const fs = require('fs');
const os = require('os');
const path = require('path');
const seamless = require('../src/main/seamless');
const game = require('../src/main/game');

const mode = process.argv[2] === 'seamless' ? 'seamless' : 'normal';
const settingsFile = path.join(process.env.APPDATA || os.homedir(), 'Erdtree Launcher', 'settings.json');
const prefs = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
const info = game.inspectGame(prefs.gamePath, prefs.gameExe);

(async () => {
  try {
    if (mode === 'seamless') {
      seamless.configure(info, prefs);
      const result = await seamless.launch(info, prefs);
      console.log(JSON.stringify({ mode, result }, null, 2));
    } else {
      const exe = game.resolveNormalExe(info, prefs.gameExe);
      const result = await game.launch({ gameExe: exe });
      console.log(JSON.stringify({ mode, result }, null, 2));
    }
  } catch (err) {
    console.error(JSON.stringify({ mode, error: err.message, code: err.code || '', report: err.report || null }, null, 2));
    process.exitCode = 1;
  }
})();
