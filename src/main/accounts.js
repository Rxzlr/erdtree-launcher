const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSION_DAYS = 45;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function now() {
  return new Date().toISOString();
}

function randomId() {
  return `acc_${crypto.randomBytes(9).toString('hex')}`;
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function recoveryCode() {
  const pick = () =>
    Array.from({ length: 4 }, () => RECOVERY_ALPHABET[crypto.randomInt(0, RECOVERY_ALPHABET.length)]).join('');
  return `ERD-${pick()}-${pick()}-${pick()}`;
}

function normalizeCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function slugName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

// The account store lives at the Electron userData root. Each account owns a
// private profile directory; the guest session owns a sandbox that is wiped on
// every logout so a guest truly saves nothing.
class AccountManager {
  constructor(root) {
    this.root = root;
    this.file = path.join(root, 'accounts.json');
    this.sessionFile = path.join(root, 'session.json');
    this.data = { version: 1, accounts: [] };
    this.current = null;
    this.remember = true;
    this.sessionToken = '';
    this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = {
        version: 1,
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      };
    } catch {
      this.data = { version: 1, accounts: [] };
    }
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  publicAccount(account = this.current) {
    if (!account) return null;
    return {
      id: account.id,
      username: account.username,
      email: account.email,
      avatar: account.avatar || '',
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt || '',
      guest: false,
      level: Number(account.level) || 0,
    };
  }

  savedAccounts() {
    return this.data.accounts.map((account) => ({
      id: account.id,
      username: account.username,
      avatar: account.avatar || '',
      lastLoginAt: account.lastLoginAt || '',
    }));
  }

  find(identifier) {
    const key = String(identifier || '').trim().toLowerCase();
    if (!key) return null;
    return (
      this.data.accounts.find((account) => account.username.toLowerCase() === key) ||
      this.data.accounts.find((account) => String(account.email || '').toLowerCase() === key) ||
      null
    );
  }

  validate({ username, email, password }) {
    const name = String(username || '').trim();
    if (name.length < 3 || name.length > 24) throw new Error('Username must be 3–24 characters.');
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('Username can only use letters, numbers, dots, dashes and underscores.');
    const mail = String(email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw new Error('Enter a valid email address.');
    if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters.');
    if (this.find(name)) throw new Error('That username is already taken.');
    if (this.find(mail)) throw new Error('That email is already registered.');
    return { name, mail };
  }

  register({ username, email, password, remember = true, migrateLegacy = true }) {
    const { name, mail } = this.validate({ username, email, password });
    const salt = crypto.randomBytes(16).toString('hex');
    const recoverySalt = crypto.randomBytes(16).toString('hex');
    const code = recoveryCode();
    const account = {
      id: randomId(),
      username: name,
      email: mail,
      salt,
      hash: hashPassword(password, salt),
      recoverySalt,
      recoveryHash: hashPassword(normalizeCode(code), recoverySalt),
      avatar: '',
      createdAt: now(),
      lastLoginAt: now(),
      level: 0,
      remember: !!remember,
      legacyMigrated: false,
    };
    this.data.accounts.push(account);
    this.persist();
    this.migrateLegacy(account, { enabled: !!migrateLegacy });
    this.startSession(account, { remember });
    return { account: this.publicAccount(account), recoveryCode: code };
  }

  login({ identifier, password, remember = true }) {
    const account = this.find(identifier);
    if (!account) throw new Error('No account matches that username or email.');
    const candidate = hashPassword(password, account.salt);
    if (!safeEqual(candidate, account.hash)) throw new Error('Incorrect password.');
    account.lastLoginAt = now();
    account.remember = !!remember;
    this.persist();
    this.startSession(account, { remember });
    return { account: this.publicAccount(account) };
  }

  startGuest() {
    this.current = {
      id: 'guest',
      username: 'Guest',
      email: '',
      guest: true,
      avatar: '',
      createdAt: now(),
      level: 0,
    };
    this.sessionToken = randomToken();
    this.remember = false;
    this.persistSession();
    return { account: this.publicAccount(this.current) };
  }

  startSession(account, { remember = true } = {}) {
    this.current = account;
    this.remember = !!remember;
    this.sessionToken = randomToken();
    account.sessionHash = hashToken(this.sessionToken);
    account.sessionAt = now();
    account.remember = this.remember;
    this.persist();
    this.persistSession();
  }

  persistSession() {
    try {
      if (!this.current || this.current.guest || !this.remember) {
        fs.rmSync(this.sessionFile, { force: true });
        return;
      }
      const payload = {
        accountId: this.current.id,
        token: this.sessionToken,
        createdAt: now(),
        expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
      };
      const tmp = `${this.sessionFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tmp, this.sessionFile);
    } catch {
      /* session persistence is best effort */
    }
  }

  // Returns { account } when a remembered session is still valid.
  restore() {
    let saved;
    try {
      saved = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
    } catch {
      return null;
    }
    if (!saved?.accountId || !saved?.token) return null;
    if (Number(saved.expiresAt) && Date.now() > Number(saved.expiresAt)) {
      fs.rmSync(this.sessionFile, { force: true });
      return null;
    }
    const account = this.data.accounts.find((item) => item.id === saved.accountId);
    if (!account) {
      fs.rmSync(this.sessionFile, { force: true });
      return null;
    }
    if (!safeEqual(hashToken(saved.token), account.sessionHash || '')) {
      fs.rmSync(this.sessionFile, { force: true });
      return null;
    }
    this.current = account;
    this.sessionToken = saved.token;
    this.remember = true;
    account.lastLoginAt = now();
    this.persist();
    return { account: this.publicAccount(account) };
  }

  logout() {
    const wasGuest = !!this.current?.guest;
    if (this.current && !this.current.guest) {
      this.current.sessionHash = '';
      this.current.sessionAt = '';
      this.persist();
    }
    this.current = null;
    this.sessionToken = '';
    try {
      fs.rmSync(this.sessionFile, { force: true });
    } catch {
      /* ignore */
    }
    if (wasGuest) this.wipeGuest();
    return { ok: true };
  }

  dataRoot(account = this.current) {
    if (!account) throw new Error('Not signed in.');
    if (account.guest) return this.guestRoot();
    return path.join(this.root, 'profiles', account.id);
  }

  guestRoot() {
    return path.join(this.root, '.guest');
  }

  wipeGuest() {
    try {
      fs.rmSync(this.guestRoot(), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  // Keeps the display level in sync with the highest character level the
  // launcher can read from the save file.
  setLevel(level) {
    if (!this.current || this.current.guest) return;
    const value = Math.max(0, Math.min(999, Math.round(Number(level) || 0)));
    if (value === this.current.level) return;
    this.current.level = value;
    const record = this.data.accounts.find((item) => item.id === this.current.id);
    if (record) record.level = value;
    this.persist();
  }

  update({ username, email, avatar }) {
    if (!this.current) throw new Error('Not signed in.');
    if (this.current.guest) throw new Error('Guest profiles are temporary. Create an account to keep your profile.');
    const account = this.data.accounts.find((item) => item.id === this.current.id);
    if (!account) throw new Error('Account not found.');
    if (username != null) {
      const name = String(username).trim();
      if (name !== account.username) {
        if (name.length < 3 || name.length > 24 || !/^[a-zA-Z0-9_.-]+$/.test(name)) {
          throw new Error('Username must be 3–24 letters, numbers, dots, dashes or underscores.');
        }
        const clash = this.find(name);
        if (clash && clash.id !== account.id) throw new Error('That username is already taken.');
        account.username = name;
      }
    }
    if (email != null) {
      const mail = String(email).trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw new Error('Enter a valid email address.');
      const clash = this.find(mail);
      if (clash && clash.id !== account.id) throw new Error('That email is already registered.');
      account.email = mail;
    }
    if (avatar != null) {
      const data = String(avatar || '');
      if (data && !/^data:image\/(png|jpe?g|webp);base64,/i.test(data)) {
        throw new Error('Choose a PNG, JPG or WebP image.');
      }
      if (data.length > 700_000) throw new Error('That image is too large — pick one under 500 KB.');
      account.avatar = data;
    }
    account.updatedAt = now();
    this.current = account;
    this.persist();
    return this.publicAccount(account);
  }

  changePassword({ currentPassword, newPassword }) {
    if (!this.current || this.current.guest) throw new Error('Not signed in.');
    const account = this.data.accounts.find((item) => item.id === this.current.id);
    if (!safeEqual(hashPassword(currentPassword, account.salt), account.hash)) {
      throw new Error('Current password is incorrect.');
    }
    if (String(newPassword || '').length < 8) throw new Error('New password must be at least 8 characters.');
    account.salt = crypto.randomBytes(16).toString('hex');
    account.hash = hashPassword(newPassword, account.salt);
    this.persist();
    return { ok: true };
  }

  // Local recovery: the code shown once at signup is the only proof. Nothing
  // is emailed because this launcher stores accounts on this PC only.
  recoverStart({ identifier }) {
    const account = this.find(identifier);
    if (!account) throw new Error('No account matches that username or email.');
    return { found: true, username: account.username };
  }

  recoverReset({ identifier, code, newPassword }) {
    const account = this.find(identifier);
    if (!account) throw new Error('No account matches that username or email.');
    if (String(newPassword || '').length < 8) throw new Error('New password must be at least 8 characters.');
    const candidate = hashPassword(normalizeCode(code), account.recoverySalt);
    if (!safeEqual(candidate, account.recoveryHash)) throw new Error('That recovery code is not correct.');
    account.salt = crypto.randomBytes(16).toString('hex');
    account.hash = hashPassword(newPassword, account.salt);
    const nextCode = recoveryCode();
    account.recoverySalt = crypto.randomBytes(16).toString('hex');
    account.recoveryHash = hashPassword(normalizeCode(nextCode), account.recoverySalt);
    account.updatedAt = now();
    this.persist();
    return { ok: true, recoveryCode: nextCode };
  }

  hasAccounts() {
    return this.data.accounts.length > 0;
  }

  // Copies the pre-account launcher data (settings, save backups, mods,
  // social identity, builds) into the first account so upgrading does not
  // throw away the setup that already exists on this PC.
  migrateLegacy(account, { enabled = true } = {}) {
    if (!enabled) return { migrated: false };
    const root = this.root;
    const legacySettings = path.join(root, 'settings.json');
    if (!fs.existsSync(legacySettings)) return { migrated: false };
    if (this.data.accounts.some((item) => item.legacyMigrated)) return { migrated: false };
    const target = path.join(root, 'profiles', account.id);
    fs.mkdirSync(target, { recursive: true });
    if (fs.existsSync(path.join(target, 'settings.json'))) return { migrated: false };
    const files = [
      'settings.json',
      'social.json',
      'builds.json',
      'characters.json',
      'mods.json',
      'trainer-state.json',
      'downloads.json',
    ];
    let copied = 0;
    for (const name of files) {
      const from = path.join(root, name);
      if (!fs.existsSync(from)) continue;
      try {
        fs.copyFileSync(from, path.join(target, name));
        copied += 1;
      } catch {
        /* skip unreadable legacy file */
      }
    }
    for (const dir of ['mods', 'save-backups', 'downloads']) {
      const from = path.join(root, dir);
      if (!fs.existsSync(from)) continue;
      try {
        fs.cpSync(from, path.join(target, dir), { recursive: true });
        copied += 1;
      } catch {
        /* skip */
      }
    }
    const record = this.data.accounts.find((item) => item.id === account.id);
    if (record) {
      record.legacyMigrated = true;
      record.migratedAt = now();
    }
    this.persist();
    return { migrated: copied > 0, copied };
  }
}

module.exports = { AccountManager, normalizeCode };
