/* LEGACY — the launcher now updates from GitHub Releases (see
 * src/main/updater.js and scripts/test-updater-github.js). This delta-feed
 * generator is kept for reference only and is no longer used by the app.
 *
 * Erdtree Launcher — update feed generator.
 *
 * Usage:
 *   node scripts/make-update.js --source release/win-unpacked/resources/app \
 *        --out release/feed --version 2.1.0 --notes "Friends system;Best Builds"
 *
 * The generated folder is a static update feed: manifest.json plus the exact
 * app files at their relative paths. Host it anywhere over HTTPS (or a local
 * HTTP server while testing) and point Settings → Updates → Update feed at it.
 *
 * Only changed files are downloaded by the launcher; the manifest carries a
 * sha256 + size for every file so the launcher can diff its own install.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function walk(root, rel = '') {
  const out = [];
  const dir = path.join(root, rel);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(root, next));
    else if (entry.isFile()) out.push(next);
  }
  return out;
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function latestAppDir(root) {
  const candidates = [];
  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const app = path.join(dir, 'win-unpacked', 'resources', 'app');
    if (fs.existsSync(app)) candidates.push({ app, mtime: fs.statSync(app).mtimeMs });
    const direct = path.join(dir, 'resources', 'app');
    if (fs.existsSync(direct)) candidates.push({ app: direct, mtime: fs.statSync(direct).mtimeMs });
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.app || '';
}

function main() {
  const root = path.resolve(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const source = path.resolve(root, arg('source', latestAppDir(path.join(root, 'release'))));
  const out = path.resolve(root, arg('out', path.join(root, 'release', 'feed')));
  const version = String(arg('version', pkg.version)).replace(/^v/i, '');
  const notes = arg('notes', '')
    .split(/[;|]/)
    .map((line) => line.trim())
    .filter(Boolean);
  const full = arg('full', '');

  if (!source || !fs.existsSync(source)) {
    console.error('[make-update] App source not found. Build first (npm run package) or pass --source <resources/app>.');
    process.exit(1);
  }
  if (path.resolve(source) === path.resolve(out)) {
    console.error('[make-update] Source and output must be different folders.');
    process.exit(1);
  }

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const files = {};
  const relative = walk(source);
  for (const rel of relative) {
    const from = path.join(source, rel);
    const buffer = fs.readFileSync(from);
    files[rel] = { sha256: sha256(buffer), size: buffer.length };
    copyFile(from, path.join(out, rel));
  }

  const manifest = {
    version,
    releasedAt: new Date().toISOString(),
    notes: notes.length ? notes : [`Erdtree Launcher v${version}`],
    files,
  };

  if (full && fs.existsSync(full)) {
    const buffer = fs.readFileSync(full);
    const fileName = path.basename(full);
    copyFile(full, path.join(out, fileName));
    manifest.full = { url: fileName, sha256: sha256(buffer), size: buffer.length };
  }

  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const bytes = Object.values(files).reduce((sum, file) => sum + file.size, 0);
  console.log(`[make-update] v${version} → ${out}`);
  console.log(`[make-update] ${relative.length} files, ${(bytes / (1024 * 1024)).toFixed(2)} MB total`);
  console.log(`[make-update] Launchers on older versions download only files whose sha256 differs.`);
}

if (require.main === module) main();

module.exports = { sha256, walk };
