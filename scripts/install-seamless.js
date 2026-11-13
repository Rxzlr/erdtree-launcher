#!/usr/bin/env node
/**
 * Install Seamless Co-op into an Elden Ring folder.
 * Usage: node scripts/install-seamless.js "<gameDir>" "<extractedSeamlessDir>" [password]
 *
 * It keeps a timestamped backup, copies the real v2 files, and creates the
 * compatibility aliases the launcher/UI look for:
 *   launch_elden_ring_seamlesscoop.exe  -> ersc_launcher.exe
 *   seamlesscoop.dll                    -> SeamlessCoop\ersc.dll
 *   seamlesscoop.ini                    -> SeamlessCoop\ersc_settings.ini
 */
const fs = require('fs');
const path = require('path');

const gameDir = process.argv[2];
const sourceDir = process.argv[3];
const password = process.argv[4] || '';

if (!gameDir || !sourceDir) {
  console.error('Usage: node scripts/install-seamless.js "<gameDir>" "<extractedSeamlessDir>" [password]');
  process.exit(1);
}

const alisa = (p) => p.replace(/[\\/]+/g, path.sep);
const must = (p) => {
  if (!fs.existsSync(p)) throw new Error(`Missing: ${p}`);
  return p;
};

const srcLauncher = must(path.join(sourceDir, 'ersc_launcher.exe'));
const srcCoop = must(path.join(sourceDir, 'SeamlessCoop'));
const srcDll = must(path.join(srcCoop, 'ersc.dll'));
const srcIni = must(path.join(srcCoop, 'ersc_settings.ini'));

const game = path.resolve(gameDir);
must(path.join(game, 'eldenring.exe'));

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupRoot = path.join(game, `_launcher_backup_${stamp}`);
fs.mkdirSync(backupRoot, { recursive: true });

function backup(target, label) {
  if (!fs.existsSync(target)) return;
  const dest = path.join(backupRoot, label);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(target, dest, { recursive: true, force: true });
  console.log(`backup: ${target} -> ${dest}`);
}

backup(path.join(game, 'SeamlessCoop'), 'SeamlessCoop');
backup(path.join(game, 'ersc_launcher.exe'), 'ersc_launcher.exe');
backup(path.join(game, 'launch_elden_ring_seamlesscoop.exe'), 'launch_elden_ring_seamlesscoop.exe');
backup(path.join(game, 'seamlesscoop.dll'), 'seamlesscoop.dll');
backup(path.join(game, 'seamlesscoop.ini'), 'seamlesscoop.ini');
backup(path.join(game, 'steam_emu.ini'), 'steam_emu.ini');
backup(path.join(game, 'OnlineFix.ini'), 'OnlineFix.ini');
backup(path.join(game, 'config_eldenring.toml'), 'config_eldenring.toml');
backup(path.join(game, 'config_eldenring.toml.original'), 'config_eldenring.toml.original');

// Install real files.
fs.mkdirSync(path.join(game, 'SeamlessCoop'), { recursive: true });
fs.cpSync(srcLauncher, path.join(game, 'ersc_launcher.exe'), { force: true });
fs.cpSync(srcCoop, path.join(game, 'SeamlessCoop'), { recursive: true, force: true });

// Configure the ini (preserve the generated file as base).
const iniPath = path.join(game, 'SeamlessCoop', 'ersc_settings.ini');
let ini = fs.readFileSync(iniPath, 'utf8');
function setIni(text, key, value) {
  const re = new RegExp(`^(\\s*${key}\\s*=\\s*).*$`, 'm');
  if (re.test(text)) return text.replace(re, `$1${value}`);
  return `${text.trimEnd()}\n${key} = ${value}\n`;
}
ini = setIni(ini, 'cooppassword', password);
ini = setIni(ini, 'skip_splash_screens', '1');
ini = setIni(ini, 'save_file_extension', 'co2');
ini = setIni(ini, 'mod_language_override', '');
fs.writeFileSync(iniPath, ini, 'utf8');

// Aliases (hard links when possible; copies otherwise).
function alias(linkPath, targetPath) {
  try {
    if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { force: true });
    fs.linkSync(targetPath, linkPath);
    console.log(`hardlink: ${linkPath} -> ${targetPath}`);
  } catch (err) {
    fs.copyFileSync(targetPath, linkPath);
    console.log(`copy: ${linkPath} -> ${targetPath} (${err.code || err.message})`);
  }
}
alias(path.join(game, 'launch_elden_ring_seamlesscoop.exe'), path.join(game, 'ersc_launcher.exe'));
alias(path.join(game, 'seamlesscoop.dll'), path.join(game, 'SeamlessCoop', 'ersc.dll'));
alias(path.join(game, 'seamlesscoop.ini'), iniPath);

console.log('\nSeamless Co-op installed.');
console.log(`  game:    ${game}`);
console.log(`  backup:  ${backupRoot}`);
console.log(`  config:  ${iniPath}`);
