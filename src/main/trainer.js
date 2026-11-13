const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GROUPS, TYPE_LABELS, cloneCatalog, presetList } = require('./cheats');

const PROCESS_NAME = 'eldenring.exe';

// AOB signatures (The Grand Archives, App Ver 1.17.2). Each signature matches
// a `mov reg,[rip+disp32]` that loads the address of the global pointer.
const SIG_GAME_DATA_MAN = '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 05 48 8B 40 58 C3 C3';
const SIG_WORLD_CHR_MAN = '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 0F 48 39 88';

function translateError(raw) {
  const text = String(raw || '').trim();
  const [code, detail] = text.split(':');
  switch (code) {
    case 'PROCESS_NOT_FOUND':
      return 'اللعبة مو شغالة. شغّلها وادخل جوّها، وبعدين دوس «اتصال باللعبة».';
    case 'OPEN_FAILED':
      if (detail === '5') {
        return 'ويندوز رفض الوصول للعبة. سكّر اللانشر وافتحه كمسؤول، وتأكد إن اللعبة أوفلاين.';
      }
      return `ما قدرنا نفتح اللعبة (خطأ ${detail || '?'}). جرّب تشغيل اللانشر كمسؤول.`;
    case 'MODULE_NOT_FOUND':
      return 'ما لقينا eldenring.exe داخل اللعبة. تأكد إن اللعبة فتحت ووصلت للقائمة.';
    case 'ENUM_MODULES_FAILED':
      return 'ما قدرنا نقرأ ملفات اللعبة — غالباً صلاحيات. شغّل اللانشر كمسؤول.';
    case 'NOT_ATTACHED':
      return 'ما بعدنا متصلين. دوس «اتصال باللعبة» أول.';
    case 'ANCHOR_MISSING':
      return 'ما لقينا أساس البيانات داخل اللعبة. تأكد إن نسخة اللعبة 1.17.2 وشغّل الاتصال من جديد.';
    case 'READ_FAILED':
      return `ما قدرنا نقرأ القيمة${detail ? ` عند ${detail}` : ''}. غالباً اللعبة تغيّرت حالتها أو المكان غلط.`;
    case 'WRITE_FAILED':
      return `ما قدرنا نكتب (خطأ ${detail || '?'}). ممكن العملية محمية — جرّب كمسؤول.`;
    case 'CHAIN_NULL':
      return 'اللعبة ما حمّلت شخصيتك بعد. ادخل اللعبة (Continue) والتعديل بيشتغل تلقائياً.';
    case 'CHAIN_INVALID':
      return 'عنوان غير صالح وسط المؤشرات — جرّب تعيد الاتصال.';
    case 'BAD_TYPE':
      return `نوع الرقم مو مدعوم (${detail || '?'}).`;
    case 'BAD_MODE':
      return 'نوع البحث مو مدعوم.';
    case 'BAD_COMMAND':
      return 'أمر داخلي مو معروف.';
    case 'COMPILE_ERROR':
      return `ما قدرنا نجهّز محرك الذاكرة: ${detail || ''}`;
    default:
      if (text.includes('COMPILE_ERROR')) return text;
      return text || 'صار خطأ غير معروف في محرك الذاكرة';
  }
}

class MemHelper {
  constructor(scriptPath) {
    this.scriptPath = scriptPath;
    this.proc = null;
    this.pending = new Map();
    this.seq = 1;
    this.buffer = '';
    this.readyPromise = null;
  }

