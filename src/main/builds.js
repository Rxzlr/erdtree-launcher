const fs = require('fs');
const path = require('path');
const { list, find, STAT_KEYS, levelFor, cloneBuild } = require('../data/builds');

const STAT_MIN = 1;
const STAT_MAX = 99;

function clampStats(input = {}) {
  const out = {};
  for (const key of STAT_KEYS) {
    const value = Math.round(Number(input[key]));
    out[key] = Number.isFinite(value) ? Math.max(STAT_MIN, Math.min(STAT_MAX, value)) : 10;
  }
  return out;
}

function cleanText(value, fallback = '', max = 240) {
  const text = String(value ?? '').replace(/[<>]/g, '').trim();
  return (text || fallback).slice(0, max);
}

function slug(value) {
  return String(value || 'build')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'build';
}

// Loadout application is deliberately honest:
//  - attributes + level are written straight into the live character through
//    the verified GameDataMan offsets;
//  - the full gear/spell loadout is stored on the character profile inside the
//    launcher, because injecting new inventory records into ER0000.sl2 is not
//    safe and can corrupt a save.
class BuildManager {
  constructor(userData) {
    this.file = path.join(userData, 'builds.json');
    this.data = this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        version: 1,
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
        applied: parsed.applied && typeof parsed.applied === 'object' ? parsed.applied : {},
      };
    } catch {
      return { version: 1, custom: [], applied: {} };
    }
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  all() {
    return [...list(), ...this.data.custom.map((b) => ({ ...cloneBuild(b), saved: true }))];
  }

  get(id) {
    const preset = find(id);
    if (preset) return preset;
    const custom = this.data.custom.find((item) => item.id === id);
    return custom ? { ...cloneBuild(custom), saved: true } : null;
  }

  saveCustom(input = {}) {
    const base = input.baseId ? this.get(input.baseId) : null;
    const name = cleanText(input.name, base?.name || 'My Build', 40);
    const stats = clampStats(input.stats || base?.stats || {});
    const existing = input.id ? this.data.custom.find((item) => item.id === input.id) : null;
    const record = {
      ...(base || {}),
      ...(existing || {}),
      id: existing ? existing.id : `custom-${Date.now()}-${slug(name)}`,
      baseId: input.baseId || existing?.baseId || '',
      name,
      role: cleanText(input.role, base?.role || existing?.role || 'Custom', 24),
      power: Math.max(1, Math.min(10, Number(input.power) || base?.power || existing?.power || 8)),
      tagline: cleanText(input.tagline, base?.tagline || existing?.tagline || 'A loadout forged by you.', 160),
      description: cleanText(input.description, base?.description || existing?.description || '', 900),
      playstyle: cleanText(input.playstyle, base?.playstyle || existing?.playstyle || '', 500),
      image: base?.image || existing?.image || 'assets/builds/faith.jpg',
      accent: base?.accent || existing?.accent || '#c9a86a',
      weapon: base?.weapon || existing?.weapon || [],
      armor: base?.armor || existing?.armor || [],
      talismans: base?.talismans || existing?.talismans || [],
      spells: base?.spells || existing?.spells || [],
      acquisition: base?.acquisition || existing?.acquisition || [],
      howTo: base?.howTo || existing?.howTo || [],
      stats,
      level: levelFor(stats),
      saved: true,
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      const index = this.data.custom.findIndex((item) => item.id === existing.id);
      this.data.custom[index] = record;
    } else {
      record.createdAt = new Date().toISOString();
      this.data.custom.push(record);
    }
    this.persist();
    return { build: record, custom: this.data.custom };
  }

  remove(id) {
    const before = this.data.custom.length;
    this.data.custom = this.data.custom.filter((item) => item.id !== id);
    for (const key of Object.keys(this.data.applied)) {
      if (this.data.applied[key]?.buildId === id) delete this.data.applied[key];
    }
    this.persist();
    return { removed: before !== this.data.custom.length };
  }

  // Apply a build to a character. Stats/level go live when the trainer is
  // attached and a character is loaded; otherwise they are queued and applied
  // automatically the next time the trainer attaches.
  async applyToCharacter({ buildId, characterId, trainer, characters, saveFile }) {
    const build = this.get(buildId);
    if (!build) throw new Error('This build no longer exists.');
    const roster = characters.list(saveFile);
    const character = roster.characters.find((item) => item.id === characterId);
    if (!character) throw new Error('Choose a character first.');

    const loadout = {
      buildId: build.id,
      name: build.name,
      role: build.role,
      power: build.power,
      image: build.image,
      accent: build.accent,
      stats: { ...build.stats },
      level: levelFor(build.stats),
      weapon: build.weapon || [],
      armor: build.armor || [],
      talismans: build.talismans || [],
      spells: build.spells || [],
      appliedAt: new Date().toISOString(),
    };
    characters.setBuild(character.id, loadout);

    let live = false;
    let pending = false;
    let warnings = [];
    if (trainer.attached && trainer.live.inGame) {
      try {
        await trainer.applyStats(build.stats);
        live = true;
        characters.clearPendingStats(character.id);
      } catch (err) {
        pending = true;
        characters.setPendingStats(character.id, build.stats);
        warnings.push(err.message);
      }
    } else {
      pending = true;
      characters.setPendingStats(character.id, build.stats);
      warnings.push('Stats are queued. They apply automatically the moment the launcher connects to a loaded character.');
    }

    this.data.applied[character.id] = {
      buildId: build.id,
      name: build.name,
      level: loadout.level,
      at: loadout.appliedAt,
    };
    this.persist();

    return {
      ok: true,
      live,
      pending,
      level: loadout.level,
      build: loadout,
      character: { id: character.id, name: character.name, slot: character.slot },
      warnings,
      characters: characters.list(saveFile),
    };
  }

  // Called after the trainer attaches: if the active character has a queued
  // build, write it now.
  async flushPending({ trainer, characters, saveFile }) {
    if (!trainer.attached || !trainer.live.inGame) return { applied: false };
    const roster = characters.list(saveFile);
    const active = roster.characters.find((item) => item.active);
    if (!active) return { applied: false };
    const profile = characters.getProfile(active.id);
    if (!profile.pendingStats) return { applied: false };
    try {
      await trainer.applyStats(profile.pendingStats);
      characters.clearPendingStats(active.id);
      return { applied: true, characterId: active.id };
    } catch (err) {
      return { applied: false, error: err.message };
    }
  }
}

module.exports = { BuildManager, clampStats, levelFor, STAT_KEYS };
