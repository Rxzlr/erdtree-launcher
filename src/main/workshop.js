const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { CATALOG, CATEGORIES, FILTERS, nexusSearch } = require('./workshop-catalog');
const { installSeamlessFromZip, installZipToGame } = require('./tools');

const UA = 'ErdtreeLauncher/3.0 (+https://github.com/)';

// Streaming SHA-256 so large archives never sit in memory twice. Used to verify
// direct GitHub downloads against the digest GitHub publishes for each asset.
async function sha256File(file) {
  const handle = await fsp.open(file, 'r');
  try {
    const hash = crypto.createHash('sha256');
    const buffer = Buffer.alloc(1024 * 1024);
    let position = 0;
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    return hash.digest('hex');
  } finally {
    await handle.close();
  }
}

// Turn common share links into direct file links so the launcher can fetch the
// archive itself: Google Drive "view" links and Dropbox preview links.
function directLink(url) {
  const clean = String(url || '').trim();
  try {
    const parsed = new URL(clean);
    if (/(^|\.)drive\.google\.com$/i.test(parsed.hostname)) {
      let id = parsed.searchParams.get('id');
      if (!id) {
        const match = parsed.pathname.match(/\/d\/([^/]+)/);
        if (match) id = match[1];
      }
      if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    }
    if (/(^|\.)dropbox\.com$/i.test(parsed.hostname) && parsed.searchParams.get('dl') === '0') {
      parsed.searchParams.set('dl', '1');
      return parsed.toString();
    }
  } catch {
    /* keep the original string */
  }
  return clean;
}

function linkFileName(url, id) {
  try {
    const base = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || '');
    if (/\.(zip|7z|rar)$/i.test(base)) return base;
  } catch {
    /* fall back to the mod id */
  }
  return `${id}.zip`;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

async function downloadToFile(url, target, onProgress) {
  const guard = withTimeout(15 * 60 * 1000);
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      redirect: 'follow',
      signal: guard.signal,
    });
  } catch (err) {
    guard.clear();
    throw new Error(`Could not reach the download server: ${err.message}`);
  }
  if (!res.ok || !res.body) {
    guard.clear();
    throw new Error(`The download was refused (${res.status}). Press Retry, or use Import file for this mod.`);
  }
  const total = Number(res.headers.get('content-length')) || 0;
  const out = fs.createWriteStream(target);
  const reader = res.body.getReader();
  let received = 0;
  let lastTick = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (!out.write(Buffer.from(value))) {
        await new Promise((resolve) => out.once('drain', resolve));
      }
      const now = Date.now();
      if (onProgress && now - lastTick > 120) {
        lastTick = now;
        onProgress(received, total);
      }
    }
    await new Promise((resolve, reject) => {
      out.end(() => resolve());
      out.on('error', reject);
    });
    if (onProgress) onProgress(received, total || received);
    return { received, total };
  } catch (err) {
    out.destroy();
    throw err;
  } finally {
    guard.clear();
  }
}

// The workshop is deliberately two-step:
//   1. download() only stores the archive in <profile>/downloads/<id>/ and never
//      touches the game.
//   2. activate() extracts it, registers it with the mod manager and re-syncs
//      the game folder so PLAY starts exactly the activated set.
// Deactivate keeps the downloaded archive so it can be switched back on, and
// delete removes both the archive and the mod folder.
class Workshop {
  constructor({ mods, seamless, settings, userData, openNexus = null }) {
    this.mods = mods;
    this.seamless = seamless;
    this.settings = settings;
    this.openNexus = openNexus;
    this.root = path.join(userData, 'downloads');
    this.file = path.join(userData, 'downloads.json');
    this.data = { version: 2, items: {}, links: {} };
    this.jobs = new Map();
    this.releaseCache = new Map();
    this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const items = parsed && typeof parsed.items === 'object' && parsed.items ? parsed.items : {};
      const links = parsed && typeof parsed.links === 'object' && parsed.links ? parsed.links : {};
      this.data = { version: 2, items, links };
    } catch {
      this.data = { version: 2, items: {}, links: {} };
    }
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  entry(id) {
    const entry = CATALOG.find((item) => item.id === String(id));
    if (!entry) throw new Error('That mod is not in the workshop catalogue.');
    return entry;
  }

