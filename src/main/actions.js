const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { app, dialog, shell } = require('electron');
const { ModManager } = require('./mods');
const { Workshop } = require('./workshop');
const { Trainer } = require('./trainer');
const { SaveManager } = require('./saves');
const { CharacterManager } = require('./characters');
const { BuildManager } = require('./builds');
const { Social } = require('./social');
const { Updater, normalizeRepo } = require('./updater');
const { UnlockManager } = require('./unlocks');
const gameLib = require('./game');
const seamlessLib = require('./seamless');
const dlss = require('./dlss');
const controller = require('./controller');
const nexus = require('./nexus');
const { createNexusSession } = require('./nexus-window');

function createActions({
  settings,
  getWindow,
  emit = () => {},
  showOverlay = () => {},
  dataRoot = '',
  account = null,
  accounts = null,
  nexusSession = null,
}) {
  // Every account has its own profile directory. Game-wide data (accounts,
  // sessions) stays at the Electron userData root in main.js.
  const userData = dataRoot || app.getPath('userData');
  const mods = new ModManager(userData);
  // Nexus-only mods download through a small in-launcher Nexus window: the
  // player signs in once and presses Nexus' free button once, then the launcher
  // captures the file and finishes setup. Tests inject a fake session here.
  const nexusWin = nexusSession || createNexusSession({ getWindow, emit });
  const workshop = new Workshop({
    mods,
    seamless: seamlessLib,
    settings,
    userData,
    openNexus: (entry, hooks) => nexusWin.open(entry, hooks),
  });
  // memory.ps1 لازم يكون ملف حقيقي على القرص: PowerShell ما يقدر يقرأ من
  // داخل app.asar، عشان كذا نفكّه عبر asarUnpack ونمرّر مساره المفكوك.
  const memoryScript = path.join(__dirname, 'memory.ps1');
  const unpackedMemory = memoryScript.replace(/app\.asar(?=$|[\\/])/, 'app.asar.unpacked');
  const helperScript = fs.existsSync(unpackedMemory) ? unpackedMemory : memoryScript;
  const trainer = new Trainer({
    userData,
    scriptPath: helperScript,
  });
  const saves = new SaveManager(userData);
  const characters = new CharacterManager(userData);
  const builds = new BuildManager(userData);
  const unlocks = new UnlockManager({ userData, trainer, workshop, mods });
  let dlssCache = null;
  let controllerCache = null;
  let gameRunning = { running: false, pid: null };
  let lastInGame = false;
  let closeBackupTimer = null;
  let profileCache = { at: 0, stats: null };

  // Real, honest numbers for the friend profile card. Characters need the save
  // file, so the result is cached for a minute instead of parsing on every
  // presence heartbeat.
  function profileStats() {
    const now = Date.now();
    if (profileCache.stats && now - profileCache.at < 60000) return profileCache.stats;
    let level = 0;
    let charactersCount = 0;
    try {
      const listed = characters.list(activeSaveFile());
      const parsed = Array.isArray(listed?.characters) ? listed.characters : [];
      charactersCount = parsed.length;
      level = parsed.reduce((max, ch) => Math.max(max, Number(ch.level) || 0), 0);
    } catch {
      /* save missing or unreadable */
    }
    let modCount = 0;
    try {
      modCount = fs
        .readdirSync(mods.root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).length;
    } catch {
      /* mods root not created yet */
    }
    let buildCount = 0;
    try {
      buildCount = builds.all().length;
    } catch {
      /* ignore */
    }
    const stats = { level, characters: charactersCount, mods: modCount, builds: buildCount, hours: 0 };
    profileCache = { at: now, stats };
    return stats;
  }

  const social = new Social({
    userData,
    getGameStatus: () => ({
      running: !!gameRunning.running,
      inGame: !!(trainer.attached && trainer.live.inGame),
      activity: '',
    }),
    getProfile: () => ({ about: settings.data.aboutMe || '', stats: profileStats() }),
    setAbout: (text) => settings.save({ aboutMe: text }),
    joining: (invite) => joinInvite(invite),
  });
  social.setEvents((payload) => emit(payload));
  if (settings.data.seamlessPassword) social.setSharedPassword(settings.data.seamlessPassword);

  const updater = new Updater({
    userData,
    version: app.getVersion(),
    appRoot: app.getAppPath(),
    packaged: app.isPackaged,
    getRepo: () => settings.data.updateRepo || settings.data.updateFeedUrl,
    emit,
  });

  function inspect() {
    return gameLib.inspectGame(settings.data.gamePath, settings.data.gameExe);
  }

  // Accepting an invite syncs the host's session password into Seamless and
  // starts the game when it is closed. If the game is already in the world we
  // cannot inject into gameplay, so the popup tells the player to use the
  // in-game effigy with the freshly synced password.
  async function joinInvite(invite = {}) {
    const password = String(invite.password || settings.data.seamlessPassword || '').trim().slice(0, 127);
    settings.save({ seamlessPassword: password, launchMode: 'seamless' });
    social.setSharedPassword(password);
    const info = inspect();
    if (info.found) {
      try {
        seamlessLib.configure(info, settings.data);
      } catch (err) {
        throw new Error(`Seamless is not configured: ${err.message}`);
      }
    }
    const running = await gameLib.isRunning();
    if (running.running) {
      return {
        joined: true,
        launched: false,
        password,
        message:
          'Session password synced. In-game: open Multiplayer and use the Small Golden Effigy / Bloody Finger to join.',
      };
    }
    if (!info.found) throw new Error('Set your game folder in Settings first.');
    const result = await seamlessLib.launch(info, settings.data);
    return { joined: true, launched: true, password, ...result };
  }

  // Applies a queued build to the loaded character when the trainer finally
  // reaches the world (attach at the title screen, then Continue).
  async function flushPendingBuild() {
    const result = await builds.flushPending({ trainer, characters, saveFile: activeSaveFile() });
    if (result?.applied) {
      emit({ type: 'build:applied', characterId: result.characterId });
    }
    return result;
  }

  function activeSaveFile() {
    return saves.resolveSaveFile(settings.data);
  }

  async function dlssInfo(force = false) {
    if (!dlssCache || force) dlssCache = await dlss.info();
    return dlssCache;
  }

  async function controllerInfo(force = false) {
    if (!controllerCache || force) controllerCache = await controller.info();
    return controllerCache;
  }

  async function state() {
    const game = inspect();
    const dlssState = await dlssInfo();
    const controllerState = await controllerInfo();
    const modsList = await mods.list(game);
    const characterList = characters.list(activeSaveFile());
    const highestLevel = (characterList.characters || []).reduce(
      (max, ch) => Math.max(max, Number(ch.level) || 0),
      0
    );
    let accountInfo = account && accounts ? accounts.publicAccount(account) : null;
    if (accountInfo && highestLevel && highestLevel !== accountInfo.level) {
      accounts.setLevel(highestLevel);
      accountInfo = { ...accountInfo, level: highestLevel };
    }
    return {
      account: accountInfo,
      settings: {
        ...settings.data,
        // لا نرسل المفتاح نفسه للواجهة — يكفي معرفة أنه محفوظ.
        nexusApiKey: settings.data.nexusApiKey ? '••••••••' : '',
      },
      game,
      mods: modsList,
      trainer: trainer.status(),
      saves: await saves.list(settings.data),
      characters: characterList,
      unlocks: await unlocks.status(game, modsList),
      dlss: dlssState,
      controller: controllerState,
      nexus: {
        hasKey: !!settings.data.nexusApiKey,
        gameUrl: 'https://www.nexusmods.com/eldenring',
      },
      seamless: seamlessLib.status(game, settings.data),
      workshop: {
        installedCount: modsList.length,
        gameReady: !!game.found,
        hasModEngine2: !!game.hasModEngine2,
        needsSetup: !settings.data.setupDone,
      },
      social: (() => {
        const snapshot = social.state();
        return {
          connected: snapshot.connected,
          relay: snapshot.relay,
          identity: snapshot.identity,
          unread: snapshot.unread,
          pending: snapshot.pending,
          friendCount: snapshot.friends.length,
          incoming: snapshot.requests.incoming.length,
          outgoing: snapshot.requests.outgoing.length,
        };
      })(),
      builds: {
        customCount: builds.data.custom.length,
        total: builds.all().length,
      },
      updates: updater.getState(),
      paths: {
        userData,
        modsRoot: mods.root,
        trainerFile: trainer.stateFile,
        savesRoot: saves.backupsRoot,
      },
      version: app.getVersion(),
      platform: process.platform,
    };
  }

  async function pickGameExe() {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: 'اختر ملف تشغيل اللعبة (nrcs)',
      properties: ['openFile'],
      buttonLabel: 'اختيار الملف',
      filters: [
        { name: 'ملفات تشغيل اللعبة', extensions: ['exe', 'nrcs', 'bat', 'cmd'] },
        { name: 'كل الملفات', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const exe = result.filePaths[0];
    if (!fs.existsSync(exe)) throw new Error(gameLib.MISSING_EXE);
    if (gameLib.SEAMLESS_NAMES.includes(path.basename(exe).toLowerCase())) {
      throw new Error('هذا ملف Seamless. اختر ملف التشغيل العادي (nrcs أو eldenring.exe) — وللعب كوب اختار «Play with Seamless Co-op».');
    }
    const dir = path.dirname(exe);
    settings.save({
      gameExe: exe,
      gamePath: gameLib.resolveGameDir(dir) || dir,
    });
    return state();
  }

  async function pickSaveFile() {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: 'اختر ملف الحفظ',
      properties: ['openFile'],
      filters: [{ name: 'حفظ Elden Ring', extensions: ['sl2', 'co2', 'psc'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    settings.save({ saveFile: result.filePaths[0] });
    return state();
  }

  async function pickModFiles() {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: 'اختر ملف المود',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'ملفات المودات', extensions: ['zip', '7z', 'rar'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const installed = [];
    const failed = [];
    for (const file of result.filePaths) {
      try {
        installed.push(await mods.installArchive(file));
      } catch (err) {
        failed.push({ file: path.basename(file), error: err.message });
      }
    }
    return { installed, failed, mods: await mods.list(inspect()) };
  }

  async function pickModFolder() {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: 'اختر مجلد المود',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const installed = await mods.installFolder(result.filePaths[0]);
    return { installed, mods: await mods.list(inspect()) };
  }

  function requireDlssSupport() {
    return dlssInfo().then((info) => {
      if (!info.dlssSupported) {
        const err = new Error('كرتك ما يدعم DLSS');
        err.code = 'DLSS_UNSUPPORTED';
        throw err;
      }
      return info;
    });
  }

  const handlers = {
    state: () => state(),

    'settings.update': async (patch = {}) => {
      const next = { ...patch };
      if (Object.prototype.hasOwnProperty.call(next, 'gameExe')) {
        const exe = String(next.gameExe || '').trim();
        if (exe && !fs.existsSync(exe)) {
          throw new Error(gameLib.MISSING_EXE);
        }
        next.gameExe = exe;
        if (exe) next.gamePath = gameLib.resolveGameDir(path.dirname(exe)) || path.dirname(exe);
      }
      if (Object.prototype.hasOwnProperty.call(next, 'dlssMode')) {
        const mode = String(next.dlssMode || 'off');
        if (!['off', 'quality', 'balanced', 'performance', 'ultra'].includes(mode)) {
          throw new Error('نوع DLSS غير معروف.');
        }
        if (mode !== 'off') {
          const info = await requireDlssSupport();
          if (!info.dlssSupported) throw new Error('كرتك ما يدعم DLSS');
        }
        next.dlssMode = mode;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'frameGeneration') && next.frameGeneration) {
        const info = await dlssInfo();
        if (!info.frameGenSupported) throw new Error('كرتك ما يدعم توليد الفريمات');
      }
      if (Object.prototype.hasOwnProperty.call(next, 'nexusApiKey')) {
        next.nexusApiKey = String(next.nexusApiKey || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(next, 'language')) {
        if (!['ar', 'en'].includes(next.language)) throw new Error('اللغة غير معروفة.');
      }
      if (Object.prototype.hasOwnProperty.call(next, 'launchMode')) {
        if (!['normal', 'seamless'].includes(next.launchMode)) throw new Error('وضع التشغيل غير معروف.');
      }
      if (Object.prototype.hasOwnProperty.call(next, 'seamlessPassword')) {
        next.seamlessPassword = String(next.seamlessPassword || '').trim().slice(0, 127);
      }
      if (Object.prototype.hasOwnProperty.call(next, 'seamlessPlayerName')) {
        next.seamlessPlayerName = String(next.seamlessPlayerName || '').trim().slice(0, 32) || 'Player';
      }
      if (Object.prototype.hasOwnProperty.call(next, 'seamlessMaxPlayers')) {
        const n = Math.round(Number(next.seamlessMaxPlayers));
        if (!Number.isFinite(n) || n < 2 || n > 127) throw new Error('عدد اللاعبين لازم يكون بين 2 و 127.');
        next.seamlessMaxPlayers = n;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'updateFeedUrl')) {
        const feed = String(next.updateFeedUrl || '').trim();
        if (feed && !/^https?:\/\/[^\s]+$/i.test(feed)) {
          throw new Error('Update feed must be a valid http(s) URL.');
        }
        next.updateFeedUrl = feed;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'updateRepo')) {
        const repo = normalizeRepo(next.updateRepo);
        if (String(next.updateRepo || '').trim() && !repo) {
          throw new Error('GitHub repository must look like owner/name (or a github.com URL).');
        }
        next.updateRepo = repo;
      }
      if (Object.prototype.hasOwnProperty.call(next, 'autoUpdate')) {
        next.autoUpdate = !!next.autoUpdate;
      }
      settings.save(next);
      if (Object.prototype.hasOwnProperty.call(next, 'seamlessPassword')) {
        social.setSharedPassword(next.seamlessPassword);
      }
      const touchesSeamless = ['seamlessPassword', 'seamlessPlayerName', 'seamlessMaxPlayers'].some((k) =>
        Object.prototype.hasOwnProperty.call(next, k)
      );
      if (touchesSeamless) {
        const info = inspect();
        if (info.found) {
          try {
            seamlessLib.configure(info, settings.data);
          } catch {
            /* Seamless may not be installed yet; Test Seamless will explain. */
          }
        }
      }
      return state();
    },

    'settings.pickGameExe': () => pickGameExe(),
    'settings.pickSaveFile': () => pickSaveFile(),
    'settings.clearGameExe': async () => {
      settings.save({ gameExe: '', gamePath: '' });
      return state();
    },
    'settings.detectSave': async () => {
      const file = activeSaveFile();
      if (!file) {
        throw new Error('ما لقينا حفظ اللعبة تلقائياً. اختَر ملف الحفظ يدوياً.');
      }
      settings.save({ saveFile: file });
      return state();
    },
    'settings.refreshDlss': async () => {
      dlssCache = null;
      return { dlss: await dlssInfo(true), state: await state() };
    },
    'controller.detect': async () => {
      controllerCache = null;
      return { controller: await controllerInfo(true), state: await state() };
    },

    'game.detect': async () => {
      const found = await gameLib.detectGame();
      const patch = {};
      if (found.path) {
        patch.gamePath = found.path;
        const current = String(settings.data.gameExe || '');
        const currentIsSeamless = current && gameLib.SEAMLESS_NAMES.includes(path.basename(current).toLowerCase());
        if (!current || currentIsSeamless || !fs.existsSync(current)) {
          for (const name of ['nrcs.exe', 'eldenring.exe']) {
            const candidate = path.join(found.path, name);
            if (fs.existsSync(candidate)) {
              patch.gameExe = candidate;
              break;
            }
          }
        }
        settings.save(patch);
      }
      return { found: found.path, via: found.via, state: await state() };
    },
    'game.launch': async (payload = {}) => {
      let mode = settings.data.launchMode === 'seamless' ? 'seamless' : 'normal';
      if (payload.mode) {
        if (!['normal', 'seamless'].includes(payload.mode)) throw new Error('وضع التشغيل غير معروف.');
        mode = payload.mode;
        settings.save({ launchMode: mode });
      }
      const info = inspect();
      const modsList = await mods.list(info);
      const enabledMods = modsList.filter((m) => m.enabled && m.compatible !== false);
      // Mod Engine 2 is what actually loads activated mods. Launching the game
      // exe directly ignores config_eldenring.toml and the mod folder, so any
      // modded launch MUST go through modengine2_launcher.exe.
      const me2Ready = !!(info.found && info.hasModEngine2 && info.modLauncher);
      const gameTarget = info.found && gameLib.fileExists(path.join(info.path, 'eldenring.exe'))
        ? path.join(info.path, 'eldenring.exe')
        : null;

      if (mode === 'seamless') {
        const st = seamlessLib.status(info, settings.data);
        if (enabledMods.length && me2Ready && st.installed && gameTarget) {
          // Co-op + mods together: ME2 injects SeamlessCoop\ersc.dll alongside
          // the mod DLLs (the community-proven pattern for Seamless + ME2).
          seamlessLib.configure(info, settings.data);
          const seamlessDll = path.join(info.path, 'SeamlessCoop', 'ersc.dll');
          await mods.writeConfig(info, { seamlessDll });
          settings.save({ lastSync: new Date().toISOString() });
          const result = await gameLib.launchModEngine({
            gameDir: info.path,
            launcher: info.modLauncher,
            targetExe: gameTarget,
          });
          return {
            ...result,
            via: 'modengine2+seamless',
            mode,
            modCount: enabledMods.length,
            version: st.version,
            state: await state(),
          };
        }
        const result = await seamlessLib.launch(info, settings.data);
        const warning = enabledMods.length
          ? 'Mods are enabled but Mod Engine 2 is missing — Seamless started WITHOUT mods. Install Mod Engine 2 from the Workshop, then press PLAY again.'
          : '';
        return { ...result, mode, warning, state: await state() };
      }

      const exe = gameLib.resolveNormalExe(info, settings.data.gameExe);
      if (enabledMods.length) {
        if (!me2Ready) {
          const err = new Error(
            'موداتك مفعّلة لكن Mod Engine 2 مو موجود في مجلد اللعبة — ثبّته من الورشة (تحميل مباشر) أو طفّي المودات من MY MODS.'
          );
          err.code = 'MODS_NEED_ME2';
          throw err;
        }
        await mods.writeConfig(info, {});
        settings.save({ lastSync: new Date().toISOString() });
        const result = await gameLib.launchModEngine({
          gameDir: info.path,
          launcher: info.modLauncher,
          targetExe: gameTarget || exe,
        });
        return { ...result, mode: 'normal', modCount: enabledMods.length, state: await state() };
      }
      const result = await gameLib.launch({ gameExe: exe });
      return { ...result, mode: 'normal', state: await state() };
    },
    'game.running': () => gameLib.isRunning(),

    'seamless.status': () => seamlessLib.status(inspect(), settings.data),
    'seamless.test': async () => {
      const report = seamlessLib.test(inspect(), settings.data);
      return { ...report, state: await state() };
    },
    'seamless.configure': async () => {
      const st = seamlessLib.configure(inspect(), settings.data);
      return { seamless: st, state: await state() };
    },
    'seamless.openIni': async () => {
      const st = seamlessLib.status(inspect(), settings.data);
      const target = st.files.iniReal || st.files.ini;
      if (!target) throw new Error('ملف إعدادات Seamless مو موجود.');
      const error = await shell.openPath(target);
      if (error) throw new Error(error);
      return { ok: true };
    },

    'mods.list': async () => mods.list(inspect()),
    'mods.installFiles': () => pickModFiles(),
    'mods.installFolder': () => pickModFolder(),
    'mods.toggle': async ({ id, enabled }) => {
      await mods.toggle(id, enabled);
      const info = inspect();
      let sync = null;
      if (info.found) {
        try {
          sync = await mods.sync(info);
          settings.save({ lastSync: new Date().toISOString() });
        } catch (err) {
          sync = { error: err.message };
        }
      }
      return { mods: await mods.list(info), sync, state: await state() };
    },
    'mods.remove': async ({ id }) => {
      await mods.remove(id);
      return { mods: await mods.list(inspect()), state: await state() };
    },
    'mods.sync': async () => {
      const result = await mods.sync(inspect());
      settings.save({ lastSync: new Date().toISOString() });
      return { ...result, state: await state() };
    },
    'mods.openRoot': async () => mods.openRoot(),
    'mods.open': async ({ id }) => {
      const target = path.join(mods.root, String(id || '').replace(/[\\/]/g, ''));
      const error = await shell.openPath(target);
      if (error) throw new Error(error);
      return { ok: true };
    },
    'mods.openGameDir': async () => {
      const info = inspect();
      if (!info.found) throw new Error('مسار اللعبة غير محدد.');
      const target = info.hasModDir ? info.modDir : info.path;
      const error = await shell.openPath(target);
      if (error) throw new Error(error);
      return { ok: true };
    },

    'nexus.search': async ({ query }) => {
      const result = await nexus.search({ query, apiKey: settings.data.nexusApiKey });
      return { ...result, hasKey: !!settings.data.nexusApiKey };
    },
    'nexus.saveKey': async ({ key }) => {
      const clean = String(key || '').trim();
      if (!clean) throw new Error('حط مفتاح Nexus أول.');
      const info = await nexus.validateKey(clean);
      settings.save({ nexusApiKey: clean });
      return { info, hasKey: true, state: await state() };
    },
    'nexus.clearKey': async () => {
      settings.save({ nexusApiKey: '' });
      return state();
    },

    'workshop.list': async () => workshop.catalog(inspect()),
    // Two-step workshop: download stores the archive in the profile, activate
    // copies it into the game and re-syncs the ModEngine TOML.
    'workshop.download': async ({ id }) => {
      const result = await workshop.download(id, inspect());
      return { ...result, workshop: await workshop.catalog(inspect()) };
    },
    'workshop.activate': async ({ id }) => {
      const result = await workshop.activate(id, inspect());
      return { ...result, state: await state() };
    },
    'workshop.deactivate': async ({ id }) => {
      const result = await workshop.deactivate(id, inspect());
      return { ...result, state: await state() };
    },
    'workshop.delete': async ({ id }) => {
      const result = await workshop.remove(id, inspect());
      return { ...result, state: await state() };
    },
    'workshop.activateAll': async () => {
      const result = await workshop.activateAll(inspect());
      return { ...result, state: await state() };
    },
    'workshop.deactivateAll': async () => {
      const result = await workshop.deactivateAll(inspect());
      return { ...result, state: await state() };
    },
    'workshop.progress': () => workshop.progress(),
    'workshop.importFile': async ({ id }) => {
      const picked = await dialog.showOpenDialog(getWindow(), {
        title: 'Import a downloaded mod archive',
        properties: ['openFile'],
        filters: [{ name: 'Mod archives', extensions: ['zip', '7z', 'rar'] }],
      });
      if (picked.canceled || !picked.filePaths.length) return null;
      const result = await workshop.importArchive(picked.filePaths[0], inspect(), id ? { id } : {});
      return { ...result, state: await state() };
    },
    'workshop.importFiles': () => pickModFiles(),
    // Free mirror link for a Nexus-only mod (ModDB, Google Drive, GitHub or the
    // author's host). Saving an empty url removes it. The renderer only ever
    // sends the URL the player pasted.
    'workshop.setLink': async ({ id, url }) => {
      const link = workshop.setFreeLink(id, url);
      return { link, workshop: await workshop.catalog(inspect()) };
    },
    // Closes the in-app Nexus window; the pending download then reports
    // NEXUS_CLOSED so the card offers Download again.
    'workshop.nexusCancel': async () => {
      nexusWin.close();
      return { closed: true, workshop: await workshop.catalog(inspect()) };
    },
    'workshop.uninstall': async ({ id }) => {
      const result = await workshop.uninstallMod(id, inspect());
      return {
        ...result,
        workshop: await workshop.catalog(inspect()),
        state: await state(),
        message: 'The mod folder was moved to the Recycle Bin.',
      };
    },
    'workshop.repair': async () => {
      const result = await workshop.repair(inspect());
      return { ...result, workshop: await workshop.catalog(inspect()), state: await state() };
    },
    // Repair/reinstall a game-folder tool (Seamless Co-op): fresh official
    // download, integrity-checked, force-installed with configs preserved.
    'workshop.repairTool': async ({ id }) => {
      const result = await workshop.repairTool(id, inspect());
      return { ...result, workshop: await workshop.catalog(inspect()), state: await state() };
    },

    'trainer.attach': async () => {
      const status = await trainer.attach();
      await flushPendingBuild().catch(() => {});
      const unlockSync = await unlocks.syncPending().catch(() => null);
      if (unlockSync?.applied) emit({ type: 'unlocks:applied', level: unlockSync.level });
      social.publishPresence();
      return status;
    },
    'trainer.detach': () => trainer.detach(),
    'trainer.status': () => trainer.status(),
    'trainer.live': () => trainer.refreshLive(),
    'trainer.toggle': async ({ id, enabled }) => trainer.setEnabled(id, enabled),
    'trainer.verify': ({ id }) => trainer.verify(id),
    'trainer.all': ({ enabled }) => trainer.setAll(enabled),
    'trainer.preset': ({ id }) => trainer.applyPreset(id),
    'trainer.saveProfile': ({ name }) => trainer.saveProfile(name),
    'trainer.deleteProfile': ({ id }) => trainer.deleteProfile(id),
    'trainer.applyCharacter': ({ cheats }) => trainer.applyCharacter(cheats),
    'trainer.scan.start': (payload) => trainer.scanStart(payload),
    'trainer.scan.next': (payload) => trainer.scanNext(payload),
    'trainer.scan.reset': () => trainer.scanReset(),
    'trainer.scan.page': ({ offset, limit }) => trainer.scanPage(offset, limit),
    'trainer.scan.write': ({ address, type, value }) => trainer.writeAtAddress(address, type, value),

    'unlocks.status': async () => unlocks.status(inspect(), await mods.list(inspect())),
    'unlocks.select': async ({ patch }) => {
      unlocks.setSelection(patch || {});
      return { unlocks: await unlocks.status(inspect(), await mods.list(inspect())) };
    },
    'unlocks.apply': async () => {
      const result = await unlocks.apply(inspect());
      return { ...result, workshop: await workshop.catalog(inspect()), state: await state() };
    },
    'unlocks.remove': async () => {
      const result = await unlocks.remove(inspect());
      return { ...result, workshop: await workshop.catalog(inspect()), state: await state() };
    },

    'characters.list': () => characters.list(activeSaveFile()),
    'characters.setActive': async ({ id, active }) => {
      const list = characters.list(activeSaveFile());
      const character = list.characters.find((c) => c.id === id);
      if (!character) throw new Error('ما لقينا هذه الشخصية.');
      characters.setActive(id, active);
      const profile = characters.getProfile(id);
      let cheats = profile.cheats || {};
      if (active && !Object.keys(cheats).length) {
        cheats = {};
        for (const cheat of trainer.status().cheats) {
          if (cheat.enabled) cheats[cheat.id] = true;
        }
        characters.setCheats(id, cheats);
      }
      const trainerStatus = await trainer.applyCharacter(cheats, { active: !!active });
      return {
        characters: characters.list(activeSaveFile()),
        trainer: trainerStatus,
        state: await state(),
      };
    },
    'characters.cheat': async ({ id, cheatId, enabled }) => {
      const list = characters.list(activeSaveFile());
      const character = list.characters.find((c) => c.id === id);
      if (!character) throw new Error('ما لقينا هذه الشخصية.');
      const profile = characters.getProfile(id);
      const cheats = { ...(profile.cheats || {}) };
      if (enabled) cheats[cheatId] = true;
      else delete cheats[cheatId];
      characters.setCheats(id, cheats);
      let result = { warnings: [], status: trainer.status() };
      if (character.active) {
        result = await trainer.setEnabled(cheatId, enabled);
      } else if (enabled) {
        result.warnings.push('انحفظ التعديل لهذي الشخصية. فعّلها عشان ينطبق على اللعبة.');
      }
      return {
        ...result,
        characters: characters.list(activeSaveFile()),
        state: await state(),
      };
    },

    'characters.rename': async ({ id, label }) => {
      const list = characters.list(activeSaveFile());
      if (!list.characters.some((character) => character.id === id)) {
        throw new Error('هذه الشخصية مو موجودة في حفظك الحالي.');
      }
      const result = characters.rename(id, label);
      return { ...result, characters: characters.list(activeSaveFile()), state: await state() };
    },
    'characters.hide': async ({ id, hidden }) => {
      const list = characters.list(activeSaveFile());
      if (!list.characters.some((character) => character.id === id)) {
        throw new Error('هذه الشخصية مو موجودة في حفظك الحالي.');
      }
      const result = characters.setHidden(id, hidden);
      return { ...result, characters: characters.list(activeSaveFile()), state: await state() };
    },

    'saves.list': () => saves.list(settings.data),
    'saves.backup': async ({ name }) => {
      const meta = await saves.backupCurrent(settings.data, { name });
      return { meta, saves: await saves.list(settings.data), state: await state() };
    },
    'saves.restore': async ({ id }) => {
      const result = await saves.restore(settings.data, { id });
      return { ...result, saves: await saves.list(settings.data), state: await state() };
    },
    'saves.duplicate': async ({ id, name }) => {
      const meta = await saves.duplicate({ id, name });
      return { meta, saves: await saves.list(settings.data), state: await state() };
    },
    'saves.remove': async ({ id }) => {
      const result = await saves.remove({ id });
      return { ...result, saves: await saves.list(settings.data), state: await state() };
    },
    'saves.openRoot': () => saves.openRoot(),
    'saves.autoBackup': async () => {
      const result = await saves.autoBackup(settings.data);
      return { ...result, saves: await saves.list(settings.data) };
    },
    'saves.createSlot': async ({ name }) => {
      const meta = await saves.createSlot(settings.data, { name });
      return { meta, saves: await saves.list(settings.data), state: await state() };
    },

    'social.state': () => social.state(),
    'social.setName': ({ name }) => social.setName(name),
    'social.add': ({ query, name }) => {
      const result = social.addFriend(query, { name });
      return { ...result, social: social.state() };
    },
    'social.respond': ({ code, accept }) => social.respondRequest(code, accept),
    'social.chat': ({ code, text }) => {
      const result = social.sendChat(code, text);
      return { ...result, social: social.state() };
    },
    'social.invite': ({ code }) => social.invite(code),
    'social.join': ({ code }) => social.join(code),
    'social.accept': async () => {
      const result = await social.acceptInvite();
      return { ...result, social: social.state(), state: await state() };
    },
    'social.decline': () => social.declineInvite(),
    'social.markRead': ({ code }) => social.markRead(code),
    'social.search': ({ query }) => social.search(query),
    'social.about': async ({ text }) => {
      const next = social.setAbout(text);
      return { social: next, state: await state() };
    },
    'social.activity': ({ view }) => {
      const labels = {
        home: 'In the launcher',
        friends: 'Social — catching up',
        builds: 'Studying builds',
        trainer: 'At the training grounds',
        characters: 'Managing characters',
        mods: 'Browsing mods',
        settings: 'Tuning the launcher',
        saves: 'Managing saves',
        mysaves: 'In MY SAVES',
        unlocks: 'Unlocking everything',
      };
      return social.setActivity(labels[view] || 'In the launcher');
    },
    'social.setPassword': async ({ password }) => {
      const clean = String(password || '').trim().slice(0, 127);
      settings.save({ seamlessPassword: clean });
      social.setSharedPassword(clean);
      const info = inspect();
      if (info.found) {
        try {
          seamlessLib.configure(info, settings.data);
        } catch {
          /* Seamless missing */
        }
      }
      return { ok: true, social: social.state(), state: await state() };
    },

    'builds.list': () => ({
      builds: builds.all(),
      applied: builds.data.applied,
      characters: characters.list(activeSaveFile()),
    }),
    'builds.get': ({ id }) => {
      const build = builds.get(id);
      if (!build) throw new Error('This build no longer exists.');
      return build;
    },
    'builds.apply': async ({ buildId, characterId }) => {
      const result = await builds.applyToCharacter({
        buildId,
        characterId,
        trainer,
        characters,
        saveFile: activeSaveFile(),
      });
      return { ...result, state: await state() };
    },
    'builds.save': ({ build }) => {
      const result = builds.saveCustom(build || {});
      return { ...result, builds: builds.all(), applied: builds.data.applied };
    },
    'builds.remove': ({ id }) => {
      const result = builds.remove(id);
      return { ...result, builds: builds.all(), applied: builds.data.applied };
    },

    'updates.state': () => updater.getState(),
    'updates.check': async () => {
      const result = await updater.check({ force: true });
      if (result?.available) emit({ type: 'update:available', result });
      return { result, state: updater.getState() };
    },
    'updates.download': async () => {
      const result = await updater.download();
      return { result, state: updater.getState() };
    },
    'updates.install': () => updater.install({ quit: () => app.quit() }),
    'updates.setRepo': ({ repo }) => {
      const normalized = normalizeRepo(repo);
      if (String(repo || '').trim() && !normalized) {
        throw new Error('GitHub repository must look like owner/name (or a github.com URL).');
      }
      settings.save({ updateRepo: normalized });
      return updater.getState();
    },

    'shell.openExternal': async ({ url }) => {
      if (!/^https?:\/\//i.test(String(url))) throw new Error('رابط غير مسموح.');
      await shell.openExternal(url);
      return { ok: true };
    },
    'shell.openPath': async ({ target }) => {
      const error = await shell.openPath(String(target || ''));
      if (error) throw new Error(error);
      return { ok: true };
    },
    'app.openUserData': async () => {
      const error = await shell.openPath(userData);
      if (error) throw new Error(error);
      return { ok: true };
    },
    // إعادة تشغيل اللانشر بصلاحيات مسؤول — يحتاجها الاتصال باللعبة عندما
    // تكون اللعبة نفسها شغالة كمسؤول (Windows يمنع القراءة/الكتابة بالذاكرة).
    'app.relaunchAdmin': () =>
      new Promise((resolve, reject) => {
        if (process.platform !== 'win32') {
          reject(new Error('إعادة التشغيل كمسؤول متاحة على ويندوز فقط.'));
          return;
        }
        const exe = process.execPath;
        const args = app.isPackaged ? [] : [path.resolve(__dirname, '..', '..')];
        const esc = (value) => String(value).replace(/'/g, "''");
        const argPart = args.length ? ` -ArgumentList '${args.map(esc).join("','")}'` : '';
        const script = [
          "$ErrorActionPreference='Stop'",
          `Start-Process -FilePath '${esc(exe)}'${argPart} -Verb RunAs`,
        ].join('; ');
        let stderr = '';
        const child = spawn(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', script],
          { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }
        );
        child.stderr.on('data', (chunk) => {
          stderr += String(chunk || '');
        });
        child.on('error', (err) => reject(new Error(`ما قدرنا نطلب صلاحيات مسؤول: ${err.message}`)));
        child.on('close', (code) => {
          if (code === 0) {
            setTimeout(() => app.quit(), 900);
            resolve({ ok: true });
            return;
          }
          const canceled = /canceled|cancelled|1223|ألغيت/i.test(stderr);
          reject(
            new Error(
              canceled
                ? 'انلغى طلب صلاحيات المسؤول. تقدر تسكّر اللانشر وتفتحه بيمين الفأرة ← «تشغيل كمسؤول».'
                : `تعذّر رفع الصلاحيات${stderr ? `: ${stderr.trim().split('\n')[0]}` : ''}.`
            )
          );
        });
      }),
    'app.info': () => ({
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      userData,
    }),
  };

  async function dispatch(action, payload) {
    const handler = handlers[action];
    if (!handler) throw new Error(`أمر غير معروف: ${action}`);
    return handler(payload || {});
  }

  async function autoCheckUpdates() {
    if (!settings.data.autoUpdate) return { skipped: true, reason: 'disabled' };
    if (!updater.repo()) return { skipped: true, reason: 'no-repo' };
    return updater.check({ force: false });
  }

  const watchdog = setInterval(async () => {
    try {
      const running = await gameLib.isRunning();
      if (!!running.running !== !!gameRunning.running) {
        const wasRunning = !!gameRunning.running;
        gameRunning = running;
        social.publishPresence();
        // The game just closed: take one automatic save backup (deduplicated
        // by the save file's own timestamp).
        if (wasRunning && !running.running) {
          if (closeBackupTimer) clearTimeout(closeBackupTimer);
          closeBackupTimer = setTimeout(async () => {
            closeBackupTimer = null;
            try {
              const result = await saves.autoBackup(settings.data);
              if (result && result.auto) emit({ type: 'saves:autoBackup', meta: result.meta });
            } catch {
              /* save may still be locked by Steam Cloud for a moment */
            }
          }, 4000);
          closeBackupTimer.unref?.();
        }
      }
      const inGame = !!(trainer.attached && trainer.live.inGame);
      if (inGame && !lastInGame) {
        await flushPendingBuild().catch(() => {});
        const unlockSync = await unlocks.syncPending().catch(() => null);
        if (unlockSync?.applied) emit({ type: 'unlocks:applied', level: unlockSync.level });
      }
      lastInGame = inGame;
    } catch {
      /* transient */
    }
  }, 4000);
  watchdog.unref?.();

  social.start();

  function shutdown() {
    clearInterval(watchdog);
    if (closeBackupTimer) clearTimeout(closeBackupTimer);
    social.stop();
    nexusWin.close();
    trainer.shutdown();
  }

  return { dispatch, state, shutdown, inspect, mods, autoCheckUpdates };
}

module.exports = { createActions };
