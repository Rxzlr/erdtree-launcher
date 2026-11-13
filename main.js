const { app, BrowserWindow, ipcMain, Menu, shell, protocol, net, screen, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { Settings } = require('./src/main/settings');
const { createActions } = require('./src/main/actions');
const { AccountManager } = require('./src/main/accounts');

let win = null;
let overlay = null;
let actions = null;
let settings = null;
let accounts = null;
let sessionAccount = null;

const OVERLAY_WIDTH = 470;
const OVERLAY_EVENTS = new Set([
  'social:invite',
  'social:chat',
  'social:joinRequest',
  'social:request',
]);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'erdmod',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    backgroundColor: '#07080a',
    title: 'Erdtree Launcher — لانشر إلدن رينغ',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (actions) actions.autoCheckUpdates().catch(() => {});
    }, 2200);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  win.on('closed', () => {
    win = null;
    if (overlay && !overlay.isDestroyed()) overlay.destroy();
    overlay = null;
  });
}

function overlayHeight(value) {
  const height = Math.round(Number(value) || 240);
  return Math.max(120, Math.min(560, height));
}

function positionOverlay(height = 240) {
  if (!overlay || overlay.isDestroyed()) return;
  const area = screen.getPrimaryDisplay().workArea;
  const h = overlayHeight(height);
  overlay.setBounds({
    x: Math.round(area.x + (area.width - OVERLAY_WIDTH) / 2),
    y: area.y + 64,
    width: OVERLAY_WIDTH,
    height: h,
  });
}

function ensureOverlay() {
  if (overlay && !overlay.isDestroyed()) return overlay;
  overlay = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: 240,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true });
  overlay.loadFile(path.join(__dirname, 'src', 'renderer', 'overlay.html'));
  overlay.on('closed', () => {
    overlay = null;
  });
  return overlay;
}

function showOverlayEvent(payload) {
  const popup = ensureOverlay();
  positionOverlay(payload?.height || 260);
  const send = () => {
    if (popup.isDestroyed()) return;
    popup.webContents.send('overlay:event', payload);
    popup.showInactive();
    popup.moveTop?.();
  };
  if (popup.webContents.isLoading()) popup.webContents.once('did-finish-load', send);
  else send();
}

function hideOverlay() {
  if (overlay && !overlay.isDestroyed()) overlay.hide();
}

// Forward social/update events to the main window. While the launcher is not
// focused (i.e. the player is in-game), invites and chat also pop up in the
// transparent always-on-top overlay — unless the player turned popups off.
function broadcast(payload) {
  if (!payload || !payload.type) {
    if (win && !win.isDestroyed()) win.webContents.send('launcher:event', payload);
    return;
  }
  const notifyPopups = !settings || settings.data.notifyPopups !== false;
  const notifySound = !settings || settings.data.notifySound !== false;
  const event = OVERLAY_EVENTS.has(payload.type) ? { ...payload, sound: notifySound } : payload;
  if (win && !win.isDestroyed()) win.webContents.send('launcher:event', event);
  if (payload.type === 'social:inviteResolved') {
    hideOverlay();
    return;
  }
  if (!OVERLAY_EVENTS.has(payload.type) || !notifyPopups) return;
  const launcherFocused = win && !win.isDestroyed() && win.isFocused() && win.isVisible();
  if (!launcherFocused) showOverlayEvent(event);
}

async function registerModProtocol() {
  protocol.handle('erdmod', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'local') return new Response('Not found', { status: 404 });
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const file = actions?.mods?.resolveImage(rel);
      if (!file) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Bad request', { status: 400 });
    }
  });
}

// ---------------------------------------------------------------------------
// Account session lifecycle
// Each signed-in account (or the guest sandbox) gets its own Settings +
// action engines pointed at a private profile directory, so logging in as
// someone else never reads or overwrites another player's data.
// ---------------------------------------------------------------------------
function stopEngine() {
  if (actions) {
    try {
      actions.shutdown();
    } catch {
      /* engine already down */
    }
  }
  actions = null;
  settings = null;
}

