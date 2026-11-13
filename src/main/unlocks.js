const fs = require('fs');
const path = require('path');

// UNLOCK ALL is honest about how each category is delivered:
//  - The seven item categories are served by one real mod, Glorious Merchant
//    (Nexus id 5192). It puts every base-game and DLC item into the merchant
//    shops for free. A launcher cannot safely write thousands of inventory
//    entries into ER0000.sl2, so a shop mod is the safe route.
//  - Max Runes is the existing rune freeze cheat (real memory write).
//  - Max Level writes 99 into every attribute and 713 total level, and stores
//    the previous attributes so REMOVE can put them back.
const MERCHANT_ID = '5192';

const MAX_STATS = {
  vigor: 99,
  mind: 99,
  endurance: 99,
  strength: 99,
  dexterity: 99,
  intelligence: 99,
  faith: 99,
  arcane: 99,
};

const CATEGORIES = [
  {
    id: 'weapons',
    label: 'All Weapons — Base Game + Shadow of the Erdtree',
    desc: 'Every weapon, including the DLC arsenal, becomes free at the merchant.',
    item: true,
  },
  {
    id: 'armor',
    label: 'All Armor Sets',
    desc: 'Every armor piece and set, free at the merchant.',
    item: true,
  },
  {
    id: 'talismans',
    label: 'All Talismans',
    desc: 'Every talisman, free at the merchant.',
    item: true,
  },
  {
    id: 'spells',
    label: 'All Spells / Incantations',
    desc: 'Every sorcery and incantation, free at the merchant.',
    item: true,
  },
  {
    id: 'ashes',
    label: 'All Ashes of War',
    desc: 'Every Ash of War, free at the merchant.',
    item: true,
  },
  {
    id: 'spirits',
    label: 'All Spirit Ashes',
    desc: 'Every summon, free at the merchant.',
    item: true,
  },
  {
    id: 'materials',
    label: 'All Items / Materials',
    desc: 'Crafting materials, consumables and upgrade stones, free at the merchant.',
    item: true,
  },
  {
    id: 'maxRunes',
    label: 'Max Runes',
    desc: 'Freezes your rune counter at 999,999,999 while the game runs.',
    memory: true,
  },
  {
    id: 'maxLevel',
    label: 'Max Level',
    desc: 'Writes 99 into all eight attributes (level 713). REMOVE puts your old stats back.',
    memory: true,
  },
];

const ITEM_IDS = CATEGORIES.filter((category) => category.item).map((category) => category.id);

function emptySelection() {
  const out = {};
  for (const category of CATEGORIES) out[category.id] = false;
  return out;
}

class UnlockManager {
  constructor({ userData, trainer, workshop, mods }) {
    this.file = path.join(userData, 'unlocks.json');
    this.trainer = trainer;
    this.workshop = workshop;
    this.mods = mods;
    this.data = this.load();
  }

