const fs = require('fs');
const os = require('os');
const path = require('path');
const seamless = require('../src/main/seamless');
const game = require('../src/main/game');

const settingsFile = path.join(process.env.APPDATA || os.homedir(), 'Erdtree Launcher', 'settings.json');
const prefs = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
const info = game.inspectGame(prefs.gamePath, prefs.gameExe);
console.log('settings:', settingsFile);
console.log('game exe:', prefs.gameExe);
console.log('game dir:', info.path);
console.log('seamless exe:', info.seamlessExe);
const report = seamless.test(info, prefs);
console.log('READY', report.ready, 'VERSION', report.status && report.status.version);
for (const c of report.checks) {
  console.log(`${c.ok ? 'OK ' : 'BAD'} ${c.required ? 'req' : 'opt'} ${c.id} ${c.label} ${c.detail || ''}`);
}
console.log('FAILED', report.failed, 'WARN', report.warnings);
