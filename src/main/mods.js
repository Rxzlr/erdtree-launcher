const fsp = require('fs/promises');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { shell } = require('electron');

const MANIFEST = 'erdtree-mod.json';
const SYNC_MARKER = '.erdtree-synced';
const CONFIG_NAME = 'config_eldenring.toml';
const COVER = '.cover';
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

function run(cmd, args, timeout = 120000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || stdout || err.message).toString().trim()));
      resolve({ stdout, stderr });
    });
  });
}

function slugify(name) {
  const cleaned = String(name)
    .replace(/["'<>|:*?]/g, '')
    .replace(/[\\/.]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
  return cleaned || 'mod';
}

async function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  return out;
}

async function extractArchive(file, dest) {
  const isZip = /\.zip$/i.test(file);
  try {
    await run('tar.exe', ['-xf', file, '-C', dest]);
    return;
  } catch (err) {
    if (!isZip) {
      throw new Error('ما قدرت أفك الضغط. الصيغة المدعومة: ZIP، وأحياناً 7z/RAR. جرّب تفكها يدوياً وتستخدم "تركيب من مجلد".');
    }
  }
  const psDest = dest.replace(/'/g, "''");
  const psFile = file.replace(/'/g, "''");
  await run('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `Expand-Archive -LiteralPath '${psFile}' -DestinationPath '${psDest}' -Force`,
  ]);
}

async function flattenRoot(dir) {
  let current = dir;
  for (let depth = 0; depth < 3; depth += 1) {
    const entries = await fsp.readdir(current, { withFileTypes: true }).catch(() => []);
    const dirs = entries.filter((e) => e.isDirectory());
    const files = entries.filter((e) => e.isFile() && !/^__MACOSX$/i.test(e.name));
    if (dirs.length === 1 && files.length === 0) {
      current = path.join(current, dirs[0].name);
      continue;
    }
    break;
  }
  // A lot of mod archives wrap everything inside a `mod` folder.
  const modDir = path.join(current, 'mod');
  try {
    const stat = await fsp.stat(modDir);
    if (stat.isDirectory()) {
      const inner = await fsp.readdir(modDir);
      const hasPayload = inner.some((name) => !/\.(txt|md)$/i.test(name));
      if (hasPayload) return modDir;
    }
  } catch {
    /* no wrapper */
  }
  return current;
}

async function findCover(dir) {
  const files = await walk(dir);
  const images = files.filter((f) => IMAGE_EXT.test(f) && fs.statSync(f).size < 6 * 1024 * 1024);
  if (!images.length) return null;
  const score = (file) => {
    const rel = path.relative(dir, file).toLowerCase();
    const base = path.basename(rel);
    let value = 0;
    if (/^(cover|preview|thumbnail|thumb|image|screenshot|logo)/.test(base)) value += 20;
    if (/\.(png|webp)$/i.test(base)) value += 4;
    if (!rel.includes(path.sep)) value += 8;
    if (/screenshot/i.test(rel)) value += 3;
    value -= rel.split(path.sep).length * 2;
    return value;
  };
  images.sort((a, b) => score(b) - score(a));
  return images[0];
}

function isCompatible(mod, game) {
  if (mod.compatible === false) {
    return { ok: false, reason: mod.compatibilityReason || 'المود معمول لنسخة مختلفة من اللعبة.' };
  }
  if (mod.targetGame && mod.targetGame !== 'eldenring') {
    return { ok: false, reason: 'المود مو معمول للعبة Elden Ring.' };
  }
  if (mod.requiresModEngine && game && game.found && !game.hasModEngine2) {
    return { ok: false, reason: 'هذا المود يحتاج Mod Engine 2 داخل مجلد اللعبة.' };
  }
  return { ok: true, reason: '' };
}

class ModManager {
  constructor(userData) {
    this.root = path.join(userData, 'mods');
  }

  async ensureRoot() {
    await fsp.mkdir(this.root, { recursive: true });
    return this.root;
  }

  async list(game) {
    await this.ensureRoot();
    const dirs = await fsp.readdir(this.root, { withFileTypes: true }).catch(() => []);
    const mods = [];
    for (const dirent of dirs) {
      if (!dirent.isDirectory()) continue;
      const dir = path.join(this.root, dirent.name);
      let manifest;
      try {
        manifest = JSON.parse(await fsp.readFile(path.join(dir, MANIFEST), 'utf8'));
      } catch {
        continue;
      }
      const compat = isCompatible({ ...manifest, id: dirent.name }, game);
      const imagePath = manifest.image ? path.join(dir, manifest.image) : '';
      const hasImage = imagePath && fs.existsSync(imagePath);
      mods.push({
        ...manifest,
        id: dirent.name,
        dir,
        image: hasImage ? `erdmod://local/${encodeURIComponent(dirent.name)}/${encodeURIComponent(manifest.image)}` : '',
        compatible: compat.ok,
        compatibilityReason: compat.reason,
      });
    }
    mods.sort((a, b) => (a.installedAt || '').localeCompare(b.installedAt || ''));
    return mods;
  }

  async uniqueId(name) {
    const base = slugify(name);
    let id = base;
    let i = 2;
    while (fs.existsSync(path.join(this.root, id))) id = `${base}-${i++}`;
    return id;
  }

  async installFolder(folderPath, displayName, meta = {}) {
    await this.ensureRoot();
    const name = displayName || path.basename(folderPath);
    const id = await this.uniqueId(meta.id || name);
    const dest = path.join(this.root, id);
    const source = await flattenRoot(folderPath);
    await fsp.cp(source, dest, { recursive: true });

    let embedded = {};
    try {
      embedded = JSON.parse(await fsp.readFile(path.join(dest, MANIFEST), 'utf8'));
    } catch {
      embedded = {};
    }

    const files = await walk(dest);
    const dlls = files.filter((f) => /\.dll$/i.test(f)).map((f) => path.relative(dest, f));
    let bytes = 0;
    for (const f of files) {
      try {
        bytes += (await fsp.stat(f)).size;
      } catch {
        /* ignored */
      }
    }

    const cover = await findCover(dest);
    let image = '';
    if (cover) {
      const ext = path.extname(cover).toLowerCase() || '.png';
      const target = `${COVER}${ext}`;
      await fsp.copyFile(cover, path.join(dest, target));
      image = target;
    }

    const compatible = meta.compatible !== undefined ? meta.compatible : embedded.compatible !== false;
    const enabled = meta.enabled !== undefined ? !!meta.enabled : compatible !== false;
    // ReShade preset packs ship only presets/shaders — they do nothing without
    // the ReShade runtime itself. Flag them so the UI can warn honestly.
    const requiresReShade =
      !!embedded.requiresReShade || (dlls.length === 0 && files.some((f) => /reshade/i.test(f) || /\.fx$/i.test(f)));
    const manifest = {
      name: String(embedded.name || meta.name || name).trim(),
      enabled,
      dllMode: dlls.length > 0,
      dlls,
      fileCount: files.length,
      bytes,
      installedAt: new Date().toISOString(),
      source: path.basename(folderPath),
      image,
      nexus: meta.nexus || embedded.nexus || null,
      compatible,
      compatibilityReason: meta.compatibilityReason || embedded.compatibilityReason || '',
      requiresReShade,
      targetGame: embedded.targetGame || 'eldenring',
      requiresModEngine: !!embedded.requiresModEngine,
      gameVersion: embedded.gameVersion || '',
      description: embedded.description || meta.description || '',
      version: embedded.version || meta.version || '',
      author: embedded.author || meta.author || '',
      workshopId: embedded.workshopId || meta.workshopId || '',
    };
    await fsp.writeFile(path.join(dest, MANIFEST), JSON.stringify(manifest, null, 2), 'utf8');
    return { id, ...manifest, imageUrl: image ? `erdmod://local/${encodeURIComponent(id)}/${encodeURIComponent(image)}` : '' };
  }

  async installArchive(filePath, meta = {}) {
    const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'erdtree-'));
    try {
      await extractArchive(filePath, temp);
      const base = path.basename(filePath).replace(/\.(zip|7z|rar)$/i, '');
      return await this.installFolder(temp, meta.name || base, meta);
    } finally {
      await fsp.rm(temp, { recursive: true, force: true }).catch(() => {});
    }
  }

  async readManifest(id) {
    return JSON.parse(await fsp.readFile(path.join(this.root, id, MANIFEST), 'utf8'));
  }

  async toggle(id, enabled) {
    const file = path.join(this.root, id, MANIFEST);
    const manifest = JSON.parse(await fsp.readFile(file, 'utf8'));
    if (enabled && manifest.compatible === false) {
      throw new Error('هذا المود مو متوافق مع نسختك');
    }
    manifest.enabled = !!enabled;
    await fsp.writeFile(file, JSON.stringify(manifest, null, 2), 'utf8');
    return { id, ...manifest };
  }

  async remove(id) {
    const clean = String(id || '').replace(/[\\/]/g, '');
    if (!clean || clean === '.' || clean === '..') throw new Error('معرّف المود غير صالح.');
    await fsp.rm(path.join(this.root, clean), { recursive: true, force: true });
    return { id: clean };
  }

  // Uninstall that is recoverable: the mod folder goes to the Windows Recycle
  // Bin instead of being deleted outright.
  async trash(id) {
    const clean = String(id || '').replace(/[\\/]/g, '');
    if (!clean || clean === '.' || clean === '..') throw new Error('معرّف المود غير صالح.');
    const dir = path.join(this.root, clean);
    if (!fs.existsSync(dir)) throw new Error('هذا المود مو موجود أصلاً.');
    try {
      await shell.trashItem(dir);
    } catch {
      await fsp.rm(dir, { recursive: true, force: true });
    }
    return { id: clean };
  }

  tomlString(p) {
    return `"${p.replace(/\\/g, '\\\\')}"`;
  }

  // seamlessDll: absolute path to SeamlessCoop\ersc.dll when PLAY runs in
  // Seamless mode through Mod Engine 2 (the same pattern the community uses:
  // ME2 injects ersc.dll, so co-op and mods load together).
  buildToml(mods, { seamlessDll = '', modDir = '' } = {}) {
    const enabled = mods.filter((m) => m.enabled && m.compatible !== false);
    const dllPaths = [];
    for (const mod of enabled) {
      if (!mod.dllMode) continue;
      for (const dll of mod.dlls || []) {
        // Never point Mod Engine 2 at a DLL that is not actually on disk.
        if (modDir && !fs.existsSync(path.join(modDir, mod.id, dll))) continue;
        dllPaths.push(`mod\\${mod.id}\\${dll}`);
      }
    }
    if (seamlessDll && fs.existsSync(seamlessDll)) dllPaths.push(seamlessDll);
    const lines = [];
    lines.push('# Generated by Erdtree Launcher — do not edit by hand.');
    lines.push(`# generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('[modengine]');
    lines.push('debug = false');
    lines.push(`external_dlls = [${dllPaths.map((p) => this.tomlString(p)).join(', ')}]`);
    lines.push('');
    lines.push('[extension.mod_loader]');
    lines.push('enabled = true');
    lines.push('loose_params = false');
    lines.push('mods = [');
    for (const mod of enabled) {
      lines.push(
        `    { name = ${this.tomlString(mod.name)}, enabled = true, path = ${this.tomlString(`mod\\${mod.id}`)} },`
      );
    }
    lines.push(']');
    lines.push('');
    lines.push('[extension.scyllaversion_check]');
    lines.push('enabled = false');
    lines.push('');
    lines.push('[extension.debug]');
    lines.push('enabled = false');
    lines.push('');
    return lines.join('\n');
  }

  // Rewrites only config_eldenring.toml (no file copies). PLAY calls this right
  // before launching through Mod Engine 2 so the config always matches the
  // launch mode: Seamless mode adds ersc.dll to external_dlls, normal mode
  // does not.
  async writeConfig(game, { seamlessDll = '' } = {}) {
    if (!game || !game.found) throw new Error('مسار اللعبة غير محدد — ما أقدر أكتب إعدادات المودات.');
    const mods = await this.list(game);
    const configPath = path.join(game.path, CONFIG_NAME);
    let backedUp = false;
    if (fs.existsSync(configPath)) {
      const head = await fsp.readFile(configPath, 'utf8').catch(() => '');
      if (!head.includes('Erdtree Launcher')) {
        await fsp.copyFile(configPath, `${configPath}.original`);
        backedUp = true;
      }
    }
    await fsp.writeFile(configPath, this.buildToml(mods, { seamlessDll, modDir: game.modDir }), 'utf8');
    return { configPath, backedUp, enabled: mods.filter((m) => m.enabled).length, total: mods.length };
  }

  async sync(game, { seamlessDll = '' } = {}) {
    if (!game || !game.found) throw new Error('مسار اللعبة غير محدد — ما أقدر أنسخ المودات.');
    const mods = await this.list(game);
    const modDir = game.modDir;
    await fsp.mkdir(modDir, { recursive: true });

    let copied = 0;
    let removed = 0;
    const warnings = [];

    for (const mod of mods) {
      const target = path.join(modDir, mod.id);
      const marker = path.join(target, SYNC_MARKER);

      if (!mod.enabled) {
        if (fs.existsSync(target)) {
          if (fs.existsSync(marker)) {
            await fsp.rm(target, { recursive: true, force: true });
            removed++;
          }
        }
        continue;
      }

      if (fs.existsSync(target) && !fs.existsSync(marker)) {
        warnings.push(`تخطيت "${mod.name}" — فيه مجلد بنفس الاسم في اللعبة مو تابع للانشر.`);
        continue;
      }

      await fsp.rm(target, { recursive: true, force: true });
      await fsp.cp(path.join(this.root, mod.id), target, { recursive: true });
      await fsp.writeFile(marker, JSON.stringify({ id: mod.id, syncedAt: new Date().toISOString() }), 'utf8');
      copied++;
      if (mod.dllMode) {
        for (const dll of mod.dlls || []) {
          if (!fs.existsSync(path.join(target, dll))) {
            warnings.push(`"${mod.name}": ملف ${dll} مو موجود داخل مجلد المود — ما راح ينحقن.`);
          }
        }
      }
    }

    const config = await this.writeConfig(game, { seamlessDll });

    return {
      copied,
      removed,
      warnings,
      backedUp: config.backedUp,
      configPath: config.configPath,
      enabled: config.enabled,
      total: config.total,
      modEngine2: !!game.hasModEngine2,
    };
  }

  async openRoot() {
    await this.ensureRoot();
    const error = await shell.openPath(this.root);
    if (error) throw new Error(error);
    return { ok: true };
  }

  resolveImage(relative) {
    const clean = String(relative || '').replace(/\\/g, '/');
    if (!clean || clean.includes('..')) return null;
    const [id, ...rest] = clean.split('/');
    const file = path.join(this.root, decodeURIComponent(id), ...rest.map((p) => decodeURIComponent(p)));
    const normalized = path.normalize(file);
    if (!normalized.startsWith(path.normalize(this.root + path.sep))) return null;
    if (!IMAGE_EXT.test(normalized)) return null;
    return fs.existsSync(normalized) ? normalized : null;
  }
}

module.exports = { ModManager, MANIFEST, isCompatible };
