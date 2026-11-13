/* Erdtree Launcher — Best Builds self-test (plain Node).
 *
 * Proves the one-click "Take This Build" backend:
 *   - a build applies to the exact character that was chosen;
 *   - stats go live when the trainer is attached in-game;
 *   - stats queue and apply later when the game is closed;
 *   - the full weapon/armor/talisman/spell loadout is persisted on the profile;
 *   - custom builds can be saved, renamed, edited and removed.
 *
 * Run: node scripts/test-builds.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { BuildManager } = require('../src/main/builds');
const { levelFor } = require('../src/data/builds');

function fakeCharacters() {
  const profiles = {};
  return {
    profiles,
    list() {
      return {
        ok: true,
        characters: [
          { id: 'slot-1', slot: 1, name: 'Tarnished One', level: 120, active: true },
          { id: 'slot-2', slot: 2, name: 'Second Blade', level: 40, active: false },
        ],
      };
    },
    setBuild(id, build) {
      profiles[id] = { ...(profiles[id] || {}), build };
    },
    setPendingStats(id, stats) {
      profiles[id] = { ...(profiles[id] || {}), pendingStats: stats };
    },
    clearPendingStats(id) {
      profiles[id] = { ...(profiles[id] || {}), pendingStats: null };
    },
    getProfile(id) {
      return profiles[id] || { pendingStats: null, build: null };
    },
  };
}

async function main() {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
  };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-builds-'));
  const manager = new BuildManager(tmp);
  const characters = fakeCharacters();

  const curated = manager.all().filter((b) => !b.saved);
  check('34 curated builds', curated.length === 34, String(curated.length));
  check(
    'every build has type chips and a /5 rating',
    curated.every((b) => Array.isArray(b.types) && b.types.length > 0 && Number.isFinite(b.rating))
  );
  check(
    'required build archetypes exist',
    ['bleed', 'moonveil', 'rivers', 'blasphemous', 'bonk', 'lightning', 'malenia', 'comet', 'bow', 'tank', 'parry', 'rot', 'frost', 'holy', 'blackflame', 'guts', 'samurai', 'dragon'].every(
      (id) => !!manager.get(id)
    )
  );
  const bleed = manager.get('bleed');
  check('bleed build loads full kit', bleed.weapon.length === 2 && bleed.talismans.length === 4 && bleed.armor.length === 4);
  check('level math', levelFor(bleed.stats) === Object.values(bleed.stats).reduce((a, b) => a + b, 0) - 79);

  // Game closed → queue, still attach the whole loadout to the chosen character.
  const queued = await manager.applyToCharacter({
    buildId: 'bleed',
    characterId: 'slot-2',
    trainer: { attached: false, live: { inGame: false } },
    characters,
    saveFile: '',
  });
  check('applies to the chosen character', queued.character.id === 'slot-2' && queued.character.name === 'Second Blade');
  check('stats queued while game is closed', queued.pending === true && queued.live === false);
  check('full gear saved on profile', characters.profiles['slot-2'].build.weapon.length === 2 && characters.profiles['slot-2'].build.spells.length === 2);
  check('other character untouched', !characters.profiles['slot-1']);
  check('applied record persisted', manager.data.applied['slot-2']?.buildId === 'bleed');

  // Game attached in world → write attributes live.
  let written = null;
  const live = await manager.applyToCharacter({
    buildId: 'mage',
    characterId: 'slot-1',
    trainer: {
      attached: true,
      live: { inGame: true },
      async applyStats(stats) {
        written = stats;
        return { level: levelFor(stats) };
      },
    },
    characters,
    saveFile: '',
  });
  check('live apply when in-game', live.live === true && live.pending === false);
  check('live stats match the build', !!written && written.intelligence === 80 && written.mind === 38);
  check('queued stats cleared after live write', characters.profiles['slot-1'].pendingStats === null);

  // flushPending for the active queued character.
  const flushed = await manager.flushPending({
    trainer: { attached: true, live: { inGame: true }, applyStats: async () => ({}) },
    characters: {
      list: () => ({ characters: [{ id: 'slot-2', active: true }] }),
      getProfile: (id) => characters.getProfile(id),
      clearPendingStats: (id) => characters.clearPendingStats(id),
    },
    saveFile: '',
  });
  check('queued build flushes on attach', flushed.applied === true && flushed.characterId === 'slot-2');

  // Custom build lifecycle.
  const saved = manager.saveCustom({ baseId: 'faith', name: 'My Golden Paladin', stats: { ...bleed.stats, vigor: 200 } });
  check('custom build saved', saved.build.saved === true && saved.build.name === 'My Golden Paladin');
  check('stats clamped to 99', saved.build.stats.vigor === 99);
  check('custom build listed after presets', manager.all().some((b) => b.id === saved.build.id));
  const edited = manager.saveCustom({ id: saved.build.id, name: 'Renamed Paladin' });
  check('custom build renamed in place', edited.build.id === saved.build.id && manager.all().filter((b) => b.saved).length === 1);
  const removed = manager.remove(saved.build.id);
  check('custom build removed', removed.removed === true && manager.all().filter((b) => b.saved).length === 0);

  // Persistence across a fresh manager (simulates a launcher restart).
  const reloaded = new BuildManager(tmp);
  check('builds.json persists across restart', reloaded.data.applied['slot-2']?.buildId === 'bleed');

  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((item) => !item.ok);
  console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${results.length - failed.length}/${results.length} checks`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
