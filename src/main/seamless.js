const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const FILES = {
  launcher: 'launch_elden_ring_seamlesscoop.exe',
  launcherReal: 'ersc_launcher.exe',
  dll: 'seamlesscoop.dll',
  dllReal: path.join('SeamlessCoop', 'ersc.dll'),
  ini: 'seamlesscoop.ini',
  iniReal: path.join('SeamlessCoop', 'ersc_settings.ini'),
  crashpad: path.join('SeamlessCoop', 'crashpad', 'crashpad_handler.exe'),
  locale: path.join('SeamlessCoop', 'locale', 'english.json'),
  steamEmu: 'steam_emu.ini',
};

const REQUIRED_IDS = [
  'gameDir',
  'eldenring',
  'launcherAlias',
  'launcherReal',
  'dllAlias',
  'dllReal',
  'iniAlias',
  'iniReal',
  'passwordSection',
  'crashpad',
];

function exists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function size(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function readIni(file) {
  const out = {};
  let section = '';
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) continue;
      const sec = line.match(/^\[([^\]]+)\]$/);
      if (sec) {
        section = sec[1].trim().toUpperCase();
        continue;
      }
      const kv = line.match(/^([^=]+)=(.*)$/);
      if (kv) out[`${section}.${kv[1].trim()}`] = kv[2].trim();
    }
  } catch {
    /* missing */
  }
  return out;
}

