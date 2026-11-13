/* Real two-version update test on a separate, disposable test install.
 *
 *   node scripts/test-update-two-versions.js run
 *       Copies the REAL 2.6.1 portable exe into a temp folder, serves the
 *       REAL 2.7.0 portable exe through a local GitHub-shaped mock, then runs
 *       the production updater (check → download → SHA-256 verify → install)
 *       and exits so the install helper can replace the exe and relaunch it.
 *
 *   node scripts/test-update-two-versions.js watch
 *       Waits until the temp exe's SHA-256 equals the 2.7.0 package digest
 *       (proof the replacement happened) and prints the relaunched pid.
 *
 * The update itself only touches the temp folder. The relaunched launcher is
 * the real packaged app; close it after verifying its version.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execFileSync } = require('child_process');
const { Updater, sha256File } = require('../src/main/updater');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const NEW_VERSION = pkg.version;
const OLD_PORTABLE = path.join(root, 'release-2026-11-13T01-33-36', 'Erdtree-Launcher-2.6.1-portable.exe');
// ERDTREE_ARTIFACT_DIR lets the test point at a rebuilt artifact folder when
// the default release-<version> directory is locked by antivirus/indexer.
const NEW_DIR = process.env.ERDTREE_ARTIFACT_DIR
  ? path.resolve(root, process.env.ERDTREE_ARTIFACT_DIR)
  : path.join(root, `release-${NEW_VERSION}`);
const NEW_PORTABLE = path.join(NEW_DIR, `Erdtree-Launcher-${NEW_VERSION}-portable.exe`);
const STATE_FILE = path.join(os.tmpdir(), 'erdtree-two-version-state.json');

async function run() {
  for (const file of [OLD_PORTABLE, NEW_PORTABLE]) {
    if (!fs.existsSync(file)) {
      console.error(`missing artifact: ${file}`);
      process.exit(1);
    }
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-2v-'));
  const oldExe = path.join(tmp, 'Erdtree-Launcher-old.exe');
  fs.copyFileSync(OLD_PORTABLE, oldExe);
  const digest = await sha256File(NEW_PORTABLE);
  const size = fs.statSync(NEW_PORTABLE).size;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/repos/test/erdtree/releases/latest') {
      const body = JSON.stringify({
        tag_name: `v${NEW_VERSION}`,
        published_at: new Date().toISOString(),
        html_url: `https://github.com/test/erdtree/releases/tag/v${NEW_VERSION}`,
        body: '- Real two-version update test\n- GitHub Releases source',
        assets: [
          {
            name: path.basename(NEW_PORTABLE),
            size,
            digest: `sha256:${digest}`,
            browser_download_url: `http://127.0.0.1:${server.address().port}/download/portable.exe`,
          },
        ],
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
      return res.end(body);
    }
    if (url.pathname === '/download/portable.exe') {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': size });
      return fs.createReadStream(NEW_PORTABLE).pipe(res);
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.ERDTREE_UPDATE_API_BASE = `http://127.0.0.1:${server.address().port}`;

  const updater = new Updater({
    userData: path.join(tmp, 'data'),
    version: '2.6.1',
    appRoot: path.join(tmp, 'app'),
    packaged: true,
    portableFile: oldExe,
    getRepo: () => 'test/erdtree',
    emit: () => {},
  });

  const check = await updater.check({ force: true });
  console.log(`check: available=${check.available} latest=${check.latest}`);
  if (!check.available || check.latest !== NEW_VERSION) process.exit(1);
  const dl = await updater.download();
  console.log(`download: verified=${dl.verified} bytes=${dl.bytes}`);
  if (!dl.verified || dl.bytes !== size) process.exit(1);

  fs.writeFileSync(STATE_FILE, JSON.stringify({ tmp, oldExe, digest, size }, null, 2));
  console.log('state file:', STATE_FILE);
  updater.install({ quit: () => {} });
  console.log('install helper spawned; exiting so it can replace the exe and relaunch…');
  server.closeAllConnections?.();
  server.close();
  setTimeout(() => process.exit(0), 600);
}

async function watch() {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const deadline = Date.now() + 90000;
  let hash = '';
  while (Date.now() < deadline) {
    try {
      hash = await sha256File(state.oldExe);
    } catch {
      hash = '';
    }
    if (hash === state.digest) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (hash !== state.digest) {
    console.error('FAIL: test install exe was not replaced with the new package');
    process.exit(1);
  }
  console.log(`PASS: test install replaced with the ${NEW_VERSION} package (SHA-256 match)`);
  const ps = execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Get-Process | Where-Object { $_.Path -eq '${state.oldExe.replace(/'/g, "''")}' } | Select-Object -ExpandProperty Id`,
    ],
    { encoding: 'utf8' }
  );
  console.log('relaunched pid:', ps.trim() || '(not seen yet)');
  console.log('state file:', STATE_FILE);
}

const mode = process.argv[2];
if (mode === 'run') run().catch((err) => { console.error(err); process.exit(1); });
else if (mode === 'watch') watch().catch((err) => { console.error(err); process.exit(1); });
else {
  console.error('usage: node scripts/test-update-two-versions.js run|watch');
  process.exit(1);
}