/* Focused tests for the GitHub Releases auto-updater.
 * Run: node scripts/test-updater-github.js
 * Uses a local mock of the GitHub API — no network, no Electron. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const { Updater, OFFICIAL_REPO, normalizeRepo, compareVersions, parseNotes, sha256, sha256File } = require('../src/main/updater');

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, passed: false, detail: err.message });
    console.log(`FAIL  ${name} :: ${err.message}`);
  }
}

const PAYLOAD = Buffer.concat([Buffer.from('MZ-ERDTREE-TEST-PACKAGE\n'), Buffer.alloc(256 * 1024, 9)]);
const DIGEST = sha256(PAYLOAD);

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-updater-'));
  const rangeRequests = [];
  let mode = 'good'; // good | bad-digest | no-digest | no-asset | evil-host | same-version

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const send = (code, body, type = 'application/json') => {
      res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
      res.end(body);
    };
    if (url.pathname === '/repos/empty/repo/releases/latest') return send(404, '{"message":"Not Found"}');
    if (url.pathname === '/repos/rate/limited/releases/latest') return send(403, '{"message":"API rate limit exceeded"}');
    if (url.pathname === '/repos/test/erdtree/releases/latest') {
      const tag = mode === 'same-version' ? 'v2.6.0' : 'v9.9.9';
      const asset = {
        name: 'Erdtree-Launcher-Setup-9.9.9.exe',
        size: PAYLOAD.length,
        digest: mode === 'bad-digest' ? `sha256:${'0'.repeat(64)}` : `sha256:${DIGEST}`,
        browser_download_url:
          mode === 'evil-host'
            ? 'https://evil.example.com/steal.exe'
            : `http://127.0.0.1:${server.address().port}/download/setup.exe`,
      };
      if (mode === 'no-digest') delete asset.digest;
      const assets = mode === 'no-asset' ? [] : [asset];
      return send(
        200,
        JSON.stringify({
          tag_name: tag,
          published_at: '2026-11-13T00:00:00Z',
          html_url: `https://github.com/test/erdtree/releases/tag/${tag}`,
          body: "## What's new\n- Friends & invites\n- Controller support\n\nThanks for updating!",
          assets,
        })
      );
    }
    if (url.pathname === '/download/setup.exe') {
      const range = req.headers.range;
      if (range) {
        rangeRequests.push(range);
        const start = Number(/bytes=(\d+)-/.exec(range)[1]);
        const slice = PAYLOAD.subarray(start);
        res.writeHead(206, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': slice.length,
          'Content-Range': `bytes ${start}-${PAYLOAD.length - 1}/${PAYLOAD.length}`,
        });
        return res.end(slice);
      }
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': PAYLOAD.length });
      return res.end(PAYLOAD);
    }
    send(404, '{"message":"Not Found"}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  process.env.ERDTREE_UPDATE_API_BASE = `http://127.0.0.1:${port}`;

  let repo = 'test/erdtree';
  let seq = 0;
  const events = [];
  const makeUpdater = (extra = {}) => {
    seq += 1;
    return new Updater({
      userData: path.join(tmp, `u${seq}`),
      version: '2.6.0',
      appRoot: path.join(tmp, 'install', 'resources', 'app'),
      packaged: false,
      getRepo: () => repo,
      emit: (e) => events.push(e),
      ...extra,
    });
  };

  await test('normalizeRepo accepts owner/name, GitHub URLs, .git and /releases', async () => {
    assert.strictEqual(normalizeRepo('owner/repo'), 'owner/repo');
    assert.strictEqual(normalizeRepo('https://github.com/owner/repo'), 'owner/repo');
    assert.strictEqual(normalizeRepo('https://www.github.com/owner/repo/releases/'), 'owner/repo');
    assert.strictEqual(normalizeRepo('github.com/owner/repo.git'), 'owner/repo');
    assert.strictEqual(normalizeRepo('  owner/repo  '), 'owner/repo');
    assert.strictEqual(normalizeRepo(''), '');
    assert.strictEqual(normalizeRepo('owner'), '');
    assert.strictEqual(normalizeRepo('a/b/c'), '');
    assert.strictEqual(normalizeRepo('owner/repo;rm -rf'), '');
  });

  await test('compareVersions handles v-prefix and numeric segments', async () => {
    assert.strictEqual(compareVersions('2.7.0', '2.6.1'), 1);
    assert.strictEqual(compareVersions('v2.7.0', '2.7.0'), 0);
    assert.strictEqual(compareVersions('2.10.0', '2.9.9'), 1);
    assert.strictEqual(compareVersions('2.6.0', '2.6.1'), -1);
  });

  await test('parseNotes turns release markdown into bullets', async () => {
    assert.deepStrictEqual(parseNotes("## What's new\n- Friends & invites\n- Controller support\n\nThanks!"), [
      'Friends & invites',
      'Controller support',
    ]);
    assert.deepStrictEqual(parseNotes('1. First\n2. Second'), ['First', 'Second']);
    assert.deepStrictEqual(parseNotes(''), ['See the release notes on GitHub.']);
    assert.deepStrictEqual(parseNotes('Plain paragraph line.'), ['Plain paragraph line.']);
  });

  await test('check() reads GitHub release, digest and notes', async () => {
    mode = 'good';
    repo = 'test/erdtree';
    const u = makeUpdater();
    const r = await u.check({ force: true });
    assert.strictEqual(r.available, true);
    assert.strictEqual(r.latest, '9.9.9');
    assert.strictEqual(r.full.sha256, DIGEST);
    assert.strictEqual(r.mode, 'installer');
    assert.ok(r.notes.includes('Friends & invites'));
    const s = u.getState();
    assert.strictEqual(s.status, 'available');
    assert.strictEqual(s.source, 'github');
    assert.strictEqual(s.repo, 'test/erdtree');
    assert.strictEqual(s.feed, 'test/erdtree');
  });

  await test('check() treats 404 as "no releases yet", not an error', async () => {
    repo = 'empty/repo';
    const u = makeUpdater();
    const r = await u.check({ force: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.noReleases, true);
    assert.strictEqual(r.available, false);
    assert.strictEqual(u.getState().status, 'current');
  });

  await test('check() reports GitHub rate limit clearly', async () => {
    repo = 'rate/limited';
    const u = makeUpdater();
    const r = await u.check({ force: false });
    assert.strictEqual(r.ok, false);
    assert.ok(/rate limit/i.test(r.error));
  });

  await test('check() refuses to offer a package without a SHA-256 digest', async () => {
    mode = 'no-digest';
    repo = 'test/erdtree';
    const u = makeUpdater();
    const r = await u.check({ force: true });
    assert.strictEqual(r.available, false);
    assert.ok(/checksum/i.test(u.getState().message));
  });

  await test('check() with no exe asset offers nothing', async () => {
    mode = 'no-asset';
    const r = await makeUpdater().check({ force: true });
    assert.strictEqual(r.available, false);
  });

  await test('check() on the same version says up to date', async () => {
    mode = 'same-version';
    const u = makeUpdater();
    const r = await u.check({ force: true });
    assert.strictEqual(r.available, false);
    assert.ok(/latest version/i.test(u.getState().message));
  });

  await test('repo resolution: official repo baked in, empty settings still configured', async () => {
    repo = '';
    const u = makeUpdater();
    if (OFFICIAL_REPO) {
      // Release build: the publisher baked the official repo in, so updates
      // are configured out of the box even when user settings are empty.
      assert.strictEqual(u.repo(), normalizeRepo(OFFICIAL_REPO));
      const r = await u.check({});
      assert.strictEqual(r.configured, true);
    } else {
      // Dev build before injection: updates stay disabled without network.
      const r = await u.check({});
      assert.strictEqual(r.ok, false);
      assert.strictEqual(r.configured, false);
    }
    repo = 'test/erdtree';
  });

  await test('download() streams, verifies SHA-256 and reports progress', async () => {
    mode = 'good';
    repo = 'test/erdtree';
    const u = makeUpdater();
    await u.check({ force: true });
    const res = await u.download();
    assert.strictEqual(res.verified, true);
    assert.strictEqual(res.bytes, PAYLOAD.length);
    assert.ok(res.file.endsWith('Erdtree-Launcher-Setup-9.9.9.exe'));
    assert.strictEqual(await sha256File(res.file), DIGEST);
    assert.strictEqual(u.getState().status, 'ready');
    assert.strictEqual(u.getState().progress, 100);
    assert.ok(
      events.some((e) => e.type === 'update:state' && e.state.status === 'downloading' && e.state.progress > 0 && e.state.progress < 100),
      'expected intermediate progress events'
    );
    assert.ok(!fs.existsSync(`${res.file}.part`), '.part must be renamed away');
  });

  await test('download() without a prior check refuses', async () => {
    await assert.rejects(() => makeUpdater().download(), /No update is available/);
  });

  await test('download() rejects a checksum mismatch and deletes the file', async () => {
    mode = 'bad-digest';
    const u = makeUpdater();
    await u.check({ force: true });
    await assert.rejects(() => u.download(), /not authentic/);
    assert.strictEqual(u.downloaded, null);
    assert.strictEqual(u.getState().status, 'error');
    const dir = path.join(u.userData, 'updates', '9.9.9');
    const leftovers = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    assert.ok(!leftovers.some((f) => f.endsWith('.part')), 'corrupt .part must be removed');
    assert.ok(!leftovers.some((f) => f.endsWith('.exe')), 'unverified exe must not exist');
  });

  await test('download() refuses non-GitHub hosts', async () => {
    mode = 'evil-host';
    const u = makeUpdater();
    await u.check({ force: true });
    await assert.rejects(() => u.download(), /untrusted host/);
    assert.strictEqual(u.downloaded, null);
  });

  await test('interrupted download resumes with a Range request', async () => {
    mode = 'good';
    const u = makeUpdater();
    await u.check({ force: true });
    const target = path.join(u.userData, 'updates', '9.9.9', 'Erdtree-Launcher-Setup-9.9.9.exe');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(`${target}.part`, PAYLOAD.subarray(0, 100 * 1024));
    rangeRequests.length = 0;
    const res = await u.download();
    assert.strictEqual(res.verified, true);
    assert.strictEqual(await sha256File(res.file), DIGEST);
    assert.ok(
      rangeRequests.some((r) => r === `bytes=${100 * 1024}-`),
      'must resume with a Range request'
    );
  });

  await test('install() refuses dev builds, missing or unverified downloads', async () => {
    const u = makeUpdater();
    assert.throws(() => u.install({}), /packaged launcher/);
    const p = makeUpdater({ packaged: true });
    assert.throws(() => p.install({}), /Download the update first/);
    p.downloaded = { mode: 'installer', file: 'x.exe', verified: false };
    assert.throws(() => p.install({}), /integrity verification/);
  });

  await test('install script: silent install, relaunch, never touches user data', async () => {
    const u = makeUpdater({ packaged: true });
    const inst = u.buildInstallScript({ mode: 'installer', file: path.join(tmp, 'setup.exe') });
    assert.ok(inst.script.includes("'/S'"), 'silent NSIS flag');
    assert.ok(inst.script.includes(`'/D=${path.join(tmp, 'install')}'`), 'reinstalls into the same directory');
    assert.ok(inst.script.includes('Wait-Process'), 'waits for launcher exit');
    assert.ok(inst.script.includes('-Wait'), 'waits for installer');
    assert.ok(inst.script.includes(process.execPath.replace(/'/g, "''")), 'relaunches the launcher');
    assert.ok(!inst.script.includes('Remove-Item'), 'must not delete anything');
    assert.ok(inst.args.includes('-NonInteractive'));
    const portableExe = path.join(tmp, 'Erdtree-Launcher.exe');
    const p = makeUpdater({ packaged: true, portableFile: portableExe });
    const ps = p.buildInstallScript({ mode: 'portable', file: path.join(tmp, 'new.exe') });
    assert.ok(ps.script.includes('Copy-Item'), 'portable replaces the exe');
    assert.ok(ps.script.includes('for ($i = 0; $i -lt 20; $i++)'), 'portable copy retries while antivirus holds a lock');
    assert.ok(ps.script.includes(portableExe.replace(/'/g, "''")));
    assert.ok(!ps.script.includes('Remove-Item'));
  });

  await test('portable build auto-detected from electron-builder environment', async () => {
    const exe = path.join(tmp, 'Erdtree-Launcher-2.7.0-portable.exe');
    process.env.PORTABLE_EXECUTABLE_FILE = exe;
    try {
      const p = makeUpdater({ packaged: true });
      assert.strictEqual(p.portableFile, exe, 'PORTABLE_EXECUTABLE_FILE wires the portable exe');
      assert.strictEqual(p.getState().portable, true);
    } finally {
      delete process.env.PORTABLE_EXECUTABLE_FILE;
    }
  });

  await test('install helper is launched via WMI so it survives the launcher exit', async () => {
    const p = makeUpdater({ packaged: true });
    p.downloaded = { mode: 'installer', file: path.join(tmp, 'setup.exe'), verified: true };
    const h = p.buildHelperFiles(p.downloaded);
    assert.ok(h.ps1Path.startsWith(os.tmpdir()), 'helper script lives in the temp dir');
    assert.ok(h.content.includes('Wait-Process'), 'helper waits for the launcher to exit');
    assert.ok(h.content.includes('Start-Transcript'), 'helper keeps a log for support');
    const decoded = Buffer.from(h.encoded, 'base64').toString('utf16le');
    assert.ok(decoded.includes('Win32_Process'), 'WMI creates the helper outside the job object');
    assert.ok(decoded.includes(h.ps1Path), 'WMI runs the helper script file');
  });

  server.closeAllConnections?.();
  server.close();
  delete process.env.ERDTREE_UPDATE_API_BASE;
  fs.rmSync(tmp, { recursive: true, force: true });

  const failed = results.filter((r) => !r.passed).length;
  console.log('---------------------------------------------');
  console.log(`RESULT ${failed ? 'FAILED' : 'PASSED'} — ${results.length - failed}/${results.length}`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});