function writeIniValue(file, section, key, value) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    text = '';
  }
  const lines = text.split(/\r?\n/);
  let inSection = false;
  let sectionAt = -1;
  let done = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) {
      inSection = sec[1].trim().toUpperCase() === section.toUpperCase();
      if (inSection) sectionAt = i;
      continue;
    }
    if (inSection) {
      const kv = line.match(/^([^=;#]+)=/);
      if (kv && kv[1].trim() === key) {
        lines[i] = `${key} = ${value}`;
        done = true;
        break;
      }
    }
  }
  if (!done) {
    if (sectionAt >= 0) lines.splice(sectionAt + 1, 0, `${key} = ${value}`);
    else lines.push(`[${section}]`, `${key} = ${value}`);
  }
  fs.writeFileSync(file, lines.join('\r\n').replace(/\r\n+$/, '\r\n'), 'utf8');
}

function readSteamName(gameDir) {
  const ini = readIni(path.join(gameDir, FILES.steamEmu));
  const name = ini['SETTINGS.UserName'];
  return name && name !== 'Player' ? name : name || '';
}

function writeSteamName(gameDir, playerName) {
  const name = String(playerName || '').trim();
  if (!name) return { ok: false, reason: 'empty' };
  const file = path.join(gameDir, FILES.steamEmu);
  if (!exists(file)) return { ok: false, reason: 'missing' };
  const before = readSteamName(gameDir);
  if (before === name) return { ok: true, unchanged: true };
  const backup = `${file}.erdtree-backup`;
  if (!exists(backup)) {
    try {
      fs.copyFileSync(file, backup);
    } catch {
      /* keep going */
    }
  }
  try {
    let text = fs.readFileSync(file, 'latin1');
    if (/^UserName=.*$/m.test(text)) {
      text = text.replace(/^UserName=.*$/m, `UserName=${name}`);
    } else {
      text += `\r\nUserName=${name}\r\n`;
    }
    fs.writeFileSync(file, text, 'latin1');
    return { ok: true, before };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function readConfig(gameDir) {
  const real = path.join(gameDir, FILES.iniReal);
  const alias = path.join(gameDir, FILES.ini);
  const file = exists(real) ? real : alias;
  const ini = readIni(file);
  return {
    file: exists(file) ? file : null,
    password: ini['PASSWORD.cooppassword'] ?? '',
    saveExtension: ini['SAVE.save_file_extension'] || '',
    skipSplash: ini['GAMEPLAY.skip_splash_screens'] || '',
    invaders: ini['GAMEPLAY.allow_invaders'] || '',
    summons: ini['GAMEPLAY.allow_summons'] || '',
    languageOverride: ini['LANGUAGE.mod_language_override'] || '',
  };
}

function detectVersion(gameDir) {
  try {
    const buf = fs.readFileSync(path.join(gameDir, FILES.dllReal));
    const text = buf.toString('latin1');
    const m = text.match(/\b2\.0\.\d+\b/);
    if (m) return m[0];
  } catch {
    /* ignore */
  }
  return '';
}

function resolveGameDir(gameInfo) {
  if (gameInfo && gameInfo.found && gameInfo.path) return gameInfo.path;
  if (gameInfo && gameInfo.path) return gameInfo.path;
  return '';
}

function status(gameInfo, prefs = {}) {
  const gameDir = resolveGameDir(gameInfo);
  const launcher = path.join(gameDir, FILES.launcher);
  const launcherReal = path.join(gameDir, FILES.launcherReal);
  const dll = path.join(gameDir, FILES.dll);
  const dllReal = path.join(gameDir, FILES.dllReal);
  const ini = path.join(gameDir, FILES.ini);
  const iniReal = path.join(gameDir, FILES.iniReal);
  const crashpad = path.join(gameDir, FILES.crashpad);
  const locale = path.join(gameDir, FILES.locale);
  const steamEmu = path.join(gameDir, FILES.steamEmu);
  const config = gameDir ? readConfig(gameDir) : { password: '', saveExtension: '' };
  const missing = [];
  if (!gameDir) missing.push('gameDir');
  else {
    if (!exists(path.join(gameDir, 'eldenring.exe'))) missing.push('eldenring');
    if (!exists(launcher)) missing.push('launcherAlias');
    if (!exists(launcherReal)) missing.push('launcherReal');
    if (!exists(dll)) missing.push('dllAlias');
    if (!exists(dllReal)) missing.push('dllReal');
    if (!exists(ini)) missing.push('iniAlias');
    if (!exists(iniReal)) missing.push('iniReal');
    if (!exists(crashpad)) missing.push('crashpad');
  }
  return {
    installed: missing.length === 0,
    ready: missing.length === 0,
    version: gameDir ? detectVersion(gameDir) : '',
    gameDir,
    files: {
      launcher: exists(launcher) ? launcher : '',
      launcherReal: exists(launcherReal) ? launcherReal : '',
      dll: exists(dll) ? dll : '',
      dllReal: exists(dllReal) ? dllReal : '',
      ini: exists(ini) ? ini : '',
      iniReal: exists(iniReal) ? iniReal : '',
      crashpad: exists(crashpad) ? crashpad : '',
      locale: exists(locale) ? locale : '',
      steamEmu: exists(steamEmu) ? steamEmu : '',
    },
    sizes: {
      launcher: size(launcher),
      dll: size(dll),
      ini: size(ini),
    },
    config,
    playerName: gameDir ? readSteamName(gameDir) : '',
    password: config.password || prefs.seamlessPassword || '',
    maxPlayers: Number(prefs.seamlessMaxPlayers) || 4,
    missing,
  };
}

function check(id, label, ok, required = true, detail = '') {
  return { id, label, ok: !!ok, required, detail };
}

function test(gameInfo, prefs = {}) {
  const st = status(gameInfo, prefs);
  const dir = st.gameDir;
  const checks = [];
  const pass = (id, label, ok, required = true, detail = '') => checks.push(check(id, label, ok, required, detail));

  pass('gameDir', 'game folder', !!dir && exists(path.join(dir, 'eldenring.exe')), true, dir || '');
  pass('eldenring', 'eldenring.exe', !!dir && exists(path.join(dir, 'eldenring.exe')), true);
  pass(
    'launcherAlias',
    'launch_elden_ring_seamlesscoop.exe',
    !!st.files.launcher && st.sizes.launcher > 10000,
    true,
    st.sizes.launcher ? `${st.sizes.launcher} bytes` : ''
  );
  pass(
    'launcherReal',
    'ersc_launcher.exe',
    !!st.files.launcherReal && size(st.files.launcherReal) > 10000,
    true
  );
  pass('dllAlias', 'seamlesscoop.dll', !!st.files.dll && st.sizes.dll > 1000000, true, st.sizes.dll ? `${st.sizes.dll} bytes` : '');
  pass('dllReal', 'SeamlessCoop\\ersc.dll', !!st.files.dllReal && size(st.files.dllReal) > 1000000, true);
  pass('iniAlias', 'seamlesscoop.ini', !!st.files.ini, true);
  pass('iniReal', 'SeamlessCoop\\ersc_settings.ini', !!st.files.iniReal, true);
  pass(
    'sameContent',
    'aliases match the real files',
    !!st.files.dll && !!st.files.dllReal && size(st.files.dll) === size(st.files.dllReal),
    true,
    ''
  );
  pass('passwordSection', '[PASSWORD] cooppassword', !!st.config.file && Object.prototype.hasOwnProperty.call(readIni(st.config.file), 'PASSWORD.cooppassword'), true);
  pass(
    'saveExtension',
    'save_file_extension',
    st.config.saveExtension === 'co2',
    false,
    st.config.saveExtension || 'missing'
  );
  pass('crashpad', 'crashpad_handler.exe', !!st.files.crashpad, true);
  pass('locale', 'locale\\english.json', !!st.files.locale, false);
  pass('playerName', 'player name (steam_emu.ini)', !!st.files.steamEmu && !!st.playerName, false, st.playerName || 'not set');
  pass(
    'password',
    'session password',
    !!st.config.password,
    false,
    st.config.password ? 'set' : 'empty — anyone who shares the blank password can join'
  );

  const requiredFailed = checks.filter((c) => c.required && !c.ok);
  const warnings = checks.filter((c) => !c.required && !c.ok);
  return {
    ready: requiredFailed.length === 0,
    checks,
    warnings: warnings.map((c) => c.id),
    failed: requiredFailed.map((c) => c.id),
    status: st,
    testedAt: new Date().toISOString(),
  };
}

function configure(gameInfo, prefs = {}) {
  const st = status(gameInfo, prefs);
  if (!st.gameDir || !exists(st.files.iniReal)) {
    throw new Error('ما لقينا ملف إعدادات Seamless. ركّب Seamless أول.');
  }
  const password = String(prefs.seamlessPassword ?? st.config.password ?? '').trim();
  writeIniValue(st.files.iniReal, 'PASSWORD', 'cooppassword', password);
  writeIniValue(st.files.iniReal, 'SAVE', 'save_file_extension', 'co2');
  writeIniValue(st.files.iniReal, 'GAMEPLAY', 'skip_splash_screens', '1');
  // Keep the compatibility alias in sync if it is a separate copy rather than a hardlink.
  try {
    if (exists(st.files.ini) && fs.realpathSync(st.files.ini) !== fs.realpathSync(st.files.iniReal)) {
      fs.copyFileSync(st.files.iniReal, st.files.ini);
    }
  } catch {
    try {
      if (exists(st.files.ini)) fs.copyFileSync(st.files.iniReal, st.files.ini);
    } catch {
      /* ignore */
    }
  }
  let nameResult = { ok: false, reason: 'no name' };
  if (prefs.seamlessPlayerName) nameResult = writeSteamName(st.gameDir, prefs.seamlessPlayerName);
  return {
    ...status(gameInfo, prefs),
    playerNameResult: nameResult,
    configuredAt: new Date().toISOString(),
  };
}

function spawnDetached(exe, cwd) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(exe, [], { cwd, detached: true, stdio: 'ignore', windowsHide: false });
    } catch (err) {
      reject(err);
      return;
    }
    const timer = setTimeout(() => {
      child.removeAllListeners('error');
      if (child.pid) {
        child.unref();
        resolve({ pid: child.pid });
      } else {
        reject(new Error('ما قدرنا نشغّل الملف.'));
      }
    }, 1200);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function launch(gameInfo, prefs = {}) {
  const report = test(gameInfo, prefs);
  const st = report.status;
  if (!report.ready) {
    const err = new Error('Seamless مو جاهز — فيه ملفات ناقصة. افتح «فحص Seamless» في الإعدادات.');
    err.code = 'SEAMLESS_NOT_READY';
    err.report = report;
    throw err;
  }
  configure(gameInfo, prefs);
  const exe = st.files.launcher || st.files.launcherReal;
  const dir = st.gameDir;
  const result = await spawnDetached(exe, dir);
  return { ok: true, via: 'seamless', exe, dir, pid: result.pid, version: st.version };
}

module.exports = {
  FILES,
  REQUIRED_IDS,
  status,
  test,
  configure,
  launch,
  readConfig,
  readSteamName,
};
