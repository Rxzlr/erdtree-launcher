const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

// Elden Ring save: BND4, 10 slots. Character summary table starts at 0x1901D0E
// and each record is 588 bytes. Name is 32 bytes UTF-16LE at the record start;
// level is a uint16 at +0x22 and total playtime is a uint32 of seconds at +0x26.
const NAME_TABLE = 0x1901d0e;
const RECORD_SIZE = 588;
const SLOT_COUNT = 10;
const NAME_BYTES = 32;
const PLAYTIME_OFFSET = 0x26;
const PLAYTIME_CAP = 500000000;

function playtimeLabel(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 60) return '';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function cleanName(raw) {
  let text = raw.toString('utf16le');
  const nul = text.indexOf('\u0000');
  if (nul >= 0) text = text.slice(0, nul);
  text = text.replace(/[\u0000-\u001f]/g, '').trim();
  if (!text || !/[\p{L}\p{N}]/u.test(text)) return '';
  if (text.length > 16) text = text.slice(0, 16);
  return text;
}

function parseCharacters(file) {
  let buffer;
  try {
    buffer = fs.readFileSync(file);
  } catch {
    return { ok: false, error: 'ما قدرنا نقرأ حفظ اللعبة.', characters: [] };
  }
  if (buffer.length < NAME_TABLE + RECORD_SIZE * SLOT_COUNT) {
    return { ok: false, error: 'ملف الحفظ مو واضح — تأكد إنه ملف ER0000.sl2 الصحيح.', characters: [] };
  }
  const characters = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    const record = NAME_TABLE + i * RECORD_SIZE;
    const name = cleanName(buffer.subarray(record, record + NAME_BYTES));
    if (!name) continue;
    const level = buffer.readUInt16LE(record + 0x22);
    let playtime = null;
    try {
      const seconds = buffer.readUInt32LE(record + PLAYTIME_OFFSET);
      if (seconds > 0 && seconds < PLAYTIME_CAP) playtime = seconds;
    } catch {
      playtime = null;
    }
    characters.push({
      id: `slot-${i + 1}`,
      slot: i + 1,
      name,
      level: Number.isFinite(level) && level > 0 && level <= 999 ? level : null,
      playtimeSeconds: playtime,
      playtime: playtime === null ? '' : playtimeLabel(playtime),
      recordOffset: record,
    });
  }
  if (!characters.length) {
    return {
      ok: false,
      error: 'ما لقينا أي شخصية داخل الحفظ. تأكد إن فيه شخصية جاهزة داخل اللعبة.',
      characters: [],
    };
  }
  return { ok: true, characters };
}

class CharacterManager {
  constructor(userData) {
    this.file = path.join(userData, 'characters.json');
    this.data = this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        version: 1,
        activeId: parsed.activeId || '',
        profiles: parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {},
      };
    } catch {
      return { version: 1, activeId: '', profiles: {} };
    }
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
  }

  profile(id) {
    if (!this.data.profiles[id]) {
      this.data.profiles[id] = { cheats: {}, build: null, pendingStats: null, label: '', hidden: false, updatedAt: null };
    }
    return this.data.profiles[id];
  }

  list(saveFile) {
    const parsed = saveFile ? parseCharacters(saveFile) : { ok: false, error: 'ما حددنا ملف الحفظ.', characters: [] };
    const characters = parsed.characters.map((character) => {
      const profile = this.data.profiles[character.id] || {};
      return {
        ...character,
        label: String(profile.label || ''),
        hidden: !!profile.hidden,
        active: this.data.activeId === character.id,
        cheats: profile.cheats || {},
        build: profile.build || null,
        buildPending: !!profile.pendingStats,
        lastEdited: profile.updatedAt || null,
      };
    });
    return {
      ok: parsed.ok,
      error: parsed.error || null,
      saveFile: saveFile || '',
      activeId: this.data.activeId || '',
      characters,
    };
  }

  // Launcher-only label ("My Bleed Build"). The in-game character name is
  // never modified — the save file stays untouched.
  rename(id, label) {
    const profile = this.profile(id);
    profile.label = String(label || '').trim().slice(0, 40);
    profile.updatedAt = new Date().toISOString();
    this.persist();
    return { id, label: profile.label };
  }

  setHidden(id, hidden) {
    const profile = this.profile(id);
    profile.hidden = !!hidden;
    profile.updatedAt = new Date().toISOString();
    this.persist();
    return { id, hidden: profile.hidden };
  }

  setActive(id, active) {
    if (active) {
      this.data.activeId = id;
    } else if (this.data.activeId === id) {
      this.data.activeId = '';
    }
    this.profile(id).updatedAt = new Date().toISOString();
    this.persist();
    return { activeId: this.data.activeId };
  }

  setCheats(id, cheats) {
    const profile = this.profile(id);
    profile.cheats = { ...(cheats || {}) };
    profile.updatedAt = new Date().toISOString();
    this.persist();
    return { id, cheats: profile.cheats, updatedAt: profile.updatedAt };
  }

  getProfile(id) {
    return this.data.profiles[id] || { cheats: {}, build: null, pendingStats: null };
  }

  setBuild(id, build) {
    const profile = this.profile(id);
    profile.build = build ? { ...build } : null;
    profile.updatedAt = new Date().toISOString();
    this.persist();
    return { id, build: profile.build, updatedAt: profile.updatedAt };
  }

  setPendingStats(id, stats) {
    const profile = this.profile(id);
    profile.pendingStats = stats ? { ...stats } : null;
    profile.updatedAt = new Date().toISOString();
    this.persist();
    return { id, pendingStats: profile.pendingStats };
  }

  clearPendingStats(id) {
    const profile = this.profile(id);
    profile.pendingStats = null;
    profile.updatedAt = new Date().toISOString();
    this.persist();
    return { id };
  }

  reset() {
    this.data = { version: 1, activeId: '', profiles: {} };
    this.persist();
    return this.data;
  }
}

module.exports = {
  CharacterManager,
  parseCharacters,
  playtimeLabel,
  NAME_TABLE,
  RECORD_SIZE,
  SLOT_COUNT,
};
