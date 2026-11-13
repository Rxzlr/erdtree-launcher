const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

const APP_ID = '1245620';
const PROCESS_NAME = 'eldenring.exe';
const CONFIG_NAME = 'config_eldenring.toml';
const SEAMLESS_NAMES = ['launch_elden_ring_seamlesscoop.exe', 'ersc_launcher.exe'];

function regQuery(key, value) {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', key, '/v', value], { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const m = stdout.match(/REG_SZ\s+(.+?)\s*$/m);
      resolve(m ? m[1].trim() : null);
    });
  });
}

async function findSteamPath() {
  const candidates = [
    await regQuery('HKCU\\Software\\Valve\\Steam', 'SteamPath'),
    await regQuery('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'),
    await regQuery('HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath'),
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\SteamLibrary',
  ].filter(Boolean);
  for (const c of candidates) {
    const p = c.replace(/\//g, '\\');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// كثير من نسخ اللعبة (ري باك) ما تكون مسجّلة عند ستيم، فنلقاها من عملية
// اللعبة الشغالة نفسها أو من مجلدات الألعاب المعتادة.
function runningGameDir() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "(Get-Process eldenring -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path)",
      ],
      { windowsHide: true, timeout: 8000 },
      (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const p = String(stdout).trim();
        resolve(p ? path.dirname(p) : null);
      }
    );
  });
}

function commonGameDirs() {
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const roots = [
    'C:\\Games',
    'D:\\Games',
    'E:\\Games',
    'F:\\Games',
    'C:\\Game',
    'D:\\Game',
    'C:\\',
    'D:\\',
    'E:\\',
    pf,
    pf86,
  ];
  const out = [];
  for (const root of roots) {
    out.push(path.join(root, 'ELDEN RING'));
    out.push(path.join(root, 'Elden Ring'));
    out.push(path.join(root, 'ELDEN RING', 'Game'));
  }
  return [...new Set(out.map((p) => p.replace(/\\+$/, '')))];
}

function steamLibraries(steamPath) {
  const libs = new Set();
  if (!steamPath) return [];
  const add = (p) => {
    if (!p) return;
    const clean = path.normalize(p.replace(/\//g, '\\'));
    if (fs.existsSync(clean)) libs.add(clean);
  };
  add(steamPath);
  add(path.join(steamPath, 'steamapps'));

  const vdf = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
  try {
    const text = fs.readFileSync(vdf, 'utf8');
    const re = /"path"\s+"([^"]+)"/g;
    let m;
    while ((m = re.exec(text))) add(path.join(m[1], 'steamapps'));
  } catch {
    /* vdf missing */
  }
  return [...libs];
}