  record(id) {
    return this.data.items[String(id)] || null;
  }

  recordDir(id) {
    return path.join(this.root, safeId(id));
  }

  freeLink(id) {
    const value = this.data.links ? this.data.links[String(id)] : '';
    return typeof value === 'string' ? value : '';
  }

  // A free mirror the player saved once (ModDB, Google Drive, GitHub, the
  // author's own host). Only plain http(s) links are accepted.
  setFreeLink(id, url) {
    const entry = this.entry(id);
    const clean = String(url || '').trim();
    if (!clean) {
      if (this.data.links) delete this.data.links[entry.id];
      this.persist();
      return '';
    }
    let parsed;
    try {
      parsed = new URL(clean);
    } catch {
      throw new Error('That is not a valid link. Paste the full https:// address of the mod archive.');
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error('The link must start with http:// or https://.');
    }
    if (/(^|\.)nexusmods\.com$/i.test(parsed.hostname)) {
      throw new Error(
        'That is the Nexus mod page, not the archive itself. Nexus does not allow the launcher to fetch it automatically — use a free mirror (ModDB, Google Drive, the author\'s host) or press Import file.'
      );
    }
    this.data.links = this.data.links || {};
    this.data.links[entry.id] = clean;
    this.persist();
    return clean;
  }

  async installedByWorkshopId(game) {
    const installed = await this.mods.list(game);
    const map = new Map();
    for (const mod of installed) {
      if (mod.workshopId) map.set(String(mod.workshopId), mod);
    }
    return { installed, map };
  }

  async catalog(game) {
    const { installed, map } = await this.installedByWorkshopId(game);
    const seamless = this.seamless.status(game, this.settings.data);
    const items = CATALOG.map((entry) => {
      const rec = this.record(entry.id);
      const mod = map.get(entry.id);
      let state = 'available';
      let enabled = false;
      let modId = '';
      if (mod) {
        modId = mod.id;
        enabled = !!mod.enabled;
        state = enabled ? 'active' : 'downloaded';
      } else if (rec) {
        state = 'downloaded';
      }
      if (entry.id === '510' && seamless.installed) {
        state = 'active';
        enabled = true;
      }
      if (entry.id === '117' && game.hasEldenModLoader) {
        state = 'active';
        enabled = true;
      }
      if (entry.id === 'mod-engine-2' && game.hasModEngine2) {
        state = 'active';
        enabled = true;
      }
      const job = this.jobs.get(entry.id);
      return {
        id: entry.id,
        name: entry.name,
        author: entry.author,
        cats: entry.cats || [],
        nexusCat: entry.nexusCat,
        endorsements: entry.endorsements || '',
        downloads: entry.downloads || '',
        updated: entry.updated || '',
        size: entry.size || '',
        blurb: entry.blurb || '',
        img: entry.img || '',
        url: entry.url || nexusSearch(entry.name),
        coOp: entry.coOp || 'high',
        direct: !!entry.direct,
        freeLink: this.freeLink(entry.id),
        manual: !entry.direct && !this.freeLink(entry.id),
        tool: entry.install === 'game',
        state,
        enabled,
        modId,
        localFile: rec ? rec.file || '' : '',
        ready: !!mod || !!(rec && rec.ready),
        setupError: rec ? rec.setupError || '' : '',
        job: job
          ? {
              phase: job.phase,
              received: job.received,
              total: job.total,
              error: job.error || '',
              code: job.code || '',
              done: !!job.done,
            }
          : null,
      };
    });
    return {
      categories: CATEGORIES,
      filters: FILTERS,
      items,
      installed: installed.map((mod) => ({
        id: mod.id,
        name: mod.name,
        enabled: mod.enabled,
        compatible: mod.compatible,
        reason: mod.compatibilityReason || '',
        image: mod.image,
        version: mod.version,
        author: mod.author,
        fileCount: mod.fileCount,
        bytes: mod.bytes,
        installedAt: mod.installedAt || '',
        workshopId: mod.workshopId || '',
        dllMode: !!mod.dllMode,
        requiresReShade: !!mod.requiresReShade,
      })),
      counts: {
        total: items.length,
        downloaded: items.filter((item) => item.state === 'downloaded').length,
        active: items.filter((item) => item.state === 'active').length,
        direct: items.filter((item) => item.direct).length,
      },
      hasModEngine2: !!game.hasModEngine2,
      hasSeamless: !!seamless.installed,
      seamlessVersion: seamless.version || '',
      gameReady: !!game.found,
    };
  }

