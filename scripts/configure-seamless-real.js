const fs = require('fs');
const os = require('os');
const path = require('path');
const seamless = require('../src/main/seamless');
const game = require('../src/main/game');

const settingsFile = path.join(process.env.APPDATA || os.homedir(), 'Erdtree Launcher', 'settings.json');
const prefs = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
prefs.seamlessPassword = process.argv[2] || 'erdtree-coop';
prefs.seamlessPlayerName = prefs.seamlessPlayerName || 'Player';
prefs.launchMode = 'seamless';
fs.writeFileSync(settingsFile, `${JSON.stringify(prefs, null, 2)}\n`, 'utf8');

const info = game.inspectGame(prefs.gamePath, prefs.gameExe);
const configured = seamless.configure(info, prefs);
console.log('password:', configured.password);
console.log('saveExtension:', configured.config.saveExtension);
console.log('ini:', configured.files.iniReal);
console.log('playerName:', configured.playerName, configured.playerNameResult);