function fileExists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveGameDir(input) {
  if (!input) return null;
  const p = path.normalize(String(input).replace(/"/g, '').trim());
  const tries = [p, path.join(p, 'Game'), path.join(p, 'ELDEN RING', 'Game')];
  for (const t of tries) {
    try {
      if (fs.statSync(path.join(t, 'eldenring.exe')).isFile()) return t;
      if (fs.statSync(path.join(t, 'nrcs.exe')).isFile()) return t;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

async function detectGame() {
  const uninstall = await regQuery(
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 1245620',
    'InstallLocation'
  );
  const fromRegistry = resolveGameDir(uninstall);
  if (fromRegistry) return { path: fromRegistry, via: 'registry' };

  const steamPath = await findSteamPath();
  for (const lib of steamLibraries(steamPath)) {
    const dir = resolveGameDir(path.join(lib, 'common', 'ELDEN RING'));
    if (dir) return { path: dir, via: 'steam-library' };
  }

  const running = await runningGameDir();
  if (running && resolveGameDir(running)) {
    return { path: resolveGameDir(running), via: 'running-process' };
  }

  for (const candidate of commonGameDirs()) {
    const dir = resolveGameDir(candidate);
    if (dir) return { path: dir, via: 'common-folder' };
  }
  return { path: null, via: null, steamPath };
}

const MOD_LAUNCHERS = ['modengine2_launcher.exe', 'launchmod_eldenring.bat', 'mod_loader.exe'];

function findModLauncher(dir) {
  for (const name of MOD_LAUNCHERS) {
    const full = path.join(dir, name);
    if (fileExists(full)) return full;
  }
  return null;
}

function inspectGame(gamePath, gameExe) {
  const hasSelected = !!gameExe;
  const selectedExists = hasSelected && fileExists(gameExe);
  const exeDir = selectedExists ? path.dirname(gameExe) : null;
  const dir = exeDir || resolveGameDir(gamePath);
  if (!dir) {
    return {
      found: false,
      path: gamePath || '',
      exe: gameExe || null,
      exeExists: false,
      modDir: null,
    };
  }
  const modDir = path.join(dir, 'mod');
  const modLauncher = findModLauncher(dir);
  const exe = hasSelected ? gameExe : path.join(dir, 'eldenring.exe');
  const seamlessExe = ['launch_elden_ring_seamlesscoop.exe', 'ersc_launcher.exe']
    .map((n) => path.join(dir, n))
    .find(fileExists) || '';
  const normalExe = ['nrcs.exe', 'eldenring.exe'].map((n) => path.join(dir, n)).find(fileExists) || '';
  return {
    found: true,
    path: dir,
    exe,
    exeExists: hasSelected ? selectedExists : fileExists(exe),
    normalExe,
    seamlessExe,
    protectedLauncher: path.join(dir, 'start_protected_game.exe'),
    hasProtectedLauncher: fileExists(path.join(dir, 'start_protected_game.exe')),
    hasSeamless: !!seamlessExe && fileExists(path.join(dir, 'SeamlessCoop', 'ersc.dll')),
    hasModEngine2: !!modLauncher || fileExists(path.join(dir, 'mod_loader.dll')),
    hasEldenModLoader: fileExists(path.join(dir, 'dinput8.dll')) && fileExists(path.join(dir, 'mod_loader_config.ini')),
    modLauncher,
    hasModLauncher: !!modLauncher,
    modDir,
    hasModDir: fs.existsSync(modDir),
    configFile: path.join(dir, 'config_eldenring.toml'),
    hasConfig: fileExists(path.join(dir, 'config_eldenring.toml')),
  };
}

/**
 * Pick the executable used by "Play Normal".
 * A user-selected file wins (including nrcs), except a Seamless launcher.
 */
function resolveNormalExe(info, gameExe) {
  const selected = String(gameExe || '').trim();
  if (selected) {
    if (!fileExists(selected)) throw new Error(MISSING_EXE);
    if (!SEAMLESS_NAMES.includes(path.basename(selected).toLowerCase())) return selected;
  }
  if (info && info.normalExe) return info.normalExe;
  if (info && info.path) {
    for (const name of ['nrcs.exe', 'eldenring.exe']) {
      const candidate = path.join(info.path, name);
      if (fileExists(candidate)) return candidate;
    }
  }
  throw new Error(MISSING_EXE);
}

function isRunning(processName = PROCESS_NAME) {
  const name = String(processName || PROCESS_NAME).replace(/[^a-zA-Z0-9._-]/g, '') || PROCESS_NAME;
  return new Promise((resolve) => {
    execFile(
      'tasklist.exe',
      ['/FI', `IMAGENAME eq ${name}`, '/FO', 'CSV', '/NH'],
      { windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) return resolve({ running: false, pid: null });
        const escaped = name.replace(/\./g, '\\.');
        const m = stdout.match(new RegExp(`"${escaped}","(\\d+)"`, 'i'));
        resolve(m ? { running: true, pid: Number(m[1]) } : { running: false, pid: null });
      }
    );
  });
}

const MISSING_EXE = 'ملف اللعبة مو موجود، اختر المسار الصحيح من الاعدادات';

async function launch({ gameExe }) {
  const exe = String(gameExe || '').trim();
  if (!exe) {
    throw new Error('ما اخترت ملف تشغيل اللعبة. روح للإعدادات واختر ملف nrcs أول.');
  }
  if (!fileExists(exe)) {
    throw new Error(MISSING_EXE);
  }
  const ext = path.extname(exe).toLowerCase();
  const cwd = path.dirname(exe);
  if (ext === '.bat' || ext === '.cmd') {
    spawn('cmd.exe', ['/c', exe], { cwd, detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else {
    spawn(exe, [], { cwd, detached: true, stdio: 'ignore' }).unref();
  }
  return { ok: true, via: 'file', exe, dir: cwd };
}

/**
 * Launch through Mod Engine 2 so activated mods actually load.
 * This is the exact command the Mod Engine 2 project documents (and the one
 * proven on this machine): modengine2_launcher.exe -t er -c <config> -p <game exe>.
 * Without it, eldenring.exe ignores config_eldenring.toml and the mod folder.
 */
async function launchModEngine({ gameDir, launcher, targetExe, configName = CONFIG_NAME }) {
  if (!fileExists(launcher)) {
    const err = new Error('Mod Engine 2 مو موجود في مجلد اللعبة. ثبّته من الورشة — تحميل مباشر.');
    err.code = 'MODS_NEED_ME2';
    throw err;
  }
  if (!fileExists(targetExe)) throw new Error(MISSING_EXE);
  const config = path.join(gameDir, configName);
  const args = ['-t', 'er', '-c', config, '-p', targetExe];
  try {
    spawn(launcher, args, { cwd: gameDir, detached: true, stdio: 'ignore' }).unref();
  } catch (err) {
    throw new Error(`ما قدرنا نشغّل Mod Engine 2: ${err.message}`);
  }
  return { ok: true, via: 'modengine2', exe: launcher, args, dir: gameDir, target: targetExe };
}

module.exports = {
  APP_ID,
  PROCESS_NAME,
  MISSING_EXE,
  detectGame,
  inspectGame,
  resolveGameDir,
  resolveNormalExe,
  isRunning,
  launch,
  launchModEngine,
  fileExists,
  SEAMLESS_NAMES,
};
