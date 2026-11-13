/* Erdtree Launcher — اختبار شامل من البداية للنهاية.
 *
 * يشغّل التطبيق الحقيقي (main actions + preload + renderer) داخل Electron،
 * مع لعبة وهمية، حفظ صناعي، مودات ZIP، وسيرفر Nexus محلي.
 * الهدف: التأكد إن كل ميزة تشتغل فعلياً، وأخذ لقطات للمراجعة البصرية.
 */
const { app, BrowserWindow, ipcMain, Menu, dialog, protocol, net, shell } = require('electron');

// The launcher must never push the player to a website. Record any attempt
// instead of really opening a browser, then assert on it.
const externalOpens = [];
shell.openExternal = async (url) => {
  externalOpens.push(String(url));
};
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const { Settings } = require('../src/main/settings');
const { createActions } = require('../src/main/actions');
const { AccountManager } = require('../src/main/accounts');

// `electron test/run-e2e.js` لا يقرأ package.json الجذر تلقائياً،
// فنثب إصدار التطبيق من الملف نفسه حتى يطابق تشغيل `electron .`.
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  app.getVersion = () => pkg.version;
} catch {
  /* keep default */
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'erdmod',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

const shotsDir = path.join(__dirname, 'shots');
fs.rmSync(shotsDir, { recursive: true, force: true });
fs.mkdirSync(shotsDir, { recursive: true });

const logFile = path.join(__dirname, 'run.log.txt');
fs.writeFileSync(logFile, '');
const log = (...args) => {
  const line = `[test] ${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`);
};

const results = [];
function check(name, ok, detail = '') {
  const passed = !!ok;
  results.push({ name, passed, detail });
  log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  return passed;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let win = null;
let actions = null;
let settings = null;
let accountStore = null;
let holder = null;
let tmpDir = null;
let mockServer = null;
let mockPort = 0;
let gameDir = null;
let nrcsPath = null;
let savePath = null;
let dialogQueue = [];
let nexusCalls = [];

async function js(code) {
  return win.webContents.executeJavaScript(code, true);
}

async function waitFor(code, timeout = 20000, interval = 250) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await js(code)) return true;
    } catch {
      /* renderer may be mid-navigation */
    }
    await wait(interval);
  }
  return false;
}

async function waitFile(file, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fs.existsSync(file)) return true;
    await wait(200);
  }
  return false;
}

async function click(selector) {
  return js(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.click();
    return true;
  })()`);
}

async function fill(selector, value) {
  return js(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.value = ${JSON.stringify(String(value))};
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}

async function setChecked(selector, checked) {
  return js(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.checked = ${checked ? 'true' : 'false'};
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}

async function confirmModal() {
  const found = await waitFor("!!document.querySelector('[data-modal-action=\"1\"]')", 8000);
  if (!found) return false;
  await click('[data-modal-action="1"]');
  return true;
}

async function capture(name, { clearToasts = true } = {}) {
  if (!win || win.isDestroyed()) return;
  if (clearToasts) {
    await js("document.getElementById('toasts').innerHTML = ''").catch(() => {});
  }
  await wait(280);
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(shotsDir, name), image.toPNG());
  log('screenshot', name);
}

function runPowerShell(script) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true,
    encoding: 'utf8',
  });
}

function makeCover(file, label, color1 = '#171208', color2 = '#4b3415') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const safeFile = file.replace(/'/g, "''");
  const safeLabel = String(label).replace(/'/g, "''");
  const script = [
    'Add-Type -AssemblyName System.Drawing',
    '$bmp = New-Object System.Drawing.Bitmap(640,360)',
    '$g = [System.Drawing.Graphics]::FromImage($bmp)',
    '$rect = New-Object System.Drawing.Rectangle(0,0,640,360)',
    `$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,[System.Drawing.ColorTranslator]::FromHtml('${color1}'),[System.Drawing.ColorTranslator]::FromHtml('${color2}'),35)`,
    '$g.FillRectangle($brush, $rect)',
    "$pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#c9a86a'), 4)",
    '$g.DrawRectangle($pen, 18, 18, 604, 324)',
    "$font = New-Object System.Drawing.Font('Georgia', 30, [System.Drawing.FontStyle]::Bold)",
    `$g.DrawString('${safeLabel}', $font, [System.Drawing.Brushes]::White, 36, 286)`,
    `$bmp.Save('${safeFile}', [System.Drawing.Imaging.ImageFormat]::Png)`,
    '$g.Dispose()',
    '$bmp.Dispose()',
  ].join('; ');
  runPowerShell(script);
}

function makeZip(sourceDir, zipPath) {
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  fs.rmSync(zipPath, { force: true });
  const src = sourceDir.replace(/'/g, "''");
  const dst = zipPath.replace(/'/g, "''");
  runPowerShell(`Compress-Archive -Path '${src}\\*' -DestinationPath '${dst}' -Force`);
}

function writeModManifest(dir, manifest) {
  fs.writeFileSync(path.join(dir, 'erdtree-mod.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

// Deterministic fake release package for the GitHub-shaped update mock.
function fakeInstallerBuffer() {
  return Buffer.concat([Buffer.from('MZ-ERDTREE-FAKE-INSTALLER\n'), Buffer.alloc(64 * 1024, 7)]);
}

function startMockNexus(coverPath, zipPath, merchantZipPath = '') {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const send = (code, body, type = 'application/json') => {
        res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
        res.end(body);
      };
      if (url.pathname === '/v1/users/validate.json') {
        if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
        return send(200, JSON.stringify({ name: 'TestKnight', is_premium: true, is_supporter: false }));
      }
      if (url.pathname === '/v1/graphql' && req.method === 'POST') {
        let raw = '';
        req.on('data', (c) => {
          raw += c;
        });
        req.on('end', () => {
          if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
          send(
            200,
            JSON.stringify({
              data: {
                mods: {
                  nodes: [
                    {
                      modId: 42,
                      name: 'Cool Nexus Mod',
                      summary: 'مود تجريبي من سيرفر Nexus الوهمي',
                      pictureUrl: `http://127.0.0.1:${mockPort}/img/cover.png`,
                      downloads: 123456,
                      gameDomainName: 'eldenring',
                    },
                  ],
                  totalCount: 1,
                },
              },
            })
          );
        });
        return;
      }
      if (/^\/v1\/games\/eldenring\/mods\/42\/files\.json/.test(url.pathname)) {
        if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
        return send(
          200,
          JSON.stringify([
            {
              file_id: 7,
              file_name: 'cool-nexus.zip',
              version: '1.2',
              category_name: 'MAIN',
              archived: false,
            },
          ])
        );
      }
      if (url.pathname === '/v1/games/eldenring/mods/42/files/7/download_link.json') {
        if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
        return send(200, JSON.stringify([{ URI: `http://127.0.0.1:${mockPort}/download/cool-nexus.zip` }]));
      }
      if (/^\/v1\/games\/eldenring\/mods\/3419\/files\.json/.test(url.pathname)) {
        if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
        return send(
          200,
          JSON.stringify([
            {
              file_id: 34191,
              file_name: 'the-convergence.zip',
              version: '1.9',
              category_name: 'MAIN',
              archived: false,
            },
          ])
        );
      }
      if (url.pathname === '/v1/games/eldenring/mods/3419/files/34191/download_link.json') {
        if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
        return send(200, JSON.stringify([{ URI: `http://127.0.0.1:${mockPort}/download/cool-nexus.zip` }]));
      }
      if (/^\/v1\/games\/eldenring\/mods\/5192\/files\.json/.test(url.pathname)) {
        if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
        return send(
          200,
          JSON.stringify([
            {
              file_id: 51921,
              file_name: 'glorious-merchant.zip',
              version: '1.4',
              category_name: 'MAIN',
              archived: false,
            },
          ])
        );
      }
      if (url.pathname === '/v1/games/eldenring/mods/5192/files/51921/download_link.json') {
        if (req.headers.apikey !== 'test-key') return send(401, '{"error":"bad key"}');
        return send(200, JSON.stringify([{ URI: `http://127.0.0.1:${mockPort}/download/glorious-merchant.zip` }]));
      }
      if (url.pathname === '/download/glorious-merchant.zip' && merchantZipPath) {
        const buf = fs.readFileSync(merchantZipPath);
        res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': buf.length });
        return res.end(buf);
      }
      if (url.pathname.startsWith('/v1/games/eldenring/mods/latest_added') || url.pathname.startsWith('/v1/games/eldenring/mods/trending')) {
        return send(200, '[]');
      }
      if (url.pathname === '/img/cover.png') {
        const buf = fs.readFileSync(coverPath);
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length });
        return res.end(buf);
      }
      if (url.pathname === '/repos/test/erdtree/releases/latest') {
        const buf = fakeInstallerBuffer();
        const digest = `sha256:${require('crypto').createHash('sha256').update(buf).digest('hex')}`;
        return send(
          200,
          JSON.stringify({
            tag_name: 'v9.9.9',
            published_at: new Date().toISOString(),
            html_url: 'https://github.com/test/erdtree/releases/tag/v9.9.9',
            body: "## What's new\n- Friends & invites\n- Best Builds take-one-click\n- GitHub Releases auto-update",
            assets: [
              {
                name: 'Erdtree-Launcher-Setup-9.9.9.exe',
                size: buf.length,
                digest,
                browser_download_url: `http://127.0.0.1:${mockPort}/download/erdtree-setup.exe`,
              },
              {
                name: 'Erdtree-Launcher-Portable-9.9.9.exe',
                size: buf.length,
                digest,
                browser_download_url: `http://127.0.0.1:${mockPort}/download/erdtree-portable.exe`,
              },
            ],
          })
        );
      }
      if (url.pathname === '/download/erdtree-setup.exe' || url.pathname === '/download/erdtree-portable.exe') {
        const buf = fakeInstallerBuffer();
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': buf.length });
        return res.end(buf);
      }
      if (url.pathname === '/download/cool-nexus.zip') {
        const buf = fs.readFileSync(zipPath);
        res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': buf.length });
        return res.end(buf);
      }
      send(404, '{"error":"not found"}');
    });
    server.listen(0, '127.0.0.1', () => {
      mockServer = server;
      mockPort = server.address().port;
      resolve();
    });
  });
}

