/* LEGACY — superseded by scripts/test-updater-github.js (GitHub Releases).
 * Kept for reference only; the delta manifest feed it tests is no longer used.
 *
 * Erdtree Launcher — updater self-test (plain Node, no Electron).
 *
 * Simulates a packaged install on version 2.0.0, serves a 2.1.0 feed over a
 * local HTTP server and proves that:
 *   - only files whose sha256 differs are listed;
 *   - the delta download writes exactly those files and verifies checksums;
 *   - an unchanged file is never downloaded.
 *
 * Run: node scripts/test-updater.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { Updater, compareVersions } = require('../src/main/updater');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const file = path.join(root, rel);
      if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': rel.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-updater-'));
  const appRoot = path.join(tmp, 'app');
  const feed = path.join(tmp, 'feed');
  const userData = path.join(tmp, 'user-data');
  write(path.join(appRoot, 'src/main/app.js'), 'const version = "2.0.0";\n');
  write(path.join(appRoot, 'src/renderer/app.js'), 'renderer v2.0.0\n');
  write(path.join(appRoot, 'assets/logo.txt'), 'gold\n');

  write(path.join(feed, 'src/main/app.js'), 'const version = "2.1.0";\n');
  write(path.join(feed, 'src/renderer/app.js'), 'renderer v2.0.0\n');
  write(path.join(feed, 'assets/logo.txt'), 'gold\n');
  write(path.join(feed, 'src/main/friends.js'), 'friends system\n');

  const files = {};
  for (const rel of ['src/main/app.js', 'src/renderer/app.js', 'assets/logo.txt', 'src/main/friends.js']) {
    const buffer = fs.readFileSync(path.join(feed, rel));
    files[rel] = { sha256: sha256(buffer), size: buffer.length };
  }
  write(
    path.join(feed, 'manifest.json'),
    JSON.stringify({ version: '2.1.0', releasedAt: new Date().toISOString(), notes: ['Friends system', 'Best Builds'], files }, null, 2)
  );

  const server = await serve(feed);
  const port = server.address().port;
  const updater = new Updater({
    userData,
    version: '2.0.0',
    appRoot,
    packaged: true,
    portableFile: '',
    emit: () => {},
    getFeedUrl: () => `http://127.0.0.1:${port}/manifest.json`,
  });

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
  };

  check('patchable install detected', updater.patchable === true);
  check('semver compare', compareVersions('2.1.0', '2.0.9') === 1 && compareVersions('2.0.0', '2.0.0') === 0);

  const result = await updater.check({ force: true });
  check('update detected', result.available === true, `${result.current} → ${result.latest}`);
  check('delta mode', result.mode === 'delta', result.mode);
  check('only 2 changed files', result.changedCount === 2, JSON.stringify(result.changed.map((f) => f.path)));
  check('changed list excludes untouched files', !result.changed.some((f) => f.path === 'src/renderer/app.js'));

  const download = await updater.download();
  check('download completed', download.mode === 'delta' && download.files === 2, JSON.stringify(download));
  const versionDir = path.join(userData, 'updates', '2.1.0');
  const applied = fs.readFileSync(path.join(versionDir, 'files/src/main/app.js'), 'utf8');
  check('new file content staged', applied.includes('2.1.0'));
  check('new file created', fs.existsSync(path.join(versionDir, 'files/src/main/friends.js')));
  check('untouched file not downloaded', !fs.existsSync(path.join(versionDir, 'files/src/renderer/app.js')));
  const plan = JSON.parse(fs.readFileSync(path.join(versionDir, 'apply.json'), 'utf8'));
  check('apply plan targets the real app root', plan.appRoot === appRoot && plan.files.length === 2);
  check('state is ready', updater.getState().status === 'ready');

  server.close();
  await wait(50);
  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((item) => !item.ok);
  console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${results.length - failed.length}/${results.length} checks`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
