const { BrowserWindow, session } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// One persistent partition: the player signs in to Nexus once and the launcher
// remembers the session across restarts. Nothing is stored in the renderer.
const PARTITION = 'persist:erdtree-nexus';
const NEXUS_HOST = /(^|\.)nexusmods\.com$/i;
// Nexus serves the actual mod archives from its own file CDN (observed live:
// files.nexus-cdn.com with a signed ?md5&expires URL). The interstitial's
// auto-start and its "Start download manually" link both navigate there, so
// this host must be allowed or the free download is silently blocked.
const FILE_CDN = /(^|\.)nexus-cdn\.com$/i;
const ARCHIVE = /\.(zip|7z|rar)$/i;
const log = (...args) => console.log('[nexus-window]', ...args);
const allowedHost = (hostname) => NEXUS_HOST.test(hostname) || FILE_CDN.test(hostname);

// The catalogue stores the real mod page on nexusmods.com. We only ever open
// that exact host — never a mirror, proxy or rewritten address — and jump
// straight to the files tab so the free download button is one scroll away.
function nexusFilesUrl(entry) {
  const raw = String((entry && entry.url) || '').trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    const err = new Error('This mod has no Nexus page link in the catalogue. Use Import file instead.');
    err.code = 'NEXUS_URL_MISSING';
    throw err;
  }
  if (!/^https?:$/.test(parsed.protocol) || !NEXUS_HOST.test(parsed.hostname)) {
    const err = new Error('This mod\'s source is not a Nexus page. Use Import file instead.');
    err.code = 'NEXUS_URL_MISSING';
    throw err;
  }
  if (!parsed.searchParams.has('tab')) parsed.searchParams.set('tab', 'files');
  return parsed.toString();
}

// A small in-launcher Nexus window. The launcher does NOT click, wait out or
// bypass anything on Nexus: the player presses Nexus' own free download button
// once, and the launcher captures that download, stores it in the profile and
// finishes the setup automatically. Login cookies persist, so it is a single
// click per mod after the first sign-in.
function createNexusSession({ getWindow = () => null, emit = () => {} } = {}) {
  let active = null;

  function open(entry, { onProgress } = {}) {
    if (active) {
      const err = new Error('A Nexus window is already open for another mod. Finish that download or close its window first.');
      err.code = 'NEXUS_BUSY';
      throw err;
    }
    const url = nexusFilesUrl(entry);
    const ses = session.fromPartition(PARTITION);
    const parent = getWindow();
    const win = new BrowserWindow({
      width: 1100,
      height: 820,
      minWidth: 860,
      minHeight: 600,
      show: false,
      parent: parent && !parent.isDestroyed() ? parent : undefined,
      title: `Nexus Mods — ${entry.name}`,
      backgroundColor: '#101216',
      autoHideMenuBar: true,
      webPreferences: {
        partition: PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        backgroundThrottling: false,
      },
    });

    return new Promise((resolve, reject) => {
      let settled = false;
      let capturing = false;
      let handedOver = false;
      let temp = '';
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };
      const dropTemp = () => {
        if (temp) fs.rmSync(temp, { recursive: true, force: true });
        temp = '';
      };

      const onWillDownload = (_event, item) => {
        const name = String(item.getFilename() || '');
        log('will-download', JSON.stringify({ name, url: item.getURL() }));
        // Only the mod archive is captured; anything else the page tries to
        // save is declined so no stray files land on the player's disk.
        if (handedOver || capturing || !ARCHIVE.test(name)) {
          log('download declined', JSON.stringify({ name, handedOver, capturing }));
          item.cancel();
          return;
        }
        capturing = true;
        temp = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-nexus-'));
        const target = path.join(temp, name.replace(/[<>:"/\\|?*]/g, '-'));
        item.setSavePath(target);
        item.on('updated', (_e, state) => {
          if (state === 'progressing' && onProgress) onProgress(item.getReceivedBytes(), item.getTotalBytes());
        });
        item.once('done', (_e, state) => {
          capturing = false;
          if (state === 'completed') {
            // The workshop now owns this temp dir and removes it after copying
            // the archive into the profile — never delete it here.
            handedOver = true;
            settle(resolve, { path: target, name, temp });
            if (!win.isDestroyed()) win.close();
          } else {
            dropTemp();
            const err = new Error('The download was cancelled or interrupted inside the Nexus window. Press Download to try again — your login is kept.');
            err.code = 'NEXUS_CANCELLED';
            settle(reject, err);
          }
        });
      };

      ses.on('will-download', onWillDownload);
      win.once('closed', () => {
        ses.removeListener('will-download', onWillDownload);
        active = null;
        if (!handedOver) dropTemp();
        emit({ type: 'workshop:nexus', id: entry.id, state: 'closed' });
        const err = new Error('The Nexus window was closed before the download finished. Press Download again — your login is saved, so next time it is one click.');
        err.code = 'NEXUS_CLOSED';
        settle(reject, err);
      });
      win.webContents.setWindowOpenHandler(({ url: next }) => {
        let allowed = false;
        try {
          allowed = allowedHost(new URL(next).hostname);
          if (allowed) win.loadURL(next);
        } catch {
          /* ignore malformed popup targets */
        }
        log('popup', JSON.stringify({ url: next, allowed }));
        return { action: 'deny' };
      });
      win.webContents.on('will-navigate', (event, next) => {
        let blocked = true;
        try {
          blocked = !allowedHost(new URL(next).hostname);
          if (blocked) event.preventDefault();
        } catch {
          event.preventDefault();
        }
        log('will-navigate', JSON.stringify({ url: next, blocked }));
      });
      win.webContents.on('did-navigate', (_e, next) => log('did-navigate', next));
      win.once('ready-to-show', () => {
        if (!win.isDestroyed()) win.show();
      });
      // Only a real main-frame failure is an error. Ad/consent subframes on the
      // Nexus page can hang or be blocked without affecting the page itself,
      // and closing the window aborts the load with ERR_ABORTED — neither may
      // be reported as "could not open".
      win.webContents.on('did-fail-load', (_e, code, desc, failedUrl, isMainFrame) => {
        log('did-fail-load', JSON.stringify({ code, desc, failedUrl, isMainFrame }));
        if (!isMainFrame || code === -3) return;
        const e = new Error(`Could not open the Nexus page: ${desc} (${code})`);
        e.code = 'NEXUS_OPEN_FAILED';
        settle(reject, e);
        if (!win.isDestroyed()) win.close();
      });
      win.loadURL(url).catch(() => {
        /* handled by did-fail-load / closed above */
      });
      active = { win, id: entry.id };
      emit({ type: 'workshop:nexus', id: entry.id, state: 'open', name: entry.name });
    });
  }

  function close() {
    if (active && !active.win.isDestroyed()) active.win.close();
  }

  function isOpen() {
    return !!active;
  }

  return { open, close, isOpen };
}

module.exports = { createNexusSession, nexusFilesUrl };