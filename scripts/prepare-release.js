/* Erdtree Launcher — release preparation (publisher side).
 *
 * Prepares everything a GitHub Release needs, but NEVER publishes:
 *   1. injects the official repository into src/main/updater.js (OFFICIAL_REPO)
 *   2. sets the package version
 *   3. builds the Windows installer + portable exe into release-<version>/
 *   4. computes SHA-256 for both artifacts
 *   5. writes RELEASE.md (notes + asset digests) and prints the exact
 *      `gh release create` command for the publisher to run after review.
 *
 * Usage:
 *   node scripts/prepare-release.js --repo owner/name --version 2.8.0 \
 *        --notes "Fixed X;Added Y"
 *
 * Publishing is a separate, explicit step (gh release create … or pushing a
 * v* tag when using the GitHub Actions workflow). Nothing here uploads.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { normalizeRepo } = require('../src/main/updater');

const root = path.resolve(__dirname, '..');

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  let position = 0;
  for (;;) {
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, position);
    if (!bytes) break;
    hash.update(buffer.subarray(0, bytes));
    position += bytes;
  }
  fs.closeSync(fd);
  return hash.digest('hex');
}

function main() {
  const repo = normalizeRepo(arg('repo'));
  const version = arg('version').replace(/^v/i, '');
  const notes = arg('notes', 'Bug fixes and improvements.');
  if (!repo) {
    console.error('[prepare-release] --repo owner/name is required (the official GitHub repository).');
    process.exit(1);
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('[prepare-release] --version must look like 2.8.0');
    process.exit(1);
  }

  // 1) configure-once: bake the official repo into the updater.
  const updaterFile = path.join(root, 'src', 'main', 'updater.js');
  const updaterSrc = fs.readFileSync(updaterFile, 'utf8');
  if (!/const OFFICIAL_REPO = '[^']*';/.test(updaterSrc)) {
    console.error('[prepare-release] OFFICIAL_REPO constant not found in updater.js');
    process.exit(1);
  }
  fs.writeFileSync(updaterFile, updaterSrc.replace(/const OFFICIAL_REPO = '[^']*';/, `const OFFICIAL_REPO = '${repo}';`), 'utf8');

  // 2) version bump.
  const pkgFile = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // 3) build into a fresh folder — previous releases are never touched.
  const output = path.join(root, `release-${version}`);
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const build = spawnSync(
    npx,
    ['electron-builder', '--win', '--x64', `--config.directories.output=${output}`],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
  );
  if (build.status !== 0) process.exit(build.status || 1);

  // 4) digests for the two artifacts.
  const setup = path.join(output, `Erdtree-Launcher-Setup-${version}.exe`);
  const portable = path.join(output, `Erdtree-Launcher-${version}-portable.exe`);
  for (const file of [setup, portable]) {
    if (!fs.existsSync(file)) {
      console.error(`[prepare-release] expected artifact missing: ${file}`);
      process.exit(1);
    }
  }
  const assets = [setup, portable].map((file) => ({
    name: path.basename(file),
    size: fs.statSync(file).size,
    sha256: sha256File(file),
  }));

  // 5) release notes + the exact publish command (run it yourself, after review).
  const bullets = notes
    .split(';')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => `- ${n}`)
    .join('\n');
  const mb = (n) => (n / (1024 * 1024)).toFixed(1);
  const releaseMd = [
    `# Erdtree Launcher v${version}`,
    '',
    bullets,
    '',
    '## Downloads',
    '',
    '| File | Size | SHA-256 |',
    '| --- | --- | --- |',
    ...assets.map((a) => `| ${a.name} | ${mb(a.size)} MB | \`${a.sha256}\` |`),
    '',
    'The launcher verifies each download against the SHA-256 digest GitHub',
    'publishes for the asset before installing it. Settings, characters,',
    'friends, builds and saves are preserved across updates.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(output, 'RELEASE.md'), releaseMd, 'utf8');

  console.log('\n[prepare-release] ready. Review, then publish with:');
  console.log(
    `  gh release create v${version} "${setup}" "${portable}" --repo ${repo} --title "Erdtree Launcher v${version}" --notes-file "${path.join(output, 'RELEASE.md')}"`
  );
  console.log('[prepare-release] nothing was uploaded.');
}

main();