  progress() {
    return [...this.jobs.entries()].map(([id, job]) => ({
      id,
      phase: job.phase,
      received: job.received,
      total: job.total,
      error: job.error || '',
      code: job.code || '',
      done: !!job.done,
    }));
  }

  async resolveDirect(entry) {
    const cached = this.releaseCache.get(entry.direct.repo);
    if (cached) return cached;
    const guard = withTimeout(9000);
    try {
      const res = await fetch(`https://api.github.com/repos/${entry.direct.repo}/releases/latest`, {
        headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
        signal: guard.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const re = new RegExp(entry.direct.asset, 'i');
        const asset = (data.assets || []).find((a) => re.test(a.name || ''));
        if (asset?.browser_download_url) {
          const resolved = {
            url: asset.browser_download_url,
            name: asset.name,
            version: String(data.tag_name || '').replace(/^v/i, ''),
            size: Number(asset.size) || 0,
            // GitHub publishes a sha256 digest per asset; verify against it so a
            // corrupted or tampered download is never installed.
            sha256: String(asset.digest || '').replace(/^sha256:/i, '').toLowerCase(),
          };
          this.releaseCache.set(entry.direct.repo, resolved);
          return resolved;
        }
      }
    } catch {
      /* fall through to the pinned asset */
    } finally {
      guard.clear();
    }
    if (entry.direct.fallback) {
      return {
        url: entry.direct.fallback,
        name: entry.direct.fallbackName || `${entry.id}.zip`,
        version: '',
        size: 0,
      };
    }
    throw new Error('The official download file was not found. Press Retry in a minute.');
  }

  // Nexus serves files only to a signed-in browser session and does not allow
  // automated downloads, so the launcher never pretends it can fetch a
  // Nexus-only file. It downloads from free, direct sources instead: GitHub
  // Releases for the built-in entries, or a mirror link the player saved once
  // (ModDB, Google Drive, the author's own host). Anything else is imported.
  async resolveFree(entry) {
    const saved = this.freeLink(entry.id);
    if (!saved) {
      const err = new Error(
        'Nexus does not give the launcher this file anonymously. Press Download to open the in-app Nexus window (sign in once, press Nexus\' free download button once), or save a free mirror link / use Import file for an archive you already have.'
      );
      err.code = 'NEXUS_MANUAL';
      throw err;
    }
    const url = directLink(saved);
    return { url, name: linkFileName(url, entry.id), version: '', size: 0 };
  }

  // Nexus-only mods with no saved mirror: open the launcher's own small Nexus
  // window. The player signs in once (cookies persist) and presses Nexus' own
  // free download button once; the launcher captures that file and finishes
  // the setup. Nothing on Nexus is clicked or bypassed on the player's behalf.
  async resolveNexusWindow(entry, job) {
    if (!this.openNexus) {
      const err = new Error(
        'Nexus does not give the launcher this file directly. Press Download to open the in-app Nexus window, or use Import file for an archive you already have.'
      );
      err.code = 'NEXUS_MANUAL';
      throw err;
    }
    job.phase = 'nexus';
    const got = await this.openNexus(entry, {
      onProgress: (received, total) => {
        job.phase = 'download';
        job.received = received;
        if (total) job.total = total;
      },
    });
    return { url: '', name: got.name, version: '', size: 0, localPath: got.path, temp: got.temp || '' };
  }

  // After the archive lands in the profile it is extracted into the mod
  // library, switched off. Activating is then instant and PLAY still starts
  // only the mods the player switched on.
  async setupEntry(entry, record, game) {
    if (entry.install === 'game') return record;
    try {
      const existing = await this.findInstalled(entry.id, game);
      const installed =
        existing ||
        (await this.mods.installArchive(record.path, {
          name: entry.name,
          author: entry.author,
          description: entry.blurb,
          version: record.version || '',
          workshopId: entry.id,
          enabled: false,
          nexus: { url: entry.url },
        }));
      record.setupId = installed.id;
      record.ready = true;
      record.setupError = '';
      record.setupAt = new Date().toISOString();
    } catch (err) {
      record.ready = false;
      record.setupError = err.message;
    }
    this.data.items[entry.id] = record;
    this.persist();
    return record;
  }

  // Step 1 — download inside the launcher and set the mod up automatically.
  // Nothing is copied into the game here; activation stays a separate switch.
  async download(id, game) {
    const entry = this.entry(id);
    const activeJob = this.jobs.get(entry.id);
    if (activeJob && !activeJob.done) {
      throw new Error('This mod is already downloading — wait for it to finish.');
    }
    const job = { phase: 'resolve', received: 0, total: 0, done: false, error: '', code: '', startedAt: Date.now() };
    this.jobs.set(entry.id, job);
    let temp = '';
    try {
      const file = entry.direct
        ? await this.resolveDirect(entry)
        : this.freeLink(entry.id)
          ? await this.resolveFree(entry)
          : await this.resolveNexusWindow(entry, job);
      let target;
      if (file.localPath) {
        // The in-app Nexus window already saved the archive the player clicked.
        temp = file.temp || path.dirname(file.localPath);
        target = file.localPath;
      } else {
        job.phase = 'download';
        job.total = file.size || 0;
        temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'erdtree-ws-'));
        const safe = String(file.name || `${entry.id}.zip`).replace(/[<>:"/\\|?*]/g, '-');
        target = path.join(temp, safe);
        await downloadToFile(file.url, target, (received, total) => {
          job.received = received;
          if (total) job.total = total;
        });
      }
      const stat = await fsp.stat(target);
      if (stat.size < 1024) throw new Error('The downloaded file is empty or incomplete. Press Retry.');
      if (file.sha256) {
        job.phase = 'verify';
        const actual = await sha256File(target);
        if (actual !== file.sha256) {
          throw new Error('The download failed its integrity check (SHA-256 mismatch). Press Retry — the file was not installed.');
        }
      }
      job.phase = 'save';
      let record = await this.storeArchive(entry, target, {
        version: file.version || '',
        sourceName: path.basename(target),
      });
      job.phase = 'setup';
      record = await this.setupEntry(entry, record, game);
      job.phase = 'done';
      job.done = true;
      return { id: entry.id, record, ready: !!record.ready, setupError: record.setupError || '' };
    } catch (err) {
      job.phase = 'error';
      job.error = err.message;
      job.code = err.code || '';
      job.done = true;
      throw err;
    } finally {
      if (temp) await fsp.rm(temp, { recursive: true, force: true }).catch(() => {});
    }
  }

  async storeArchive(entry, filePath, { version = '', sourceName = '' } = {}) {
    const dir = this.recordDir(entry.id);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    await fsp.mkdir(dir, { recursive: true });
    const safe = String(sourceName || path.basename(filePath) || `${entry.id}.zip`).replace(/[<>:"/\\|?*]/g, '-');
    const target = path.join(dir, safe);
    await fsp.copyFile(filePath, target);
    const stat = await fsp.stat(target);
    const record = {
      id: entry.id,
      name: entry.name,
      author: entry.author,
      file: safe,
      path: target,
      bytes: stat.size,
      version: version || '',
      at: new Date().toISOString(),
      url: entry.url || '',
      img: entry.img || '',
    };
    this.data.items[entry.id] = record;
    this.persist();
    return record;
  }

  // Manual path for Nexus-only mods: the user downloads in the browser, then
  // picks the archive here. It is stored exactly like a launcher download.
  async importArchive(filePath, game, meta = {}) {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile() || stat.size < 128) throw new Error('That file is not a valid mod archive.');
    const entry = meta.id ? this.entry(meta.id) : null;
    if (entry) {
      const record = await this.storeArchive(entry, filePath, {
        version: meta.version || '',
        sourceName: path.basename(filePath),
      });
      return { id: entry.id, record, catalog: await this.catalog(game) };
    }
    const named = meta.name || path.basename(filePath).replace(/\.(zip|7z|rar)$/i, '');
    const installed = await this.mods.installArchive(filePath, {
      name: named,
      workshopId: meta.workshopId || '',
      enabled: false,
      nexus: meta.nexus || null,
    });
    return { installed, catalog: await this.catalog(game) };
  }

  async findInstalled(id, game) {
    const { map } = await this.installedByWorkshopId(game);
    return map.get(String(id)) || null;
  }

  // Step 2 — activate. Extracts the stored archive once, enables it and syncs
  // the game folder. Deactivation never deletes the download.
  async activate(id, game, { force = false } = {}) {
    const entry = this.entry(id);
    if (!game.found) throw new Error('Set your game folder in Settings first — activation copies files into the game.');
    if (entry.install === 'game') {
      // A working Mod Engine 2 is already in the game folder: never download
      // or copy a second one over it.
      if (entry.special === 'modengine2' && game.hasModEngine2) {
        return {
          id: entry.id,
          tool: true,
          already: true,
          result: { ok: true, already: true, gameDir: game.path },
          catalog: await this.catalog(game),
        };
      }
      // A healthy Seamless Co-op install is detected the same way: pressing
      // Activate again must not overwrite a working copy. Repair/reinstall
      // passes force:true to deliberately replace it (configs are backed up).
      if (entry.special === 'seamless' && !force) {
        const st = this.seamless.status(game, this.settings.data);
        if (st.installed) {
          return {
            id: entry.id,
            tool: true,
            already: true,
            result: { ok: true, already: true, gameDir: game.path, version: st.version || '' },
            catalog: await this.catalog(game),
          };
        }
      }
      const rec = this.record(entry.id);
      if (!rec || !fs.existsSync(rec.path)) {
        throw new Error('Download it first, then activate.');
      }
      if (entry.special === 'seamless') {
        const result = await installSeamlessFromZip(game.path, rec.path, {
          password: this.settings.data.seamlessPassword || '',
          playerName: this.settings.data.seamlessPlayerName || '',
        });
        return { id: entry.id, tool: true, result, catalog: await this.catalog(game) };
      }
      if (entry.special === 'modengine2') {
        const result = await installZipToGame(game.path, rec.path, { name: entry.name });
        // The zip ships a default config_eldenring.toml — regenerate ours so
        // PLAY immediately loads the activated mod set.
        await this.mods.sync(game);
        return { id: entry.id, tool: true, result, catalog: await this.catalog(game) };
      }
      const result = await installZipToGame(game.path, rec.path, { name: entry.name });
      return { id: entry.id, tool: true, result, catalog: await this.catalog(game) };
    }

    const existing = await this.findInstalled(entry.id, game);
    if (existing) {
      await this.mods.toggle(existing.id, true);
    } else {
      const rec = this.record(entry.id);
      if (!rec || !fs.existsSync(rec.path)) {
        throw new Error('Download it first, then activate.');
      }
      await this.mods.installArchive(rec.path, {
        name: entry.name,
        author: entry.author,
        description: entry.blurb,
        version: rec.version || '',
        workshopId: entry.id,
        enabled: true,
        nexus: { url: entry.url },
      });
    }
    const sync = await this.mods.sync(game);
    this.settings.save({ lastSync: new Date().toISOString() });
    return { id: entry.id, sync, catalog: await this.catalog(game) };
  }

  // Repair / reinstall a game-folder tool (Seamless Co-op, Mod Engine 2).
  // Downloads a fresh archive from the official source (integrity-checked),
  // then force-installs it. installSeamlessFromZip backs up the existing files
  // and re-applies the player's password/name, so settings are preserved.
  async repairTool(id, game) {
    const entry = this.entry(id);
    if (entry.install !== 'game') throw new Error('Repair is only for tools that install into the game folder.');
    if (!game.found) throw new Error('Set your game folder in Settings first.');
    await this.download(id, game);
    const result = await this.activate(id, game, { force: true });
    return { ...result, repaired: true };
  }

  async deactivate(id, game) {
    const entry = this.entry(id);
    if (entry.install === 'game') {
      throw new Error('This tool installs into the game folder itself, so it cannot be switched off here.');
    }
    const mod = await this.findInstalled(entry.id, game);
    if (!mod) throw new Error('Nothing to deactivate — this mod is not active.');
    await this.mods.toggle(mod.id, false);
    let sync = null;
    if (game.found) {
      sync = await this.mods.sync(game);
      this.settings.save({ lastSync: new Date().toISOString() });
    }
    return { id: entry.id, sync, catalog: await this.catalog(game) };
  }

  async remove(id, game) {
    const entry = this.entry(id);
    const result = { id: entry.id, removedMod: '', removedFile: false };
    const mod = await this.findInstalled(entry.id, game);
    if (mod) {
      await this.mods.trash(mod.id);
      result.removedMod = mod.id;
      if (game.found) await this.mods.sync(game).catch(() => {});
    }
    const dir = this.recordDir(entry.id);
    if (fs.existsSync(dir)) {
      await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
      result.removedFile = true;
    }
    delete this.data.items[entry.id];
    this.persist();
    return { ...result, catalog: await this.catalog(game) };
  }

  async activateAll(game) {
    const targets = CATALOG.filter((entry) => {
      const rec = this.record(entry.id);
      return rec && entry.install !== 'game';
    });
    const activated = [];
    const failed = [];
    for (const entry of targets) {
      try {
        const existing = await this.findInstalled(entry.id, game);
        if (existing && existing.enabled) continue;
        if (existing) await this.mods.toggle(existing.id, true);
        else {
          const rec = this.record(entry.id);
          await this.mods.installArchive(rec.path, {
            name: entry.name,
            author: entry.author,
            description: entry.blurb,
            version: rec.version || '',
            workshopId: entry.id,
            enabled: true,
            nexus: { url: entry.url },
          });
        }
        activated.push(entry.id);
      } catch (err) {
        failed.push({ id: entry.id, name: entry.name, error: err.message });
      }
    }
    if (game.found && activated.length) await this.mods.sync(game);
    return { activated, failed, catalog: await this.catalog(game) };
  }

  async deactivateAll(game) {
    const { installed } = await this.installedByWorkshopId(game);
    const disabled = [];
    for (const mod of installed.values()) {
      if (!mod.enabled) continue;
      await this.mods.toggle(mod.id, false).catch(() => {});
      disabled.push(mod.id);
    }
    if (game.found && disabled.length) await this.mods.sync(game);
    return { disabled, catalog: await this.catalog(game) };
  }

  // Legacy mods installed in earlier versions show up in MY MODS too.
  async uninstallMod(modId, game) {
    const installed = await this.mods.list(game);
    const mod = installed.find((item) => item.id === modId);
    if (!mod) throw new Error('That mod is not in your mods.');
    await this.mods.trash(mod.id);
    if (mod.workshopId) {
      const dir = this.recordDir(mod.workshopId);
      await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
      delete this.data.items[mod.workshopId];
      this.persist();
    }
    return { id: mod.id, name: mod.name };
  }

  async repair(game) {
    if (!game.found) throw new Error('Set your game folder first — repair copies activated mods into the game.');
    const result = await this.mods.sync(game);
    return { ...result };
  }
}

module.exports = { Workshop };