  start() {
    if (this.proc) return this.readyPromise;
    this.readyPromise = new Promise((resolve, reject) => {
      let settled = false;
      const proc = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath],
        { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
      );

      this.proc = proc;
      proc.stdout.setEncoding('utf8');
      proc.stderr.setEncoding('utf8');

      let stderrText = '';
      proc.stderr.on('data', (chunk) => {
        stderrText += chunk;
      });

      proc.stdout.on('data', (chunk) => {
        this.buffer += chunk;
        let index;
        while ((index = this.buffer.indexOf('\n')) >= 0) {
          const line = this.buffer.slice(0, index).replace(/\r$/, '');
          this.buffer = this.buffer.slice(index + 1);
          this.handleLine(line, () => {
            if (!settled) {
              settled = true;
              resolve();
            }
          });
        }
      });

      proc.on('error', (err) => {
        this.proc = null;
        if (!settled) {
          settled = true;
          reject(new Error(`ما قدرنا نشغّل محرك الذاكرة: ${err.message}`));
        }
      });

      proc.on('exit', () => {
        this.proc = null;
        this.readyPromise = null;
        const error = new Error(stderrText.trim() || 'محرك الذاكرة وقف. سكّر اللانشر وافتحه من جديد.');
        for (const [, item] of this.pending) {
          clearTimeout(item.timer);
          item.reject(translateError(error.message));
        }
        this.pending.clear();
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
    });
    return this.readyPromise;
  }

  handleLine(line, onReady) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@@')) return;
    let msg;
    try {
      msg = JSON.parse(trimmed.slice(2));
    } catch {
      return;
    }
    if (msg.event === 'ready') {
      onReady();
      return;
    }
    const entry = this.pending.get(msg.id);
    if (!entry) return;
    this.pending.delete(msg.id);
    clearTimeout(entry.timer);
    if (msg.ok) entry.resolve(msg.data || {});
    else entry.reject(new Error(translateError(msg.error)));
  }

  async call(payload, timeout = 30000) {
    await this.start();
    const id = this.seq++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('خدنا وقت طويل — جرّب مرة ثانية.'));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.proc.stdin.write(`${JSON.stringify({ ...payload, id })}\n`);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new Error(`ما قدرنا نرسل الأمر لمحرك الذاكرة: ${err.message}`));
      }
    });
  }

  stop() {
    if (!this.proc) return;
    try {
      this.proc.kill();
    } catch {
      /* ignored */
    }
    this.proc = null;
    this.readyPromise = null;
  }
}

class Trainer {
  constructor({ userData, scriptPath }) {
    this.userData = userData;
    this.stateFile = path.join(userData, 'trainer.json');
    this.helper = new MemHelper(scriptPath);
    this.attached = false;
    this.pid = null;
    this.moduleBase = 0;
    this.moduleSize = 0;
    this.moduleName = '';
    this.anchors = { gameDataMan: 0, worldChrMan: 0 };
    this.appliedNow = new Set();
    this.lastWarnings = [];
    this.busy = false;
    this.timer = null;
    this.live = { inGame: false, at: 0 };
    this.scan = { count: 0, type: null, truncated: false };
    this.state = this.loadState();
    this.cheats = cloneCatalog();
    // Drop toggles from older catalogs so the counts stay honest.
    const known = new Set(this.cheats.map((c) => c.id));
    for (const key of Object.keys(this.state.enabled)) {
      if (!known.has(key)) delete this.state.enabled[key];
    }
  }

