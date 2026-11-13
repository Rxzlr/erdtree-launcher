const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  gameExe: '',
  gamePath: '',
  saveFile: '',
  dlssMode: 'off',
  frameGeneration: false,
  warnOnline: true,
  nexusApiKey: '',
  pollMs: 900,
  lastSync: null,
  language: 'ar',
  launchMode: 'normal',
  seamlessPassword: '',
  seamlessPlayerName: 'Player',
  seamlessMaxPlayers: 4,
  setupDone: false,
  updateFeedUrl: '',
  updateRepo: '',
  autoUpdate: true,
  aboutMe: '',
  notifyPopups: true,
  notifySound: true,
  settingsVersion: 6,
};

const ALLOWED = [
  'gameExe',
  'gamePath',
  'saveFile',
  'dlssMode',
  'frameGeneration',
  'warnOnline',
  'nexusApiKey',
  'pollMs',
  'lastSync',
  'language',
  'launchMode',
  'seamlessPassword',
  'seamlessPlayerName',
  'seamlessMaxPlayers',
  'setupDone',
  'updateFeedUrl',
  'updateRepo',
  'autoUpdate',
  'aboutMe',
  'notifyPopups',
  'notifySound',
];

const SEAMLESS_LAUNCHERS = ['ersc_launcher.exe', 'launch_elden_ring_seamlesscoop.exe'];

const DLSS_MODES = ['off', 'quality', 'balanced', 'performance', 'ultra'];

class Settings {
  // `root` is the account data directory. Every account (and the guest
  // sandbox) gets its own settings.json, so logging in as someone else never
  // overwrites the previous player's configuration.
  constructor(root = app.getPath('userData')) {
    this.root = root;
    this.file = path.join(root, 'settings.json');
    this.data = { ...DEFAULTS };
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = { ...DEFAULTS, ...parsed };
      // migrate older launcher settings
      if (!this.data.gameExe && parsed.customExe && fs.existsSync(parsed.customExe)) {
        this.data.gameExe = parsed.customExe;
      }
      if (!this.data.gamePath && parsed.gamePath) this.data.gamePath = parsed.gamePath;
      // Older launchers stored a GitHub URL as the "update feed". Carry it
      // over to the new owner/repository field so updates keep working.
      if (!this.data.updateRepo && /github\.com\/[\w.-]+\/[\w.-]+/i.test(String(parsed.updateFeedUrl || ''))) {
        this.data.updateRepo = String(parsed.updateFeedUrl)
          .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
          .replace(/\/releases\/?$/i, '')
          .replace(/\/+$/, '')
          .replace(/\.git$/i, '');
      }
    } catch {
      this.data = { ...DEFAULTS };
    }
    if (!DLSS_MODES.includes(this.data.dlssMode)) this.data.dlssMode = 'off';
    this.data.frameGeneration = !!this.data.frameGeneration;
    if (!['ar', 'en'].includes(this.data.language)) this.data.language = 'ar';
    if (!['normal', 'seamless'].includes(this.data.launchMode)) this.data.launchMode = 'normal';
    this.data.aboutMe = String(this.data.aboutMe || '').slice(0, 300);
    this.data.notifyPopups = this.data.notifyPopups !== false;
    this.data.notifySound = this.data.notifySound !== false;
    this.data.seamlessPassword = String(this.data.seamlessPassword || '').slice(0, 127);
    this.data.seamlessPlayerName = String(this.data.seamlessPlayerName || 'Player').trim().slice(0, 32) || 'Player';
    this.data.seamlessMaxPlayers = Math.max(2, Math.min(127, Number(this.data.seamlessMaxPlayers) || 4));
    // Older versions saved the Seamless launcher as the "normal" exe. Fix that so
    // "Play Normal" never boots Seamless by accident.
    if (this.data.gameExe && SEAMLESS_LAUNCHERS.includes(path.basename(this.data.gameExe).toLowerCase())) {
      const dir = path.dirname(this.data.gameExe);
      const normal = ['nrcs.exe', 'eldenring.exe'].map((n) => path.join(dir, n)).find((p) => fs.existsSync(p));
      this.data.gameExe = normal || '';
    }
    this.persist();
    return this.data;
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  save(patch = {}) {
    const clean = {};
    for (const key of ALLOWED) {
      if (patch && Object.prototype.hasOwnProperty.call(patch, key)) clean[key] = patch[key];
    }
    this.data = { ...this.data, ...clean };
    this.data.settingsVersion = DEFAULTS.settingsVersion;
    this.persist();
    return this.data;
  }
}

module.exports = { Settings, DEFAULTS, DLSS_MODES, ALLOWED };
