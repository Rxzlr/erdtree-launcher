// LIVE verification of the mods fix on the REAL game install.
// Run with: npx electron scripts/test-live-mods.js
//
// What this proves (the part e2e cannot): the real Elden Ring process starts
// through Mod Engine 2 and ME2's own log confirms the mod DLL was injected.
//   1) normal mode  -> modengine_<date>.log shows "Loaded external DLL ...UnlockTheFps.dll"
//   2) seamless mode-> same log shows "Loaded external DLL ...SeamlessCoop\ersc.dll"
//
// Safety: backs up every save file first, never loads a character (kills the
// game at the title screen), never touches settings.json, and only kills
// eldenring.exe — nothing else.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { ModManager } = require('../src/main/mods');
const gameLib = require('../src/main/game');
const seamlessLib = require('../src/main/seamless');

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name} :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, timeout = 30000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout }, (err, stdout, stderr) => {
      resolve({ err, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

async function gameRunning() {
  const { stdout } = await run('tasklist.exe', ['/FI', 'IMAGENAME eq eldenring.exe', '/NH']);
  return /eldenring\.exe/i.test(stdout);
}

async function killGame() {
  await run('taskkill.exe', ['/F', '/IM', 'eldenring.exe']);
  for (let i = 0; i < 20; i += 1) {
    if (!(await gameRunning())) return true;
    await wait(500);
  }
  return !(await gameRunning());
}

function todayLog(gameDir) {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return path.join(gameDir, 'modengine2', 'logs', `modengine_${stamp}.log`);
}

async function waitForInjection(logFile, offset, needle, timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const text = await fsp.readFile(logFile, 'utf8');
      const fresh = text.slice(offset);
      const line = fresh.split(/\r?\n/).find((l) => l.includes('Loaded external DLL') && l.toLowerCase().includes(needle.toLowerCase()));
      if (line) return line.trim();
    } catch {
      /* log not created yet */
    }
    await wait(1500);
  }
  return '';
}

(async () => {
  // ---- locate the real profile (settings + mod library) ----
  const userDataRoot = path.join(process.env.APPDATA, 'Erdtree Launcher');
  const accounts = JSON.parse(await fsp.readFile(path.join(userDataRoot, 'accounts.json'), 'utf8'));
  const accountId = process.argv[2] || accounts.accounts[0].id;
  const profileDir = path.join(userDataRoot, 'profiles', accountId);
  const settings = JSON.parse(await fsp.readFile(path.join(profileDir, 'settings.json'), 'utf8'));
  const gameDir = settings.gamePath;
  console.log(`profile: ${accountId}`);
  console.log(`gameDir: ${gameDir}`);

  // ---- 0) back up every save before touching the game ----
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupRoot = path.join(os.tmpdir(), `erdtree-live-save-backup-${stamp}`);
  const saveRoot = path.join(process.env.APPDATA, 'EldenRing');
  let backedUp = 0;
  for (const dir of await fsp.readdir(saveRoot)) {
    const full = path.join(saveRoot, dir);
    if (!(await fsp.stat(full)).isDirectory()) continue;
    for (const file of await fsp.readdir(full)) {
      if (!/\.(sl2|co2)$/i.test(file)) continue;
      const dest = path.join(backupRoot, dir, file);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.copyFile(path.join(full, file), dest);
      backedUp++;
    }
  }
  check('كل ملفات الحفظ انسخت احتياطياً قبل التجربة', backedUp >= 1, { backedUp, backupRoot });
  console.log(`save backup: ${backupRoot}`);

  const info = gameLib.inspectGame(gameDir, settings.gameExe);
  check('اللعبة + Mod Engine 2 موجودين', info.found && info.hasModEngine2 && !!info.modLauncher, {
    found: info.found,
    hasModEngine2: info.hasModEngine2,
    modLauncher: info.modLauncher,
  });
  if (!info.found || !info.modLauncher) {
    console.log(`\nRESULT ${passed} passed, ${failed} failed`);
    process.exit(1);
  }

  const mods = new ModManager(profileDir);
  const list = await mods.list(info);
  const enabled = list.filter((m) => m.enabled && m.compatible !== false);
  console.log(`enabled mods: ${enabled.map((m) => m.name).join(', ') || '(none)'}`);
  check('فيه مود مفعّل واحد على الأقل (Unlock the framerate)', enabled.some((m) => /framerate/i.test(m.name)), enabled.map((m) => m.name));

  const logFile = todayLog(gameDir);
  const targetExe = path.join(gameDir, 'eldenring.exe');

  async function launchAndVerify(mode, needle) {
    // Same sequence as actions.js 'game.launch'.
    let offset = 0;
    try {
      offset = (await fsp.stat(logFile)).size;
    } catch {
      offset = 0;
    }
    if (mode === 'seamless') {
      seamlessLib.configure(info, settings);
      await mods.writeConfig(info, { seamlessDll: path.join(gameDir, 'SeamlessCoop', 'ersc.dll') });
    } else {
      await mods.writeConfig(info, {});
    }
    const toml = await fsp.readFile(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
    console.log(`--- ${mode} TOML external_dlls ---`);
    console.log((toml.match(/external_dlls = .*/) || [''])[0]);

    const result = await gameLib.launchModEngine({ gameDir, launcher: info.modLauncher, targetExe });
    check(`${mode}: أمر Mod Engine 2 انطلق`, result.ok && result.via === 'modengine2', result.args);

    const line = await waitForInjection(logFile, offset, needle);
    check(`${mode}: سجل ME2 يثبت حقن ${needle}`, !!line, line || `no injection line within 90s (log: ${logFile})`);
    if (line) console.log(`  evidence: ${line}`);

    await wait(4000);
    const running = await gameRunning();
    check(`${mode}: eldenring.exe شغال بعد الحقن`, running, null);
    const closed = await killGame();
    check(`${mode}: اللعبة انقفلت بعد جمع الدليل`, closed, null);
    await wait(2000);
  }

  // ---- 1) normal mode: the FPS unlocker DLL must be injected ----
  await launchAndVerify('normal', 'UnlockTheFps.dll');

  // ---- 2) seamless mode: ersc.dll must be injected alongside the mod ----
  await launchAndVerify('seamless', 'ersc.dll');

  // Leave the config matching the user's stored launch mode.
  if (settings.launchMode === 'seamless') {
    await mods.writeConfig(info, { seamlessDll: path.join(gameDir, 'SeamlessCoop', 'ersc.dll') });
  } else {
    await mods.writeConfig(info, {});
  }

  console.log(`\nRESULT ${passed} passed, ${failed} failed`);
  console.log(`save backup kept at: ${backupRoot}`);
  process.exit(failed ? 1 : 0);
})().catch(async (err) => {
  console.error('FATAL', err);
  await killGame().catch(() => {});
  process.exit(1);
});