function buildSyntheticSave(file) {
  const NAME_TABLE = 0x1901d0e;
  const RECORD = 588;
  const buffer = Buffer.alloc(NAME_TABLE + RECORD * 10 + 8192);
  buffer.fill(0);
  const put = (slot, name, level, hp, runes, playtime) => {
    const rec = NAME_TABLE + slot * RECORD;
    buffer.write(name, rec, 32, 'utf16le');
    buffer.writeUInt16LE(level, rec + 0x22);
    buffer.writeUInt32LE(playtime, rec + 0x26);
    buffer.writeInt32LE(hp, rec + 0x30);
    buffer.writeInt32LE(runes, rec + 0x34);
  };
  put(0, 'Von', 87, 1450, 320000, 152220); // 42h 17m
  put(1, 'Rxzlr', 42, 980, 12500, 5400); // 1h 30m
  put(2, 'Malenia', 150, 1900, 999999, 998280); // 277h 18m
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buffer);
  return buffer;
}

async function bootUi() {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: true,
    backgroundColor: '#07080a',
    frame: false,
    title: 'Erdtree Launcher — اختبار',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.webContents.setBackgroundThrottling(false);
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) log('renderer console:', message);
  });
  win.webContents.on('preload-error', (_e, p, error) => log('preload error', p, String(error)));
  win.webContents.on('render-process-gone', (_e, details) => log('render process gone', JSON.stringify(details)));
  await win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
  await wait(1800);
  await js('document.fonts.ready.then(() => true)').catch(() => {});
}

