// Focused verification of the Seamless Co-op installer improvements (task #44).
// Run with: npx electron scripts/test-seamless-install.js
//
// Proves, on a FAKE game dir (never the user's real install):
//   - sha256File helper is correct (known vector)
//   - activate('510') refuses to overwrite a healthy install (already:true)
//   - resolveDirect returns the official GitHub URL + a sha256 digest
//   - repairTool downloads the real official zip, integrity-checks it, and
//     force-installs it; the password/name are written and version detected
//   - after install, activate without force again returns already:true
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { ModManager } = require('../src/main/mods');
const { Workshop } = require('../src/main/workshop');
const seamless = require('../src/main/seamless');
const gameLib = require('../src/main/game');

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

function fakeSeamlessGame(gameDir) {
  fs.mkdirSync(path.join(gameDir, 'SeamlessCoop', 'crashpad'), { recursive: true });
  fs.mkdirSync(path.join(gameDir, 'SeamlessCoop', 'locale'), { recursive: true });
  fs.writeFileSync(path.join(gameDir, 'eldenring.exe'), '');
  for (const f of ['launch_elden_ring_seamlesscoop.exe', 'ersc_launcher.exe', 'seamlesscoop.dll']) {
    fs.writeFileSync(path.join(gameDir, f), Buffer.alloc(20000));
  }
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'ersc.dll'), Buffer.alloc(1200000, 1));
  const ini = '[GAMEPLAY]\r\nskip_splash_screens = 1\r\n[PASSWORD]\r\ncooppassword = \r\n[SAVE]\r\nsave_file_extension = co2\r\n';
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'ersc_settings.ini'), ini);
  fs.writeFileSync(path.join(gameDir, 'seamlesscoop.ini'), ini);
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'crashpad', 'crashpad_handler.exe'), 'x');
  fs.writeFileSync(path.join(gameDir, 'SeamlessCoop', 'locale', 'english.json'), '{}');
  fs.writeFileSync(path.join(gameDir, 'steam_emu.ini'), '[Settings]\r\nUserName=Player\r\n');
}

(async () => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'erdtree-seamless-'));
  const userData = path.join(tmp, 'userdata');
  await fsp.mkdir(userData, { recursive: true });
  const mods = new ModManager(userData);
  const settings = { data: { seamlessPassword: 'test-coop-pass', seamlessPlayerName: 'Tester' }, save: () => {} };
  const workshop = new Workshop({ mods, seamless, settings, userData });

  // 1) sha256File known vector ("abc" -> ba7816bf...).
  const vectorFile = path.join(tmp, 'vector.txt');
  await fsp.writeFile(vectorFile, 'abc');
  const { sha256File } = require('../src/main/updater');
  const digest = await sha256File(vectorFile);
  check(
    'sha256File يطابق المتجه المعروف',
    digest === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    digest
  );

  // 2) Healthy install is never overwritten by a plain activate.
  const gameDirA = path.join(tmp, 'GameA');
  fakeSeamlessGame(gameDirA);
  const gameA = gameLib.inspectGame(gameDirA, path.join(gameDirA, 'eldenring.exe'));
  check('اللعبة الوهمية فيها Seamless مثبّت', seamless.status(gameA, settings.data).installed, seamless.status(gameA, settings.data).missing);
  const actA = await workshop.activate('510', gameA);
  check('activate بدون force يرجع already:true وما يعيد التثبيت', actA.already === true && actA.result?.already === true, actA.already);

  // 3) resolveDirect returns the official URL + a sha256 digest.
  const entry = workshop.entry('510');
  check('مدخل Seamless مصدره الرسمي الصحيح', entry.direct?.repo === 'yuiamoroll/EldenRingSeamlessCoopRelease', entry.direct);
  const resolved = await workshop.resolveDirect(entry);
  check(
    'resolveDirect يرجع رابط GitHub الرسمي + بصمة sha256',
    /github\.com\/yuiamoroll\/EldenRingSeamlessCoopRelease/.test(resolved.url) && /^[a-f0-9]{64}$/.test(resolved.sha256 || ''),
    { url: resolved.url, sha256: resolved.sha256, version: resolved.version }
  );

  // 4) repairTool on a FRESH game: real official download (integrity-checked)
  //    + force-install. Never touches the user's real game.
  const gameDirB = path.join(tmp, 'GameB');
  await fsp.mkdir(gameDirB, { recursive: true });
  await fsp.writeFile(path.join(gameDirB, 'eldenring.exe'), '');
  // The official zip ships no steam_emu.ini (that file belongs to emulator
  // setups like the user's repack). Create one so the player-name write path —
  // which only touches an existing steam_emu.ini — is actually exercised.
  await fsp.writeFile(path.join(gameDirB, 'steam_emu.ini'), '[Settings]\r\nUserName=Player\r\n');
  const gameB = gameLib.inspectGame(gameDirB, path.join(gameDirB, 'eldenring.exe'));
  check('اللعبة الطازة بدون Seamless', !seamless.status(gameB, settings.data).installed, null);
  const repair = await workshop.repairTool('510', gameB);
  const stB = seamless.status(gameB, settings.data);
  check('repairTool نزّل وثبّت Seamless الرسمي', repair.repaired === true && stB.installed, { repaired: repair.repaired, missing: stB.missing });
  check('الإصدار انكشف من الملف الرسمي', /^2\.0\./.test(stB.version || ''), stB.version);
  check('كلمة السر انكتبت في الإعدادات', stB.config.password === 'test-coop-pass', stB.config.password);
  check('اسم اللاعب انكتب', stB.playerName === 'Tester', stB.playerName);
  // The downloaded archive's hash must equal the published digest (the download
  // path already enforces this; re-confirm against the stored file).
  const rec = workshop.record('510');
  const storedHash = rec && fs.existsSync(rec.path) ? await sha256File(rec.path) : '';
  check('الملف المخزّن يطابق بصمة GitHub المنشورة', storedHash === resolved.sha256, { storedHash, expected: resolved.sha256 });

  // 5) After a real install, plain activate again protects the install.
  const actB = await workshop.activate('510', gameB);
  check('بعد التثبيت، activate بدون force يرجع already:true', actB.already === true, actB.already);

  await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  console.log(`\nRESULT ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});