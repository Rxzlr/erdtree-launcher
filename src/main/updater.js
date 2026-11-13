const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const os = require('os');
const { spawnSync } = require('child_process');

// Official update source: GitHub Releases of the launcher repository.
// The publisher sets OFFICIAL_REPO once (release workflow); every future
// release is then picked up automatically by all installed launchers.
const OFFICIAL_REPO = 'Rxzlr/erdtree-launcher';
const GITHUB_API = 'https://api.github.com';
const MAX_REDIRECTS = 6;

// Test hook only — lets the automated tests point the updater at a local
// mock of the GitHub API. Production always uses api.github.com.
function apiBase() {
  return String(process.env.ERDTREE_UPDATE_API_BASE || GITHUB_API).replace(/\/+$/, '');
}

function normalizeRepo(input) {
  let value = String(input || '').trim();
  if (!value) return '';
  value = value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\/releases\/?$/i, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '');
  const parts = value.split('/').filter(Boolean);
  if (parts.length !== 2) return '';
  const [owner, name] = parts;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return '';
  return `${owner}/${name}`;
}

function compareVersions(a, b) {
  const parse = (value) =>
    String(value || '0')
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .map((part) => parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const x = left[i] || 0;
    const y = right[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

// Release notes arrive as GitHub markdown. Turn them into short bullet
// lines for the update dialog; fall back to a pointer to GitHub.
function parseNotes(body) {
  const text = String(body || '').replace(/\r\n/g, '\n').trim();
  if (!text) return ['See the release notes on GitHub.'];
  const bullets = [];
  const plain = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || /^#{1,6}\s/.test(line)) continue;
    const match = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (match) bullets.push(match[1].replace(/\*\*/g, '').trim());
    else plain.push(line.replace(/\*\*/g, '').trim());
    if (bullets.length + plain.length >= 40) break;
  }
  const picked = (bullets.length ? bullets : plain).filter(Boolean).slice(0, 20);
  return picked.length ? picked : ['See the release notes on GitHub.'];
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

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

function request(url, { timeout = 20000, redirects = MAX_REDIRECTS, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error('Update source URL is not valid.'));
      return;
    }
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.get(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          'User-Agent': 'Erdtree-Launcher-Updater',
          Accept: 'application/vnd.github+json, application/json, */*',
          'Cache-Control': 'no-cache',
          ...headers,
        },
        timeout,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirects <= 0) {
            reject(new Error('Too many redirects from the update source.'));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          request(next, { timeout, redirects: redirects - 1, headers }).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          const err = new Error(`Update source returned HTTP ${res.statusCode}.`);
          err.status = res.statusCode;
          reject(err);
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ buffer: Buffer.concat(chunks), headers: res.headers }));
        res.on('error', reject);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('The update source timed out.'));
    });
    req.on('error', reject);
  });
}

// Update packages may only ever be fetched from GitHub-owned hosts (or the
// local test mock). Anything else is refused before a single byte is read.
function allowedAssetHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (host === 'github.com' || host === 'api.github.com' || host.endsWith('.githubusercontent.com')) return true;
  try {
    const base = new URL(apiBase());
    if (host === base.hostname.toLowerCase()) return true;
  } catch {
    /* invalid base — fall through to deny */
  }
  return false;
}

function openStream(url, { timeout = 120000, redirects = MAX_REDIRECTS, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error('Update download URL is not valid.'));
      return;
    }
    if (!allowedAssetHost(parsed.hostname)) {
      reject(new Error(`Refusing to download an update from an untrusted host (${parsed.hostname}).`));
      return;
    }
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.get(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          'User-Agent': 'Erdtree-Launcher-Updater',
          Accept: 'application/octet-stream, */*',
          ...headers,
        },
        timeout,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirects <= 0) {
            reject(new Error('Too many redirects while downloading the update.'));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          openStream(next, { timeout, redirects: redirects - 1, headers }).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          res.resume();
          const err = new Error(`Update download returned HTTP ${res.statusCode}.`);
          err.status = res.statusCode;
          reject(err);
          return;
        }
        resolve(res);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('The update download timed out.'));
    });
    req.on('error', reject);
  });
}

