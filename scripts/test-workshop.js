const path = require('path');
const { ModManager } = require('../src/main/mods');
const { Workshop } = require('../src/main/workshop');
const seamless = require('../src/main/seamless');
const gameLib = require('../src/main/game');

const settings = {
  data: {
    gamePath: 'C:\\Games\\ELDEN RING\\Game',
    gameExe: 'C:\\Games\\ELDEN RING\\Game\\eldenring.exe',
    seamlessPassword: 'erdtree-coop',
    seamlessPlayerName: 'Player',
  },
};

(async () => {
  const game = gameLib.inspectGame(settings.data.gamePath, settings.data.gameExe);
  const mods = new ModManager(path.join(__dirname, '..', 'test', 'tmp-userdata'));
  const workshop = new Workshop({ mods, seamless, settings });
  const catalog = await workshop.catalog(game);
  console.log('GAME', game.found, game.path, 'ME2', game.hasModEngine2, 'SEAMLESS', game.hasSeamless);
  console.log('COUNTS', catalog.counts, 'categories', catalog.categories.length);
  for (const item of catalog.items) {
    console.log(
      [
        item.id.padEnd(26),
        item.category.padEnd(10),
        item.direct ? 'DIRECT' : 'NEXUS ',
        item.state.padEnd(9),
        item.version || '',
      ].join(' ')
    );
  }
  for (const id of ['seamless-coop', 'mod-engine-2', 'elden-mod-loader']) {
    const entry = workshop.entry(id);
    const file = await workshop.resolveDirect(entry);
    console.log('RESOLVE', id, '->', file.name, file.version, Math.round((file.size || 0) / 1024) + 'KB');
  }
  console.log('PROGRESS', JSON.stringify(workshop.progress()));
})().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