function startEngine(account) {
  stopEngine();
  sessionAccount = account;
  settings = new Settings(accounts.dataRoot(account));
  settings.load();
  actions = createActions({
    settings,
    getWindow: () => win,
    emit: broadcast,
    showOverlay: showOverlayEvent,
    dataRoot: accounts.dataRoot(account),
    account,
    accounts,
  });
  if (win && !win.isDestroyed()) win.webContents.send('account:changed', accountSession());
}

function accountSession() {
  if (!accounts) return { loggedIn: false, account: null, guest: false, saved: [], hasAccounts: false };
  const current = accounts.current;
  return {
    loggedIn: !!current,
    account: current ? accounts.publicAccount(current) : null,
    guest: !!(current && current.guest),
    saved: accounts.savedAccounts(),
    hasAccounts: accounts.hasAccounts(),
  };
}

async function pickAvatarFile() {
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose a profile picture',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const file = result.filePaths[0];
  try {
    const image = nativeImage.createFromPath(file);
    if (image.isEmpty()) throw new Error('That file is not a readable image.');
    const resized = image.getSize().width > 320 ? image.resize({ width: 320, quality: 'better' }) : image;
    const data = `data:image/png;base64,${resized.toPNG().toString('base64')}`;
    if (data.length > 700_000) throw new Error('That image is too large — pick a smaller picture.');
    return { data, name: path.basename(file) };
  } catch (err) {
    throw new Error(err.message || 'Could not read that image.');
  }
}

function registerAccountIpc() {
  ipcMain.handle('account', async (_event, action, payload = {}) => {
    try {
      if (!accounts) throw new Error('Account store is not ready yet.');
      switch (action) {
        case 'status':
          return { ok: true, data: accountSession() };
        case 'login': {
          const result = accounts.login(payload);
          startEngine(accounts.current);
          return { ok: true, data: { ...result, session: accountSession() } };
        }
        case 'register': {
          const result = accounts.register(payload);
          startEngine(accounts.current);
          return { ok: true, data: { ...result, session: accountSession() } };
        }
        case 'guest': {
          accounts.wipeGuest();
          const result = accounts.startGuest();
          startEngine(accounts.current);
          return { ok: true, data: { ...result, session: accountSession() } };
        }
        case 'logout': {
          if (sessionAccount) {
            stopEngine();
            accounts.logout();
            sessionAccount = null;
          }
          if (win && !win.isDestroyed()) win.webContents.send('account:changed', accountSession());
          return { ok: true, data: accountSession() };
        }
        case 'forgot': {
          const started = accounts.recoverStart(payload);
          return { ok: true, data: started };
        }
        case 'resetPassword': {
          const reset = accounts.recoverReset(payload);
          return { ok: true, data: reset };
        }
        case 'update': {
          const updated = accounts.update(payload);
          return { ok: true, data: { account: updated, session: accountSession() } };
        }
        case 'changePassword':
          return { ok: true, data: accounts.changePassword(payload) };
        case 'pickAvatar':
          return { ok: true, data: await pickAvatarFile() };
        default:
          throw new Error('Unknown account action.');
      }
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err), code: err?.code || '' };
    }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setName('Erdtree Launcher');
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    app.setAppUserModelId('com.erdtree.launcher');

    accounts = new AccountManager(app.getPath('userData'));
    // A guest session never survives a restart — its sandbox is disposable.
    accounts.wipeGuest();
    const restored = accounts.restore();
    if (restored) startEngine(accounts.current);

    await registerModProtocol();
    registerAccountIpc();

    ipcMain.handle('erd', async (_event, action, payload) => {
      if (!actions) {
        return { ok: false, error: 'Sign in to use the launcher.', code: 'AUTH_REQUIRED' };
      }
      try {
        return { ok: true, data: await actions.dispatch(action, payload) };
      } catch (err) {
        return {
          ok: false,
          error: err && err.message ? err.message : String(err),
          code: err?.code || '',
          url: err?.url || '',
        };
      }
    });

    ipcMain.on('overlay:resize', (_event, height) => {
      positionOverlay(height);
    });
    ipcMain.on('overlay:hide', () => {
      hideOverlay();
    });

    ipcMain.handle('win', (_event, action) => {
      if (!win) return false;
      if (action === 'minimize') win.minimize();
      else if (action === 'maximize') {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
      } else if (action === 'close') win.close();
      return win.isMaximized();
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('before-quit', () => {
    stopEngine();
  });
}