  loadState() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      return {
        version: 3,
        enabled: raw.enabled && typeof raw.enabled === 'object' ? raw.enabled : {},
        profiles: Array.isArray(raw.profiles) ? raw.profiles : [],
        activePreset: raw.activePreset || null,
      };
    } catch {
      return { version: 3, enabled: {}, profiles: [], activePreset: null };
    }
  }

  persist() {
    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    fs.writeFileSync(
      this.stateFile,
      JSON.stringify({ ...this.state, updatedAt: new Date().toISOString() }, null, 2),
      'utf8'
    );
  }

  getCheat(id) {
    const cheat = this.cheats.find((c) => c.id === id);
    if (!cheat) throw new Error('ما لقينا هذا التعديل.');
    return cheat;
  }

  isEnabled(id) {
    return !!this.state.enabled[id];
  }

  cheatsPublic() {
    return this.cheats.map((c) => {
      const enabled = this.isEnabled(c.id);
      const applied = this.appliedNow.has(c.id);
      return {
        id: c.id,
        name: c.name,
        desc: c.desc,
        icon: c.icon,
        group: c.group,
        kind: c.kind,
        warn: !!c.warn,
        value: c.value,
        typeLabel: TYPE_LABELS[c.type] || c.type,
        enabled,
        applied: enabled && applied,
        pending: enabled && !applied,
      };
    });
  }

  status() {
    const cheats = this.cheatsPublic();
    return {
      attached: this.attached,
      pid: this.pid,
      moduleBase: this.moduleBase,
      moduleSize: this.moduleSize,
      moduleName: this.moduleName,
      anchors: { ...this.anchors },
      inGame: !!this.live.inGame,
      live: { ...this.live },
      cheats,
      groups: GROUPS,
      presets: presetList(this.state.profiles),
      savedProfiles: this.state.profiles,
      activePreset: this.state.activePreset,
      enabledCount: cheats.filter((c) => c.enabled).length,
      appliedCount: cheats.filter((c) => c.enabled && c.applied).length,
      pendingCount: cheats.filter((c) => c.enabled && c.pending).length,
      warnings: this.lastWarnings,
      processName: PROCESS_NAME,
    };
  }

  async attach(processName = PROCESS_NAME) {
    if (this.attached) await this.detach();
    const data = await this.helper.call({ cmd: 'attach', process: processName }, 60000);
    this.attached = true;
    this.pid = Number(data.pid);
    this.moduleBase = Number(data.moduleBase);
    this.moduleSize = Number(data.moduleSize);
    this.moduleName = data.moduleName;
    this.lastWarnings = [];
    await this.resolveAnchors();
    await this.tick();
    this.startLoop();
    await this.applyEnabled({ silent: true });
    return this.status();
  }

  async resolveAnchors() {
    const gd = await this.helper.call(
      { cmd: 'aobScan', pattern: SIG_GAME_DATA_MAN, resolveRip: true, instrLen: 7, max: 2 },
      120000
    );
    const wc = await this.helper.call(
      { cmd: 'aobScan', pattern: SIG_WORLD_CHR_MAN, resolveRip: true, instrLen: 7, max: 2 },
      120000
    );
    const gdAddr = Number(String(gd.addresses || '').split(',')[0]) || 0;
    const wcAddr = Number(String(wc.addresses || '').split(',')[0]) || 0;
    this.anchors = { gameDataMan: gdAddr, worldChrMan: wcAddr };
    if (!gdAddr || !wcAddr) throw new Error('ANCHOR_MISSING:gd=' + gdAddr + ' wc=' + wcAddr);
    return this.anchors;
  }

  async detach() {
    this.stopLoop();
    this.appliedNow.clear();
    try {
      if (this.helper.proc) await this.helper.call({ cmd: 'detach' }, 5000);
    } catch {
      /* helper may be gone */
    }
    this.attached = false;
    this.pid = null;
    this.moduleBase = 0;
    this.moduleSize = 0;
    this.moduleName = '';
    this.anchors = { gameDataMan: 0, worldChrMan: 0 };
    this.scan = { count: 0, type: null, truncated: false };
    this.live = { inGame: false, at: 0 };
    this.lastWarnings = [];
    return this.status();
  }

  startLoop() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch(() => {});
    }, 1500);
    this.timer.unref?.();
  }

  stopLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // Reads the live player values and re-applies every enabled cheat. Runs on a
  // 1.5s loop so toggles survive area loads / respawns (same idea as a CE
  // "freeze" entry) without hammering the game.
  async tick() {
    if (!this.attached || this.busy) return this.status();
    this.busy = true;
    try {
      await this.readLive();
      for (const cheat of this.cheats) {
        if (!this.isEnabled(cheat.id)) continue;
        try {
          await this.applyCheat(cheat, { silent: true });
          this.appliedNow.add(cheat.id);
        } catch (err) {
          this.appliedNow.delete(cheat.id);
        }
      }
    } finally {
      this.busy = false;
    }
    return this.status();
  }

  anchorFor(cheat) {
    const addr = cheat.anchor === 'gamedata' ? this.anchors.gameDataMan : this.anchors.worldChrMan;
    if (!addr) throw new Error('ANCHOR_MISSING');
    return addr;
  }

  async readLive() {
    const next = { inGame: false, at: Date.now() };
    try {
      if (this.anchors.worldChrMan) {
        const read = (chain, type) =>
          this.helper.call({ cmd: 'read', addr: this.anchors.worldChrMan, chain, type }, 8000);
        const [hp, maxHp, fp, maxFp, sp, maxSp] = await Promise.all([
          read([0x10ef8, 0, 0x190, 0, 0x138], 'int32'),
          read([0x10ef8, 0, 0x190, 0, 0x13c], 'int32'),
          read([0x10ef8, 0, 0x190, 0, 0x148], 'int32'),
          read([0x10ef8, 0, 0x190, 0, 0x150], 'int32'),
          read([0x10ef8, 0, 0x190, 0, 0x154], 'int32'),
          read([0x10ef8, 0, 0x190, 0, 0x158], 'int32'),
        ]);
        next.inGame = true;
        next.hp = Number(hp.value);
        next.maxHp = Number(maxHp.value);
        next.fp = Number(fp.value);
        next.maxFp = Number(maxFp.value);
        next.stamina = Number(sp.value);
        next.maxStamina = Number(maxSp.value);
      }
    } catch {
      next.inGame = false;
    }
    try {
      if (this.anchors.gameDataMan) {
        const [runes, level] = await Promise.all([
          this.helper.call({ cmd: 'read', addr: this.anchors.gameDataMan, chain: [0x8, 0x6c], type: 'int32' }, 8000),
          this.helper.call({ cmd: 'read', addr: this.anchors.gameDataMan, chain: [0x8, 0x68], type: 'int32' }, 8000),
        ]);
        next.runes = Number(runes.value);
        next.level = Number(level.value);
      }
    } catch {
      /* gamedata may not be ready yet */
    }
    this.live = next;
    return next;
  }

  async applyCheat(cheat) {
    if (!this.attached) throw new Error('NOT_ATTACHED');
    const addr = this.anchorFor(cheat);
    if (cheat.kind === 'bit') {
      const current = await this.helper.call({ cmd: 'read', addr, chain: cheat.chain, type: 'int8' }, 8000);
      const mask = 1 << cheat.bit;
      const before = Number(current.value) & 0xff;
      const want = this.isEnabled(cheat.id) ? before | mask : before & ~mask;
      if (want !== before) {
        await this.helper.call({ cmd: 'write', addr, chain: cheat.chain, type: 'int8', value: want }, 8000);
      }
      return { before, after: want };
    }
    if (cheat.kind === 'set') {
      await this.helper.call(
        { cmd: 'write', addr, chain: cheat.chain, type: cheat.type, value: Number(cheat.value) },
        8000
      );
      return { after: Number(cheat.value) };
    }
    if (cheat.kind === 'full') {
      const max = await this.helper.call({ cmd: 'read', addr, chain: cheat.sourceChain, type: 'int32' }, 8000);
      await this.helper.call(
        { cmd: 'write', addr, chain: cheat.chain, type: 'int32', value: Number(max.value) },
        8000
      );
      return { after: Number(max.value) };
    }
    throw new Error('BAD_CHEAT_KIND');
  }

  async ensureAttached() {
    if (this.attached) return true;
    try {
      await this.attach();
      return true;
    } catch {
      return false;
    }
  }

  async setEnabled(id, enabled, { silent = false } = {}) {
    const cheat = this.getCheat(id);
    const on = !!enabled;
    if (on && cheat.kind === 'full') {
      // "full" cheats are one-shot actions, never persisted as toggles.
      const ready = await this.ensureAttached();
      if (!ready) return { warnings: ['اللعبة مو شغالة — شغّلها وادخل شخصيتك أول.'], status: this.status() };
      try {
        await this.applyCheat(cheat);
        this.appliedNow.add(cheat.id);
      } catch (err) {
        this.lastWarnings = [err.message];
        return { warnings: [err.message], status: this.status() };
      }
      this.lastWarnings = [];
      return { status: this.status() };
    }

    this.state.enabled[id] = on;
    this.state.activePreset = null;
    this.persist();

    const warnings = [];
    if (on) {
      const ready = await this.ensureAttached();
      if (!ready) {
        warnings.push('انحفظ التفعيل. شغّل اللعبة واضغط «اتصال باللعبة» عشان يشتغل.');
      } else {
        try {
          await this.applyCheat(cheat);
          this.appliedNow.add(id);
          // refresh live values so the panel reflects the change
          await this.readLive();
        } catch (err) {
          this.appliedNow.delete(id);
          warnings.push(err.message);
        }
      }
    } else {
      this.appliedNow.delete(id);
      if (this.attached && cheat.kind === 'bit') {
        try {
          await this.applyCheat(cheat); // clears the bit
        } catch {
          /* not in game, nothing to clear */
        }
      }
    }
    this.lastWarnings = warnings;
    if (!silent && warnings.length) return { warnings, status: this.status() };
    return { status: this.status() };
  }

  async applyEnabled({ silent = false } = {}) {
    const warnings = [];
    for (const cheat of this.cheats) {
      if (!this.isEnabled(cheat.id)) continue;
      try {
        await this.applyCheat(cheat);
        this.appliedNow.add(cheat.id);
      } catch (err) {
        this.appliedNow.delete(cheat.id);
        if (!silent) warnings.push(`«${cheat.name}»: ${err.message}`);
      }
    }
    this.lastWarnings = warnings;
    return { warnings, status: this.status() };
  }

  async setAll(enabled) {
    for (const cheat of this.cheats) {
      if (cheat.kind === 'full') continue;
      await this.setEnabled(cheat.id, enabled, { silent: true });
    }
    return { status: this.status() };
  }

  async applyList(ids) {
    const wanted = new Set(ids || []);
    for (const cheat of this.cheats) {
      if (cheat.kind === 'full') continue;
      await this.setEnabled(cheat.id, wanted.has(cheat.id), { silent: true });
    }
    return this.status();
  }

  async applyPreset(presetId) {
    const preset = presetList(this.state.profiles).find((p) => p.id === presetId);
    if (!preset) throw new Error('ما لقينا هذا البريست.');
    await this.applyList(preset.cheats);
    this.state.activePreset = preset.id;
    this.persist();
    return this.status();
  }

  async applyCharacter(cheatsMap, { active = true } = {}) {
    const wanted = new Set(Object.keys(cheatsMap || {}).filter((id) => cheatsMap[id]));
    for (const cheat of this.cheats) {
      if (cheat.kind === 'full') continue;
      await this.setEnabled(cheat.id, active && wanted.has(cheat.id), { silent: true });
    }
    return this.status();
  }

  statChains() {
    return {
      vigor: [0x8, 0x3c],
      mind: [0x8, 0x40],
      endurance: [0x8, 0x44],
      strength: [0x8, 0x48],
      dexterity: [0x8, 0x4c],
      intelligence: [0x8, 0x50],
      faith: [0x8, 0x54],
      arcane: [0x8, 0x58],
    };
  }

  // Reads the eight attributes and the level so UNLOCK ALL can put the exact
  // previous values back when the player presses REMOVE UNLOCK.
  async readStats() {
    if (!this.attached) throw new Error('NOT_ATTACHED');
    const out = {};
    for (const [key, chain] of Object.entries(this.statChains())) {
      const res = await this.helper.call(
        { cmd: 'read', addr: this.anchors.gameDataMan, chain, type: 'int32' },
        8000
      );
      out[key] = Number(res.value);
    }
    const level = await this.helper.call(
      { cmd: 'read', addr: this.anchors.gameDataMan, chain: [0x8, 0x68], type: 'int32' },
      8000
    );
    out.level = Number(level.value);
    return out;
  }

  // Attribute offsets are taken from The Grand Archives table (App Ver 1.17.2):
  // GameDataMan -> PlayerGameData (+0x8) -> attributes at 0x3C..0x58, level 0x68.
  async applyStats(stats = {}) {
    if (!this.attached) throw new Error('NOT_ATTACHED');
    const chains = this.statChains();
    const applied = {};
    let total = 0;
    for (const [key, chain] of Object.entries(chains)) {
      const value = Math.max(1, Math.min(99, Math.round(Number(stats[key]) || 10)));
      applied[key] = value;
      total += value;
      await this.helper.call(
        { cmd: 'write', addr: this.anchors.gameDataMan, chain, type: 'int32', value },
        8000
      );
    }
    const level = Math.max(1, Math.min(713, total - 79));
    await this.helper.call(
      { cmd: 'write', addr: this.anchors.gameDataMan, chain: [0x8, 0x68], type: 'int32', value: level },
      8000
    );
    await this.readLive();
    return { applied, level, status: this.status() };
  }

  async refreshLive() {
    if (!this.attached) return this.status();
    await this.readLive();
    return this.status();
  }

  async verify(id) {
    const cheat = this.getCheat(id);
    const ready = await this.ensureAttached();
    if (!ready) throw new Error('PROCESS_NOT_FOUND');
    const addr = this.anchorFor(cheat);
    if (cheat.kind === 'bit') {
      const mask = 1 << cheat.bit;
      const raw = Number((await this.helper.call({ cmd: 'read', addr, chain: cheat.chain, type: 'int8' }, 8000)).value);
      const before = raw & 0xff;
      const on = (before | mask) & 0xff;
      const restored = before;
      await this.helper.call({ cmd: 'write', addr, chain: cheat.chain, type: 'int8', value: on }, 8000);
      const afterOn = Number((await this.helper.call({ cmd: 'read', addr, chain: cheat.chain, type: 'int8' }, 8000)).value) & 0xff;
      await this.helper.call({ cmd: 'write', addr, chain: cheat.chain, type: 'int8', value: before & ~mask }, 8000);
      const afterOff = Number((await this.helper.call({ cmd: 'read', addr, chain: cheat.chain, type: 'int8' }, 8000)).value) & 0xff;
      await this.helper.call({ cmd: 'write', addr, chain: cheat.chain, type: 'int8', value: restored }, 8000);
      return {
        ok: (afterOn & mask) !== 0 && (afterOff & mask) === 0,
        before,
        after: restored,
        detail: `تشغيل ${afterOn} → إيقاف ${afterOff}`,
      };
    }
    const before = Number((await this.helper.call({ cmd: 'read', addr, chain: cheat.chain, type: cheat.type }, 8000)).value);
    await this.applyCheat(cheat);
    const after = Number((await this.helper.call({ cmd: 'read', addr, chain: cheat.chain, type: cheat.type }, 8000)).value);
    const ok = cheat.kind === 'set' ? after === Number(cheat.value) : cheat.kind === 'full' ? after > 0 : after !== before;
    return { ok, before, after, detail: `${before} → ${after}` };
  }

  saveProfile(name) {
    const clean = String(name || '').trim();
    if (!clean) throw new Error('اكتب اسم للتشكيلة.');
    const cheats = this.cheats.filter((c) => this.isEnabled(c.id)).map((c) => c.id);
    if (!cheats.length) throw new Error('شغّل تعديل واحد على الأقل قبل ما تحفظ التشكيلة.');
    const profile = {
      id: `saved-${Date.now()}`,
      name: clean.slice(0, 40),
      desc: `${cheats.length} تعديل`,
      icon: 'bookmark',
      cheats,
      createdAt: new Date().toISOString(),
      saved: true,
    };
    this.state.profiles.push(profile);
    this.persist();
    return { profile, status: this.status() };
  }

  deleteProfile(id) {
    const clean = String(id || '');
    if (!clean.startsWith('saved-')) throw new Error('هذا بريست جاهز ما ينحذف.');
    const before = this.state.profiles.length;
    this.state.profiles = this.state.profiles.filter((p) => p.id !== clean);
    if (this.state.activePreset === clean) this.state.activePreset = null;
    this.persist();
    return { removed: before !== this.state.profiles.length, status: this.status() };
  }

  async scanStart({ type = 'int32', value, max = 20000 }) {
    if (!this.attached) throw new Error('NOT_ATTACHED');
    const data = await this.helper.call({ cmd: 'scanStart', type, value: Number(value), max }, 180000);
    this.scan = { count: data.count, type: data.type || type, truncated: !!data.truncated };
    return { ...this.scan };
  }

  async scanNext({ mode = 'exact', value }) {
    if (!this.attached) throw new Error('NOT_ATTACHED');
    const data = await this.helper.call({ cmd: 'scanNext', mode, value: Number(value) }, 60000);
    this.scan = { ...this.scan, count: data.count, truncated: !!data.truncated };
    return { ...this.scan };
  }

  async scanReset() {
    if (this.attached) await this.helper.call({ cmd: 'scanReset' }, 10000).catch(() => {});
    this.scan = { count: 0, type: null, truncated: false };
    return { ...this.scan };
  }

  async scanPage(offset = 0, limit = 50) {
    if (!this.attached) throw new Error('NOT_ATTACHED');
    const data = await this.helper.call({ cmd: 'scanPage', offset, limit }, 20000);
    const rows = String(data.page || '')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [addr, value] = line.split('|');
        return {
          address: Number(addr),
          addressHex: `0x${Number(addr).toString(16).toUpperCase()}`,
          value: Number(value),
        };
      });
    return { rows, count: data.count, type: data.type };
  }

  async writeAtAddress(address, type, value) {
    if (!this.attached) throw new Error('NOT_ATTACHED');
    await this.helper.call({ cmd: 'writeAbs', addr: address, type, value: Number(value) }, 15000);
    const data = await this.helper.call({ cmd: 'readAbs', addr: address, type }, 15000);
    return { value: data.value };
  }

  shutdown() {
    this.stopLoop();
    this.helper.stop();
  }
}

module.exports = { Trainer, translateError, PROCESS_NAME };
