// Focused unit checks for the mods-loading fix (Mod Engine 2 launch routing).
// Run with: npx electron scripts/test-mod-launch.js
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
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
    console.log(`FAIL ${name} :: ${JSON.stringify(detail)}`);
  }
}

(async () => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'erdtree-modlaunch-'));
  const gameDir = path.join(tmp, 'Game');
  const userData = path.join(tmp, 'userdata');
  await fsp.mkdir(path.join(gameDir, 'mod'), { recursive: true });
  await fsp.mkdir(userData, { recursive: true });
  // Real executable so launchModEngine can spawn it (where.exe stands in).
  const realExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'where.exe');
  await fsp.copyFile(realExe, path.join(gameDir, 'eldenring.exe'));
  await fsp.copyFile(realExe, path.join(gameDir, 'modengine2_launcher.exe'));
  await fsp.mkdir(path.join(gameDir, 'SeamlessCoop'), { recursive: true });
  await fsp.writeFile(path.join(gameDir, 'SeamlessCoop', 'ersc.dll'), Buffer.alloc(2048, 1));
  // A user config that must be backed up before we overwrite it.
  await fsp.writeFile(path.join(gameDir, 'config_eldenring.toml'), '[modengine]\ndebug = true\n# user\n');

  const game = gameLib.inspectGame(gameDir, path.join(gameDir, 'eldenring.exe'));
  check('fake game detected with ME2', game.found && game.hasModEngine2 && !!game.modLauncher, game);

  const mods = new ModManager(userData);

  // 1) DLL mod install + sync → TOML lists the DLL with a verified path.
  const dllModSrc = path.join(tmp, 'dllmod');
  await fsp.mkdir(dllModSrc, { recursive: true });
  await fsp.writeFile(path.join(dllModSrc, 'TestMod.dll'), Buffer.alloc(4096, 2));
  const installed = await mods.installFolder(dllModSrc, 'Test DLL Mod', { enabled: true });
  check('DLL mod installed with dllMode', installed.dllMode === true && installed.dlls.includes('TestMod.dll'), installed.dlls);
  const sync = await mods.sync(game);
  const toml1 = await fsp.readFile(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
  check('sync copies mod into game/mod', sync.copied === 1 && fs.existsSync(path.join(gameDir, 'mod', installed.id, 'TestMod.dll')), sync);
  check('TOML external_dlls points at the real DLL', toml1.includes(`mod\\\\${installed.id}\\\\TestMod.dll`), toml1);
  check('user config backed up as .original', fs.existsSync(path.join(gameDir, 'config_eldenring.toml.original')), null);

  // 2) writeConfig with seamlessDll → ersc.dll added; without → removed.
  const ersc = path.join(gameDir, 'SeamlessCoop', 'ersc.dll');
  await mods.writeConfig(game, { seamlessDll: ersc });
  const toml2 = await fsp.readFile(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
  check('seamless mode TOML includes ersc.dll', toml2.includes('SeamlessCoop\\\\ersc.dll'), toml2);
  await mods.writeConfig(game, {});
  const toml3 = await fsp.readFile(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
  check('normal mode TOML drops ersc.dll', !toml3.includes('ersc.dll') && toml3.includes('TestMod.dll'), toml3);

  // 3) Missing DLL files are never written into external_dlls.
  await fsp.rm(path.join(gameDir, 'mod', installed.id, 'TestMod.dll'));
  await mods.writeConfig(game, {});
  const toml4 = await fsp.readFile(path.join(gameDir, 'config_eldenring.toml'), 'utf8');
  check('missing DLL skipped in TOML', !toml4.includes('TestMod.dll'), toml4);
  await fsp.writeFile(path.join(gameDir, 'mod', installed.id, 'TestMod.dll'), Buffer.alloc(4096, 2));

  // 4) ReShade preset-only packs are flagged; DLL mods are not.
  const presetSrc = path.join(tmp, 'preset');
  await fsp.mkdir(path.join(presetSrc, 'reshade-shaders', 'Textures'), { recursive: true });
  await fsp.writeFile(path.join(presetSrc, 'My ReShade Preset.ini'), 'Effects=0\n');
  await fsp.writeFile(path.join(presetSrc, 'reshade-shaders', 'Textures', 'lut.png'), Buffer.alloc(64));
  const preset = await mods.installFolder(presetSrc, 'Preset Pack', { enabled: false });
  check('preset-only pack flagged requiresReShade', preset.requiresReShade === true, preset.requiresReShade);
  check('DLL mod not flagged requiresReShade', installed.requiresReShade === false, installed.requiresReShade);

  // 5) launchModEngine builds the documented ME2 command; missing launcher errors.
  const launch = await gameLib.launchModEngine({
    gameDir,
    launcher: game.modLauncher,
    targetExe: path.join(gameDir, 'eldenring.exe'),
  });
  check(
    'launchModEngine uses -t er -c <config> -p <exe>',
    launch.via === 'modengine2' &&
      launch.args[0] === '-t' && launch.args[1] === 'er' &&
      launch.args[2] === '-c' && launch.args[3] === path.join(gameDir, 'config_eldenring.toml') &&
      launch.args[4] === '-p' && launch.args[5] === path.join(gameDir, 'eldenring.exe'),
    launch.args
  );
  let me2Error = '';
  try {
    await gameLib.launchModEngine({ gameDir, launcher: path.join(gameDir, 'nope.exe'), targetExe: path.join(gameDir, 'eldenring.exe') });
  } catch (err) {
    me2Error = err.code || err.message;
  }
  check('missing ME2 launcher raises MODS_NEED_ME2', me2Error === 'MODS_NEED_ME2', me2Error);

  // 6) Workshop: mod-engine-2 entry resolves from the official repo; activate
  //    never installs a second copy over a working ME2.
  const settings = { data: { seamlessPassword: '', seamlessPlayerName: '' }, save: () => {} };
  const workshop = new Workshop({ mods, seamless, settings, userData });
  const entry = workshop.entry('mod-engine-2');
  check('catalog has official ME2 direct source', entry.direct?.repo === 'soulsmods/ModEngine2' && entry.install === 'game', entry.direct);
  const resolved = await workshop.resolveDirect(entry);
  check('ME2 resolves to the official win64 zip', /ModEngine-.*win64\.zip$/i.test(resolved.name) && /github\.com\/soulsmods\/ModEngine2/.test(resolved.url), resolved);
  const act = await workshop.activate('mod-engine-2', game);
  check('activate skips duplicate ME2 install', act.already === true && act.result?.already === true, act.already);

  await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  console.log(`\nRESULT ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});