/* Dump visible Arabic strings from every launcher view (for building i18n). */
const { app, BrowserWindow, ipcMain, Menu, protocol, net, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { Settings } = require('../src/main/settings');
const { createActions } = require('../src/main/actions');

protocol.registerSchemesAsPrivileged([
  { scheme: 'erdmod', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

app.setName('Erdtree Launcher');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const settings = new Settings();
  settings.load();
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const actions = createActions({ settings, getWindow: () => win });
  protocol.handle('erdmod', async (request) => {
    try {
      const url = new URL(request.url);
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const file = actions.mods.resolveImage(rel);
      if (!file) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Bad request', { status: 400 });
    }
  });
  ipcMain.handle('erd', async (_e, action, payload) => {
    try {
      return { ok: true, data: await actions.dispatch(action, payload) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle('win', () => false);
  await win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));

  const js = (code) => win.webContents.executeJavaScript(code, true);
  for (let i = 0; i < 120; i += 1) {
    if (await js('!!(window.S && S.state)').catch(() => false)) break;
    await wait(500);
  }
  const collect = `(() => {
    const out = new Set();
    const walk = (root) => {
      const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (it.nextNode()) {
        const t = it.currentNode.textContent.replace(/\\s+/g, ' ').trim();
        if (/[\\u0600-\\u06FF]/.test(t)) out.add(t);
      }
      root.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
        for (const a of ['placeholder','title','aria-label']) {
          const v = el.getAttribute(a);
          if (v && /[\\u0600-\\u06FF]/.test(v)) out.add(v.replace(/\\s+/g,' ').trim());
        }
      });
    };
    walk(document.body);
    return JSON.stringify([...out]);
  })()`;

  const all = new Set();
  const views = ['home', 'trainer', 'characters', 'mods', 'settings'];
  for (const v of views) {
    await js(`go(${JSON.stringify(v)})`);
    await wait(1200);
    const arr = JSON.parse(await js(collect));
    arr.forEach((s) => all.add(s));
    if (v === 'characters') {
      const clicked = await js(`(() => { const b=document.querySelector('.character-card'); if(!b) return false; b.click(); return true; })()`);
      if (clicked) {
        await wait(800);
        JSON.parse(await js(collect)).forEach((s) => all.add(s));
        await js('S.detail=null; go("characters")');
      }
    }
    if (v === 'mods') {
      await js(`(() => { const b=document.querySelector('[data-act="toggleNexus"]'); if(b) b.click(); })()`);
      await wait(700);
      JSON.parse(await js(collect)).forEach((s) => all.add(s));
    }
  }
  console.log('=== STRINGS ===');
  console.log([...all].sort().join('\n'));
  console.log('=== COUNT ===', all.size);

  await js(`I18N.setLang('en')`);
  await wait(800);
  const leftover = new Set();
  for (const v of views) {
    await js(`go(${JSON.stringify(v)})`);
    await wait(1000);
    JSON.parse(await js(collect)).forEach((s) => leftover.add(s));
  }
  await js(`go('home')`);
  await wait(700);
  JSON.parse(await js(`(() => {
    const out = new Set();
    const walk = (root) => {
      const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (it.nextNode()) {
        const t = it.currentNode.textContent.replace(/\\s+/g, ' ').trim();
        if (/[\\u0600-\\u06FF]/.test(t)) out.add(t);
      }
      root.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
        for (const a of ['placeholder','title','aria-label']) {
          const v = el.getAttribute(a);
          if (v && /[\\u0600-\\u06FF]/.test(v)) out.add(v.replace(/\\s+/g,' ').trim());
        }
      });
    };
    walk(document.body);
    return JSON.stringify([...out]);
  })()`)).forEach((s) => leftover.add(s));
  console.log('=== UNTRANSLATED (EN mode) ===');
  console.log([...leftover].sort().join('\n'));
  console.log('=== LEFT ===', leftover.size);
  win.destroy();
  app.quit();
});
