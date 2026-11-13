const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const gameLib = require('./game');

const SAVE_FILENAME = 'ER0000.sl2';

function stamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function prettyDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function safeRm(target) {
  return fsp.rm(target, { recursive: true, force: true }).catch(() => {});
}

class SaveManager {
  constructor(userData) {
    this.userData = userData;
    this.backupsRoot = path.join(userData, 'save-backups');
    this.metaRoot = path.join(userData, 'save-backups-meta');
  }

  async ensure() {
    await fsp.mkdir(this.backupsRoot, { recursive: true });
    await fsp.mkdir(this.metaRoot, { recursive: true });
  }

  detectSaves() {
    const root = path.join(os.homedir(), 'AppData', 'Roaming', 'EldenRing');
    const out = [];
    let accounts = [];
    try {
      accounts = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
    } catch {
      return out;
    }
    for (const account of accounts) {
      const dir = path.join(root, account.name);
      for (const filename of ['ER0000.sl2', 'ER0000.co2', 'ER0000.psc']) {
        const full = path.join(dir, filename);
        try {
          const stat = fs.statSync(full);
          if (!stat.isFile()) continue;
          out.push({
            account: account.name,
            filename,
            path: full,
            modifiedAt: stat.mtime.toISOString(),
            modifiedLabel: prettyDate(stat.mtime),
            size: stat.size,
            active: filename === 'ER0000.sl2',
          });
        } catch {
          /* missing */
        }
      }
    }
    out.sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)));
    return out;
  }

  resolveSaveFile(settings) {
    if (settings?.saveFile && fs.existsSync(settings.saveFile)) return settings.saveFile;
    const saves = this.detectSaves();
    const sl2 = saves.find((s) => s.filename === SAVE_FILENAME);
    return sl2 ? sl2.path : '';
  }

  async list(settings) {
    await this.ensure();
    const dirs = await fsp.readdir(this.metaRoot, { withFileTypes: true }).catch(() => []);
    const backups = [];
    for (const entry of dirs) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const meta = readJson(path.join(this.metaRoot, entry.name), null);
      if (!meta || !meta.id) continue;
      const file = path.join(this.backupsRoot, meta.id, SAVE_FILENAME);
      if (!fs.existsSync(file)) continue;
      backups.push({
        ...meta,
        sizeLabel: this.bytes(meta.size || fs.statSync(file).size),
        dateLabel: prettyDate(meta.createdAt),
      });
    }
    backups.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const active = this.resolveSaveFile(settings);
    let activeInfo = null;
    if (active && fs.existsSync(active)) {
      const stat = fs.statSync(active);
      activeInfo = {
        path: active,
        size: stat.size,
        sizeLabel: this.bytes(stat.size),
        modifiedAt: stat.mtime.toISOString(),
        modifiedLabel: prettyDate(stat.mtime),
      };
    }
    return {
      saveFile: active,
      active: activeInfo,
      backups,
      detected: this.detectSaves(),
    };
  }

  bytes(n) {
    const num = Number(n) || 0;
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  }

  async backupCurrent(settings, { name } = {}) {
    await this.ensure();
    const source = this.resolveSaveFile(settings);
    if (!source || !fs.existsSync(source)) {
      throw new Error('ما لقينا حفظ اللعبة. شغّل اللعبة مرة وحدة عشان ينشئ الحفظ، أو حدد مسار الحفظ من الإعدادات.');
    }
    const now = new Date();
    const id = stamp(now);
    const dir = path.join(this.backupsRoot, id);
    await fsp.mkdir(dir, { recursive: true });
    const target = path.join(dir, SAVE_FILENAME);
    await fsp.copyFile(source, target);
    const stat = await fsp.stat(target);
    const meta = {
      id,
      name: String(name || '').trim() || `نسخة ${now.toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      createdAt: now.toISOString(),
      source,
      size: stat.size,
      sourceMtime: fs.statSync(source).mtime.toISOString(),
      sourceSize: fs.statSync(source).size,
      auto: false,
      slot: false,
    };
    await fsp.writeFile(path.join(this.metaRoot, `${id}.json`), JSON.stringify(meta, null, 2), 'utf8');
    return meta;
  }

  readAllMeta() {
    let dirs = [];
    try {
      dirs = fs.readdirSync(this.metaRoot, { withFileTypes: true });
    } catch {
      return [];
    }
    const out = [];
    for (const entry of dirs) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const meta = readJson(path.join(this.metaRoot, entry.name), null);
      if (meta && meta.id) out.push(meta);
    }
    return out;
  }

  // Called by the watchdog when the game closes. Makes one backup per distinct
  // save state, so closing the launcher twice does not pile up duplicates.
  async autoBackup(settings) {
    await this.ensure();
    const source = this.resolveSaveFile(settings);
    if (!source || !fs.existsSync(source)) return { skipped: true, reason: 'no-save' };
    let stat;
    try {
      stat = fs.statSync(source);
    } catch {
      return { skipped: true, reason: 'no-save' };
    }
    const mtime = stat.mtime.toISOString();
    const existing = this.readAllMeta().find(
      (meta) => meta.sourceMtime === mtime && Number(meta.sourceSize) === stat.size
    );
    if (existing) return { skipped: true, reason: 'already-backed-up', meta: existing };
    const meta = await this.backupCurrent(settings, { name: 'Auto backup — game closed' });
    const metaFile = path.join(this.metaRoot, `${meta.id}.json`);
    const parsed = readJson(metaFile, meta);
    parsed.auto = true;
    await fsp.writeFile(metaFile, JSON.stringify(parsed, null, 2), 'utf8');
    return { meta: { ...meta, auto: true }, auto: true };
  }

  // A launcher-side save slot: a named full copy of the current save that can
  // be restored with one click. The game itself still creates characters.
  async createSlot(settings, { name } = {}) {
    const fallback = `Save slot — ${new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const meta = await this.backupCurrent(settings, { name: String(name || '').trim() || fallback });
    const metaFile = path.join(this.metaRoot, `${meta.id}.json`);
    const parsed = readJson(metaFile, meta);
    parsed.slot = true;
    await fsp.writeFile(metaFile, JSON.stringify(parsed, null, 2), 'utf8');
    return { ...meta, slot: true };
  }

  async restore(settings, { id }) {
    const meta = this.readMeta(id);
    const backupFile = path.join(this.backupsRoot, meta.id, SAVE_FILENAME);
    if (!fs.existsSync(backupFile)) throw new Error('ملف النسخة الاحتياطية مو موجود.');
    const running = await gameLib.isRunning();
    if (running.running) {
      throw new Error('اللعبة شغالة. سكّر اللعبة أول، وبعدها ارجع النسخة.');
    }
    const target = this.resolveSaveFile(settings) || meta.source;
    if (!target) throw new Error('ما عرفنا مكان حفظ اللعبة. حدد مسار الحفظ من الإعدادات.');

    if (fs.existsSync(target)) {
      const auto = await this.backupCurrent(settings, { name: 'نسخة تلقائية قبل الاسترجاع' });
      const autoMetaFile = path.join(this.metaRoot, `${auto.id}.json`);
      try {
        const parsed = readJson(autoMetaFile, auto);
        parsed.auto = true;
        await fsp.writeFile(autoMetaFile, JSON.stringify(parsed, null, 2), 'utf8');
      } catch {
        /* best effort */
      }
    }
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.copyFile(backupFile, target);
    return { restored: meta, target };
  }

  async duplicate({ id, name }) {
    const meta = this.readMeta(id);
    const source = path.join(this.backupsRoot, meta.id, SAVE_FILENAME);
    if (!fs.existsSync(source)) throw new Error('ملف النسخة الاحتياطية مو موجود.');
    await this.ensure();
    const now = new Date();
    const newId = stamp(now);
    const dir = path.join(this.backupsRoot, newId);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.copyFile(source, path.join(dir, SAVE_FILENAME));
    const copyMeta = {
      ...meta,
      id: newId,
      name: String(name || '').trim() || `${meta.name} — نسخة`,
      createdAt: now.toISOString(),
      auto: false,
    };
    await fsp.writeFile(path.join(this.metaRoot, `${newId}.json`), JSON.stringify(copyMeta, null, 2), 'utf8');
    return copyMeta;
  }

  async remove({ id }) {
    const meta = this.readMeta(id);
    await safeRm(path.join(this.backupsRoot, meta.id));
    await fsp.rm(path.join(this.metaRoot, `${meta.id}.json`), { force: true }).catch(() => {});
    return { id: meta.id };
  }

  readMeta(id) {
    const clean = String(id || '').replace(/[^0-9A-Za-z_-]/g, '');
    const meta = readJson(path.join(this.metaRoot, `${clean}.json`), null);
    if (!meta) throw new Error('ما لقينا هذي النسخة الاحتياطية.');
    return meta;
  }

  async openRoot() {
    await this.ensure();
    const { shell } = require('electron');
    const error = await shell.openPath(this.backupsRoot);
    if (error) throw new Error(error);
    return { ok: true };
  }
}

module.exports = { SaveManager, SAVE_FILENAME, prettyDate };
