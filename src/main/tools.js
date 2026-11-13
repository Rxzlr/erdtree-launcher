const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const SEAMLESS = {
  launcher: 'ersc_launcher.exe',
  launcherAlias: 'launch_elden_ring_seamlesscoop.exe',
  dllAlias: 'seamlesscoop.dll',
  iniAlias: 'seamlesscoop.ini',
  coopDir: 'SeamlessCoop',
  dll: path.join('SeamlessCoop', 'ersc.dll'),
  ini: path.join('SeamlessCoop', 'ersc_settings.ini'),
};

function run(cmd, args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || stdout || err.message).toString().trim()));
      resolve({ stdout, stderr });
    });
  });
}

async function extractZip(file, dest) {
  await fsp.mkdir(dest, { recursive: true });
  try {
    await run('tar.exe', ['-xf', file, '-C', dest]);
  } catch {
    const psDest = dest.replace(/'/g, "''");
    const psFile = file.replace(/'/g, "''");
    await run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Expand-Archive -LiteralPath '${psFile}' -DestinationPath '${psDest}' -Force`,
    ]);
  }
}

async function flattenRoot(dir) {
  let current = dir;
  for (let depth = 0; depth < 3; depth += 1) {
    const entries = await fsp.readdir(current, { withFileTypes: true }).catch(() => []);
    const dirs = entries.filter((e) => e.isDirectory() && !/^__MACOSX$/i.test(e.name));
    const files = entries.filter((e) => e.isFile() && !/^\./i.test(e.name));
    if (dirs.length === 1 && files.length === 0) {
      current = path.join(current, dirs[0].name);
      continue;
    }
    break;
  }
  return current;
}

async function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fsp.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  return out;
}

async function backupFiles(gameDir, relativePaths, stamp) {
  const backupRoot = path.join(gameDir, `_erdtree_backup_${stamp}`);
  const saved = [];
  for (const rel of relativePaths) {
    const src = path.join(gameDir, rel);
    try {
      if (!fs.existsSync(src)) continue;
      const dest = path.join(backupRoot, rel);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.cp(src, dest, { recursive: true, force: true });
      saved.push(rel);
    } catch {
      /* a locked file must not block the install */
    }
  }
  return { backupRoot: saved.length ? backupRoot : '', saved };
}

function iniSet(text, key, value) {
  // Horizontal whitespace only ([ \t], never \s): \s would swallow the newline
  // after an empty value (e.g. "cooppassword = ") and eat the next [SECTION]
  // header, writing the value outside its section. Keep the match line-bound.
  const re = new RegExp(`^([ \\t]*${key}[ \\t]*=[ \\t]*).*$`, 'm');
  if (re.test(text)) return text.replace(re, `$1${value}`);
  return `${text.trimEnd()}\r\n${key} = ${value}\r\n`;
}

async function configureSeamlessIni(gameDir, { password = '', playerName = '' } = {}) {
  const ini = path.join(gameDir, SEAMLESS.ini);
  if (!fs.existsSync(ini)) return { ok: false, reason: 'ini missing' };
  let text = await fsp.readFile(ini, 'utf8').catch(() => '');
  text = iniSet(text, 'cooppassword', String(password || ''));
  text = iniSet(text, 'skip_splash_screens', '1');
  text = iniSet(text, 'save_file_extension', 'co2');
  text = iniSet(text, 'mod_language_override', '');
  await fsp.writeFile(ini, text, 'utf8');

  const alias = path.join(gameDir, SEAMLESS.iniAlias);
  try {
    const a = await fsp.readFile(alias, 'utf8').catch(() => null);
    if (a !== null) await fsp.writeFile(alias, text, 'utf8');
  } catch {
    /* alias may be a hardlink; ignore */
  }

  if (playerName) {
    const steam = path.join(gameDir, 'steam_emu.ini');
    try {
      const buf = await fsp.readFile(steam, 'latin1');
      const next = /^UserName=.*$/m.test(buf)
        ? buf.replace(/^UserName=.*$/m, `UserName=${String(playerName).slice(0, 32)}`)
        : `${buf.trimEnd()}\r\nUserName=${String(playerName).slice(0, 32)}\r\n`;
      await fsp.writeFile(steam, next, 'latin1');
    } catch {
      /* no steam_emu.ini — nothing to write */
    }
  }
  return { ok: true, file: ini };
}

async function installSeamlessFromZip(gameDir, zipPath, opts = {}) {
  if (!gameDir || !fs.existsSync(path.join(gameDir, 'eldenring.exe'))) {
    throw new Error('مسار اللعبة غير صحيح — ما لقينا eldenring.exe.');
  }
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'erdtree-ersc-'));
  try {
    await extractZip(zipPath, temp);
    const root = await flattenRoot(temp);
    const files = await walk(root);
    const hasLauncher = files.some((f) => path.basename(f).toLowerCase() === SEAMLESS.launcher);
    const dll = files.find((f) => /seamlesscoop[\\/]ersc\.dll$/i.test(f) || /[\\/]ersc\.dll$/i.test(f));
    if (!hasLauncher || !dll) {
      throw new Error('ملف Seamless غير متوقع — تأكد أنك تحمّل النسخة الرسمية (ersc release).');
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backup = await backupFiles(
      gameDir,
      [
        SEAMLESS.launcher,
        SEAMLESS.launcherAlias,
        SEAMLESS.dllAlias,
        SEAMLESS.iniAlias,
        SEAMLESS.coopDir,
        'steam_emu.ini',
      ],
      stamp
    );

    await fsp.mkdir(path.join(gameDir, SEAMLESS.coopDir), { recursive: true });
    for (const entry of await fsp.readdir(root, { withFileTypes: true })) {
      if (/^__MACOSX$/i.test(entry.name)) continue;
      await fsp.cp(path.join(root, entry.name), path.join(gameDir, entry.name), {
        recursive: true,
        force: true,
      });
    }

    // Compatibility aliases used by the launcher UI / older shortcuts.
    const launcherReal = path.join(gameDir, SEAMLESS.launcher);
    await fsp.copyFile(launcherReal, path.join(gameDir, SEAMLESS.launcherAlias));
    await fsp.copyFile(path.join(gameDir, SEAMLESS.dll), path.join(gameDir, SEAMLESS.dllAlias));
    await fsp.copyFile(path.join(gameDir, SEAMLESS.ini), path.join(gameDir, SEAMLESS.iniAlias));

    await configureSeamlessIni(gameDir, opts);
    return {
      ok: true,
      gameDir,
      backup: backup.backupRoot,
      password: String(opts.password || ''),
    };
  } finally {
    await fsp.rm(temp, { recursive: true, force: true }).catch(() => {});
  }
}

async function installZipToGame(gameDir, zipPath, opts = {}) {
  if (!gameDir || !fs.existsSync(path.join(gameDir, 'eldenring.exe'))) {
    throw new Error('مسار اللعبة غير صحيح — ما لقينا eldenring.exe.');
  }
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'erdtree-tool-'));
  try {
    await extractZip(zipPath, temp);
    const root = await flattenRoot(temp);
    const files = await walk(root);
    if (!files.length) throw new Error('الملف فاضي أو مو ZIP صالح.');

    const relatives = files.map((f) => path.relative(root, f));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backup = await backupFiles(gameDir, relatives, stamp);
    for (const rel of relatives) {
      const dest = path.join(gameDir, rel);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.copyFile(path.join(root, rel), dest);
    }
    return { ok: true, gameDir, files: relatives.length, backup: backup.backupRoot, name: opts.name || '' };
  } finally {
    await fsp.rm(temp, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  SEAMLESS,
  extractZip,
  installSeamlessFromZip,
  installZipToGame,
  configureSeamlessIni,
};