  load() {
    let parsed = null;
    try {
      parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      parsed = null;
    }
    const selected = emptySelection();
    if (parsed && parsed.selected && typeof parsed.selected === 'object') {
      for (const category of CATEGORIES) {
        if (Object.prototype.hasOwnProperty.call(parsed.selected, category.id)) {
          selected[category.id] = !!parsed.selected[category.id];
        }
      }
    }
    return {
      version: 1,
      selected,
      prevStats: parsed && typeof parsed.prevStats === 'object' ? parsed.prevStats : null,
      levelApplied: !!(parsed && parsed.levelApplied),
      pendingLevel: !!(parsed && parsed.pendingLevel),
      runesApplied: !!(parsed && parsed.runesApplied),
      merchantActivated: !!(parsed && parsed.merchantActivated),
      appliedAt: (parsed && parsed.appliedAt) || '',
    };
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  setSelection(patch = {}) {
    for (const category of CATEGORIES) {
      if (Object.prototype.hasOwnProperty.call(patch, category.id)) {
        this.data.selected[category.id] = !!patch[category.id];
      }
    }
    this.persist();
    return this.data.selected;
  }

  async merchant(game, modsList) {
    const list = modsList || (await this.mods.list(game));
    const installed = list.find((mod) => String(mod.workshopId) === MERCHANT_ID) || null;
    const record = this.workshop.record(MERCHANT_ID);
    return {
      id: MERCHANT_ID,
      downloaded: !!record,
      ready: !!record && !!record.ready,
      installed: !!installed,
      installedId: installed ? installed.id : '',
      active: !!(installed && installed.enabled),
      setupError: record ? record.setupError || '' : '',
    };
  }

  async status(game, modsList) {
    const shop = await this.merchant(game, modsList);
    const trainerStatus = this.trainer.status();
    const runeCheat = (trainerStatus.cheats || []).find((cheat) => cheat.id === 'runes');
    const selectedCount = CATEGORIES.filter((category) => this.data.selected[category.id]).length;
    const warnings = [];
    if (this.data.pendingLevel) {
      warnings.push('Max Level is queued. Open the game and press Apply again so the launcher can read your current stats first.');
    }
    if (shop.setupError) warnings.push(`Merchant mod setup: ${shop.setupError}`);
    return {
      categories: CATEGORIES.map((category) => ({
        ...category,
        enabled: !!this.data.selected[category.id],
      })),
      selectedCount,
      merchant: shop,
      applied: {
        items: shop.active,
        runes: !!(runeCheat && runeCheat.enabled),
        level: !!this.data.levelApplied,
      },
      pendingLevel: !!this.data.pendingLevel,
      prevStats: this.data.prevStats,
      trainerAttached: !!trainerStatus.attached,
      appliedAt: this.data.appliedAt || '',
      warnings,
    };
  }

  // Downloads (inside the launcher) and activates the merchant mod once.
  async ensureMerchant(game) {
    if (!game || !game.found) {
      throw new Error('Set your game folder in Settings first — UNLOCK installs the merchant mod into the game.');
    }
    let record = this.workshop.record(MERCHANT_ID);
    if (!record || !fs.existsSync(record.path)) {
      await this.workshop.download(MERCHANT_ID, game);
      record = this.workshop.record(MERCHANT_ID);
    }
    if (!record) throw new Error('The merchant mod was not stored. Press Apply to retry.');
    const installed = await this.workshop.findInstalled(MERCHANT_ID, game);
    if (!installed || !installed.enabled) {
      await this.workshop.activate(MERCHANT_ID, game);
    }
    return true;
  }

  async apply(game) {
    const errors = [];
    const warnings = [];
    const result = { items: false, runes: false, level: false, levelValue: 0 };

    if (ITEM_IDS.some((id) => this.data.selected[id])) {
      try {
        await this.ensureMerchant(game);
        this.data.merchantActivated = true;
        result.items = true;
      } catch (err) {
        errors.push({ area: 'items', code: err.code || '', message: err.message });
      }
    }

    if (this.data.selected.maxRunes) {
      try {
        const out = await this.trainer.setEnabled('runes', true, { silent: true });
        this.data.runesApplied = true;
        result.runes = true;
        const note = (out && out.warnings && out.warnings[0]) || '';
        if (note) warnings.push(note);
      } catch (err) {
        errors.push({ area: 'runes', code: err.code || '', message: err.message });
      }
    }

    if (this.data.selected.maxLevel) {
      if (this.trainer.attached) {
        try {
          const previous = await this.trainer.readStats();
          this.data.prevStats = previous;
          const out = await this.trainer.applyStats(MAX_STATS);
          this.data.levelApplied = true;
          this.data.pendingLevel = false;
          result.level = true;
          result.levelValue = out.level;
        } catch (err) {
          errors.push({ area: 'level', code: err.code || '', message: err.message });
        }
      } else {
        this.data.pendingLevel = true;
        warnings.push('Max Level needs one in-game read. Open Elden Ring, press Connect on the trainer, then press Apply again.');
      }
    }

    this.data.appliedAt = new Date().toISOString();
    this.persist();
    return {
      ...result,
      errors,
      warnings,
      unlocks: await this.status(game),
      trainer: this.trainer.status(),
    };
  }

  async remove(game) {
    const warnings = [];
    const errors = [];
    const result = { statsRestored: false, merchantOff: false };

    if (this.data.levelApplied || this.data.pendingLevel) {
      if (this.trainer.attached && this.data.prevStats) {
        try {
          await this.trainer.applyStats(this.data.prevStats);
          result.statsRestored = true;
        } catch (err) {
          errors.push({ area: 'level', message: err.message });
        }
      } else if (this.data.prevStats) {
        warnings.push('Your previous stats are saved. Open the game, press Connect on the trainer, then press Remove again to put them back.');
      } else if (this.data.levelApplied) {
        warnings.push('Max Level was applied before the launcher recorded your old stats. Use MY SAVES → Restore to roll the character back completely.');
      }
    }

    try {
      await this.trainer.setEnabled('runes', false, { silent: true });
    } catch (err) {
      errors.push({ area: 'runes', message: err.message });
    }

    try {
      const installed = await this.workshop.findInstalled(MERCHANT_ID, game);
      if (installed && installed.enabled) {
        await this.workshop.deactivate(MERCHANT_ID, game);
      }
      result.merchantOff = true;
    } catch (err) {
      errors.push({ area: 'items', message: err.message });
    }

    this.data.levelApplied = false;
    this.data.pendingLevel = false;
    this.data.runesApplied = false;
    this.data.merchantActivated = false;
    if (result.statsRestored) this.data.prevStats = null;
    this.persist();
    return {
      ...result,
      errors,
      warnings,
      unlocks: await this.status(game),
      trainer: this.trainer.status(),
    };
  }

  // Called right after the trainer reaches the world: finishes a queued Max
  // Level write without the player having to press Apply again.
  async syncPending() {
    if (!this.trainer.attached || !this.data.pendingLevel) return { applied: false };
    try {
      const previous = await this.trainer.readStats();
      if (!this.data.prevStats) this.data.prevStats = previous;
      await this.trainer.applyStats(MAX_STATS);
      this.data.pendingLevel = false;
      this.data.levelApplied = true;
      this.persist();
      return { applied: true, level: 713 };
    } catch {
      return { applied: false };
    }
  }
}

const MERCHANT = { id: MERCHANT_ID, name: 'Glorious Merchant' };

module.exports = { UnlockManager, CATEGORIES, MAX_STATS, MERCHANT_ID, MERCHANT };