function copyTree(source, target) {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      copyTree(from, to);
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function psQuote(value) {
  return String(value).replace(/'/g, "''");
}

class Updater {
  constructor({ userData, version, appRoot, packaged = false, getRepo, getFeedUrl, emit, portableFile = '' }) {
    this.userData = userData;
    this.version = version;
    this.appRoot = appRoot;
    this.packaged = !!packaged;
    this.getRepo = getRepo || getFeedUrl || (() => '');
    this.emit = emit || (() => {});
    this.portableFile = portableFile || process.env.PORTABLE_EXECUTABLE_FILE || '';
    this.dir = path.join(userData, 'updates');
    this.manifest = null;
    this.checkResult = null;
    this.downloaded = null;
    this.busy = false;
    this.state = {
      status: 'idle',
      current: version,
      latest: '',
      available: false,
      configured: false,
      progress: 0,
      notes: [],
      message: '',
      error: '',
      checkedAt: null,
      lastResult: null,
    };
    // GitHub Releases ship full packages (installer / portable exe), so the
    // old per-file delta patching is intentionally disabled.
    this.patchable = false;
  }

  repo() {
    return normalizeRepo(this.getRepo()) || normalizeRepo(OFFICIAL_REPO);
  }

  feed() {
    return this.repo();
  }

  manifestUrl() {
    const repo = this.repo();
    if (!repo) return '';
    return `${apiBase()}/repos/${repo}/releases/latest`;
  }

  async check({ force = false } = {}) {
    const repo = this.repo();
    if (!repo) {
      this.state = {
        ...this.state,
        status: 'idle',
        configured: false,
        available: false,
        message: 'Add the GitHub repository (owner/name) to enable automatic updates.',
      };
      return { ok: false, configured: false, current: this.version, available: false, message: this.state.message };
    }
    this.busy = true;
    this.state = { ...this.state, status: 'checking', error: '', configured: true };
    this.emit({ type: 'update:state', state: this.state });
    try {
      const response = await request(this.manifestUrl(), { timeout: 15000 });
      let release;
      try {
        release = JSON.parse(response.buffer.toString('utf8'));
      } catch {
        throw new Error('GitHub did not return valid release JSON.');
      }
      if (!release || !release.tag_name) throw new Error('The GitHub release is missing a version tag.');
      const latest = String(release.tag_name).replace(/^v/i, '');
      const newer = compareVersions(latest, this.version) > 0;
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const isExe = (asset) => /\.exe$/i.test(String(asset.name || ''));
      const exeAssets = assets.filter(isExe);
      const installer = exeAssets.find((asset) => /setup|installer/i.test(asset.name));
      const portable = exeAssets.find((asset) => /portable/i.test(asset.name));
      const single = exeAssets.length === 1 ? exeAssets[0] : null;
      const asset = this.portableFile ? portable || installer || single : installer || portable || single;
      const digest = asset && asset.digest ? String(asset.digest).replace(/^sha256:/i, '').toLowerCase() : '';
      const full = asset
        ? {
            url: String(asset.browser_download_url || ''),
            sha256: digest,
            size: Number(asset.size) || 0,
            name: String(asset.name || ''),
          }
        : null;
      // An update is only offered when GitHub publishes a SHA-256 digest for
      // the package — without it the download cannot be authenticated.
      const available = newer && !!(full && full.url && full.sha256);
      const notes = parseNotes(release.body);
      const mode = this.portableFile ? 'portable' : 'installer';
      const bytes = full ? full.size : 0;
      this.manifest = { release, full };
      this.checkResult = {
        ok: true,
        configured: true,
        current: this.version,
        latest,
        available,
        notes,
        releasedAt: release.published_at || '',
        bytes,
        mode,
        patchable: false,
        changedCount: 0,
        repo,
        htmlUrl: release.html_url || '',
        assetName: full ? full.name : '',
        full,
      };
      this.state = {
        ...this.state,
        status: available ? 'available' : 'current',
        latest,
        available,
        progress: 0,
        notes,
        error: '',
        message: available
          ? `Version ${latest} is ready on GitHub.`
          : newer
            ? `Version ${latest} is published, but its package has no SHA-256 checksum yet — skipped for safety.`
            : 'You are on the latest version.',
        checkedAt: new Date().toISOString(),
        lastResult: {
          latest,
          available,
          bytes,
          mode,
          notes,
          releasedAt: release.published_at || '',
          repo,
          htmlUrl: release.html_url || '',
          full,
        },
      };
      this.emit({ type: 'update:state', state: this.state });
      return this.checkResult;
    } catch (err) {
      if (err.status === 404) {
        // Repository exists but has no releases yet (or the name is wrong).
        this.state = {
          ...this.state,
          status: 'current',
          latest: '',
          available: false,
          progress: 0,
          error: '',
          message: 'No releases found on GitHub for this repository yet.',
          checkedAt: new Date().toISOString(),
          lastResult: null,
        };
        this.emit({ type: 'update:state', state: this.state });
        return {
          ok: true,
          configured: true,
          current: this.version,
          latest: '',
          available: false,
          noReleases: true,
          message: this.state.message,
        };
      }
      const message =
        err.status === 403
          ? 'GitHub rate limit reached — try checking again in a few minutes.'
          : err.message;
      this.state = {
        ...this.state,
        status: 'error',
        configured: true,
        error: message,
        message,
        checkedAt: new Date().toISOString(),
      };
      this.emit({ type: 'update:state', state: this.state });
      if (force) throw err;
      return { ok: false, configured: true, current: this.version, available: false, error: message };
    } finally {
      this.busy = false;
    }
  }

  // Streams the package to a `.part` file while hashing it incrementally.
  // Interrupted downloads keep the `.part` and resume with a Range request;
  // a package whose SHA-256 does not match GitHub's digest is deleted and
  // never becomes installable.
  async downloadFile(url, target, expected, onBytes) {
    const part = `${target}.part`;
    await fsp.mkdir(path.dirname(target), { recursive: true });
    let hash = crypto.createHash('sha256');
    let received = 0;
    let resume = 0;
    try {
      resume = (await fsp.stat(part)).size;
    } catch {
      resume = 0;
    }
    if (resume > 0) {
      const handle = await fsp.open(part, 'r');
      try {
        const buffer = Buffer.alloc(1024 * 1024);
        let position = 0;
        for (;;) {
          const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
          if (!bytesRead) break;
          hash.update(buffer.subarray(0, bytesRead));
          position += bytesRead;
        }
        received = position;
      } finally {
        await handle.close();
      }
    }
    let res = await openStream(url, {
      timeout: 120000,
      headers: resume > 0 ? { Range: `bytes=${resume}-` } : {},
    });
    if (resume > 0 && res.statusCode !== 206) {
      // Server ignored the resume request — start over cleanly.
      res.destroy();
      hash = crypto.createHash('sha256');
      received = 0;
      resume = 0;
      await fsp.rm(part, { force: true });
      res = await openStream(url, { timeout: 120000 });
    }
    const total = resume + (Number(res.headers['content-length']) || 0);
    const out = fs.createWriteStream(part, { flags: resume > 0 ? 'a' : 'w' });
    await new Promise((resolve, reject) => {
      res.on('data', (chunk) => {
        hash.update(chunk);
        received += chunk.length;
        if (onBytes) onBytes(received, total || received);
        if (!out.write(chunk)) {
          res.pause();
          out.once('drain', () => res.resume());
        }
      });
      res.on('end', () => out.end(resolve));
      res.on('error', (err) => {
        out.destroy();
        reject(err);
      });
      out.on('error', (err) => {
        res.destroy();
        reject(err);
      });
    });
    const digest = hash.digest('hex');
    if (expected && digest !== expected) {
      await fsp.rm(part, { force: true });
      throw new Error(`Checksum mismatch for ${path.basename(target)} — the update was rejected as not authentic.`);
    }
    await fsp.rm(target, { force: true });
    await fsp.rename(part, target);
    return received;
  }

  async download() {
    const check = this.checkResult;
    if (!check || !check.available) throw new Error('No update is available. Check for updates first.');
    const full = this.manifest && this.manifest.full;
    if (!full || !full.url) throw new Error('The release has no downloadable package — check again.');
    if (!full.sha256) throw new Error('The release package has no SHA-256 digest — refusing to download an unverifiable update.');
    this.busy = true;
    this.state = { ...this.state, status: 'downloading', progress: 0, error: '' };
    this.emit({ type: 'update:state', state: this.state });
    const versionDir = path.join(this.dir, check.latest);
    // Keep the directory (and any `.part`) so interrupted downloads resume.
    await fsp.mkdir(versionDir, { recursive: true });
    try {
      let fileName = String(full.name || '').replace(/[\\/:*?"<>|]/g, '_').trim();
      if (!fileName || fileName.includes('..') || !/\.exe$/i.test(fileName)) fileName = 'Erdtree-Launcher-update.exe';
      const target = path.join(versionDir, fileName);
      let lastPct = -1;
      const received = await this.downloadFile(full.url, target, full.sha256, (bytes, total) => {
        const pct = Math.min(99, Math.round((bytes / Math.max(1, total)) * 100));
        if (pct !== lastPct) {
          lastPct = pct;
          this.state = { ...this.state, progress: pct, downloadedBytes: bytes, totalBytes: total };
          this.emit({ type: 'update:state', state: this.state });
        }
      });
      this.downloaded = {
        mode: this.portableFile ? 'portable' : 'installer',
        dir: versionDir,
        file: target,
        bytes: received,
        verified: true,
      };
      this.state = {
        ...this.state,
        status: 'ready',
        progress: 100,
        message: 'Update downloaded and verified. Restarting to install…',
      };
      this.emit({ type: 'update:state', state: this.state });
      return { ok: true, ...this.downloaded, version: check.latest };
    } catch (err) {
      this.state = { ...this.state, status: 'error', error: err.message, message: err.message };
      this.emit({ type: 'update:state', state: this.state });
      throw err;
    } finally {
      this.busy = false;
    }
  }

  // PowerShell helper that waits for the launcher to exit, installs the
  // verified package and relaunches. userData (settings, characters,
  // friends, builds, saves) is never in scope. Exposed for tests.
  buildInstallScript(info) {
    const exePath = this.portableFile || process.execPath;
    let script;
    if (info.mode === 'portable') {
      // Antivirus/indexer can briefly lock a freshly downloaded exe, so retry
      // the copy. If every attempt fails we still relaunch the OLD exe — the
      // user is never left without a launcher and can retry the update.
      script = [
        "$ErrorActionPreference='Stop'",
        `Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
        'Start-Sleep -Milliseconds 900',
        `for ($i = 0; $i -lt 20; $i++) { try { Copy-Item -LiteralPath '${psQuote(info.file)}' -Destination '${psQuote(this.portableFile)}' -Force; break } catch { Start-Sleep -Milliseconds 750 } }`,
        `Start-Process -FilePath '${psQuote(this.portableFile)}'`,
      ].join('; ');
    } else {
      // NSIS installer: silent install into the SAME directory so shortcuts
      // and the install location survive the update; app data is kept, then
      // relaunch. /D must stay the last argument and unquoted (NSIS rule).
      const installDir = this.appRoot ? path.resolve(this.appRoot, '..', '..') : '';
      const nsisArgs = installDir ? `'/S', '/D=${psQuote(installDir)}'` : `'/S'`;
      script = [
        "$ErrorActionPreference='Stop'",
        `Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
        'Start-Sleep -Milliseconds 900',
        `Start-Process -FilePath '${psQuote(info.file)}' -ArgumentList ${nsisArgs} -Wait`,
        `if (Test-Path '${psQuote(exePath)}') { Start-Process -FilePath '${psQuote(exePath)}' }`,
      ].join('; ');
    }
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', script];
    return { script, args };
  }

  // The install helper must outlive the launcher. On Windows a detached
  // PowerShell child exits instantly (DETACHED_PROCESS leaves it without a
  // console), and an attached child dies with the parent's job object. So we
  // write the helper to a .ps1 and let WMI create it as an independent
  // process — that survives the launcher's exit. -EncodedCommand (base64
  // UTF-16LE) avoids every Node -> PowerShell command-line quoting problem.
  buildHelperFiles(info) {
    const { script } = this.buildInstallScript(info);
    const ps1Path = path.join(os.tmpdir(), `erdtree-update-${Date.now()}-${process.pid}.ps1`);
    const logPath = path.join(this.dir, 'install-helper.log');
    const content = [
      `Start-Transcript -LiteralPath '${psQuote(logPath)}' -Force | Out-Null`,
      script,
      'Stop-Transcript | Out-Null',
    ].join('\r\n');
    const launcher =
      `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${psQuote(ps1Path)}"' }; ` +
      'if ($r.ReturnValue -ne 0) { exit 1 }';
    const encoded = Buffer.from(launcher, 'utf16le').toString('base64');
    return { ps1Path, content, encoded, logPath };
  }

  install({ quit } = {}) {
    if (!this.packaged) throw new Error('Updates can only be installed from the packaged launcher.');
    if (!this.downloaded) throw new Error('Download the update first.');
    const info = this.downloaded;
    if (!info.verified) throw new Error('Refusing to install an update that failed integrity verification.');
    const { ps1Path, content, encoded } = this.buildHelperFiles(info);
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(ps1Path, content, 'utf8');
    const res = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: 20000 }
    );
    if (res.status !== 0) {
      throw new Error('Could not start the update helper. Try again, or install the update manually from GitHub.');
    }
    setTimeout(() => {
      if (typeof quit === 'function') quit();
    }, 350);
    return { ok: true, mode: info.mode };
  }

  getState() {
    return {
      ...this.state,
      repo: this.repo(),
      feed: this.repo(),
      source: 'github',
      patchable: false,
      packaged: this.packaged,
      portable: !!this.portableFile,
      downloaded: this.downloaded
        ? {
            mode: this.downloaded.mode,
            bytes: this.downloaded.bytes,
            verified: !!this.downloaded.verified,
            version: this.checkResult?.latest || '',
          }
        : null,
    };
  }
}

module.exports = {
  Updater,
  OFFICIAL_REPO,
  GITHUB_API,
  normalizeRepo,
  compareVersions,
  parseNotes,
  sha256,
  sha256File,
  copyTree,
  request,
};