async function main() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-e2e-'));
  app.setPath('userData', tmpDir);

  process.env.ERDTREE_GPU_NAME = 'Intel(R) UHD Graphics 620';
  // Deterministic PS5 pad scenario for the controller-support checks (no real
  // hardware needed). DualSense over USB, ViGEmBus present, no DS4Windows/Steam.
  process.env.ERDTREE_CONTROLLER_JSON = JSON.stringify({
    sony: [{ name: 'Wireless Controller', id: 'USB\\VID_054C&PID_0CE6\\6&2a1b3c4d&0&2', status: 'OK', class: 'HIDClass' }],
    vigem: true,
    ds4windows: false,
    steam: false,
  });
  process.env.ERDTREE_NEXUS_API = 'http://127.0.0.1:1'; // replaced after mock starts

  // ---------- fake game ----------
  gameDir = path.join(tmpDir, 'SteamLibrary', 'steamapps', 'common', 'ELDEN RING', 'Game');
  fs.mkdirSync(path.join(gameDir, 'mod'), { recursive: true });
  for (const file of ['eldenring.exe', 'start_protected_game.exe', 'mod_loader.dll']) {
    fs.writeFileSync(path.join(gameDir, file), '');
  }
  // The Mod Engine 2 launcher must be a real executable so the modded-launch
  // test can spawn it (where.exe stands in, like the fake Seamless launcher).
  fs.copyFileSync(
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'where.exe'),
    path.join(gameDir, 'modengine2_launcher.exe')
  );
  fs.writeFileSync(path.join(gameDir, 'config_eldenring.toml'), '[modengine]\ndebug = true\n# user config\n');
  nrcsPath = path.join(gameDir, 'nrcs.bat');
  const launchMarker = path.join(gameDir, 'nrcs-launched.txt');
  fs.writeFileSync(nrcsPath, '@echo off\r\necho launched>"%~dp0nrcs-launched.txt"\r\n', 'utf8');

  // Fake but structurally complete Seamless Co-op install.
  const fakeSeamlessExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'where.exe');
  fs.mkdirSync(path.join(gameDir, 'SeamlessCoop', 'crashpad'), { recursive: true });
  fs.mkdirSync(path.join(gameDir, 'SeamlessCoop', 'locale'), { recursive: true });
  fs.copyFileSync(fakeSeamlessExe, path.join(gameDir, 'launch_elden_ring_seamlesscoop.exe'));
  fs.copyFileSync(fakeSeamlessExe, path.join(gameDir, 'ersc_launcher.exe'));
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'ersc.dll'), Buffer.alloc(1200000, 1));
  fs.writeFileSync(path.join(gameDir, 'seamlesscoop.dll'), Buffer.alloc(1200000, 1));
  const fakeSeamlessIni = [
    '[GAMEPLAY]',
    'skip_splash_screens = 1',
    '[PASSWORD]',
    'cooppassword = ',
    '[SAVE]',
    'save_file_extension = co2',
    '',
  ].join('\r\n');
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'ersc_settings.ini'), fakeSeamlessIni);
  fs.writeFileSync(path.join(gameDir, 'seamlesscoop.ini'), fakeSeamlessIni);
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'crashpad', 'crashpad_handler.exe'), 'x');
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'locale', 'english.json'), '{}');
  fs.writeFileSync(path.join(gameDir, 'steam_emu.ini'), '[Settings]\r\nUserName=Player\r\nLanguage=english\r\n');

  // ---------- synthetic Elden Ring save ----------
  savePath = path.join(tmpDir, 'save', 'ER0000.sl2');
  const originalSave = buildSyntheticSave(savePath);

  // ---------- mods / images / zips ----------
  const modsRoot = path.join(tmpDir, 'mods');
  const seedMod = (id, name, files, { dll = false, cover = false, compatible = true } = {}) => {
    const dir = path.join(modsRoot, id);
    for (const file of files) {
      const full = path.join(dir, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, Buffer.alloc(64000 + Math.floor(Math.random() * 64000)));
    }
    let image = '';
    if (cover) {
      image = 'cover.png';
      makeCover(path.join(dir, image), name, '#0d0b07', '#3d2d14');
    }
    writeModManifest(dir, {
      name,
      enabled: true,
      dllMode: dll,
      dlls: dll ? ['ersc.dll'] : [],
      fileCount: files.length,
      bytes: 128000,
      installedAt: new Date(Date.now() - 86400000).toISOString(),
      image,
      compatible,
      compatibilityReason: '',
      targetGame: 'eldenring',
      requiresModEngine: false,
      version: '1.0',
      author: 'E2E',
    });
  };
  seedMod('regulation-overhaul', 'Regulation Overhaul', ['regulation.bin', 'map/MapStudio/m10_00.msb'], { cover: true });
  seedMod('seamless-coop', 'Seamless Co-op', ['ersc.dll', 'ersc_launcher.exe'], { dll: true });

  const coolPkg = path.join(tmpDir, 'pkg', 'cool-mod');
  fs.mkdirSync(path.join(coolPkg, 'parts'), { recursive: true });
  fs.writeFileSync(path.join(coolPkg, 'regulation.bin'), Buffer.alloc(180000));
  fs.writeFileSync(path.join(coolPkg, 'parts', 'c1000.partsbnd.dcx'), Buffer.alloc(24000));
  makeCover(path.join(coolPkg, 'preview.png'), 'COOL MOD', '#101a0a', '#2d4a16');
  const coolZip = path.join(tmpDir, 'Cool Mod 2.0.zip');
  makeZip(coolPkg, coolZip);

  const legacyPkg = path.join(tmpDir, 'pkg', 'legacy');
  fs.mkdirSync(legacyPkg, { recursive: true });
  fs.writeFileSync(path.join(legacyPkg, 'regulation.bin'), Buffer.alloc(96000));
  writeModManifest(legacyPkg, {
    name: 'Legacy Pack',
    compatible: false,
    compatibilityReason: 'معمول لنسخة 1.10 من اللعبة',
  });
  const legacyZip = path.join(tmpDir, 'Legacy Pack.zip');
  makeZip(legacyPkg, legacyZip);

  const nexusPkg = path.join(tmpDir, 'pkg', 'nexus');
  fs.mkdirSync(nexusPkg, { recursive: true });
  fs.writeFileSync(path.join(nexusPkg, 'regulation.bin'), Buffer.alloc(120000));
  makeCover(path.join(nexusPkg, 'cover.png'), 'NEXUS MOD', '#160b1f', '#4a1f5e');
  const nexusZip = path.join(tmpDir, 'nexus', 'cool-nexus.zip');
  makeZip(nexusPkg, nexusZip);
  const nexusCover = path.join(tmpDir, 'nexus', 'cover.png');
  makeCover(nexusCover, 'COOL NEXUS MOD', '#1f0b0b', '#5e1f1f');

  // Glorious Merchant (UNLOCK ALL installs this inside the launcher).
  const merchantPkg = path.join(tmpDir, 'pkg', 'merchant');
  fs.mkdirSync(merchantPkg, { recursive: true });
  // Random bytes so the archive is not compressed below the download size check.
  fs.writeFileSync(path.join(merchantPkg, 'merchant.dll'), require('crypto').randomBytes(64000));
  fs.writeFileSync(path.join(merchantPkg, 'merchant_config.ini'), 'free_items=1\n', 'utf8');
  const merchantZip = path.join(tmpDir, 'nexus', 'glorious-merchant.zip');
  makeZip(merchantPkg, merchantZip);

  await startMockNexus(nexusCover, nexusZip, merchantZip);
  process.env.ERDTREE_NEXUS_API = `http://127.0.0.1:${mockPort}`;
  process.env.ERDTREE_UPDATE_API_BASE = `http://127.0.0.1:${mockPort}`;
  log('mock nexus on', String(mockPort));

  // ---------- settings / actions ----------
  settings = new Settings();
  settings.load();
  settings.save({ gamePath: gameDir, saveFile: savePath });

  // Accounts: register a throwaway local account so the UI boots past the
  // first-open login screen, exactly like a remembered real user session.
  accountStore = new AccountManager(tmpDir);
  accountStore.register({
    username: 'e2e_tarnished',
    email: 'e2e@erdtree.test',
    password: 'erdtree-e2e-1234',
    migrateLegacy: false,
  });

  // In production the Nexus session is a real in-launcher BrowserWindow. In e2e
  // we inject a fake that stands in for a player who signed in once and pressed
  // Nexus' own free download button: it hands the launcher the archive.
  const fakeNexusSession = {
    open: async (entry, hooks = {}) => {
      nexusCalls.push(entry.id);
      await wait(600);
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-e2e-nexus-'));
      const target = path.join(temp, `${entry.id}.zip`);
      const asset = entry.id === '5192' ? 'glorious-merchant.zip' : 'cool-nexus.zip';
      const res = await fetch(`http://127.0.0.1:${mockPort}/download/${asset}`);
      if (!res.ok) throw new Error(`mock archive missing: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(target, buf);
      if (hooks.onProgress) hooks.onProgress(buf.length, buf.length);
      return { path: target, name: `${entry.id}.zip`, temp };
    },
    close: () => {},
    isOpen: () => false,
  };
  actions = createActions({ settings, getWindow: () => win, nexusSession: fakeNexusSession });
  Menu.setApplicationMenu(null);

  protocol.handle('erdmod', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'local') return new Response('Not found', { status: 404 });
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const file = actions?.mods?.resolveImage(rel);
      if (!file) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Bad request', { status: 400 });
    }
  });

  dialog.showOpenDialog = async () => {
    const next = dialogQueue.shift();
    if (!next) return { canceled: true, filePaths: [] };
    return { canceled: false, filePaths: [next] };
  };

  ipcMain.handle('erd', async (_event, action, payload) => {
    try {
      return { ok: true, data: await actions.dispatch(action, payload) };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err), code: err?.code || '' };
    }
  });
  ipcMain.handle('win', () => false);

  ipcMain.handle('account', async (_event, action, payload = {}) => {
    const session = () => ({
      loggedIn: !!accountStore.current,
      account: accountStore.current ? accountStore.publicAccount(accountStore.current) : null,
      guest: !!(accountStore.current && accountStore.current.guest),
      saved: accountStore.savedAccounts(),
      hasAccounts: accountStore.hasAccounts(),
    });
    try {
      switch (action) {
        case 'status':
          return { ok: true, data: session() };
        case 'login': {
          const result = accountStore.login(payload);
          return { ok: true, data: { ...result, session: session() } };
        }
        case 'register': {
          const result = accountStore.register(payload);
          return { ok: true, data: { ...result, session: session() } };
        }
        case 'guest': {
          accountStore.startGuest();
          return { ok: true, data: { session: session() } };
        }
        case 'logout':
          accountStore.logout();
          return { ok: true, data: session() };
        case 'update': {
          const account = accountStore.update(payload);
          return { ok: true, data: { account, session: session() } };
        }
        default:
          return { ok: true, data: session() };
      }
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  // ---------- fake eldenring.exe process ----------
  const nodeExe = execFileSync('where.exe', ['node'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
  const fakeExe = path.join(tmpDir, 'bin', 'eldenring.exe');
  fs.mkdirSync(path.dirname(fakeExe), { recursive: true });
  fs.copyFileSync(nodeExe, fakeExe);
  holder = spawn(fakeExe, [path.join(__dirname, 'holder.js')], {
    stdio: 'ignore',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
  await wait(1600);
  log('holder pid', String(holder.pid));

  // =========================================================
  //  UI
  // =========================================================
  await bootUi();

  const booted = await waitFor("!!document.querySelector('.home-view')", 25000);
  check('الواجهة تحمّل الرئيسية بدون أخطاء', booted);

  // Fresh userData opens the first-run wizard. Dismiss it like a real user so
  // the screenshots show the actual views and the wizard overlay can't
  // swallow clicks meant for the app underneath.
  if (await js('!!S.setup?.open')) {
    await click('[data-wiz-act="skip"]');
    await waitFor('!S.setup.open', 8000);
    await wait(500);
  }
  check('معالج أول مرة يفتح ويتخطى بنجاح', !(await js('!!S.setup?.open')));

  const nav = await js(
    "[...document.querySelectorAll('[data-nav]')].map(b => b.querySelector('span:not(.nav-icon):not(.nav-badge)').textContent.trim())"
  );
  check(
    'أقسام اللانشر السبعة بالترتيب المطلوب',
    JSON.stringify(nav) ===
      JSON.stringify(['الرئيسية', 'Friends', 'Builds', 'Workshop', 'MY SAVES', 'UNLOCK ALL', 'الاعدادات']),
    nav
  );
  const title = await js("document.querySelector('.home-greeting')?.textContent.trim()");
  check('الرئيسية ترحّب بالحساب المسجّل', !!title && title.startsWith('Welcome back'), title);
  const homeSub = await js("document.querySelector('.home-status-line')?.textContent.trim() || ''");
  check('الرئيسية فيها سطر حالة واضح', homeSub.length > 10, homeSub);

  const hasLaunch = await js("!!document.querySelector('[data-act=\"launch\"]')");
  const hasPick = await js("!!document.querySelector('[data-act=\"pickGameExe\"]')");
  check('رئيسية التشغيل فيها زر التشغيل واختيار الملف', hasLaunch && hasPick);
  await capture('01-home.png');

  // ---------- settings: pick nrcs through the real UI button ----------
  await click('[data-nav="settings"]');
  await waitFor("document.querySelector('.view-title')?.textContent.trim() === 'الاعدادات'");
  dialogQueue.push(nrcsPath);
  await click('[data-act="pickGameExe"]');
  const picked = await waitFor(`S.state.settings.gameExe === ${JSON.stringify(nrcsPath)}`, 12000);
  check('اختيار ملف nrcs من الاعدادات ينحفظ', picked);
  const savedJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
  check('مسار nrcs ينكتب في settings.json', savedJson.gameExe === nrcsPath, savedJson.gameExe);
  await capture('02-settings-top.png');

  // ---------- missing exe exact message ----------
  const nrcsBackup = `${nrcsPath}.off`;
  fs.renameSync(nrcsPath, nrcsBackup);
  await click('[data-nav="home"]');
  await waitFor("!!document.querySelector('.home-view')");
  await js('refreshState().then(() => render())');
  await wait(800);
  const bannerText = await js("document.querySelector('.banner.warn')?.textContent || ''");
  check(
    'رسالة ملف اللعبة المفقود تظهر على الرئيسية',
    bannerText.includes('Point the launcher at your game folder'),
    bannerText.trim().slice(0, 80)
  );
  await click('[data-act="launch"]');
  await wait(700);
  const launchError = await js("[...document.querySelectorAll('.toast.error')].map(t => t.textContent).join(' | ')");
  check(
    'التشغيل يشرح إن الملف مفقود',
    launchError.includes('ملف اللعبة مو موجود، اختر المسار الصحيح من الاعدادات'),
    launchError
  );
  let directMissing = '';
  try {
    await actions.dispatch('settings.update', { gameExe: path.join(tmpDir, 'nope', 'nrcs.bat') });
  } catch (err) {
    directMissing = err.message;
  }
  check('حفظ مسار غير موجود مرفوض بنفس الرسالة', directMissing === 'ملف اللعبة مو موجود، اختر المسار الصحيح من الاعدادات', directMissing);
  await capture('03-home-missing-exe.png');
  fs.renameSync(nrcsBackup, nrcsPath);
  await js('refreshState().then(() => render())');
  await wait(500);

  // The direct-launch path is the NO-MODS path: with mods enabled, PLAY now
  // (correctly) routes through Mod Engine 2 — that routing is verified by the
  // modded-launch block after the workshop section. Temporarily disable the
  // seeded mods so these checks exercise direct nrcs / Seamless launching.
  for (const id of ['regulation-overhaul', 'seamless-coop']) {
    await actions.dispatch('mods.toggle', { id, enabled: false });
  }
  await js('refreshState().then(() => render())');

  // ---------- launch for real (nrcs .bat marker) ----------
  await click('[data-nav="home"]');
  await waitFor("!!document.querySelector('.home-view')");
  fs.rmSync(launchMarker, { force: true });
  await click('[data-act="launch"]');
  const launched = await waitFile(launchMarker, 12000);
  check('تشغيل اللعبة يشتغل من ملف nrcs مباشرة بدون ستيم', launched);
  const launchToast = await js("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')");
  check('واجهة التشغيل تؤكد إرسال الأمر', launchToast.includes('بنشغّل الوضع العادي'), launchToast);
  await capture('04-home-launched.png');

  // ---------- launch modes: normal / seamless (mode is stored in settings) ----------
  const modeChip = await js("document.querySelector('.home-play-mode')?.textContent.trim()");
  check('زر PLAY يعرض وضع التشغيل الحالي', modeChip === 'Normal launch', modeChip);

  await actions.dispatch('settings.update', { launchMode: 'seamless' });
  await js('refreshState().then(() => render())');
  const modeSaved = await waitFor("S.state.settings.launchMode === 'seamless'", 12000);
  check('اختيار وضع Seamless ينحفظ', modeSaved);
  const seamlessChip = await js("document.querySelector('.home-play-mode')?.textContent.trim() || ''");
  check('واجهة الرئيسية تعكس وضع Seamless', seamlessChip.includes('Seamless'), seamlessChip);
  const modeJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
  check('وضع التشغيل ينكتب في settings.json', modeJson.launchMode === 'seamless', modeJson.launchMode);
  await capture('04b-home-seamless-mode.png');

  // seamless launch goes to the Seamless launcher, never the normal exe
  fs.rmSync(launchMarker, { force: true });
  await click('[data-act="launch"]');
  const seamlessToast = await waitFor(
    "[...document.querySelectorAll('.toast')].some(t => t.textContent.includes('Seamless مباشرة'))",
    20000,
    400
  );
  check('زر التشغيل في وضع Seamless يشتغل', seamlessToast);
  const seamlessRun = await actions.dispatch('game.launch', {});
  check(
    'وضع Seamless يوجّه الأمر إلى launch_elden_ring_seamlesscoop.exe',
    seamlessRun.mode === 'seamless' &&
      seamlessRun.via === 'seamless' &&
      /launch_elden_ring_seamlesscoop\.exe$/i.test(seamlessRun.exe || ''),
    { mode: seamlessRun.mode, exe: seamlessRun.exe }
  );
  await wait(700);
  check('وضع Seamless ما يشغّل ملف nrcs العادي', !fs.existsSync(launchMarker));

  // back to normal mode
  await actions.dispatch('settings.update', { launchMode: 'normal' });
  await js('refreshState().then(() => render())');
  await waitFor("S.state.settings.launchMode === 'normal'", 12000);
  fs.rmSync(launchMarker, { force: true });
  await click('[data-act="launch"]');
  const normalAgain = await waitFile(launchMarker, 12000);
  check('الرجوع للوضع العادي يشغّل ملف nrcs', normalAgain);

  // Restore the seeded mods for the remaining sections.
  for (const id of ['regulation-overhaul', 'seamless-coop']) {
    await actions.dispatch('mods.toggle', { id, enabled: true });
  }
  await js('refreshState().then(() => render())');

  // =========================================================
  //  TRAINER
  // =========================================================
  await js("go('trainer')");
  await waitFor("S.view === 'trainer'");
  await waitFor("document.querySelectorAll('.cheat-tile').length >= 13");
  const groups = await js("[...document.querySelectorAll('.group-name')].map(e => e.textContent.trim()).slice(0, 4)");
  check(
    'مجموعات التعديلات الأربع بالاسم والترتيب',
    JSON.stringify(groups) === JSON.stringify(['اللاعب', 'القتال', 'الموارد', 'المتعة']),
    groups
  );
  const cheatNames = await js(
    "[...document.querySelectorAll('.cheat-title')].map(e => e.textContent.replace('⚠','').trim())"
  );
  const expectedCheats = [
    'منع الموت',
    'بدون ضرر',
    'فوكس لا نهائي',
    'ستامينا لا نهائية',
    'تعبئة الدم',
    'تعبئة الفوكس',
    'تعبئة الستامينا',
    'الأدوات ما تنقص',
    'تعطيل هجومك',
    'تجميد الحركة',
    'تجميد الشخصية',
    'رونز ٩٩٩ مليون',
    'تسريع الحركة',
  ];
  check(
    'كل التعديلات الثلاثة عشر موجودة بالاسم المطلوب',
    expectedCheats.every((n) => cheatNames.includes(n)) && cheatNames.length === 13,
    cheatNames.length
  );
  const hasToolbar = await js(
    "!!document.querySelector('[data-act=\"allCheats\"][data-enabled=\"1\"]') && !!document.querySelector('[data-act=\"allCheats\"][data-enabled=\"0\"]') && !!document.querySelector('[data-act=\"saveLoadout\"]')"
  );
  check('أزرار تشغيل الكل / إيقاف الكل / حفظ تشكيلتي', hasToolbar);
  await capture('05-trainer.png');

  // attach through UI (offline warning modal)
  await click('[data-act="attachTrainer"]');
  await wait(400);
  const modalShown = await waitFor("!!document.querySelector('[data-modal-action=\"1\"]')", 5000);
  check('تحذير الأوفلاين يظهر قبل التعديل', modalShown);
  await click('[data-modal-action="1"]');
  const attached = await waitFor('!!S.state?.trainer?.attached', 180000, 500);
  check('الاتصال بعملية eldenring.exe ينجح', attached, await js('S.lastAttachError || ""'));
  await capture('06-trainer-connected.png');

  const groupCounts = await js(
    'S.state.trainer.cheats.reduce((a,c)=>(a[c.group]=(a[c.group]||0)+1,a),{})'
  );
  check(
    'توزيع التعديلات على المجموعات صحيح',
    groupCounts['اللاعب'] === 7 && groupCounts['القتال'] === 4 && groupCounts['الموارد'] === 1 && groupCounts['المتعة'] === 1,
    groupCounts
  );

  // scanner first + next
  check('نبقى داخل قسم التعديلات بعد الاتصال', (await js('S.view')) === 'trainer', await js('S.view'));
  // The test window is visible on the desktop; a stray click can switch views.
  // Re-assert the trainer view so the scanner checks exercise the real UI.
  if ((await js('S.view')) !== 'trainer') {
    await click('[data-nav="trainer"]');
    await wait(500);
  }
  await click('[data-panel="scanner"] summary');
  await wait(400);
  await fill('#scanValue', '987654321');
  await click('[data-act="scanStart"]');
  const gotHits = await waitFor('S.scan && S.scan.count > 0 && !S.scan.loading', 120000, 500);
  check('فاحص القيم: البحث الأول يلقى القيمة الحقيقية', gotHits, await js('S.scan.count'));
  const firstCount = await js('S.scan.count');
  const firstRow = await js('S.scan.rows[0] || null');
  check('نتائج الفحص فيها عنوان وقيمة', !!(firstRow && firstRow.address && firstRow.value === 987654321), firstRow);
  await js("document.querySelector('[data-panel=\"scanner\"]')?.scrollIntoView({block:'start'})");
  await wait(400);
  await capture('08-scanner-results.png');

  await fill('#scanMode', 'exact');
  await fill('#scanNextValue', '987654321');
  await click('[data-act="scanNext"]');
  await waitFor('!S.scan.loading', 30000, 300);
  const nextCount = await js('S.scan.count');
  check('البحث التالي يصفّي النتائج', nextCount > 0 && nextCount <= firstCount, { firstCount, nextCount });

  // write a value through the UI prompt
  const scanAddress = Number((await js('S.scan.rows[0]?.address')) || 0);
  if (scanAddress) {
    await click('[data-act="scanWrite"]');
    await waitFor("!!document.querySelector('#promptInput')", 5000);
    await fill('#promptInput', '555555');
    await click('[data-modal-action="1"]');
    await wait(900);
    const written = await actions.dispatch('trainer.scan.write', {
      address: scanAddress,
      type: 'int32',
      value: 555555,
    });
    check('كتابة قيمة في الذاكرة من الفاحص تشتغل', written.value === 555555, written.value);
  } else {
    check('كتابة قيمة في الذاكرة من الفاحص تشتغل', false, 'لا يوجد عنوان');
  }

  // toggle a real cheat through the UI and confirm the engine applies it
  await setChecked('[data-cheat-toggle="no-dead"]', true);
  await wait(400);
  await confirmModal();
  const applied = await waitFor(
    "S.state.trainer.cheats.find(c => c.id === 'no-dead')?.applied === true",
    20000,
    400
  );
  check('تفعيل تعديل من الواجهة يطبق داخل اللعبة', applied);
  await capture('09-trainer-applied.png');
  await setChecked('[data-cheat-toggle="no-dead"]', false);
  await wait(600);

  // all off / preset / save loadout
  await click('[data-act="allCheats"][data-enabled="0"]');
  await waitFor('S.state.trainer.enabledCount === 0', 12000);
  check('إيقاف الكل يوقف كل التعديلات', (await js('S.state.trainer.enabledCount')) === 0);

  await click('[data-act="applyPreset"][data-id="explorer"]');
  await wait(300);
  await confirmModal();
  const presetApplied = await waitFor('S.state.trainer.enabledCount === 3', 12000);
  check(
    'البريستات الجاهزة تنطبق (المستكشف)',
    presetApplied,
    await js('JSON.stringify(S.state.trainer.cheats.filter(c=>c.enabled).map(c=>c.id))')
  );

  await click('[data-act="saveLoadout"]');
  await waitFor("!!document.querySelector('#promptInput')", 5000);
  await fill('#promptInput', 'تشكيلة الاختبار');
  await click('[data-modal-action="1"]');
  const savedLoadout = await waitFor(
    "S.state.trainer.presets.some(p => p.saved && p.name === 'تشكيلة الاختبار')",
    12000
  );
  check('حفظ تشكيلتي يضيف بريست محفوظ', savedLoadout);
  await capture('10-trainer-preset.png');

  await click('[data-act="detachTrainer"]');
  await waitFor('!S.state.trainer.attached', 10000);
  check('فصل التعديلات يشتغل', !(await js('S.state.trainer.attached')));

  // stop the fake game so save-restore is allowed
  try {
    holder.kill();
  } catch {
    /* ignore */
  }
  holder = null;
  await wait(1800);
  const runningAfterKill = await actions.dispatch('game.running', {});
  check('اللعبة تظهر متوقفة بعد إغلاق العملية', runningAfterKill.running === false, runningAfterKill);

  // =========================================================
  //  CHARACTERS
  // =========================================================
  await js("go('characters')");
  await waitFor("S.view === 'characters'");
  await waitFor("document.querySelectorAll('.character-card').length === 3", 15000);
  const charNames = await js(
    "[...document.querySelectorAll('.character-card .char-name')].map(e => e.textContent.trim().split(' ')[0])"
  );
  check(
    'أسماء الشخصيات من الحفظ تظهر صحيحة',
    ['Von', 'Rxzlr', 'Malenia'].every((n) => charNames.includes(n)),
    charNames
  );
  await capture('11-characters.png');

  await fill('#charSearch', 'von');
  await wait(400);
  const visibleChars = await js(
    "[...document.querySelectorAll('.character-card')].filter(c => c.style.display !== 'none').length"
  );
  check('البحث بالاسم يصفّي الشخصيات', visibleChars === 1, visibleChars);
  await fill('#charSearch', '');
  await wait(300);

  await click('[data-act="openCharacter"][data-id="slot-1"]');
  await waitFor("!!document.querySelector('.char-hero')", 5000);
  const detailTitle = await js("document.querySelector('.view-title')?.textContent.trim()");
  check('صفحة الشخصية تفتح باسمها', detailTitle === 'Von', detailTitle);
  await capture('12-character-detail.png');

  // edit an inactive character: should save for that character only
  await setChecked('[data-char-cheat="no-dead"]', true);
  await wait(300);
  await confirmModal();
  const charSaved = await waitFor(
    "S.state.characters.characters.find(c => c.id === 'slot-1')?.cheats?.['no-dead'] === true",
    12000
  );
  check('تعديل الشخصية ينحفظ لها لحالها', charSaved);
  const globalStillOff = await js("S.state.trainer.cheats.find(c => c.id === 'no-dead')?.enabled === false");
  check('شخصية غير مفعّلة ما تطبق تعديلها على اللعبة', globalStillOff);

  await click('[data-act="toggleCharacter"][data-id="slot-1"]');
  await wait(300);
  await confirmModal();
  const vonActive = await waitFor("S.state.characters.characters.find(c => c.id === 'slot-1')?.active === true", 12000);
  check('تفعيل الشخصية يشتغل', vonActive);
  const vonCheatApplied = await waitFor(
    "S.state.trainer.cheats.find(c => c.id === 'no-dead')?.enabled === true",
    12000
  );
  check('تفعيل الشخصية يطبق تعديلاتها المختارة', vonCheatApplied);
  await capture('13-character-active.png');
  await click('[data-act="backCharacters"]');
  await waitFor("!!document.querySelector('.char-grid')", 5000);

  // =========================================================
  //  SAVES
  // =========================================================
  await click('[data-act="openSaves"]');
  await waitFor("document.querySelector('.view-title')?.textContent.trim() === 'مدير الحفظ'", 8000);
  check('مدير الحفظ يفتح من الشخصيات', true);
  check('مدير الحفظ يستخدم ملف الحفظ المحدد', (await js('S.state.saves.active?.path')) === savePath);
  await capture('14-saves-empty.png');

  // The watchdog can add an automatic backup when the game closes, so every
  // count here is relative instead of assuming an empty list.
  const savesStart = await js('S.state.saves.backups.length');

  await click('[data-act="backupSave"]');
  const backup1 = await waitFor(`S.state.saves.backups.length === ${savesStart + 1}`, 12000);
  check('نسخ الحفظ الحالي يضيف نسخة احتياطية', backup1);
  const originalIds = await js('S.state.saves.backups.map(b => b.id)');
  const originalBackupId = originalIds[originalIds.length - 1]; // oldest = taken above, from the original save
  await wait(1200);
  await capture('15-saves-backup.png');

  const countBeforeCopy = await js('S.state.saves.backups.length');
  await click('[data-act="copySave"]');
  const backup2 = await waitFor(`S.state.saves.backups.length === ${countBeforeCopy + 1}`, 12000);
  check('نسخ النسخة الاحتياطية يشتغل', backup2);

  const countBeforeDelete = await js('S.state.saves.backups.length');
  await click('[data-act="deleteSave"]');
  await wait(300);
  await confirmModal();
  const backupDeleted = await waitFor(`S.state.saves.backups.length === ${countBeforeDelete - 1}`, 12000);
  check('حذف النسخة الاحتياطية يشتغل', backupDeleted);

  // modify the save, then restore the known-good copy and compare bytes
  fs.writeFileSync(savePath, Buffer.concat([originalSave, Buffer.from([1, 2, 3, 4])]));
  await wait(1100);
  const countBeforeRestore = await js('S.state.saves.backups.length');
  const restoreSelector = `[data-act="restoreSave"][data-id="${originalBackupId}"]`;
  const restoreButtonExists = await js(`!!document.querySelector(${JSON.stringify(restoreSelector)})`);
  await click(restoreSelector);
  await wait(300);
  await confirmModal();
  const restored = await waitFor(`S.state.saves.backups.length === ${countBeforeRestore + 1}`, 20000);
  check('استرجاع النسخة ينشئ نسخة أمان قبل الاستبدال', restored && restoreButtonExists);
  const restoredBytes = fs.readFileSync(savePath);
  check('الاسترجاع يعيد محتوى الحفظ الأصلي', restoredBytes.equals(originalSave), `${restoredBytes.length} == ${originalSave.length}`);
  await capture('16-saves-restored.png');
  await click('[data-act="backCharacters"]');
  await wait(400);

  // =========================================================
  //  WORKSHOP (two-step: download into library → activate)
  // =========================================================
  await click('[data-nav="mods"]');
  await waitFor("document.querySelectorAll('.ws-card').length >= 40", 20000);
  const wsTotal = await js('S.workshop.data?.counts?.total || 0');
  check('الورشة تعرض كتالوج 301 مود', wsTotal === 301, String(wsTotal));
  const me2Item = await js("S.workshop.data?.items?.find(i => i.id === 'mod-engine-2') || null");
  check(
    'Mod Engine 2 في الورشة بمصدر رسمي مباشر وحالة مثبت',
    !!me2Item && me2Item.direct === true && me2Item.tool === true && me2Item.state === 'active',
    me2Item && { direct: me2Item.direct, tool: me2Item.tool, state: me2Item.state }
  );
  const coverLoaded = await waitFor("document.querySelector('.ws-card .ws-cover img')?.naturalWidth > 0", 12000);
  check('صور المودات الأصلية تتحمل', coverLoaded);
  await capture('17-workshop-discover.png');

  await fill('#wsSearch', 'seamless');
  const wsFiltered = await waitFor(
    "[...document.querySelectorAll('.ws-card')].filter(c => c.style.display !== 'none').length >= 1 && [...document.querySelectorAll('.ws-card')].filter(c => c.style.display !== 'none').length < 40",
    8000
  );
  check(
    'البحث في الورشة يصفّي النتائج',
    wsFiltered,
    await js("[...document.querySelectorAll('.ws-card')].filter(c => c.style.display !== 'none').length")
  );
  await fill('#wsSearch', '');
  await wait(400);

  // Nexus-only mods get the same Download button as everything else. Pressing
  // it opens the launcher's own Nexus window; the player's single click on
  // Nexus' free button is captured and the launcher finishes the setup.
  const manualItem = await js("S.workshop.data?.items?.find(i => i.id === '3419') || null");
  check(
    'مود Nexus فقط معلّم كنافذة داخلية بدون رابط محفوظ',
    manualItem?.manual === true && manualItem?.freeLink === '',
    manualItem?.manual
  );
  const manualCard = await js(
    "!!document.querySelector('[data-act=\"wsDownload\"][data-ws=\"3419\"]') && !!document.querySelector('[data-act=\"wsImportFor\"][data-ws=\"3419\"]') && !document.querySelector('[data-act=\"wsLink\"][data-ws=\"3419\"]')"
  );
  check('كارت مود Nexus يعرض Download + Import مثل باقي المودات', manualCard);
  const wsText = await js("document.querySelector('.ws-view')?.textContent || ''");
  check('لا توجد أي كلمة Premium أو اشتراك في الورشة', !/premium|subscription/i.test(wsText));

  let nexusPageError = '';
  try {
    await actions.dispatch('workshop.setLink', {
      id: '3419',
      url: 'https://www.nexusmods.com/eldenring/mods/3419',
    });
  } catch (err) {
    nexusPageError = err.message;
  }
  check(
    'رابط صفحة Nexus مرفوض — يطلب رابط مجاني أو ملف',
    /Nexus mod page/.test(nexusPageError),
    nexusPageError
  );

  // One press of Download in the UI: the in-app Nexus window session hands the
  // archive over (the fake session stands in for the player's single free click).
  await click('[data-act="wsDownload"][data-ws="3419"]');
  const nexusBanner = await waitFor("!!document.querySelector('[data-act=\"wsNexusCancel\"]')", 6000);
  check('أثناء الانتظار يظهر شريط يشرح ضغطة نيكسس الواحدة', nexusBanner);
  const uiDownloaded = await waitFor(
    "(() => { const e = S.workshop.data?.items?.find(i => i.id === '3419'); return !!(e && e.ready && e.state !== 'available' && (!e.job || e.job.done)); })()",
    120000,
    500
  );
  const downloaded = await js("S.workshop.data?.items?.find(i => i.id === '3419') || null");
  check(
    'Download من الواجهة ينزّل عبر نافذة نيكسس ويجهّز المود تلقائياً',
    uiDownloaded && downloaded?.ready === true && !downloaded?.setupError && nexusCalls.includes('3419'),
    downloaded?.setupError || ''
  );

  // Optional power-user path: a saved free mirror bypasses the window entirely.
  await actions.dispatch('workshop.setLink', {
    id: '48',
    url: `http://127.0.0.1:${mockPort}/download/cool-nexus.zip`,
  });
  const mirrorResult = await actions.dispatch('workshop.download', { id: '48' });
  const downloadsJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'downloads.json'), 'utf8'));
  check(
    'الرابط المجاني الاختياري ينحفظ ويستخدم كمصدر مباشر بدون نافذة',
    mirrorResult?.ready === true &&
      downloadsJson.links['48'] === `http://127.0.0.1:${mockPort}/download/cool-nexus.zip` &&
      !nexusCalls.includes('48'),
    mirrorResult?.setupError || ''
  );
  check(
    'الأرشيف محفوظ داخل اللانشر قبل التفعيل — ما يلمس مجلد اللعبة',
    !!downloadsJson.items['3419']?.file &&
      !fs.existsSync(path.join(gameDir, 'mod', 'The-Convergence'))
  );
  check(
    'ما انفتح أي متصفح/موقع أثناء التحميل',
    !externalOpens.some((u) => /nexusmods\.com/i.test(u)),
    externalOpens
  );

  await js('loadWorkshop(true).then(() => { S.workshop.tab = "mymods"; render(); })');
  const activateReady = await waitFor("!!document.querySelector('[data-act=\"wsActivate\"][data-ws=\"3419\"]')", 10000);
  check('المود يظهر في MY MODS مع زر Activate', activateReady);
  await capture('18-workshop-mymods.png');

  await click('[data-act="wsActivate"][data-ws="3419"]');
  const activated = await waitFor(
    "S.workshop.data?.items?.find(i => i.id === '3419')?.state === 'active'",
    60000,
    500
  );
  check('Activate يفعّل المود داخل الورشة', activated);
  const toml = fs.readFileSync(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
  const syncedDirs = fs.readdirSync(path.join(gameDir, 'mod'));
  check(
    'التفعيل ينسخ المود ويحدث TOML',
    toml.includes('The Convergence') && syncedDirs.some((d) => /convergence/i.test(d)),
    syncedDirs
  );
  await capture('19-workshop-active.png');

  // ---------- modded launch routing (the core mods fix) ----------
  // With an active mod, PLAY must go through Mod Engine 2 — launching the game
  // exe directly ignores config_eldenring.toml and the mod folder entirely.
  fs.rmSync(launchMarker, { force: true });
  const moddedNormal = await actions.dispatch('game.launch', { mode: 'normal' });
  const moddedToml = fs.readFileSync(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
  check(
    'PLAY مع مود مفعّل يمر عبر Mod Engine 2',
    moddedNormal.via === 'modengine2' &&
      /modengine2_launcher\.exe$/i.test(moddedNormal.exe || '') &&
      moddedNormal.modCount >= 1 &&
      (moddedNormal.args || []).includes('-t') &&
      (moddedNormal.args || []).includes('er'),
    { via: moddedNormal.via, exe: moddedNormal.exe, args: moddedNormal.args }
  );
  check(
    'TOML الوضع العادي فيه المود وبدون Seamless DLL',
    moddedToml.includes('Erdtree Launcher') &&
      moddedToml.includes('The Convergence') &&
      !moddedToml.includes('SeamlessCoop\\\\ersc.dll'),
    moddedToml.slice(0, 160)
  );
  check('التشغيل عبر Mod Engine 2 ما يشغّل nrcs', !fs.existsSync(launchMarker));
  const moddedSeamless = await actions.dispatch('game.launch', { mode: 'seamless' });
  const seamlessToml = fs.readFileSync(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
  check(
    'PLAY Seamless مع مودات يجمع Mod Engine 2 + ersc.dll',
    moddedSeamless.via === 'modengine2+seamless' && seamlessToml.includes('SeamlessCoop\\\\ersc.dll'),
    { via: moddedSeamless.via, toml: seamlessToml.slice(0, 220) }
  );
  await actions.dispatch('settings.update', { launchMode: 'normal' });

  await click('[data-act="wsDeactivate"][data-ws="3419"]');
  const deactivated = await waitFor(
    "S.workshop.data?.items?.find(i => i.id === '3419')?.state === 'downloaded'",
    30000,
    500
  );
  const stillStored = fs.existsSync(path.join(tmpDir, 'downloads', '3419'));
  check('Deactivate يبقي الملف منزّل داخل اللانشر', deactivated && stillStored);

  // Manual ZIP install path still works, with the incompatibility reason kept.
  await click('[data-act="wsTab"][data-tab="discover"]');
  const modsStart = await js('S.state.mods.length');
  dialogQueue.push(legacyZip);
  await click('[data-act="wsImportFile"]');
  const legacyInstalled = await waitFor(`S.state.mods.length === ${modsStart + 1}`, 25000);
  check('تركيب مود ZIP يدوي يشتغل', legacyInstalled);
  const legacyMod = await js("S.state.mods.find(m => m.name === 'Legacy Pack') || null");
  check(
    'المود غير المتوافق يظهر مع سبب واضح',
    !!legacyMod && legacyMod.compatible === false,
    legacyMod && legacyMod.compatibilityReason
  );
  await capture('20-workshop-legacy.png');

  // =========================================================
  //  MY SAVES — الأوّل في الواجهة
  // =========================================================
  await click('[data-nav="mysaves"]');
  const mySavesReady = await waitFor(
    "document.querySelector('.ms-title')?.textContent.trim() === 'MY SAVES'",
    12000
  );
  check('قسم MY SAVES يفتح من الشريط الجانبي', mySavesReady);
  const myCards = await js(
    "[...document.querySelectorAll('.ms-char')].map(c => ({ name: c.querySelector('.ms-char-name')?.textContent.trim(), stats: [...c.querySelectorAll('.ms-stats b')].map(b => b.textContent.trim()) }))"
  );
  check(
    'MY SAVES يعرض كل الشخصيات بالاسم والمستوى ووقت اللعب',
    myCards.length === 3 &&
      myCards[0].name === 'Von' &&
      myCards[0].stats[0] === '87' &&
      /42h/.test(myCards[0].stats[1]),
    JSON.stringify(myCards)
  );
  await capture('20b-my-saves.png');

  // Use This Save → active character used by PLAY / cheats.
  await click('[data-act="useSave"][data-id="slot-2"]');
  const useOk = await waitFor(
    "S.state.characters?.characters?.find(c => c.id === 'slot-2')?.active === true",
    12000
  );
  check('Use This Save يحدد الشخصية النشطة', useOk);

  // Rename only changes the launcher label.
  await click('[data-act="renameCharacter"][data-id="slot-1"]');
  const promptReady = await waitFor("!!document.getElementById('promptInput')", 6000);
  await fill('#promptInput', 'My Bleed Build');
  await js("document.querySelector('[data-modal-action=\"1\"]')?.click()");
  const renamed = await waitFor(
    "S.state.characters?.characters?.find(c => c.id === 'slot-1')?.label === 'My Bleed Build'",
    12000
  );
  check('Rename يحفظ اسم العرض داخل اللانشر', promptReady && renamed);

  // Delete asks first, then hides only — the save stays intact.
  const sizeBeforeHide = fs.statSync(savePath).size;
  await click('[data-act="hideCharacter"][data-id="slot-3"]');
  const confirmShown = await waitFor("!!document.querySelector('[data-modal-action=\"1\"]')", 6000);
  const confirmTitle = await js("document.querySelector('.modal-title')?.textContent.trim() || ''");
  check('Delete يسأل Are you sure؟ قبل أي تغيير', confirmShown && /Are you sure/i.test(confirmTitle), confirmTitle);
  await confirmModal();
  const hidden = await waitFor(
    "S.state.characters?.characters?.find(c => c.id === 'slot-3')?.hidden === true",
    12000
  );
  check(
    'Delete يخفي الشخصية من القائمة بدون لمس ملف الحفظ',
    hidden && fs.statSync(savePath).size === sizeBeforeHide
  );
  await click('[data-act="restoreCharacter"][data-id="slot-3"]');
  const shownAgain = await waitFor(
    "S.state.characters?.characters?.find(c => c.id === 'slot-3')?.hidden === false",
    12000
  );
  check('الشخصية ترجع للقائمة من قسم Hidden', shownAgain);

  // A brand-new in-game character shows up on the next read.
  const grown = Buffer.concat([fs.readFileSync(savePath), Buffer.alloc(0)]);
  grown.write('Nova', 0x1901d0e + 588 * 3, 32, 'utf16le');
  grown.writeUInt16LE(12, 0x1901d0e + 588 * 3 + 0x22);
  fs.writeFileSync(savePath, grown);
  const freshList = await actions.dispatch('characters.list', {});
  check(
    'شخصية جديدة داخل اللعبة تظهر تلقائياً في MY SAVES',
    (freshList.characters || []).some((c) => c.name === 'Nova' && c.slot === 4),
    (freshList.characters || []).map((c) => c.name)
  );

  // Auto backup once the game closes: first run makes one, second run skips.
  const auto1 = await actions.dispatch('saves.autoBackup', {});
  const auto2 = await actions.dispatch('saves.autoBackup', {});
  check(
    'نسخ احتياطي تلقائي عند إغلاق اللعبة (بدون تكرار)',
    auto1 && auto1.meta && auto1.meta.auto === true && auto2 && auto2.skipped === true,
    { first: auto1 && auto1.meta && auto1.meta.name, second: auto2 && auto2.reason }
  );

  // Create New Save Slot → a labelled launcher-side snapshot.
  await click('[data-act="createSaveSlot"]');
  await waitFor("!!document.getElementById('promptInput')", 6000);
  await fill('#promptInput', 'Before Radahn');
  await js("document.querySelector('[data-modal-action=\"1\"]')?.click()");
  const slotMade = await waitFor(
    "S.state.saves.backups.some(b => b.slot === true && /Before Radahn/.test(b.name))",
    20000
  );
  check('Create New Save Slot ينشئ نسخة كاملة قابلة للاسترجاع', slotMade);
  await capture('20c-my-saves-backups.png');

  // =========================================================
  //  UNLOCK ALL
  // =========================================================
  await click('[data-nav="unlocks"]');
  const unlocksReady = await waitFor("document.querySelector('.ul-title')?.textContent.trim() === 'UNLOCK ALL'", 12000);
  check('قسم UNLOCK ALL يفتح', unlocksReady);
  const unlockBoxes = await js(
    "[...document.querySelectorAll('[data-unlock-toggle]')].map(i => i.dataset.unlockToggle)"
  );
  check(
    'كل صناديق الاختيار المطلوبة موجودة',
    ['weapons', 'armor', 'talismans', 'spells', 'ashes', 'spirits', 'materials', 'maxRunes', 'maxLevel'].every((id) =>
      unlockBoxes.includes(id)
    ),
    unlockBoxes
  );
  check(
    'تحذير اللعب الفردي/الأصدقاء ظاهر',
    /single player or with friends/i.test(await js("document.querySelector('.ul-warning')?.textContent || ''"))
  );

  // Tick the item categories through the real checkbox listener.
  for (const id of ['weapons', 'armor', 'spells']) {
    await js(`(() => {
      const el = document.querySelector('[data-unlock-toggle="${id}"]');
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
  }
  const selectedCount = await waitFor(
    "S.state.unlocks?.categories?.filter(c => c.enabled).length >= 3",
    8000
  );
  check('اختيار الفئات ينحفظ ويتحدث العدّاد', selectedCount);

  // UNLOCK ALL uses the Glorious Merchant mod. It is Nexus-only, so APPLY goes
  // through the same in-app Nexus window path as any other Download press.
  await click('[data-act="unlockApply"]');
  const unlockApplied = await waitFor(
    "S.state.unlocks?.applied?.items === true && S.unlocks?.busy === ''",
    120000,
    500
  );
  const merchantMod = await js(
    "S.workshop.data?.items?.find(i => i.id === '5192')?.state || ''"
  );
  check(
    'APPLY ينزّل ويشغّل مود التاجر عبر نافذة نيكسس الداخلية',
    unlockApplied && merchantMod === 'active' && nexusCalls.includes('5192'),
    merchantMod
  );
  const unlockJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'unlocks.json'), 'utf8'));
  check(
    'حالة Unlock تنحفظ على القرص',
    unlockJson.selected.weapons === true && unlockJson.merchantActivated === true
  );
  await capture('20d-unlock-all.png');

  await click('[data-act="unlockRemove"]');
  const unlockRemoved = await waitFor(
    "S.state.unlocks?.applied?.items === false && S.unlocks?.busy === ''",
    120000,
    500
  );
  const merchantOff = await js(
    "S.workshop.data?.items?.find(i => i.id === '5192')?.state || ''"
  );
  check('REMOVE يوقف مود التاجر ويرجع الوضع الطبيعي', unlockRemoved && merchantOff !== 'active', merchantOff);

  // =========================================================
  //  SETTINGS / DLSS
  // =========================================================
  await click('[data-nav="settings"]');
  await waitFor("!!document.querySelector('.dlss-grid')", 10000);

  // ---------- Seamless Co-op — اللعب الجماعي ----------
  const seamlessCard = await js(
    "[...document.querySelectorAll('.card-title')].some(t => t.textContent.includes('اللعب الجماعي'))"
  );
  check('قسم Seamless Co-op — اللعب الجماعي موجود في الاعدادات', seamlessCard);
  const seamlessFields = await js(
    "['seamlessPassword','seamlessPlayerName','seamlessMaxPlayers'].every(id => !!document.getElementById(id))"
  );
  check('خيارات كلمة السر واسم اللاعب وأقصى عدد لاعبين موجودة', seamlessFields);
  const seamlessDescriptions = await js(
    "[...document.querySelectorAll('.seamless-field .setting-sub')].map(e => e.textContent.trim())"
  );
  check(
    'كل خيار Seamless مشروح بجملة عربية واحدة',
    seamlessDescriptions.length === 3 && seamlessDescriptions.every((t) => /[\u0600-\u06FF]/.test(t) && t.length > 10),
    seamlessDescriptions
  );

  await fill('#seamlessPassword', 'erdtree-friends');
  await fill('#seamlessPlayerName', 'TarnishedOne');
  await fill('#seamlessMaxPlayers', '6');
  const seamlessSettingsSaved = await waitFor(
    "S.state.settings.seamlessPassword === 'erdtree-friends' && S.state.settings.seamlessPlayerName === 'TarnishedOne' && S.state.settings.seamlessMaxPlayers === 6",
    15000
  );
  check('إعدادات Seamless (كلمة السر والاسم والعدد) تنحفظ تلقائياً', seamlessSettingsSaved);
  const miniReal = path.join(gameDir, 'SeamlessCoop', 'ersc_settings.ini');
  const iniRealText = fs.readFileSync(miniReal, 'utf8');
  check('كلمة السر تنكتب في [PASSWORD] cooppassword', /cooppassword\s*=\s*erdtree-friends/i.test(iniRealText), iniRealText.slice(0, 120));
  check('ملف Seamless يستخدم حفظ co2', /save_file_extension\s*=\s*co2/i.test(iniRealText));
  const iniAliasText = fs.readFileSync(path.join(gameDir, 'seamlesscoop.ini'), 'utf8');
  check('نسخة seamlesscoop.ini متزامنة مع الحقيقية', iniAliasText.includes('erdtree-friends'));
  const steamText = fs.readFileSync(path.join(gameDir, 'steam_emu.ini'), 'latin1');
  check('Player Name ينكتب في steam_emu.ini (UserName)', /UserName=TarnishedOne/.test(steamText), steamText.trim().slice(0, 80));

  await click('[data-act="testSeamless"]');
  const seamlessReportReady = await waitFor('S.seamless.test && S.seamless.test.ready === true', 15000);
  check('Test Seamless يؤكد أن كل الملفات جاهزة', seamlessReportReady, await js('S.seamless.test && S.seamless.test.failed'));
  const reportOkClass = await js("!!document.querySelector('.seamless-report.ok')");
  const reportRows = await js("document.querySelectorAll('.seamless-report .report-row').length");
  check(
    'تقرير Test Seamless يعرض كل الفحوصات بنجاح',
    reportOkClass && reportRows >= 10 && (await js('(S.seamless.test.warnings || []).join(",")')) === '',
    { reportRows, warnings: await js('(S.seamless.test.warnings || []).join(",")') }
  );
  await js("document.querySelector('.seamless-report')?.scrollIntoView({block:'center'})");
  await wait(500);
  await capture('22a-settings-seamless.png');

  const dlssNames = await js("[...document.querySelectorAll('.dlss-option b')].map(e => e.textContent.trim())");
  check(
    'خيارات DLSS الخمسة بالاسم المطلوب',
    JSON.stringify(dlssNames) === JSON.stringify(['إيقاف', 'جودة', 'متوازن', 'أداء', 'أداء فائق']),
    dlssNames
  );
  const dlssBanner = await js("document.querySelector('.dlss-grid')?.closest('.card')?.textContent || ''");
  check('رسالة كرت غير مدعوم حرفياً', dlssBanner.includes('كرتك ما يدعم DLSS'), dlssBanner.trim().slice(0, 80));
  const disabledModes = await js(
    "[...document.querySelectorAll('[data-dlss]')].filter(e => e.dataset.dlss !== 'off').every(e => e.disabled)"
  );
  check('خيارات DLSS مقفلة على كرت غير مدعوم', disabledModes);
  check(
    'توليد الفريمات مقفل على كرت غير مدعوم',
    await js("!!document.querySelector('[data-setting=\"frameGeneration\"]')?.disabled")
  );
  const perfDesc = await js(
    "[...document.querySelectorAll('.dlss-option')].find(o => o.textContent.includes('أداء') && !o.textContent.includes('فائق'))?.textContent || ''"
  );
  check('وصف الأداء يوضح فريمات أعلى وجودة أقل', perfDesc.includes('فريمات أعلى وجودة أقل'), perfDesc.trim());
  await capture('22-settings-dlss.png');

  let dlssError = '';
  try {
    await actions.dispatch('settings.update', { dlssMode: 'performance' });
  } catch (err) {
    dlssError = err.message;
  }
  check('اختيار DLSS غير المدعوم مرفوض بنفس الرسالة', dlssError === 'كرتك ما يدعم DLSS', dlssError);
  let frameGenError = '';
  try {
    await actions.dispatch('settings.update', { frameGeneration: true });
  } catch (err) {
    frameGenError = err.message;
  }
  check('توليد الفريمات غير المدعوم مرفوض برسالة واضحة', frameGenError === 'كرتك ما يدعم توليد الفريمات', frameGenError);

  // ---------- Controller Support — PS4 / PS5 ----------
  const controllerTitle = await js(
    "[...document.querySelectorAll('.card-title')].some(t => t.textContent.includes('Controller Support'))"
  );
  check('قسم دعم يد PS4/PS5 موجود في الاعدادات', controllerTitle);
  const controllerLtr = await js(
    "!!document.querySelector('#controllerCard') && !!document.querySelector('#controllerCard').closest('[dir=\"ltr\"]')"
  );
  check('قسم اليد معروض بالإنجليزية LTR', controllerLtr);
  const padShown = await js("document.querySelector('#controllerCard')?.textContent || ''");
  check('يد DualSense مكتشفة ومعروضة مع USB', padShown.includes('DualSense (PS5)') && padShown.includes('USB'), padShown.slice(0, 80));
  check('اليد معترف بها من ويندوز', padShown.includes('Recognized by Windows'));
  check('حالة القسم: إعداد اختياري', padShown.includes('Optional setup'));
  check('شريحة ViGEmBus مثبّت تظهر', padShown.includes('ViGEmBus installed'));
  check('زر DS4Windows الرسمي موجود', await js("!!document.querySelector('[data-act=\"openDs4Windows\"]')"));
  check('الإرشاد يوضح أن اللانشر ما يثبّت درايفرات تلقائياً', padShown.includes('never installs drivers'));
  check('ما يضيف درايفر مكرر مع ViGEm موجود', padShown.includes('duplicate driver'));
  const detectResult = await actions.dispatch('controller.detect', {});
  check(
    'controller.detect يرجّع needs-setup ويد واحدة',
    detectResult.controller.status === 'needs-setup' && detectResult.controller.count === 1 && detectResult.controller.needsSoftware === true,
    detectResult.controller.status
  );
  await js("document.querySelector('#controllerCard')?.scrollIntoView({block:'center'})");
  await wait(300);
  await capture('22b-settings-controller.png');

  // Refresh flow: inject DS4Windows running -> the card must flip to Ready.
  process.env.ERDTREE_CONTROLLER_JSON = JSON.stringify({
    sony: [{ name: 'Wireless Controller', id: 'USB\\VID_054C&PID_0CE6\\6&2a1b3c4d&0&2', status: 'OK', class: 'HIDClass' }],
    vigem: true,
    ds4windows: true,
    steam: false,
  });
  await click('[data-act="refreshController"]');
  const controllerReady = await waitFor("S.state.controller && S.state.controller.status === 'ready'", 10000);
  check('زر Refresh يعيد الفحص ويحدّث الحالة إلى جاهز', controllerReady);
  const readyText = await js("document.querySelector('#controllerCard')?.textContent || ''");
  check('الحالة الجاهزة تذكر DS4Windows يشتغل', readyText.includes('DS4Windows running') && readyText.includes('Ready'), readyText.slice(0, 80));

  // No-controller scenario, then restore a stable one for the remaining sections.
  process.env.ERDTREE_CONTROLLER_JSON = JSON.stringify({ sony: [], vigem: false, ds4windows: false, steam: false });
  await click('[data-act="refreshController"]');
  const controllerNone = await waitFor("S.state.controller && S.state.controller.status === 'no-controller'", 10000);
  check('حالة ما فيه يد تظهر بشكل صحيح', controllerNone);
  process.env.ERDTREE_CONTROLLER_JSON = JSON.stringify({ sony: [], vigem: true, ds4windows: false, steam: true });
  await actions.dispatch('controller.detect', {});

  // save path via UI
  dialogQueue.push(savePath);
  await click('[data-act="pickSaveFile"]');
  const savePicked = await waitFor(`S.state.settings.saveFile === ${JSON.stringify(savePath)}`, 12000);
  check('اختيار ملف الحفظ من الاعدادات يشتغل', savePicked);

  // warning toggle + auto save
  await setChecked('[data-setting="warnOnline"]', false);
  const warnOff = await waitFor('S.state.settings.warnOnline === false', 8000);
  check('إعدادات تنحفظ تلقائياً بدون زر حفظ', warnOff);
  await setChecked('[data-setting="warnOnline"]', true);
  await waitFor('S.state.settings.warnOnline === true', 8000);

  // ---------- language switch (Arabic / English) ----------
  await click('[data-act="setLanguage"][data-lang="en"]');
  const englishOn = await waitFor(
    "document.documentElement.lang === 'en' && document.documentElement.dir === 'ltr'",
    12000
  );
  check('التبديل إلى الإنجليزية يقلب الواجهة إلى LTR', englishOn);
  const navEn = await js(
    "[...document.querySelectorAll('[data-nav]')].map(b => b.querySelector('span:not(.nav-icon):not(.nav-badge)').textContent.trim())"
  );
  check(
    'أسماء الأقسام تترجم للإنجليزية',
    JSON.stringify(navEn) ===
      JSON.stringify(['Home', 'Friends', 'Builds', 'Workshop', 'MY SAVES', 'UNLOCK ALL', 'Settings']),
    navEn
  );
  const settingsTitleEn = await js("document.querySelector('.view-title')?.textContent.trim()");
  check('عنوان الإعدادات يترجم إلى Settings', settingsTitleEn === 'Settings', settingsTitleEn);
  const languageJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
  check('اختيار اللغة ينحفظ', languageJson.language === 'en', languageJson.language);
  await capture('23-settings-english.png');

  await click('[data-act="setLanguage"][data-lang="ar"]');
  const arabicBack = await waitFor(
    "document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl'",
    12000
  );
  check('الرجوع إلى العربية يشتغل', arabicBack);
  const navAr = await js(
    "[...document.querySelectorAll('[data-nav]')].map(b => b.querySelector('span:not(.nav-icon):not(.nav-badge)').textContent.trim())"
  );
  check(
    'أسماء الأقسام ترجع عربية',
    JSON.stringify(navAr) ===
      JSON.stringify(['الرئيسية', 'Friends', 'Builds', 'Workshop', 'MY SAVES', 'UNLOCK ALL', 'الاعدادات']),
    navAr
  );
  const settingsTitleAr = await js("document.querySelector('.view-title')?.textContent.trim()");
  check('عنوان الإعدادات يرجع عربي', settingsTitleAr === 'الاعدادات', settingsTitleAr);

  // settings persistence across a fresh load
  const reloaded = new Settings();
  reloaded.load();
  check(
    'المسارات والإعدادات تبقى بعد إعادة التشغيل',
    reloaded.data.gameExe === nrcsPath &&
      reloaded.data.saveFile === savePath &&
      reloaded.data.dlssMode === 'off' &&
      reloaded.data.warnOnline === true &&
      reloaded.data.language === 'ar' &&
      reloaded.data.launchMode === 'normal' &&
      reloaded.data.seamlessPassword === 'erdtree-friends' &&
      reloaded.data.seamlessPlayerName === 'TarnishedOne' &&
      reloaded.data.seamlessMaxPlayers === 6,
    {
      gameExe: reloaded.data.gameExe === nrcsPath,
      saveFile: reloaded.data.saveFile === savePath,
      dlss: reloaded.data.dlssMode,
      key: !!reloaded.data.nexusApiKey,
      language: reloaded.data.language,
      launchMode: reloaded.data.launchMode,
      seamless: `${reloaded.data.seamlessPassword}/${reloaded.data.seamlessPlayerName}/${reloaded.data.seamlessMaxPlayers}`,
    }
  );

  // ---------- Friends section ----------
  await click('[data-nav="friends"]');
  const friendsReady = await waitFor(
    "document.querySelector('.view-title')?.textContent.trim() === 'Friends' && !!document.querySelector('[data-act=\"toggleAddFriend\"]')",
    12000
  );
  check('قسم Friends يفتح ويعرض زر Add Friend', friendsReady);
  const friendCode = await js("document.querySelector('.code-chip')?.textContent.trim() || ''");
  check('كود الصداقة ظاهر بصيغة ER-XXXX-XXXX', /ER-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(friendCode), friendCode);
  const friendsLtr = await js("document.querySelector('.social-view')?.getAttribute('dir') === 'ltr'");
  check('قسم الأصدقاء إنجليزي LTR', friendsLtr);
  await click('[data-act="toggleAddFriend"]');
  const addFriendBox = await waitFor("!!document.getElementById('addFriendInput')", 6000);
  check('صندوق إضافة صديق يفتح', addFriendBox);
  await capture('24-friends.png');

  // ---------- Best Builds + one-click Take This Build ----------
  await click('[data-nav="builds"]');
  const buildsReady = await waitFor("document.querySelectorAll('.build-card').length >= 34", 12000);
  check('قائمة Best Builds فيها ٣٤ بيلد', buildsReady);
  const cards = await js(
    "[...document.querySelectorAll('.build-card')].map(c => ({ name: c.querySelector('h3')?.textContent.trim(), power: c.querySelector('.build-power b')?.textContent.trim(), rating: c.querySelector('.build-rating b')?.textContent.trim(), img: c.querySelector('img')?.getAttribute('src') || '' }))"
  );
  check(
    'كل بيلد فيه صورة واسم وقوة /10 وتقييم /5',
    cards.length === 34 &&
      cards.every((c) => c.name && c.power && c.rating && c.img.includes('assets/builds/')),
    JSON.stringify(cards.slice(0, 4).map((c) => `${c.name}:${c.power}:${c.rating}`))
  );
  await click('.build-card');
  await waitFor("!!document.querySelector('.build-detail')", 8000);
  const detailActions = await js(
    "!!document.querySelector('[data-act=\"takeBuild\"]') && !!document.querySelector('[data-act=\"howToGet\"]')"
  );
  check('صفحة التفاصيل فيها How to Get It و Take This Build', detailActions);
  await capture('25-build-detail.png');

  await click('[data-act="takeBuild"]');
  const pickerReady = await waitFor("document.querySelectorAll('[data-take-char]').length >= 1", 8000);
  const pickerCount = await js("document.querySelectorAll('[data-take-char]').length");
  check('زر Take This Build يسأل على أي شخصية', pickerReady, `${pickerCount} characters`);
  await js(
    "([...document.querySelectorAll('[data-modal-action]')].find(b => b.textContent.trim() === 'Confirm') || { click() {} }).click()"
  );
  const tookBuild = await waitFor(
    "document.querySelector('.modal-title')?.textContent.trim() === 'Build Added Successfully'",
    15000
  );
  check('التأكيد يركّب البيلد فوراً ويطلع Build Added Successfully', tookBuild);
  await capture('26-build-added.png');
  await js(
    "([...document.querySelectorAll('[data-modal-action]')].find(b => b.textContent.trim() === 'Back to Characters') || { click() {} }).click()"
  );
  await waitFor("!!document.querySelector('.view-title')", 8000);
  const backToCharacters = await js("['Characters','الشخصيات'].includes(document.querySelector('.view-title')?.textContent.trim())");
  check('بعد النجاح يرجع لقائمة الشخصيات', backToCharacters);

  const charsJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'characters.json'), 'utf8'));
  const buildProfile = Object.values(charsJson.profiles || {}).find((p) => p && p.build);
  check(
    'البيلد كامل (سلاح/درع/تعويذات/ستات) محفوظ على الشخصية المختارة',
    !!buildProfile &&
      Array.isArray(buildProfile.build.weapon) &&
      buildProfile.build.weapon.length > 0 &&
      Array.isArray(buildProfile.build.talismans) &&
      buildProfile.build.talismans.length > 0 &&
      !!buildProfile.build.stats
  );
  const buildsJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'builds.json'), 'utf8'));
  check('عملية التركيب مسجلة في builds.json', Object.keys(buildsJson.applied || {}).length === 1);

  // ---------- Updates section + "New Update Available" ----------
  await click('[data-nav="settings"]');
  const updatesReady = await waitFor("!!document.getElementById('updatesCard')", 8000);
  const updatesText = await js("document.getElementById('updatesCard')?.textContent || ''");
  const pkgVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
  check(
    'قسم Updates فيه Version و Check for Updates',
    updatesReady && updatesText.includes(`Version ${pkgVersion}`) && updatesText.includes('Check for Updates'),
    updatesText.trim().slice(0, 120)
  );
  await js(
    `(() => { const i = document.getElementById('updateRepoInput'); i.value = 'test/erdtree'; return i.value; })()`
  );
  await click('[data-act="saveUpdateRepo"]');
  const updatePrompt = await waitFor(
    "document.querySelector('.modal-title')?.textContent.includes('New Update Available')",
    15000
  );
  const updateNotes = await js("[...document.querySelectorAll('.update-note')].map(n => n.textContent.trim()).join(' | ')");
  check(
    'نافذة التحديث تعرض الإصدار الجديد وقائمة التغييرات',
    updatePrompt && updateNotes.includes('Friends & invites'),
    updateNotes
  );
  const updateMeta = await js("document.querySelector('.update-meta')?.textContent || ''");
  check(
    'نافذة التحديث تذكر GitHub Releases والتحقق من SHA-256',
    updateMeta.includes('GitHub Releases') && updateMeta.includes('SHA-256'),
    updateMeta.trim().slice(0, 140)
  );
  await capture('27-update-available.png');
  const repoSaved = await js("document.getElementById('updateRepoInput')?.value || ''");
  check('مستودع GitHub محفوظ في بطاقة التحديثات', repoSaved === 'test/erdtree', repoSaved);
  // Update Now: download the mock release package and verify its SHA-256.
  // (Install itself is refused in dev builds — the e2e runs unpackaged.)
  await js(
    "([...document.querySelectorAll('[data-modal-action]')].find(b => b.textContent.trim() === 'Update Now') || { click() {} }).click()"
  );
  const updateVerified = await waitFor("S.updates?.status === 'ready' && S.updates?.downloaded?.verified === true", 20000);
  check(
    'التحديث ينزل من GitHub ويتحقق من SHA-256 قبل التثبيت',
    updateVerified,
    JSON.stringify(await js("S.updates?.downloaded || null"))
  );

  const versionText = await js("document.getElementById('versionText')?.textContent || ''");
  check(`إصدار التطبيق موحّد ${pkgVersion}`, versionText.trim() === `Version ${pkgVersion}`, versionText);

  // ---------- final home ----------
  await click('[data-nav="home"]');
  await waitFor("!!document.querySelector('.home-view')", 8000);
  await wait(500);
  await capture('99-final-home.png');

  // ---------- report ----------
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  log('---------------------------------------------');
  log(`RESULT ${failed ? 'FAILED' : 'PASSED'} — ${passed}/${results.length} checks`);
  if (failed) {
    for (const r of results.filter((x) => !x.passed)) log(`FAILED CHECK: ${r.name} :: ${r.detail}`);
  }
  log('screenshots:', shotsDir);
  process.exitCode = failed ? 1 : 0;
  return failed;
}

app.whenReady()
  .then(main)
  .catch((err) => {
    log('ERROR', err && err.stack ? err.stack : String(err));
    check('تشغيل الاختبار بدون استثناء', false, err && err.message ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (win && !win.isDestroyed()) {
        await capture('99-failure-state.png', { clearToasts: false });
      }
    } catch {
      /* ignore */
    }
    try {
      if (actions) actions.shutdown();
    } catch {
      /* ignore */
    }
    try {
      if (holder) holder.kill();
    } catch {
      /* ignore */
    }
    try {
      if (mockServer) mockServer.close();
    } catch {
      /* ignore */
    }
    await wait(500);
    try {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* temp may be locked */
    }
    app.exit(process.exitCode || 0);
  });
