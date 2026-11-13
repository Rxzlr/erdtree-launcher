/* Erdtree Launcher — واجهة عربية RTL */
const api = window.erd;

const S = {
  state: null,
  view: 'home',
  detail: null,
  savesOpen: false,
  scroll: {},
  running: null,
  openPanels: {},
  scan: { type: 'int32', value: '', mode: 'exact', nextValue: '', started: false, count: 0, rows: [], offset: 0, typeLabel: '', truncated: false, loading: false },
  nexus: { open: false, query: '', loading: false, results: [], source: '', error: '', downloading: 0, needKey: false },
  workshop: { data: null, loading: false, tab: 'discover', category: 'all', sort: 'featured', query: '', installing: '', error: '', importOpen: false, url: '', filter: 'all', limit: 48, busy: '', detail: '', failed: null },
  auth: { session: null, mode: 'login', busy: '', error: '', remember: true, identifier: '', recoveryCode: '', resetStep: 1, full: false, draft: {} },
  buildQuery: '',
  buildFilter: 'all',
  setup: { open: false, step: 1, busy: '', error: '', password: '', playerName: '', mode: 'seamless', detecting: false },
  seamless: { test: null, testing: false },
  charQuery: '',
  version: '',
  social: null,
  chatWith: '',
  chatDraft: '',
  socialBusy: '',
  addFriendOpen: false,
  addFriendQuery: '',
  addMatches: [],
  builds: null,
  buildDetail: '',
  buildBusy: '',
  buildApply: null,
  updates: null,
  updatePrompted: '',
  updateBusy: '',
  buildEditor: null,
  unlocks: { busy: '', error: '', warnings: [] },
};

const isEn = () => (window.I18N ? I18N.lang === 'en' : false);
const dateLocale = () => (isEn() ? 'en-US' : 'ar-EG');
const tr = (value) => (window.I18N ? I18N.t(value) : value);

const ICONS = {
  home: '<path d="M4 10.5 12 3l8 7.5"/><path d="M6 9.5V21h12V9.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5"/>',
  wand: '<path d="M15 3v3M15 11v2M9 7h2M20 7h-2"/><path d="m4 20 9-9"/><path d="m14 12 2 2"/><path d="m12 14 2 2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4"/><circle cx="17.2" cy="9.2" r="2.4"/><path d="M15.5 14.7c2.8.3 5 2.3 5 4.9"/>',
  play: '<path d="M7 4.5v15l13-7.5-13-7.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  pencil: '<path d="m4 20 1-4L16 5l3 3L8 19l-4 1Z"/><path d="m14 7 3 3"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  shield: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/>',
  bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>',
  alert: '<path d="M12 4 3 20h18L12 4Z"/><path d="M12 10v4M12 17.2v.2"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  snow: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/><path d="m9.5 4.5 2.5 2.5 2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5Z"/><path d="M8 3v18"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M17 4l3 3M15 6l2 2"/>',
  sword: '<path d="m14.5 3.5 6 6-8 8-3 .8.8-3 8-8Z"/><path d="m11 9 4 4"/><path d="m4 20 5-5"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.2A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/>',
  wing: '<path d="M3 13c4-1 6-4 7-9 3 3 4 7 3 11"/><path d="M12 15c4-1 6-4 7-9 2 3 2 7 1 10"/><path d="M6 19c3-1 5-2 6-4 1 2 3 3 6 4"/>',
  run: '<circle cx="14" cy="5" r="2"/><path d="m11 9-3 4 3 2-2 5"/><path d="m12 10 4 2 2 4"/><path d="M5 12h3"/>',
  up: '<path d="M12 20V5"/><path d="m6 11 6-6 6 6"/>',
  skull: '<path d="M12 3a7 7 0 0 0-7 7c0 2.6 1.3 4.3 3 5.5V19h8v-3.5c1.7-1.2 3-2.9 3-5.5a7 7 0 0 0-7-7Z"/><circle cx="9.5" cy="10" r="1"/><circle cx="14.5" cy="10" r="1"/><path d="M10 15h4"/>',
  hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.2h4M9.5 14.8h4"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  cloud: '<path d="M6 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5-1.5A4 4 0 0 1 18 18H6Z"/>',
  eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><circle cx="12" cy="13" r="3.4"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  save: '<path d="M5 3h11l3 3v15H5V3Z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/>',
  spark: '<path d="M12 2v5M12 17v5M4.9 4.9l3.5 3.5M15.6 15.6l3.5 3.5M2 12h5M17 12h5M4.9 19.1l3.5-3.5M15.6 8.4l3.5-3.5"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v5L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-10V3"/><path d="M7.5 14h9"/>',
  freeze: '<path d="M12 2v20M4 7l16 10M20 7 4 17"/><path d="m9 4 3 3 3-3M9 20l3-3 3 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  star: '<path d="m12 3 2.8 6 6.2.7-4.6 4.3 1.3 6.1L12 17l-5.7 3.1 1.3-6.1L3 9.7 9.2 9 12 3Z"/>',
  flame: '<path d="M12 21c4 0 6.5-2.6 6.5-6.2 0-3.4-2.3-5.4-3.6-8.3-.5-1.1-.8-2.4-.9-3.5-2.6 1.7-4.3 4-4.3 6.6 0 1 .3 1.9.8 2.7-1.2-.4-2-1.4-2.3-2.7-1.2 1.4-2.7 3.3-2.7 5.4C5.5 18.5 8 21 12 21Z"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  box: '<path d="M12 3 3 8v8l9 5 9-5V8l-9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2 2 0 0 0-2 2v8.5A2.5 2.5 0 0 0 6.5 16"/>',
  friends: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2.2"/><path d="M2.5 20c0-3 2.4-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><path d="M15.5 14.6c2.5.2 4.5 2 4.5 4.4"/>',
  builds: '<path d="M5 20h14"/><path d="M7 20V9l5-6 5 6v11"/><path d="M10 20v-5h4v5"/><path d="M9 9h6"/>',
  send: '<path d="m3 11 18-8-8 18-2-8-8-2Z"/><path d="m13 11 8-8"/>',
  chat: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  crown: '<path d="m3 8 4 3 5-6 5 6 4-3-2 11H5L3 8Z"/><path d="M5 19h14"/>',
  bell: '<path d="M18 16H6c1-1.5 1.5-3.4 1.5-5.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 4.5 4.5c0 2.1.5 4 1.5 5.5Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  sort: '<path d="M7 4v16M4 17l3 3 3-3"/><path d="M14 8h6M14 12h5M14 16h3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8C8 8 6 6.5 6 4.5S8.5 1.5 12 8c3.5-6.5 6-3.5 6 0S16 8 12 8Z"/>',
  shieldCheck: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  gamepad: '<path d="M7 8h10a4 4 0 0 1 4 4v1.5a2.5 2.5 0 0 1-2.5 2.5h-.6l-2-2H8.1l-2 2h-.6A2.5 2.5 0 0 1 3 13.5V12a4 4 0 0 1 4-4Z"/><path d="M8 11v3M6.5 12.5h3"/><path d="M15.5 11.5h.01M17.5 13h.01"/>',
};

const nf = new Intl.NumberFormat('ar-EG');
const nfLatin = new Intl.NumberFormat('en-US');

function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtNum(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return nfLatin.format(num);
}

function fmtBytes(bytes) {
  const num = Number(bytes) || 0;
  if (isEn()) {
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (num < 1024) return `${num} بايت`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} كيلو`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} ميقا`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} قيقا`;
}

function toast(message, type = 'info') {
  const stack = document.getElementById('toasts');
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  const name = type === 'error' ? 'alert' : type === 'ok' ? 'check' : 'bolt';
  node.innerHTML = `${icon(name)}<div>${esc(tr(message))}</div>`;
  stack.appendChild(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 260);
  }, type === 'error' ? 8000 : 3600);
}

async function call(action, payload, { silent = false } = {}) {
  try {
    return await api.invoke(action, payload);
  } catch (err) {
    if (!silent) toast(err.message || 'صار خطأ', 'error');
    throw err;
  }
}

function setBusy(btn, on) {
  if (!btn) return;
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}

function state() {
  return S.state;
}

function currentView() {
  if (S.view === 'builds' && S.buildDetail) return 'buildDetail';
  if (S.view !== 'characters') return S.view;
  if (S.savesOpen) return 'saves';
  if (S.detail) return 'characterDetail';
  return 'characters';
}

function accountInitial(name) {
  const clean = String(name || 'T').trim();
  return esc(clean.charAt(0).toUpperCase() || 'T');
}

function accountAvatarHtml(session, cls = '') {
  const account = session?.account;
  const name = account?.username || 'Guest';
  if (account?.avatar) return `<span class="account-avatar ${cls}"><img src="${esc(account.avatar)}" alt="" /></span>`;
  return `<span class="account-avatar ${cls}">${accountInitial(name)}</span>`;
}

function currentLevel() {
  const fromAccount = Number(S.auth.session?.account?.level) || 0;
  const fromChars = (S.state?.characters?.characters || []).reduce(
    (max, ch) => Math.max(max, Number(ch.level) || 0),
    0
  );
  return Math.max(fromAccount, fromChars);
}

function renderAccountChip() {
  const chip = document.getElementById('accountChip');
  if (!chip) return;
  const session = S.auth.session;
  if (!session?.loggedIn) {
    chip.innerHTML = '';
    return;
  }
  const account = session.account || {};
  const level = currentLevel();
  chip.innerHTML = `${accountAvatarHtml(session)}
    <span class="account-meta">
      <span class="account-name">${esc(account.username || 'Tarnished')}${session.guest ? ' · Guest' : ''}</span>
      <span class="account-level">${level ? `Level ${level}` : 'No character yet'}</span>
    </span>
    ${icon('chevron')}`;
}

function updateChrome() {
  if (!S.state) return;
  const st = S.state;
  const enabled = st.trainer.cheats.filter((c) => c.enabled).length;
  const setBadge = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  setBadge('trainerBadge', enabled);
  setBadge('charactersBadge', st.characters.characters.length);
  const wsCounts = S.workshop?.data?.counts;
  setBadge('modsBadge', wsCounts ? wsCounts.active : st.mods.filter((m) => m.enabled).length);
  renderAccountChip();
  const socialBadge = document.getElementById('friendsBadge');
  if (socialBadge) {
    const social = S.social || st.social || {};
    const count = (Number(social.unread) || 0) + (Number(social.incoming) || social.requests?.incoming?.length || 0);
    socialBadge.textContent = String(count);
    socialBadge.style.display = count ? '' : 'none';
  }
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    const nav = btn.dataset.nav;
    let active = nav === S.view;
    if (nav === 'characters' && S.view === 'characters') active = true;
    if (nav === 'builds' && S.view === 'builds') active = true;
    btn.classList.toggle('active', active);
  });
  document.getElementById('versionText').textContent = `Version ${S.version}`;
  document.querySelectorAll('.nav-icon[data-icon]').forEach((el) => {
    if (!el.innerHTML.trim()) el.innerHTML = icon(el.dataset.icon);
  });

  const running = !!S.running?.running;
  const attached = !!st.trainer.attached;
  const dot = document.getElementById('connDot');
  const connText = document.getElementById('connText');
  dot.className = `dot ${running ? 'dot-on' : ''} ${attached ? 'dot-live' : ''}`;
  if (attached) connText.textContent = 'متصل بالتعديلات';
  else if (running) connText.textContent = 'اللعبة شغالة';
  else connText.textContent = 'اللعبة مو شغالة';

  const tbDot = document.getElementById('tbDot');
  const tbText = document.getElementById('tbText');
  tbDot.className = `dot ${running ? 'dot-on' : ''}`;
  if (running) tbText.textContent = `اللعبة شغالة${S.running.pid ? ` · ${S.running.pid}` : ''}`;
  else if (st.game.exeExists) tbText.textContent = 'جاهز للتشغيل';
  else tbText.textContent = 'اختر ملف اللعبة من الإعدادات';
  if (window.I18N) I18N.apply(document.body);
}

/* ---------------- modal ---------------- */
let modalCloseHandler = null;

function openModal({ title, body, actions = [], wide = false, onClose = null }) {
  const root = document.getElementById('modalRoot');
  modalCloseHandler = onClose;
  root.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div class="modal-title">${title}</div>
        <button class="btn btn-icon btn-ghost" data-modal-close aria-label="إغلاق">${icon('x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-modal-action="${i}">${a.label}</button>`).join('')}</div>` : ''}
    </div>`;
  root.querySelectorAll('[data-modal-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = actions[Number(btn.dataset.modalAction)];
      if (!action) return;
      try {
        const result = action.onClick ? await action.onClick(btn) : undefined;
        if (result !== false) closeModal();
      } catch (err) {
        toast(err.message || 'خطأ', 'error');
      }
    });
  });
  root.querySelectorAll('[data-modal-close]').forEach((btn) => btn.addEventListener('click', () => closeModal()));
  if (window.I18N) I18N.apply(root);
  const first = root.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 80);
}

function closeModal() {
  const root = document.getElementById('modalRoot');
  if (!root.innerHTML) return;
  root.innerHTML = '';
  const handler = modalCloseHandler;
  modalCloseHandler = null;
  if (handler) handler();
}

/* ---------- first-run setup wizard ---------- */
function wizVals() {
  const pass = document.getElementById('wizPassword');
  const name = document.getElementById('wizPlayerName');
  if (pass) S.setup.password = pass.value.trim().slice(0, 127);
  if (name) S.setup.playerName = name.value.trim().slice(0, 32) || 'Player';
}

function openWizard(step = 1) {
  const st = state();
  S.setup.open = true;
  S.setup.step = Math.max(1, Math.min(3, step));
  S.setup.error = '';
  S.setup.busy = '';
  if (!S.setup.password) S.setup.password = st.settings.seamlessPassword || '';
  if (!S.setup.playerName) S.setup.playerName = st.settings.seamlessPlayerName || 'Player';
  S.setup.mode = st.settings.launchMode === 'normal' ? 'normal' : 'seamless';
  renderWizard();
  // أول ما يفتح المعالج على جهاز جديد: ندوّر على اللعبة تلقائياً بدل ما
  // نطلب من صاحب الجهاز يضغط «اكتشف» بنفسه.
  if (S.setup.step === 1 && !st.game.found && !S.setup.detecting) {
    S.setup.detecting = true;
    call('game.detect', undefined, { silent: true })
      .then(async (result) => {
        S.setup.detecting = false;
        if (!S.setup.open) return;
        await updateStateFrom(result, { rerender: false });
        if (S.setup.open && S.setup.step === 1) renderWizard();
      })
      .catch(() => {
        S.setup.detecting = false;
      });
  }
}

function closeWizard() {
  S.setup.open = false;
  S.setup.busy = '';
  document.getElementById('modalRoot').innerHTML = '';
}

function wizStepDots() {
  return `<div class="wiz-dots">${[1, 2, 3]
    .map((n) => `<span class="wiz-dot ${S.setup.step === n ? 'active' : ''} ${S.setup.step > n ? 'done' : ''}">${S.setup.step > n ? icon('check') : n}</span>`)
    .join('')}</div>`;
}

function renderWizard() {
  const root = document.getElementById('modalRoot');
  if (!root) return;
  const st = state();
  const g = st.game;
  const step = S.setup.step;
  const seamlessReady = !!st.seamless?.ready;
  const gameLine = g.found
    ? `<div class="wiz-line ok">${icon('check')} <span>لقينا اللعبة: <span class="mono">${esc(g.path)}</span></span></div>`
    : S.setup.detecting
      ? `<div class="wiz-line warn">${icon('search')} <span>ندوّر على اللعبة تلقائياً…</span></div>`
      : `<div class="wiz-line warn">${icon('alert')} <span>ما لقينا اللعبة تلقائياً. اضغط «اكتشف» أو اختر ملف التشغيل بنفسك.</span></div>`;

  const body =
    step === 1
      ? `
      <div class="wiz-title">أهلاً بك في Erdtree Launcher</div>
      <p class="wiz-sub">خلّنا نجهّز كل شي بثلاث خطوات قصيرة — نفس الخطوات تسويها عند أخوياك عشان تلعبون سوا.</p>
      <div class="wiz-card">${gameLine}
        <div class="wiz-actions">
          <button class="btn btn-sm" data-wiz-act="detect" ${S.setup.busy ? 'disabled' : ''}>${icon('search')} اكتشف اللعبة</button>
          <button class="btn btn-sm" data-wiz-act="pickExe">${icon('folder')} اختر ملف التشغيل</button>
        </div>
      </div>
      <div class="wiz-hint">${icon('shield')} اللانشر يشغّل اللعبة مباشرة بدون ستيم، والتعديلات أوفلاين فقط.</div>`
      : step === 2
        ? `
      <div class="wiz-title">Seamless Co-op وكلمة السر</div>
      <p class="wiz-sub">كلمة السر نفسها لازم تكون عندك وعند كل أخوياك — اللي ما يعرفها ما يدخل عالمكم.</p>
      <div class="wiz-card">
        <label class="wiz-field">
          <span class="setting-label">كلمة سر الكو-أوب</span>
          <input class="input mono" id="wizPassword" value="${esc(S.setup.password)}" placeholder="مثال: erdtree-coop" maxlength="127" autocomplete="off" spellcheck="false" />
        </label>
        <label class="wiz-field">
          <span class="setting-label">اسمك داخل اللعبة</span>
          <input class="input" id="wizPlayerName" value="${esc(S.setup.playerName)}" maxlength="32" autocomplete="off" />
        </label>
        <div class="wiz-status ${seamlessReady ? 'ok' : 'warn'}">
          ${seamlessReady ? `${icon('check')} Seamless مثبّت وجاهز ${st.seamless.version ? `· v${esc(st.seamless.version)}` : ''}` : `${icon('alert')} Seamless مو مثبّت بعد — ثبّته بضغطة (تحميل مباشر من GitHub).`}
        </div>
        ${S.setup.busy ? `<div class="wiz-prog">${icon('download')} <span>${esc(S.setup.busy)}</span></div>` : ''}
        ${
          !seamlessReady
            ? `<button class="btn btn-primary btn-block" data-wiz-act="installSeamless" ${S.setup.busy || !g.found || !S.setup.password ? 'disabled' : ''}>${icon('download')} ثبّت Seamless الآن</button>
               ${!g.found ? '<div class="wiz-hint">حدد مجلد اللعبة أول (خطوة ١).</div>' : ''}
               ${g.found && !S.setup.password ? '<div class="wiz-hint">اكتب كلمة السر أول عشان تنكتب في إعدادات Seamless.</div>' : ''}`
            : `<div class="wiz-hint">تغيير كلمة السر هنا ينطبق على ملف الإعدادات مباشرة.</div>`
        }
      </div>`
        : `
      <div class="wiz-title">جاهز… خلّنا نبدأ</div>
      <p class="wiz-sub">اختر وضع التشغيل الافتراضي، وتقدر تغيّره أي وقت من الرئيسية.</p>
      <div class="wiz-mode">
        <button class="wiz-mode-opt ${S.setup.mode === 'normal' ? 'active' : ''}" data-wiz-act="mode" data-mode="normal">
          ${icon('play')} <b>Normal</b><span>لعب فردي عادي</span>
        </button>
        <button class="wiz-mode-opt ${S.setup.mode === 'seamless' ? 'active' : ''}" data-wiz-act="mode" data-mode="seamless">
          ${icon('users')} <b>Seamless Co-op</b><span>مع أخوياك بنفس كلمة السر</span>
        </button>
      </div>
      <div class="wiz-card wiz-summary">
        <div class="wiz-line ${g.found ? 'ok' : 'warn'}">${icon(g.found ? 'check' : 'alert')} <span>${g.found ? 'اللعبة مربوطة' : 'اللعبة مو محددة — تقدر تكمل وتضبطها لاحقاً'}</span></div>
        <div class="wiz-line ${seamlessReady ? 'ok' : 'warn'}">${icon(seamlessReady ? 'check' : 'alert')} <span>${seamlessReady ? 'Seamless مثبّت' : 'Seamless مو مثبّت — اللعب الجماعي يحتاجه'}</span></div>
        <div class="wiz-line ${S.setup.password ? 'ok' : 'warn'}">${icon('users')} <span>كلمة السر: <b class="mono">${esc(S.setup.password || 'بدون')}</b>${S.setup.password ? ' — شاركها مع أخوياك' : ''}</span></div>
      </div>
      <div class="wiz-hint">${icon('shield')} خلّك Solo داخل اللعبة عند استخدام التعديلات — استخدامها أونلاين قد يبند الحساب.</div>`;

  root.innerHTML = `
    <div class="modal wiz" role="dialog" aria-modal="true">
      <div class="wiz-head">
        ${wizStepDots()}
        <button class="btn btn-sm btn-ghost" data-wiz-act="skip">تخطي</button>
      </div>
      <div class="wiz-body">
        ${S.setup.error ? `<div class="banner danger">${icon('alert')}<div>${esc(S.setup.error)}</div></div>` : ''}
        ${body}
      </div>
      <div class="wiz-foot">
        ${step > 1 ? `<button class="btn btn-ghost" data-wiz-act="back">رجوع</button>` : '<span></span>'}
        ${
          step < 3
            ? `<button class="btn btn-primary" data-wiz-act="next" ${S.setup.busy || (step === 1 && !g.found) ? 'disabled' : ''}>التالي ${icon('chevron')}</button>`
            : `<button class="btn btn-primary" data-wiz-act="finish" ${S.setup.busy ? 'disabled' : ''}>${icon('check')} ابدأ — كل شي جاهز</button>`
        }
      </div>
    </div>`;
  if (window.I18N) I18N.apply(root);
}

async function wizNext() {
  const st = state();
  wizVals();
  if (S.setup.step === 1) {
    S.setup.step = 2;
    renderWizard();
    return;
  }
  if (S.setup.step === 2) {
    if (S.setup.password) {
      try {
        const next = await call(
          'settings.update',
          { seamlessPassword: S.setup.password, seamlessPlayerName: S.setup.playerName },
          { silent: true }
        );
        S.state = next;
      } catch (err) {
        S.setup.error = err.message;
        renderWizard();
        return;
      }
    }
    S.setup.step = 3;
    renderWizard();
    return;
  }
  await wizFinish();
}

async function wizInstallSeamless() {
  wizVals();
  if (!S.setup.password) {
    S.setup.error = 'اكتب كلمة السر أول — نفسها لازم تكون عند أخوياك.';
    renderWizard();
    return;
  }
  S.setup.error = '';
  S.setup.busy = 'نحفظ كلمة السر…';
  renderWizard();
  try {
    S.state = await call(
      'settings.update',
      { seamlessPassword: S.setup.password, seamlessPlayerName: S.setup.playerName },
      { silent: true }
    );
    S.setup.busy = 'ننزل Seamless من GitHub…';
    renderWizard();
    let stop = false;
    const timer = setInterval(async () => {
      if (stop) return;
      try {
        const jobs = await call('workshop.progress', {}, { silent: true });
        const job = (jobs || []).find((j) => j.id === 'seamless-coop');
        if (job) {
          const label = wsJobLabel(job);
          const pct = wsPct(job);
          const next = `Seamless: ${label}${job.total ? ` · ${pct}%` : ''}`;
          if (next !== S.setup.busy) {
            S.setup.busy = next;
            const el = document.querySelector('.wiz-prog span');
            if (el) el.textContent = next;
          }
        }
      } catch {
        /* ignore */
      }
    }, 700);
    const result = await call('workshop.install', { id: 'seamless-coop' }, { silent: true });
    stop = true;
    clearInterval(timer);
    S.state = result.state || S.state;
    if (result.workshop) S.workshop.data = result.workshop;
    S.setup.busy = '';
    renderWizard();
    toast('Seamless انثبّت — كلمة السر انكتبت في إعداداته.', 'ok');
  } catch (err) {
    S.setup.busy = '';
    S.setup.error = err.message;
    renderWizard();
  }
}

async function wizFinish() {
  wizVals();
  S.setup.busy = 'نجهّز الإعدادات…';
  renderWizard();
  try {
    const next = await call(
      'settings.update',
      {
        setupDone: true,
        launchMode: S.setup.mode,
        seamlessPassword: S.setup.password,
        seamlessPlayerName: S.setup.playerName,
      },
      { silent: true }
    );
    S.state = next;
    closeWizard();
    go('home');
    toast('كل شي جاهز — شارك كلمة السر مع أخوياك والعبوا سوا.', 'ok');
  } catch (err) {
    S.setup.busy = '';
    S.setup.error = err.message;
    renderWizard();
  }
}

async function wizSkip() {
  try {
    S.state = await call('settings.update', { setupDone: true }, { silent: true });
  } catch {
    /* ignore */
  }
  closeWizard();
  toast('تقدر تفتح معالج الإعداد أي وقت من الاعدادات.', 'info');
}

async function handleWizard(act, el) {
  switch (act) {
    case 'detect': {
      S.setup.busy = 'ندوّر على اللعبة…';
      renderWizard();
      try {
        const result = await call('game.detect', {}, { silent: true });
        if (result.state) S.state = result.state;
        if (!result.found) S.setup.error = 'ما لقينا اللعبة تلقائياً — اختر ملف التشغيل يدوياً.';
      } catch (err) {
        S.setup.error = err.message;
      }
      S.setup.busy = '';
      renderWizard();
      return;
    }
    case 'pickExe': {
      try {
        const next = await call('settings.pickGameExe', {}, { silent: true });
        if (next) S.state = next;
      } catch (err) {
        S.setup.error = err.message;
      }
      renderWizard();
      return;
    }
    case 'installSeamless':
      await wizInstallSeamless();
      return;
    case 'mode': {
      wizVals();
      S.setup.mode = el && el.dataset.mode === 'normal' ? 'normal' : 'seamless';
      renderWizard();
      return;
    }
    case 'next':
      await wizNext();
      return;
    case 'back':
      wizVals();
      S.setup.step = Math.max(1, S.setup.step - 1);
      renderWizard();
      return;
    case 'finish':
      await wizFinish();
      return;
    case 'skip':
      await wizSkip();
      return;
    default:
      return;
  }
}

function confirmModal({ title, html, okLabel = 'تأكيد', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    openModal({
      title,
      body: html,
      actions: [
        { label: 'إلغاء', cls: 'btn-ghost', onClick: () => done(false) },
        { label: okLabel, cls: danger ? 'btn-danger' : 'btn-primary', onClick: () => done(true) },
      ],
      onClose: () => done(false),
    });
  });
}

function promptModal({ title, label, placeholder = '', value = '', okLabel = 'حفظ', hint = '' }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    openModal({
      title,
      body: `<div class="field"><label class="field-label">${esc(label)}</label>
        <input class="input" id="promptInput" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="40" />
        ${hint ? `<div class="hint small" style="margin-top:8px">${hint}</div>` : ''}
      </div>`,
      actions: [
        { label: 'إلغاء', cls: 'btn-ghost', onClick: () => done(null) },
        {
          label: okLabel,
          cls: 'btn-primary',
          onClick: () => {
            const input = document.getElementById('promptInput');
            const text = (input?.value || '').trim();
            if (!text) {
              toast('اكتب الاسم أول', 'error');
              return false;
            }
            done(text);
            return true;
          },
        },
      ],
      onClose: () => done(null),
    });
  });
}

let offlineAcked = false;
async function ensureOffline() {
  if (!state()?.settings?.warnOnline || offlineAcked) return true;
  const ok = await confirmModal({
    title: 'قبل ما نعدّل',
    html: `كل التعديلات للعب <strong>الأوفلاين</strong> بس. إذا عدّلت قيم وأنت أونلاين ممكن يتبند حسابك.<br><br>تأكد إنك داخل اللعبة بوضع <span class="code-chip">Solo / Offline</span>.`,
    okLabel: 'أنا أوفلاين — كمّل',
  });
  if (ok) offlineAcked = true;
  return ok;
}

/* ---------------- rendering ---------------- */
function heroArt() {
  return `<svg class="hero-art" viewBox="0 0 400 400" fill="none" aria-hidden="true">
    <circle cx="200" cy="200" r="150" stroke="rgba(201,168,106,.18)" stroke-width="1"/>
    <circle cx="200" cy="200" r="128" stroke="rgba(201,168,106,.12)" stroke-width="1" stroke-dasharray="2 7"/>
    <circle cx="200" cy="200" r="96" stroke="rgba(233,217,174,.22)" stroke-width="1.4"/>
    <circle cx="200" cy="200" r="60" stroke="rgba(201,168,106,.16)" stroke-width="1"/>
    <path d="M200 34v42M200 324v42M34 200h42M324 200h42" stroke="rgba(201,168,106,.2)" stroke-width="1"/>
    <path d="M200 104v192M104 200h192" stroke="rgba(201,168,106,.08)" stroke-width="1"/>
    <path d="M200 104l-26 30 26 30 26-30-26-30Z" stroke="rgba(233,217,174,.35)" stroke-width="1"/>
    <path d="M200 150v100M150 200h100" stroke="rgba(201,168,106,.12)" stroke-width="6"/>
  </svg>`;
}

function pill(text, cls = '') {
  return `<span class="pill ${cls}">${text}</span>`;
}

function dlssLabel(modeId) {
  const modes = state()?.dlss?.modes || [];
  return modes.find((m) => m.id === modeId)?.name || 'إيقاف';
}

function viewHomeLegacy() {
  const st = state();
  const g = st.game;
  const settings = st.settings;
  const mods = st.mods;
  const mode = settings.launchMode === 'seamless' ? 'seamless' : 'normal';
  const normalExe = settings.gameExe || g.normalExe || '';
  const seamlessExe = st.seamless?.files?.launcher || st.seamless?.files?.launcherReal || g.seamlessExe || '';
  const enabledMods = mods.filter((m) => m.enabled && m.compatible).length;
  const save = st.saves.active;
  const enabledCheats = st.trainer.cheats.filter((c) => c.enabled).length;
  const missingExe = !settings.gameExe;
  const badExe = settings.gameExe && !g.exeExists;
  const friendsOnline = (S.social?.friends || []).filter((f) => f.status && f.status !== 'offline').length;

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">Elden Ring · لانشر عربي</div>
      <h1 class="view-title">لانشر إلدن رينغ</h1>
      <div class="view-sub">كل شي تحت الشجرة… تشغيل، مودات، شخصيات، وتعديلات — بدون تعقيد.</div>
    </div>
    <div class="head-actions">
      <button class="btn" data-act="go" data-view="mods">${icon('layers')} المودات</button>
    </div>
  </div>

  <section class="hero home-hero">
    ${heroArt()}
    <div class="home-copy">
      <div class="eyebrow">The Lands Between</div>
      <h2 class="hero-title">ERDTREE</h2>
      <div class="hero-title-ar">كل شيء… بمكان واحد</div>
      <p class="hero-sub">لانشر بسيط يفهمه أي واحد من أول مرة. شغّل لعبتك من المسار اللي تختاره، ركّب موداتك، وعدّل قيمك بضغطة.</p>
      <div class="hero-tags">
        ${pill(g.exeExists ? 'ملف اللعبة جاهز' : 'ما اخترت ملف اللعبة', g.exeExists ? 'ok' : 'warn')}
        ${pill(`${enabledMods} مود مفعّل`, enabledMods ? 'gold' : '')}
        ${pill(`${st.characters.characters.length} شخصية`, st.characters.characters.length ? 'ok' : '')}
      </div>
    </div>

    <div class="launch-panel">
      <div class="launch-top">
        <div class="game-avatar">${icon('shield')}</div>
        <div class="launch-meta">
          <div class="name">ELDEN RING</div>
          <div class="path" title="${esc(mode === 'seamless' ? seamlessExe : normalExe || '')}">${
            mode === 'seamless'
              ? seamlessExe
                ? esc(seamlessExe)
                : 'ما اخترت ملف التشغيل بعد'
              : normalExe
                ? esc(normalExe)
                : 'ما اخترت ملف التشغيل بعد'
          }</div>
        </div>
      </div>

      <div class="mode-label">اختيار وضع اللعب</div>
      <div class="mode-choice">
        <button class="mode-option ${mode === 'normal' ? 'active' : ''}" data-act="setLaunchMode" data-mode="normal">
          <span class="mode-check">${icon('check')}</span>
          <span class="mode-copy"><b>Play Normal</b><span>يشتغل من ملف nrcs / eldenring.exe العادي — بدون ستيم.</span></span>
        </button>
        <button class="mode-option ${mode === 'seamless' ? 'active' : ''}" data-act="setLaunchMode" data-mode="seamless">
          <span class="mode-check">${icon('check')}</span>
          <span class="mode-copy"><b>Play with Seamless Co-op</b><span>يشغّل launch_elden_ring_seamlesscoop.exe مباشرة للعب مع أخوياك.</span></span>
          <span class="mode-badge ${st.seamless.ready ? 'ok' : 'warn'}">${st.seamless.ready ? `Seamless ${st.seamless.version || ''}` : 'غير جاهز'}</span>
        </button>
      </div>

      ${
        mode === 'seamless'
          ? `<div class="coop-pass">
              <div class="coop-pass-head">${icon('users')} كلمة سر الكو-أوب <span class="tiny muted">— نفسها عندك وعند أخوياك</span></div>
              <div class="coop-pass-row">
                <input class="input mono" id="coopPassword" value="${esc(settings.seamlessPassword)}" placeholder="مثال: erdtree-coop" maxlength="127" autocomplete="off" spellcheck="false" />
                <button class="btn btn-sm btn-primary" data-act="saveCoopPassword">${icon('check')} حفظ</button>
                <button class="btn btn-sm" data-act="copyCoopPassword">${icon('copy')} نسخ</button>
              </div>
              <div class="tiny muted">${
                settings.seamlessPassword
                  ? `الحالية: <b class="mono">${esc(settings.seamlessPassword)}</b> — شاركها مع أخوياك عشان يدخلون نفس العالم.`
                  : 'ما فيه كلمة سر بعد — حدد وحدة، احفظها، وأرسلها لأخوياك.'
              }</div>
            </div>`
          : ''
      }

      <button class="btn btn-primary btn-lg btn-block" data-act="launch">${icon('play')} تشغيل اللعبة</button>
      ${
        mode === 'seamless' && !st.seamless.ready
          ? `<button class="btn btn-block" data-act="fixSeamless" ${S.workshop.busy ? 'disabled' : ''}>${icon('download')} ${S.workshop.busy ? 'نثبّت Seamless…' : 'ثبّت Seamless تلقائياً'}</button>
             <button class="btn btn-sm btn-ghost btn-block" data-act="testSeamless">${icon('shield')} Test Seamless</button>`
          : missingExe || badExe
            ? `<button class="btn btn-block" data-act="pickGameExe">${icon('folder')} اختر ملف تشغيل اللعبة</button>`
            : ''
      }
      <div class="launch-hint">
        ${icon('shield')}
        <span>${
          mode === 'seamless'
            ? st.seamless.ready
              ? 'Seamless جاهز — بنشغّله مباشرة بدون ستيم.'
              : 'Seamless مو جاهز — افتح الاعدادات وجرّب Test Seamless'
            : g.exeExists
              ? 'نشغّل اللعبة من الملف اللي اخترته مباشرة — بدون ستيم.'
              : 'اختر ملف nrcs من الإعدادات، وكل تشغيل يروح عليه مباشرة.'
        }</span>
      </div>
    </div>
  </section>

  ${
    badExe
      ? `<div class="banner warn section-gap">${icon('alert')}
          <div><strong>ملف اللعبة مو موجود، اختر المسار الصحيح من الاعدادات</strong>
          <div style="margin-top:10px"><button class="btn btn-sm" data-act="pickGameExe">${icon('folder')} صحّح المسار</button></div></div>
        </div>`
      : ''
  }

  <div class="quick-grid section-gap">
    <button class="quick" data-act="go" data-view="trainer">
      <div class="stat-icon" style="width:36px;height:36px">${icon('wand')}</div>
      <div><div class="q-title">التعديلات</div><div class="q-sub">${enabledCheats} تعديل مفعّل من ${st.trainer.cheats.length}</div></div>
      <span class="quick-arrow">${icon('chevron')}</span>
    </button>
    <button class="quick" data-act="go" data-view="characters">
      <div class="stat-icon" style="width:36px;height:36px">${icon('users')}</div>
      <div><div class="q-title">الشخصيات</div><div class="q-sub">${st.characters.characters.length ? `${st.characters.characters.length} شخصية من حفظك` : 'ما لقينا شخصيات بعد'}</div></div>
      <span class="quick-arrow">${icon('chevron')}</span>
    </button>
    <button class="quick" data-act="go" data-view="mods">
      <div class="stat-icon" style="width:36px;height:36px">${icon('layers')}</div>
      <div><div class="q-title">المودات</div><div class="q-sub">${mods.length ? `${enabledMods} مفعّل من ${mods.length}` : 'ابدأ بأول مود'}</div></div>
      <span class="quick-arrow">${icon('chevron')}</span>
    </button>
    <button class="quick" data-act="go" data-view="friends">
      <div class="stat-icon" style="width:36px;height:36px">${icon('friends')}</div>
      <div><div class="q-title">Friends${st.social?.unread ? `<span class="quick-badge">${st.social.unread}</span>` : ''}</div><div class="q-sub">${friendsOnline ? `${friendsOnline} online الآن` : st.social?.friendCount ? `${st.social.friendCount} صديق` : 'أضف أول صديق'}</div></div>
      <span class="quick-arrow">${icon('chevron')}</span>
    </button>
  </div>

  <div class="status-strip section-gap">
    <div class="status-cell"><span class="status-label">الحفظ</span><span class="status-value">${save ? esc(save.modifiedLabel || '') : 'ما لقينا حفظ'}</span></div>
    <div class="status-cell"><span class="status-label">DLSS</span><span class="status-value">${esc(dlssLabel(settings.dlssMode))}</span></div>
    <div class="status-cell"><span class="status-label">توليد الفريمات</span><span class="status-value">${settings.frameGeneration ? 'شغال' : 'طافي'}</span></div>
    <div class="status-cell"><span class="status-label">مسار الحفظ</span><span class="status-value mono" title="${esc(save?.path || '')}">${save ? esc(save.path) : 'غير محدد'}</span></div>
  </div>

  <div class="banner section-gap">${icon('alert')}
    <div><strong>للتعديل بس:</strong> خلّك أوفلاين (Solo). التعديل أونلاين ممكن يبند حسابك — واللانشر ما يتجاوز أي حماية.</div>
  </div>`;
}

/* ---------------- home ---------------- */
function viewHome() {
  const st = state();
  const session = S.auth.session || {};
  const account = session.account || {};
  const gameReady = !!st.game.found && !!st.settings.gameExe && st.game.exeExists;
  const seamlessMode = st.settings.launchMode === 'seamless';
  const seamlessReady = !!st.seamless?.ready;
  const activeMods = S.workshop?.data?.counts?.active ?? st.mods.filter((m) => m.enabled).length;
  const downloaded = S.workshop?.data?.counts?.downloaded ?? 0;
  const friendsOnline = (S.social?.friends || []).filter((f) => f.status && f.status !== 'offline').length;
  const friendCount = S.social?.friendCount || st.social?.friendCount || 0;
  const unread = Number(S.social?.unread) || 0;
  const incoming = Number(S.social?.incoming) || 0;
  const level = currentLevel();
  const buildsCount = S.builds?.builds?.length || st.builds?.total || 0;
  const myChars = (st.characters?.characters || []).filter((c) => !c.hidden);
  const activeChar = myChars.find((c) => c.active);
  const unlockSelected = st.unlocks?.selectedCount || 0;
  const unlockApplied = !!(st.unlocks?.applied?.items || st.unlocks?.applied?.runes || st.unlocks?.applied?.level);
  const modeChip = seamlessMode
    ? seamlessReady
      ? 'Seamless Co-op · Ready'
      : 'Seamless Co-op · Not installed'
    : 'Normal launch';

  return `
  <div class="home-view">
    <div class="home-head">
      <div class="home-kicker">The Lands Between</div>
      <h1 class="home-greeting">Welcome back, <span>${esc(account.username || 'Tarnished')}</span></h1>
      <div class="home-status-line">
        <i class="home-dot ${gameReady ? 'on' : ''}"></i>
        ${gameReady ? 'Game ready' : 'Game folder not set'}
        <span>·</span> ${level ? `Level ${level}` : 'No character loaded'}
        <span>·</span> ${activeMods} mod${activeMods === 1 ? '' : 's'} active
        <span>·</span> ${friendsOnline ? `${friendsOnline} friend${friendsOnline === 1 ? '' : 's'} online` : `${friendCount} friend${friendCount === 1 ? '' : 's'}`}
      </div>
    </div>

    <button class="home-play" data-act="launch" aria-label="Play Elden Ring">
      <span class="home-play-art"></span>
      <span class="home-play-shade"></span>
      <span class="home-play-body">
        <span class="home-play-sigil">${icon('shield')}</span>
        <span class="home-play-label">PLAY</span>
        <span class="home-play-sub">ELDEN RING</span>
        <span class="home-play-mode">${esc(modeChip)}</span>
      </span>
    </button>

    ${
      !gameReady
        ? `<div class="banner warn" style="max-width:620px;margin:0 auto 22px;text-align:left">
            ${icon('folder')}
            <div><strong>Point the launcher at your game folder.</strong>
            <div style="margin-top:8px"><button class="btn btn-sm" data-act="pickGameExe">${icon('folder')} Locate game</button></div></div>
          </div>`
        : ''
    }

    <div class="home-grid">
      <button class="home-tile" data-act="go" data-view="friends">
        <span class="home-tile-icon">${icon('friends')}</span>
        <span class="home-tile-label">FRIENDS</span>
        <span class="home-tile-sub">${inviteSummary(friendsOnline, friendCount)}</span>
        ${unread + incoming ? `<span class="home-tile-badge">${unread + incoming}</span>` : ''}
      </button>
      <button class="home-tile" data-act="go" data-view="builds">
        <span class="home-tile-icon">${icon('builds')}</span>
        <span class="home-tile-label">BUILDS</span>
        <span class="home-tile-sub">${buildsCount ? `${buildsCount} end-game builds with one-click apply` : 'Load the build library'}</span>
      </button>
      <button class="home-tile" data-act="go" data-view="mods">
        <span class="home-tile-icon">${icon('layers')}</span>
        <span class="home-tile-label">WORKSHOP</span>
        <span class="home-tile-sub">${downloaded || activeMods ? `${downloaded} downloaded · ${activeMods} active` : 'Real Nexus mods with covers and filters'}</span>
      </button>
      <button class="home-tile" data-act="go" data-view="mysaves">
        <span class="home-tile-icon">${icon('save')}</span>
        <span class="home-tile-label">MY SAVES</span>
        <span class="home-tile-sub">${
          myChars.length
            ? `${myChars.length} character${myChars.length === 1 ? '' : 's'}${activeChar ? ` · ${esc(activeChar.label || activeChar.name)}` : ''} · auto backup on close`
            : 'Your playthroughs, backups and save slots'
        }</span>
        ${myChars.length ? `<span class="home-tile-badge">${myChars.length}</span>` : ''}
      </button>
      <button class="home-tile" data-act="go" data-view="unlocks">
        <span class="home-tile-icon">${icon('key')}</span>
        <span class="home-tile-label">UNLOCK ALL</span>
        <span class="home-tile-sub">${unlockApplied ? 'Unlock is applied — everything is free at the merchant' : unlockSelected ? `${unlockSelected} option${unlockSelected === 1 ? '' : 's'} selected` : 'Every weapon, armor, talisman, runes and max level'}</span>
      </button>
      <button class="home-tile" data-act="go" data-view="settings">
        <span class="home-tile-icon">${icon('gear')}</span>
        <span class="home-tile-label">SETTINGS</span>
        <span class="home-tile-sub">Game folder, launch mode, co-op password, tools</span>
      </button>
    </div>

    <div class="home-foot">
      <div>${icon('alert', 'tiny')} Cheats and mods are for offline Solo play — the launcher never bypasses anti-cheat.</div>
      <div><b>Version ${esc(S.version || '')}</b></div>
    </div>
  </div>`;
}

function inviteSummary(online, total) {
  if (online) return `${online} online now — send an invite`;
  if (total) return `${total} friends · invites and chat`;
  return 'Add your first Tarnished friend';
}

function cheatStatus(cheat, tr) {
  if (cheat.kind === 'full') return { cls: 'act', label: 'مرة وحدة', hint: 'اضغط الزر عشان يعبّي القيمة داخل اللعبة.' };
  if (!cheat.enabled) return { cls: 'off', label: 'طافي', hint: 'فعّله عشان يشتغل داخل اللعبة.' };
  if (cheat.applied) return { cls: 'on', label: 'شغال الآن', hint: 'مطبّق داخل اللعبة ومؤكد بالقراءة.' };
  if (!tr.attached) return { cls: 'wait', label: 'ينتظر الاتصال', hint: 'شغّل اللعبة واضغط «اتصال باللعبة».' };
  return { cls: 'wait', label: 'ينتظر الشخصية', hint: 'حمّل شخصيتك (Continue) وهو يشتغل تلقائياً.' };
}

function cheatTile(cheat, tr) {
  const status = cheatStatus(cheat, tr);
  const control =
    cheat.kind === 'full'
      ? `<button class="btn btn-sm btn-primary" data-act="cheatAction" data-id="${esc(cheat.id)}">عبّئ الآن</button>`
      : `<label class="switch" title="${cheat.enabled ? 'إيقاف' : 'تفعيل'}">
          <input type="checkbox" data-cheat-toggle="${esc(cheat.id)}" ${cheat.enabled ? 'checked' : ''} />
          <span></span>
        </label>`;
  return `
  <div class="cheat-tile ${status.cls}" data-cheat-id="${esc(cheat.id)}">
    <div class="cheat-glyph">${icon(cheat.icon || 'wand')}</div>
    <div class="cheat-copy">
      <div class="cheat-title">${esc(cheat.name)}${cheat.warn ? ' <span class="tiny warn-dot" title="تعديل تجريبي — قد يجمّد شخصيتك">⚠</span>' : ''}</div>
      <div class="cheat-desc">${esc(cheat.desc)}</div>
      <div class="cheat-state ${status.cls}" title="${esc(status.hint)}"><span class="state-dot"></span>${status.label}</div>
    </div>
    ${control}
  </div>`;
}

function liveBar(key, label, value, max, cls) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100)) : 0;
  return `<div class="live-bar-row">
    <span class="live-bar-label">${esc(label)}</span>
    <span class="live-bar-track"><span class="live-bar-fill ${cls}" data-live-fill="${key}" style="width:${pct.toFixed(1)}%"></span></span>
    <span class="live-bar-num mono"><b data-live-num="${key}">${fmtNum(value)}</b><small> / ${fmtNum(max)}</small></span>
  </div>`;
}

function viewTrainer() {
  const st = state();
  const tr = st.trainer;
  const groupIcons = { اللاعب: 'heart', القتال: 'sword', الموارد: 'coin', المتعة: 'spark' };
  const groups = tr.groups.map((group) => ({
    group,
    icon: groupIcons[group] || 'wand',
    cheats: tr.cheats.filter((c) => c.group === group),
  }));
  const builtins = tr.presets.filter((p) => !p.saved);
  const saved = tr.presets.filter((p) => p.saved);
  const scan = S.scan;
  const pageStart = scan.offset + 1;
  const pageEnd = Math.min(scan.offset + scan.rows.length, scan.count);
  const ready = tr.attached;
  const live = tr.live || {};
  const inGame = !!tr.inGame;

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">التعديلات · أوفلاين</div>
      <h1 class="view-title">التعديلات</h1>
      <div class="view-sub">تشتغل فعلياً داخل اللعبة — بدون عناوين ولا إعدادات. فعّل والعب.</div>
    </div>
    <div class="head-actions">
      <span class="pill ${inGame ? 'ok' : ready ? 'warn' : ''}" id="trainerStatePill">${inGame ? 'داخل اللعبة' : ready ? 'بانتظار الشخصية' : 'غير متصل'}</span>
      ${ready ? `<button class="btn btn-sm btn-ghost" data-act="detachTrainer">فصل</button>` : `<button class="btn btn-primary" data-act="attachTrainer">${icon('link')} اتصال باللعبة</button>`}
    </div>
  </div>

  <div class="toolbar">
    <div class="toolbar-actions">
      <button class="btn btn-primary" data-act="allCheats" data-enabled="1">${icon('bolt')} تشغيل الكل</button>
      <button class="btn" data-act="allCheats" data-enabled="0">${icon('x')} إيقاف الكل</button>
      <button class="btn" data-act="saveLoadout">${icon('save')} حفظ تشكيلتي</button>
    </div>
    <div class="toolbar-stats">
      ${pill(`${tr.enabledCount} مفعّل`, tr.enabledCount ? 'gold' : '')}
      ${pill(`${tr.appliedCount} شغال فعلياً`, tr.appliedCount ? 'ok' : '')}
      <span class="tiny muted">${ready ? 'متصلين — التعديلات تتطبق وتتأكد كل ثانية' : 'شغّل اللعبة واضغط اتصال'}</span>
    </div>
  </div>

  <div class="banner compact-banner">${icon('alert')}
    <div><strong>خلّك أوفلاين (Solo).</strong> التعديل أونلاين ممكن يبند حسابك — وعلى مسؤوليتك.</div>
  </div>

  <section class="live-panel section-gap">
    <div class="live-head">
      <div class="live-title">${icon('heart')} شخصيتك الآن</div>
      <div class="row-btns">
        ${ready ? `<button class="btn btn-sm btn-ghost" data-act="verifyCheats">${icon('check')} اختبر أن الكتابة تشتغل</button>` : ''}
      </div>
    </div>
    ${
      inGame
        ? `<div class="live-bars">
            ${liveBar('hp', 'الدم', live.hp, live.maxHp, 'hp')}
            ${liveBar('fp', 'الفوكس', live.fp, live.maxFp, 'fp')}
            ${liveBar('sp', 'الستامينا', live.stamina, live.maxStamina, 'sp')}
          </div>
          <div class="live-chips">
            <div class="live-chip">${icon('coin')} <span>الرونز</span><b class="mono" data-live-runes>${fmtNum(live.runes)}</b></div>
            <div class="live-chip">${icon('star')} <span>المستوى</span><b class="mono" data-live-level>${fmtNum(live.level)}</b></div>
            <div class="live-chip">${icon('link')} <span>أساس الشخصية</span><b class="mono tiny">0x${Number(tr.anchors?.worldChrMan || 0).toString(16).toUpperCase()}</b></div>
          </div>`
        : `<div class="live-off">${icon('pause')}
            <div>
              <b>${ready ? 'بانتظار ما تحمّل شخصيتك' : 'اللعبة مو متصلة'}</b>
              <span>${ready ? 'من قائمة اللعبة اختر Continue — أول ما تدخل، القيم بتظهر هنا والتعديلات المفعّلة بتشتغل لحالها.' : 'شغّل اللعبة من الرئيسية، وبعدها اضغط «اتصال باللعبة».'}</span>
            </div>
          </div>`
    }
  </section>

  ${
    tr.warnings && tr.warnings.length
      ? `<div class="banner info section-gap">${icon('alert')}<div>${esc(tr.warnings[0])}</div></div>`
      : ''
  }

  ${groups
    .map(
      ({ group, icon: gi, cheats }) => `
    <section class="cheat-group section-gap">
      <div class="group-head">
        <div class="group-icon">${icon(gi)}</div>
        <div>
          <div class="group-name">${esc(group)}</div>
          <div class="group-sub">${esc(groupDesc(group))}</div>
        </div>
        <div class="group-line"></div>
        <div class="tiny muted">${cheats.filter((c) => c.enabled).length} / ${cheats.length}</div>
      </div>
      <div class="cheat-grid">${cheats.map((c) => cheatTile(c, tr)).join('')}</div>
    </section>`
    )
    .join('')}

  <section class="section-gap">
    <div class="group-head">
      <div class="group-icon">${icon('bookmark')}</div>
      <div><div class="group-name">البريستات</div><div class="group-sub">تشكيلات جاهزة أو من حفظك</div></div>
      <div class="group-line"></div>
      <div class="tiny muted">${builtins.length + saved.length}</div>
    </div>
    <div class="preset-grid">
      ${builtins
        .map(
          (p) => `<div class="preset-card ${tr.activePreset === p.id ? 'active' : ''}">
            <div class="preset-icon">${icon(p.icon || 'bookmark')}</div>
            <div class="preset-copy"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span><small>${p.cheats.length} تعديل</small></div>
            <button class="btn btn-sm" data-act="applyPreset" data-id="${esc(p.id)}">تفعيل</button>
          </div>`
        )
        .join('')}
      ${saved
        .map(
          (p) => `<div class="preset-card saved ${tr.activePreset === p.id ? 'active' : ''}">
            <div class="preset-icon">${icon('bookmark')}</div>
            <div class="preset-copy"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span><small>تشكيلتك المحفوظة</small></div>
            <div class="preset-actions">
              <button class="btn btn-sm" data-act="applyPreset" data-id="${esc(p.id)}">تفعيل</button>
              <button class="btn btn-icon btn-ghost btn-danger" data-act="deletePreset" data-id="${esc(p.id)}" title="حذف">${icon('trash')}</button>
            </div>
          </div>`
        )
        .join('')}
    </div>
  </section>

  <details class="panel section-gap" data-panel="scanner" ${S.openPanels.scanner ? 'open' : ''}>
    <summary>
      <span class="summary-icon">${icon('search')}</span>
      <span><b>فاحص القيم (متقدم)</b><small>لو تبي تدور على قيمة بنفسك — بحث أول وبحث تالي</small></span>
      <span class="summary-chevron">${icon('chevron')}</span>
    </summary>
    <div class="panel-body">
      <div class="hint" style="margin-bottom:12px">
        اكتب الرقم اللي تشوفه في اللعبة → <b>بحث أول</b> → غيّره داخل اللعبة → اكتب الرقم الجديد → <b>بحث تالي</b> → كرّر لين تبقى نتيجة وحدة.
      </div>
      <div class="scan-controls">
        <div class="field">
          <label class="field-label">نوع القيمة</label>
          <select class="select" id="scanType">
            ${[
              ['int32', 'عدد صحيح (رونز/مستوى)'],
              ['float', 'عشري (دم/ستامينا)'],
              ['int64', 'عدد كبير'],
              ['int16', 'عدد صغير'],
              ['int8', 'بايت'],
              ['double', 'عشري مزدوج'],
            ]
              .map(([value, label]) => `<option value="${value}" ${scan.type === value ? 'selected' : ''}>${label}</option>`)
              .join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">القيمة اللي تشوفها</label>
          <input class="input mono" id="scanValue" value="${esc(scan.value)}" placeholder="مثال: 12500" inputmode="decimal" />
        </div>
        <button class="btn btn-primary" data-act="scanStart" ${ready ? '' : 'disabled'}>${icon('search')} بحث أول</button>
      </div>
      <div class="scan-controls scan-next">
        <div class="field">
          <label class="field-label">البحث التالي</label>
          <select class="select" id="scanMode">
            <option value="exact" ${scan.mode === 'exact' ? 'selected' : ''}>نفس القيمة</option>
            <option value="increased" ${scan.mode === 'increased' ? 'selected' : ''}>زادت</option>
            <option value="decreased" ${scan.mode === 'decreased' ? 'selected' : ''}>نقصت</option>
            <option value="changed" ${scan.mode === 'changed' ? 'selected' : ''}>تغيّرت</option>
            <option value="unchanged" ${scan.mode === 'unchanged' ? 'selected' : ''}>ما تغيّرت</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">القيمة الجديدة (اختياري)</label>
          <input class="input mono" id="scanNextValue" value="${esc(scan.nextValue)}" placeholder="إذا اخترت نفس القيمة" inputmode="decimal" />
        </div>
        <button class="btn" data-act="scanNext" ${ready && scan.started ? '' : 'disabled'}>${icon('refresh')} بحث تالي</button>
        <button class="btn btn-ghost" data-act="scanReset" ${scan.started ? '' : 'disabled'}>إعادة</button>
      </div>
      <div class="scan-status">
        <span class="dot ${scan.started ? 'dot-live' : ''}"></span>
        <span>${scan.started ? `النتائج: <b>${fmtNum(scan.count)}</b>${scan.truncated ? ' — وصلنا الحد، صفِّ أكثر' : ''}` : ready ? 'ما بعد بحثنا. ابدأ بقيمة من داخل اللعبة.' : 'اتصل باللعبة أول عشان تقدر تفحص القيم.'}</span>
      </div>
      ${
        scan.rows.length
          ? `<div class="results">
              <div class="tiny muted" style="padding:8px 6px">عرض ${pageStart}–${pageEnd} من ${fmtNum(scan.count)}</div>
              ${scan.rows
                .map(
                  (row) => `<div class="result-row">
                    <div class="result-addr" title="${esc(row.addressHex)}">${esc(row.addressHex)}</div>
                    <div class="result-val">${fmtNum(row.value)}</div>
                    <button class="btn btn-sm" data-act="scanWrite" data-addr="${row.address}">غيّر</button>
                  </div>`
                )
                .join('')}
              <div class="pager">
                <button class="btn btn-sm btn-ghost" data-act="scanPage" data-offset="${Math.max(0, scan.offset - 50)}" ${scan.offset <= 0 ? 'disabled' : ''}>اللي قبل</button>
                <button class="btn btn-sm btn-ghost" data-act="scanPage" data-offset="${scan.offset + 50}" ${scan.offset + 50 >= scan.count ? 'disabled' : ''}>اللي بعد</button>
              </div>
            </div>`
          : `<div class="empty small-empty">${icon('target')}<div>${scan.started ? 'ما فيه نتائج — جرّب قيمة ثانية أو غيّر النوع.' : 'النتائج تطلع هنا.'}</div></div>`
      }
    </div>
  </details>`;
}

function groupDesc(group) {
  switch (group) {
    case 'اللاعب':
      return 'دم، فوكس، ستامينا، وتعبئة فورية';
    case 'القتال':
      return 'أدوات ما تنقص، وتعطيل الهجوم/الحركة';
    case 'الموارد':
      return 'رونز ثابتة';
    case 'المتعة':
      return 'سرعة أنميشن الشخصية';
    default:
      return '';
  }
}

function viewCharacters() {
  const st = state();
  const chars = st.characters;
  const q = S.charQuery.toLowerCase();
  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">حفظك · شخصياتك</div>
      <h1 class="view-title">الشخصيات</h1>
      <div class="view-sub">كل شخصياتك بأسماءها اللي داخل اللعبة. اختر وحدة وعدّل عليها لحالها.</div>
    </div>
    <div class="head-actions">
      <button class="btn" data-act="openSaves">${icon('save')} مدير الحفظ</button>
    </div>
  </div>

  ${
    chars.characters.length
      ? `<div class="search-bar">
          <span class="search-icon">${icon('search')}</span>
          <input class="input" id="charSearch" value="${esc(S.charQuery)}" placeholder="ابحث عن شخصية بالاسم…" />
          <span class="tiny muted">${chars.characters.length} شخصية</span>
        </div>`
      : ''
  }

  ${
    !chars.characters.length
      ? `<div class="card"><div class="empty">
          ${icon('users')}
          <div class="empty-title">${esc(chars.error || 'ما لقينا شخصيات في حفظك')}</div>
          <div class="small">تأكد إنك لعبت وخلّصت أول شخصية، أو حدد ملف الحفظ الصحيح.</div>
          <div class="row-btns" style="margin-top:14px">
            <button class="btn btn-primary" data-act="go" data-view="settings">${icon('folder')} حدد ملف الحفظ</button>
            <button class="btn" data-act="openSaves">${icon('save')} مدير الحفظ</button>
          </div>
        </div></div>`
      : `<div class="char-grid" id="charGrid">
          ${chars.characters
            .map((c) => {
              const initial = [...c.name][0] || '؟';
              return `<div class="character-card ${c.active ? 'active' : ''}" data-char-name="${esc(c.name.toLowerCase())}">
                <div class="char-top">
                  <div class="char-portrait"><span>${esc(initial)}</span></div>
                  <div class="char-id">
                    <div class="char-name">${esc(c.name)} ${c.active ? pill('مفعّلة', 'ok') : ''}</div>
                    <div class="char-meta">${c.level ? `المستوى ${fmtNum(c.level)}` : 'المستوى غير معروف'} · خانة ${fmtNum(c.slot)}</div>
                  </div>
                </div>
                <div class="char-stats">
                  <div><span>تعديلات محفوظة</span><b>${Object.keys(c.cheats || {}).length}</b></div>
                  <div><span>آخر تعديل</span><b>${c.lastEdited ? new Date(c.lastEdited).toLocaleDateString(dateLocale()) : '—'}</b></div>
                </div>
                <div class="char-actions">
                  <button class="btn btn-sm" data-act="openCharacter" data-id="${esc(c.id)}">${icon('pencil')} تعديل</button>
                  <button class="btn btn-sm ${c.active ? 'btn-ghost' : 'btn-primary'}" data-act="toggleCharacter" data-id="${esc(c.id)}" data-active="${c.active ? '1' : '0'}">${c.active ? 'إيقاف' : 'تفعيل'}</button>
                </div>
              </div>`;
            })
            .join('')}
        </div>
        <div class="empty small-empty" id="charEmpty" style="display:none">${icon('search')}<div>ما لقينا شخصية بهذا الاسم.</div></div>`
  }

  <div class="banner section-gap">${icon('bookmark')}
    <div>لكل شخصية تعديلاتها الخاصة. لما تفعّل شخصية، تنطبق تعديلاتها المختارة — وتقدر ترجع لأي شخصية وقت ثاني.</div>
  </div>`;
}

function viewCharacterDetail() {
  const st = state();
  const character = st.characters.characters.find((c) => c.id === S.detail);
  if (!character) return viewCharacters();
  const groupIcons = { اللاعب: 'heart', القتال: 'sword', الموارد: 'coin', المتعة: 'camera' };
  const initial = [...character.name][0] || '؟';
  return `
  <div class="view-head">
    <div>
      <button class="back-link" data-act="backCharacters">${icon('chevron')} رجوع للشخصيات</button>
      <h1 class="view-title">${esc(character.name)}</h1>
      <div class="view-sub">${character.level ? `المستوى ${fmtNum(character.level)}` : 'شخصية من حفظك'} · ${character.active ? 'مفعّلة الحين' : 'مو مفعّلة'} · تعديلاتها تنحفظ لها لحالها.</div>
    </div>
    <div class="head-actions">
      <button class="btn ${character.active ? '' : 'btn-primary'}" data-act="toggleCharacter" data-id="${esc(character.id)}" data-active="${character.active ? '1' : '0'}">
        ${character.active ? 'إيقاف الشخصية' : 'تفعيل الشخصية'}
      </button>
    </div>
  </div>

  <div class="char-hero card">
    <div class="char-portrait big"><span>${esc(initial)}</span></div>
    <div class="char-hero-copy">
      <div class="char-name">${esc(character.name)} ${character.active ? pill('مفعّلة', 'ok') : pill('مو مفعّلة')}</div>
      <div class="char-meta">${Object.keys(character.cheats || {}).length} تعديل محفوظ لهذه الشخصية${character.lastEdited ? ` · آخر تعديل ${new Date(character.lastEdited).toLocaleString(dateLocale())}` : ''}</div>
      ${character.active ? `<div class="hint" style="margin-top:8px">تعديلاتها تنطبق على اللعبة الحين. أي تغيير تحت ينحفظ لها.</div>` : `<div class="hint" style="margin-top:8px">فعّلها عشان تنطبق تعديلاتها على اللعبة.</div>`}
    </div>
  </div>

  ${(['اللاعب', 'القتال', 'الموارد', 'المتعة'])
    .map((group) => {
      const cheats = st.trainer.cheats.filter((c) => c.group === group);
      return `<section class="cheat-group section-gap">
        <div class="group-head">
          <div class="group-icon">${icon(groupIcons[group] || 'wand')}</div>
          <div><div class="group-name">${esc(group)}</div><div class="group-sub">${esc(groupDesc(group))}</div></div>
          <div class="group-line"></div>
          <div class="tiny muted">${cheats.filter((c) => character.cheats?.[c.id]).length} / ${cheats.length}</div>
        </div>
        <div class="cheat-grid">
          ${cheats
            .map((cheat) => {
              const on = !!character.cheats?.[cheat.id];
              const global = st.trainer.cheats.find((c) => c.id === cheat.id);
              const status = on
                ? global?.applied && character.active
                  ? { cls: 'on', label: 'شغال' }
                  : { cls: 'wait', label: character.active ? 'ينتظر العنوان' : 'ينتظر التفعيل' }
                : { cls: 'off', label: 'طافي' };
              return `<div class="cheat-tile ${status.cls}" data-cheat-id="${esc(cheat.id)}">
                <div class="cheat-glyph">${icon(cheat.icon || 'wand')}</div>
                <div class="cheat-copy">
                  <div class="cheat-title">${esc(cheat.name)}</div>
                  <div class="cheat-desc">${esc(cheat.desc)}</div>
                  <div class="cheat-state ${status.cls}"><span class="state-dot"></span>${status.label}</div>
                </div>
                <label class="switch" title="${on ? 'إيقاف' : 'تفعيل'}">
                  <input type="checkbox" data-char-cheat="${esc(cheat.id)}" data-char-id="${esc(character.id)}" ${on ? 'checked' : ''} />
                  <span></span>
                </label>
              </div>`;
            })
            .join('')}
        </div>
      </section>`;
    })
    .join('')}`;
}

function viewSaves() {
  const st = state();
  const saves = st.saves;
  return `
  <div class="view-head">
    <div>
      <button class="back-link" data-act="backCharacters">${icon('chevron')} رجوع للشخصيات</button>
      <h1 class="view-title">مدير الحفظ</h1>
      <div class="view-sub">خذ نسخة احتياطية، ارجع لأي نسخة، وبدّل بين حفظاتك بأمان.</div>
    </div>
    <div class="head-actions">
      <button class="btn btn-primary" data-act="backupSave">${icon('save')} نسخ الحفظ الحالي</button>
    </div>
  </div>

  <div class="card save-current">
    <div class="card-head">
      <div class="card-title">${icon('shield')} الحفظ الحالي</div>
      ${pill(saves.active ? 'موجود' : 'ما لقيناه', saves.active ? 'ok' : 'warn')}
    </div>
    <div class="card-pad">
      ${
        saves.active
          ? `<div class="save-path mono" title="${esc(saves.active.path)}">${esc(saves.active.path)}</div>
             <div class="save-meta">
               <span>${esc(saves.active.modifiedLabel)}</span>
               <span>${esc(saves.active.sizeLabel)}</span>
             </div>`
          : `<div class="empty small-empty">${icon('save')}<div>ما لقينا حفظ اللعبة. شغّل اللعبة مرة وحدة أو حدد مسار الحفظ من الإعدادات.</div></div>`
      }
    </div>
  </div>

  <div class="section-gap">
    <div class="group-head">
      <div class="group-icon">${icon('bookmark')}</div>
      <div><div class="group-name">نسخي الاحتياطية</div><div class="group-sub">كل نسخة باسمها وتاريخها — تقدر ترجع لها بأي وقت</div></div>
      <div class="group-line"></div>
      <div class="tiny muted">${saves.backups.length}</div>
    </div>
    ${
      saves.backups.length
        ? `<div class="backup-list">
            ${saves.backups
              .map(
                (b) => `<div class="backup-row ${b.auto ? 'auto' : ''}">
                  <div class="backup-icon">${icon(b.auto ? 'refresh' : 'save')}</div>
                  <div class="backup-main">
                    <div class="backup-name">${esc(b.name)} ${b.auto ? pill('تلقائية') : ''}</div>
                    <div class="backup-meta"><span>${esc(b.dateLabel)}</span><span>${esc(b.sizeLabel)}</span></div>
                  </div>
                  <div class="backup-actions">
                    <button class="btn btn-sm btn-primary" data-act="restoreSave" data-id="${esc(b.id)}" data-i18n="restore">تحميل</button>
                    <button class="btn btn-sm" data-act="copySave" data-id="${esc(b.id)}">نسخ احتياطي</button>
                    <button class="btn btn-sm btn-ghost btn-danger" data-act="deleteSave" data-id="${esc(b.id)}">حذف</button>
                  </div>
                </div>`
              )
              .join('')}
          </div>`
        : `<div class="card"><div class="empty">
            ${icon('save')}
            <div class="empty-title">ما فيه نسخ احتياطية بعد</div>
            <div class="small">اضغط «نسخ الحفظ الحالي» وبنحفظ لك نسخة بأمان.</div>
          </div></div>`
    }
  </div>

  ${
    saves.detected?.length
      ? `<div class="section-gap">
          <div class="group-head">
            <div class="group-icon">${icon('folder')}</div>
            <div><div class="group-name">حفظات اللعبة المكتشفة</div><div class="group-sub">من مجلد EldenRing عندك</div></div>
            <div class="group-line"></div>
          </div>
          <div class="detected-list">
            ${saves.detected
              .map(
                (d) => `<div class="detected-row">
                  <span class="mono">${esc(d.account)}</span>
                  <span>${esc(d.filename)}</span>
                  <span class="tiny muted">${esc(d.modifiedLabel)}</span>
                  <span class="tiny muted">${fmtBytes(d.size)}</span>
                  ${d.path === saves.saveFile ? pill('الحالي', 'ok') : ''}
                </div>`
              )
              .join('')}
          </div>
        </div>`
      : ''
  }

  <div class="banner warn section-gap">${icon('alert')}
    <div>قبل ما ترجع نسخة، <strong>سكّر اللعبة</strong>. اللانشر يسوي نسخة تلقائية من حفظك الحالي قبل الاسترجاع.</div>
  </div>`;
}

function viewMySaves() {
  const st = state();
  const chars = st.characters || { characters: [] };
  const saves = st.saves || { backups: [] };
  const all = chars.characters || [];
  const visible = all.filter((c) => !c.hidden);
  const hidden = all.filter((c) => c.hidden);
  const label = (c) => c.label || c.name;
  const activeSave = saves.active;

  const charCard = (c) => `
    <article class="ms-char ${c.active ? 'active' : ''}" data-ms-char="${esc(c.id)}">
      <div class="ms-char-top">
        <span class="ms-slot">SLOT ${String(c.slot).padStart(2, '0')}</span>
        ${c.active ? '<span class="ms-active-pill">ACTIVE</span>' : ''}
      </div>
      <div class="ms-char-name">${esc(label(c))}</div>
      ${c.label ? `<div class="ms-char-real">in-game name · ${esc(c.name)}</div>` : '<div class="ms-char-real">in-game character</div>'}
      <div class="ms-stats">
        <div><span>Level</span><b>${c.level ? esc(String(c.level)) : '—'}</b></div>
        <div><span>Playtime</span><b>${c.playtime ? esc(c.playtime) : '—'}</b></div>
        <div><span>Last boss</span><b class="ms-unknown" title="Not stored in the save summary the launcher can read">—</b></div>
        <div><span>Location</span><b class="ms-unknown" title="Not stored in the save summary the launcher can read">—</b></div>
      </div>
      <div class="ms-char-actions">
        <button class="btn btn-sm btn-primary" data-act="useSave" data-id="${esc(c.id)}">${icon('play')} Use This Save</button>
        <button class="btn btn-sm" data-act="backupSave" data-char="${esc(c.id)}">${icon('save')} Backup</button>
        <button class="btn btn-sm" data-act="openRestorePicker">${icon('refresh')} Restore</button>
        <button class="btn btn-sm btn-ghost" data-act="renameCharacter" data-id="${esc(c.id)}">${icon('pencil')} Rename</button>
        <button class="btn btn-sm btn-ghost btn-danger" data-act="hideCharacter" data-id="${esc(c.id)}" data-name="${esc(c.name)}">${icon('trash')} Delete</button>
      </div>
    </article>`;

  const backupRow = (b) => `
    <div class="ms-backup ${b.auto ? 'auto' : ''}">
      <div class="ms-backup-icon">${icon(b.auto ? 'refresh' : b.slot ? 'bookmark' : 'save')}</div>
      <div class="ms-backup-main">
        <div class="ms-backup-name">${esc(b.name)}
          ${b.auto ? '<span class="ms-tag auto">AUTO</span>' : ''}
          ${b.slot ? '<span class="ms-tag slot">SLOT</span>' : ''}
        </div>
        <div class="ms-backup-meta"><span>${esc(b.dateLabel || '')}</span><span>${esc(b.sizeLabel || '')}</span></div>
      </div>
      <div class="ms-backup-actions">
        <button class="btn btn-sm btn-primary" data-act="restoreSave" data-id="${esc(b.id)}">Restore</button>
        <button class="btn btn-sm btn-ghost btn-danger" data-act="deleteSave" data-id="${esc(b.id)}">Delete</button>
      </div>
    </div>`;

  return `<div class="ms-view">
    <div class="ms-head">
      <div>
        <div class="ms-kicker">Elden Ring · Local save</div>
        <h1 class="ms-title">MY SAVES</h1>
        <div class="ms-sub">Your own playthroughs, read straight from ER0000.sl2. New characters show up here the next time you open the launcher.</div>
      </div>
      <div class="ms-head-actions">
        <button class="btn btn-primary" data-act="createSaveSlot">${icon('plus')} Create New Save Slot</button>
        <button class="btn" data-act="backupSave">${icon('save')} Backup current save</button>
      </div>
    </div>

    <div class="ms-file">
      <div class="ms-file-icon">${icon('shield')}</div>
      <div class="ms-file-main">
        <div class="ms-file-title">${activeSave ? 'Save file connected' : 'Save file not found'}</div>
        <div class="ms-file-path mono" title="${esc(activeSave?.path || '')}">${esc(activeSave?.path || 'Set your save in Settings — the launcher also scans %APPDATA%\\EldenRing automatically.')}</div>
      </div>
      <div class="ms-file-meta">
        ${activeSave ? `<span>${esc(activeSave.modifiedLabel || '')}</span><span>${esc(activeSave.sizeLabel || '')}</span>` : ''}
        <span>${all.length} character${all.length === 1 ? '' : 's'}</span>
      </div>
    </div>

    ${
      chars.error && !all.length
        ? `<div class="banner warn section-gap">${icon('alert')}<div>${esc(chars.error)}</div>
            <button class="btn btn-sm" data-act="detectSave">${icon('search')} Detect automatically</button></div>`
        : ''
    }

    ${
      visible.length
        ? `<div class="ms-grid">${visible.map(charCard).join('')}</div>`
        : all.length
          ? ''
          : `<div class="ms-empty">${icon('users')}<div><b>No characters found yet.</b><br>Create a character in game, close Elden Ring, and it appears here automatically.</div></div>`
    }

    <div class="ms-note">${icon('alert')}<div><b>Last boss and location are not in the save summary.</b> Elden Ring writes those inside the character block, not the summary record the launcher reads. Name, level and playtime are real values from your file — everything else the launcher shows is honest about what it cannot know.</div></div>

    <div class="ms-note soft">${icon('play')}<div><b>Use This Save</b> marks the character as active for cheats and builds and keeps it selected for the next PLAY. Elden Ring still shows its own character select screen — no launcher can skip it.</div></div>

    <div class="ms-section">
      <div class="ms-section-head">
        <div class="ms-section-title">${icon('refresh')} BACKUPS</div>
        <div class="ms-section-sub">Automatic backup every time the game closes · one-click restore</div>
        <button class="btn btn-sm btn-ghost" data-act="backupSave">${icon('save')} Backup now</button>
      </div>
      ${saves.backups?.length ? `<div class="ms-backups">${saves.backups.map(backupRow).join('')}</div>` : '<div class="ms-empty small">No backups yet. Close the game once and one is made automatically.</div>'}
    </div>

    ${
      hidden.length
        ? `<div class="ms-section">
            <div class="ms-section-head">
              <div class="ms-section-title">${icon('trash')} HIDDEN FROM THIS LIST</div>
              <div class="ms-section-sub">Hidden only in the launcher — the save file is untouched</div>
            </div>
            <div class="ms-hidden">
              ${hidden
                .map(
                  (c) => `<div class="ms-hidden-row">
                    <span>${esc(label(c))} <span class="tiny muted">· Lv ${c.level || '—'}</span></span>
                    <button class="btn btn-sm btn-ghost" data-act="restoreCharacter" data-id="${esc(c.id)}">${icon('refresh')} Show again</button>
                  </div>`
                )
                .join('')}
            </div>
          </div>`
        : ''
    }

    <div class="ms-warning">${icon('shieldCheck')}<div><b>Your save file is never edited by MY SAVES.</b> Rename and Delete only change what the launcher shows. Restore is the only action that replaces the save, it refuses while the game is running, and it makes a safety backup first.</div></div>
  </div>`;
}

async function openRestorePicker() {
  let saves = S.state?.saves;
  try {
    saves = await call('saves.list', {}, { silent: true });
    S.state.saves = saves;
  } catch {
    /* use cached */
  }
  const backups = saves?.backups || [];
  const rows = backups.length
    ? backups
        .map(
          (b) => `<div class="ms-pick-row">
            <div><b>${esc(b.name)}</b><div class="tiny muted">${esc(b.dateLabel || '')} · ${esc(b.sizeLabel || '')}${b.auto ? ' · auto' : ''}${b.slot ? ' · save slot' : ''}</div></div>
            <button class="btn btn-sm btn-primary" data-act="restoreSave" data-id="${esc(b.id)}">Restore</button>
          </div>`
        )
        .join('')
    : '<div class="ms-empty small">No backups yet.</div>';
  openModal({
    title: 'Restore a backup',
    body: `<div class="ms-picker">${rows}</div><div class="ms-note" style="margin-top:14px">${icon('alert')}<div>Close Elden Ring before restoring. The launcher backs up your current save first, automatically.</div></div>`,
    actions: [{ label: 'Close', cls: 'btn-ghost' }],
  });
}

function unlockRow(category, unlocks) {
  const applied =
    (category.item && unlocks.applied?.items) ||
    (category.id === 'maxRunes' && unlocks.applied?.runes) ||
    (category.id === 'maxLevel' && unlocks.applied?.level);
  return `<label class="ul-row ${category.enabled ? 'on' : ''}">
    <input type="checkbox" data-unlock-toggle="${esc(category.id)}" ${category.enabled ? 'checked' : ''} />
    <span class="ul-check">${icon('check')}</span>
    <span class="ul-copy">
      <span class="ul-label">${esc(category.label)}</span>
      <span class="ul-desc">${esc(category.desc)}</span>
    </span>
    ${applied ? '<span class="ul-applied">APPLIED</span>' : ''}
  </label>`;
}

function viewUnlocks() {
  const st = state();
  const u = st.unlocks || { categories: [], applied: {}, merchant: {} };
  const items = (u.categories || []).filter((c) => c.item);
  const memory = (u.categories || []).filter((c) => c.memory);
  const shop = u.merchant || {};
  const selected = (u.categories || []).filter((c) => c.enabled).length;
  const needsShop = items.some((c) => c.enabled);
  const busy = S.unlocks?.busy || '';
  const lastError = S.unlocks?.error || '';
  const lastWarnings = S.unlocks?.warnings || [];

  return `<div class="ul-view">
    <div class="ul-head">
      <div>
        <div class="ul-kicker">Elden Ring · Offline power</div>
        <h1 class="ul-title">UNLOCK ALL</h1>
        <div class="ul-sub">Choose what to unlock, press APPLY UNLOCK, then load your character. Everything stays until you press REMOVE UNLOCK.</div>
      </div>
      <div class="ul-head-status">
        <span class="ul-status ${u.trainerAttached ? 'on' : ''}">${u.trainerAttached ? 'Trainer connected' : 'Trainer not connected'}</span>
        <span class="ul-status ${shop.active ? 'on' : ''}">${shop.active ? 'Merchant mod active' : shop.downloaded ? 'Merchant downloaded' : 'Merchant not downloaded'}</span>
      </div>
    </div>

    <div class="ul-warning">
      ${icon('alert')}
      <div><b>Use in single player or with friends only.</b> Never take unlocked items or edited stats into public online sessions — cheats and mods can get your account banned. The launcher never bypasses Easy Anti-Cheat.</div>
    </div>

    <div class="ul-layout">
      <div class="ul-list">
        <div class="ul-group">
          <div class="ul-group-head">
            <span class="ul-group-title">ITEMS &amp; GEAR</span>
            <span class="ul-group-sub">Delivered by the Glorious Merchant mod — everything becomes free at the merchant shops, including Shadow of the Erdtree gear.</span>
          </div>
          ${items.map((c) => unlockRow(c, u)).join('')}
        </div>

        <div class="ul-group">
          <div class="ul-group-head">
            <span class="ul-group-title">CHARACTER</span>
            <span class="ul-group-sub">Direct memory writes while Elden Ring is running.</span>
          </div>
          ${memory.map((c) => unlockRow(c, u)).join('')}
        </div>

        <div class="ul-honest">
          ${icon('shieldCheck')}
          <div>
            <b>How the items really arrive.</b> The launcher does not write thousands of inventory entries into your save — that is how saves get corrupted. Instead it installs and activates <b>Glorious Merchant</b> (Nexus 5192), a real mod that puts every base-game and DLC item into the merchant shops for free. Walk to the Twin Maiden Husks, buy anything for 0 runes.
          </div>
        </div>
      </div>

      <aside class="ul-side">
        <div class="ul-side-card">
          <div class="ul-side-title">Loadout</div>
          <div class="ul-side-row"><span>Selected</span><b>${selected} / ${(u.categories || []).length}</b></div>
          <div class="ul-side-row"><span>Merchant mod</span><b>${shop.active ? 'Active' : shop.downloaded ? 'Downloaded' : 'Not installed'}</b></div>
          <div class="ul-side-row"><span>Max Runes</span><b>${u.applied?.runes ? 'On' : 'Off'}</b></div>
          <div class="ul-side-row"><span>Max Level</span><b>${u.applied?.level ? 'Applied' : u.pendingLevel ? 'Queued' : 'Off'}</b></div>
          <button class="btn ul-apply" data-act="unlockApply" ${busy ? 'disabled' : ''}>
            ${icon('bolt')} ${busy === 'apply' ? 'Working…' : 'APPLY UNLOCK'}
          </button>
          <button class="btn ul-remove" data-act="unlockRemove" ${busy ? 'disabled' : ''}>
            ${icon('x')} ${busy === 'remove' ? 'Working…' : 'REMOVE UNLOCK'}
          </button>
          ${
            needsShop && !u.trainerAttached
              ? `<div class="ul-side-hint">Items work without the game running. Max Level needs the trainer connected to read your old stats first.</div>`
              : ''
          }
        </div>

        ${
          lastError
            ? `<div class="ul-error">
                ${icon('alert')}
                <div>
                  <b>One step needs attention.</b>
                  <div class="ul-error-msg">${esc(lastError)}</div>
                  <div class="ul-error-actions">
                    <button class="btn btn-sm btn-primary" data-act="unlockApply">${icon('refresh')} Retry</button>
                    <button class="btn btn-sm" data-act="wsDownload" data-ws="5192">${icon('download')} Download mod</button>
                    <button class="btn btn-sm btn-ghost" data-act="wsImportFor" data-ws="5192">${icon('upload')} Import</button>
                    <button class="btn btn-sm btn-ghost" data-act="go" data-view="mods">Open Workshop</button>
                  </div>
                </div>
              </div>`
            : ''
        }

        ${
          lastWarnings.length
            ? `<div class="ul-hint">${icon('alert')}<div>${lastWarnings.map((w) => `<div>${esc(w)}</div>`).join('')}</div></div>`
            : ''
        }

        <div class="ul-steps">
          <div class="ul-steps-title">After APPLY</div>
          <ol>
            <li>The merchant mod is downloaded and set up inside the launcher.</li>
            <li>Activated mods are synced — PLAY starts with them.</li>
            <li>In game, open the Twin Maiden Husks shop: everything is free.</li>
            <li>Max Runes stays frozen; Max Level writes 99 in every attribute.</li>
          </ol>
        </div>
      </aside>
    </div>
  </div>`;
}

function modCard(mod) {
  const date = mod.installedAt ? new Date(mod.installedAt).toLocaleDateString(dateLocale()) : '';
  const on = mod.enabled && mod.compatible;
  return `
  <div class="mod-card ${on ? 'on' : ''} ${mod.compatible ? '' : 'incompatible'}">
    <div class="mod-cover">
      ${mod.image ? `<img src="${esc(mod.image)}" alt="${esc(mod.name)}" loading="lazy" />` : `<div class="mod-cover-empty">${icon(mod.dllMode ? 'cpu' : 'layers')}</div>`}
      <span class="mod-status ${on ? 'on' : ''}">${on ? 'مفعّل' : 'موقوف'}</span>
    </div>
    <div class="mod-body">
      <div class="mod-title-row">
        <div class="mod-title">${esc(mod.name)}</div>
        ${mod.version ? `<span class="pill">${esc(mod.version)}</span>` : ''}
      </div>
      <div class="mod-meta">
        ${mod.author ? `<span>${esc(mod.author)}</span>` : ''}
        <span>${fmtNum(mod.fileCount)} ملف</span>
        <span>${fmtBytes(mod.bytes)}</span>
        ${date ? `<span>${esc(date)}</span>` : ''}
        ${mod.workshopId ? `<span class="mod-source">${icon('layers')} الورشة</span>` : ''}
      </div>
      ${
        mod.compatible
          ? ''
          : `<div class="mod-warning" title="${esc(mod.compatibilityReason || '')}">${icon('alert')} <span><b>هذا المود مو متوافق مع نسختك</b></span></div>`
      }
      <div class="mod-actions">
        <div class="switch-row">
          <label class="switch" title="${mod.compatible ? (on ? 'إيقاف المود' : 'تشغيل المود') : 'هذا المود مو متوافق مع نسختك'}">
            <input type="checkbox" data-mod-toggle="${esc(mod.id)}" ${on ? 'checked' : ''} ${mod.compatible ? '' : 'disabled'} />
            <span></span>
          </label>
          <span class="tiny muted">${mod.compatible ? (on ? 'شغال' : 'طافي') : 'غير متوافق'}</span>
        </div>
        <div class="mod-buttons">
          <button class="btn btn-icon btn-ghost" data-act="openMod" data-id="${esc(mod.id)}" title="فتح مجلد المود">${icon('folder')}</button>
          <button class="btn btn-icon btn-ghost btn-danger" data-act="removeMod" data-id="${esc(mod.id)}" title="إزالة المود (سلة المحذوفات)">${icon('trash')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function viewModsLegacy() {
  const st = state();
  const g = st.game;
  const mods = st.mods;
  const enabled = mods.filter((m) => m.enabled && m.compatible).length;
  const nx = S.nexus;

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">المودات</div>
      <h1 class="view-title">المودات</h1>
      <div class="view-sub">ثبّت مود من ملف، أو دوّر عليه في Nexus — بدون فك ضغط يدوي.</div>
    </div>
    <div class="head-actions">
      <button class="btn ${nx.open ? 'btn-primary' : ''}" data-act="toggleNexus">${icon('search')} بحث في Nexus Mods</button>
      <button class="btn btn-primary" data-act="installMod">${icon('upload')} تركيب مود من ملف</button>
    </div>
  </div>

  ${
    nx.open
      ? `<div class="card nexus-panel">
          <div class="card-head">
            <div class="card-title">${icon('search')} بحث في Nexus Mods</div>
            <button class="btn btn-sm btn-ghost" data-act="toggleNexus">إخفاء</button>
          </div>
          <div class="card-pad">
            ${
              !st.nexus.hasKey
                ? `<div class="banner warn" style="margin-bottom:12px">${icon('key')}
                    <div><strong>مفتاح Nexus (مجاني) للبحث فقط.</strong> حطه مرة وحدة، وبنستخدمه للبحث. التحميل صار من داخل اللانشر عبر رابط مجاني أو من ملف — بدون اشتراك.</div>
                  </div>
                  <div class="nexus-key-row">
                    <input class="input mono" id="nexusKey" placeholder="مفتاح Nexus الشخصي…" />
                    <button class="btn btn-primary" data-act="saveNexusKey">${icon('save')} حفظ المفتاح</button>
                    <button class="btn" data-act="openNexusSite">${icon('link')} فتح Nexus</button>
                  </div>
                  <div class="hint small" style="margin-top:10px">تجيب المفتاح من Nexus: User Settings → API Access → Personal API Key.</div>`
                : `<div class="nexus-search-row">
                    <div class="search-bar grow">
                      <span class="search-icon">${icon('search')}</span>
                      <input class="input" id="nexusQuery" value="${esc(nx.query)}" placeholder="اكتب اسم المود… مثال: Seamless Co-op" />
                    </div>
                    <button class="btn btn-primary" data-act="nexusSearch">${icon('search')} بحث</button>
                    <button class="btn btn-ghost" data-act="openNexusSite">${icon('link')} الموقع</button>
                  </div>
                  ${nx.loading ? `<div class="loading-line"><span class="spinner"></span> ندور في Nexus…</div>` : ''}
                  ${nx.error ? `<div class="banner danger" style="margin-top:12px">${icon('alert')}<div>${esc(nx.error)}</div></div>` : ''}
                  ${
                    nx.results.length
                      ? `<div class="nexus-results">
                          <div class="tiny muted">${nx.results.length} نتيجة من Nexus</div>
                          ${nx.results
                            .map(
                              (m) => `<div class="nexus-row">
                                <div class="nexus-cover">${m.image ? `<img src="${esc(m.image)}" alt="" loading="lazy" />` : `<div class="mod-cover-empty">${icon('layers')}</div>`}</div>
                                <div class="nexus-main">
                                  <div class="nexus-name">${esc(m.name)}</div>
                                  <div class="nexus-summary">${esc(m.summary || 'مود من Nexus')}</div>
                                  <div class="nexus-meta"><span>${fmtNum(m.downloads)} تحميل</span>${m.version ? `<span>${esc(m.version)}</span>` : ''}</div>
                                </div>
                                <div class="nexus-actions">
                                  <button class="btn btn-sm btn-primary" data-act="nexusDownload" data-id="${esc(m.id)}" data-name="${esc(m.name)}" ${nx.downloading ? 'disabled' : ''} ${nx.downloading === m.id ? '' : 'data-i18n="download"'}>${nx.downloading === m.id ? 'ينزل…' : 'تحميل'}</button>
                                  <button class="btn btn-sm btn-ghost" data-act="nexusOpen" data-id="${esc(m.id)}">الصفحة</button>
                                </div>
                              </div>`
                            )
                            .join('')}
                        </div>`
                      : `<div class="empty small-empty" style="margin-top:12px">${icon('search')}<div>${nx.source === 'rest' ? 'ما لقينا نتائج بالاسم — جرّب كلمة ثانية.' : 'اكتب اسم المود ودوس بحث.'}</div></div>`
                  }`
            }
          </div>
        </div>`
      : ''
  }

  ${
    g.found && !g.hasModEngine2
      ? `<div class="banner warn section-gap">${icon('alert')}
          <div><strong>Mod Engine 2 مو موجود.</strong> بعض المودات ما تشتغل بدونه. تقدر تحمله من موقعه وتحطه داخل مجلد اللعبة.</div>
        </div>`
      : ''
  }

  <div class="mods-head section-gap">
    <div class="tiny muted">${enabled} مفعّل · ${mods.length - enabled} موقوف · ${mods.length} مود</div>
  </div>

  ${
    mods.length
      ? `<div class="mod-grid">${mods.map(modCard).join('')}</div>`
      : `<div class="card"><div class="empty">
          ${icon('layers')}
          <div class="empty-title">ما فيه مودات بعد</div>
          <div class="small">حمّل مود ZIP، أو اختره من جهازك — نفكّه ونركبه لك تلقائي.</div>
          <button class="btn btn-primary" data-act="installMod" style="margin-top:12px">${icon('plus')} اختر ملف المود</button>
        </div></div>`
  }

  <div class="sync-bar section-gap">
    <div class="tiny muted">${g.found ? `ينسخ المفعّل إلى: <span class="mono">${esc(g.modDir)}</span>` : 'حدد ملف اللعبة أول عشان نطبق المودات.'}</div>
    <button class="btn btn-primary" data-act="syncMods" ${g.found ? '' : 'disabled'}>${icon('refresh')} تطبيق على اللعبة</button>
  </div>`;
}

/* ---------------- workshop ---------------- */
function wsCover(entry) {
  return `../../assets/workshop/cover-${entry.cover || 'world'}.jpg`;
}

function wsJobLabel(job) {
  if (!job) return '';
  if (job.phase === 'resolve') return 'نجهّز التحميل…';
  if (job.phase === 'nexus') return 'بانتظار ضغطتك في نافذة نيكسس';
  if (job.phase === 'download') return 'ينزل من المصدر';
  if (job.phase === 'install') return 'نفك ونثبّت';
  if (job.phase === 'done') return 'خلص التثبيت';
  if (job.phase === 'error') return job.error || 'فشل التثبيت';
  return '';
}

function wsPct(job) {
  if (!job || !job.total) return 0;
  return Math.min(100, Math.max(0, Math.round((job.received / job.total) * 100)));
}

function wsProgress(entry) {
  const job = entry.job || null;
  const pct = wsPct(job);
  return `<div class="ws-prog" data-ws-prog="${esc(entry.id)}">
    <div class="ws-prog-track"><div class="ws-prog-fill" data-ws-fill style="width:${pct}%"></div></div>
    <div class="ws-prog-text" data-ws-text>${esc(wsJobLabel(job) || 'نجهّز التحميل…')}${job && job.total ? ` · ${pct}%` : ''}</div>
  </div>`;
}

function wsFoot(entry) {
  const busy = S.workshop.installing === entry.id;
  if (busy || (entry.job && !entry.job.done)) return wsProgress(entry);
  const details = `<button class="btn btn-sm btn-ghost" data-act="wsDetails" data-ws="${esc(entry.id)}">${icon('book')} تفاصيل</button>`;
  if (entry.state === 'installed') {
    if (entry.install === 'game') {
      return `<div class="ws-ready">${icon('check')} <span>مثبّت وجاهز${entry.version ? ` · ${esc(entry.version)}` : ''}</span></div>${details}`;
    }
    return `<div class="ws-toggle-row">
      <label class="switch" title="${entry.enabled ? 'إيقاف المود' : 'تفعيل المود'}">
        <input type="checkbox" data-mod-toggle="${esc(entry.modId)}" data-ws-reload="1" ${entry.enabled ? 'checked' : ''} />
        <span></span>
      </label>
      <span class="tiny">${entry.enabled ? 'مفعّل داخل اللعبة' : 'موقوف'}</span>
      ${details}
    </div>`;
  }
  if (entry.direct) {
    return `<button class="btn btn-sm btn-primary" data-act="wsInstall" data-ws="${esc(entry.id)}">${icon('download')} تثبيت</button>${details}`;
  }
  return `${details}`;
}

function wsCard(entry) {
  const search = `${entry.name} ${entry.summary} ${(entry.tags || []).join(' ')}`.toLowerCase();
  const catName = (S.workshop.data?.categories || []).find((c) => c.id === entry.category)?.name || '';
  return `<article class="ws-card ${entry.state === 'installed' ? 'installed' : ''}" data-ws-card data-cat="${esc(entry.category)}" data-ws-search="${esc(search)}" data-name="${esc(entry.name.toLowerCase())}" data-featured="${entry.featured ? 1 : 0}" data-direct="${entry.direct ? 1 : 0}" data-installed="${entry.state === 'installed' ? 1 : 0}">
    <div class="ws-cover" style="background-image:url('${wsCover(entry)}')">
      <span class="ws-source ${entry.direct ? 'direct' : ''}">${entry.direct ? 'تحميل مباشر' : 'Nexus'}</span>
      ${entry.featured ? `<span class="ws-featured">${icon('star')} مختار</span>` : ''}
      ${entry.state === 'installed' ? `<span class="ws-installed">${icon('check')} مثبّت</span>` : ''}
    </div>
    <div class="ws-body">
      <div class="ws-name-row">
        <div class="ws-name">${esc(entry.name)}</div>
        ${catName ? `<span class="ws-cat-badge">${esc(catName)}</span>` : ''}
      </div>
      <div class="ws-author">${esc(entry.author || '')}${entry.version ? ` · ${esc(entry.version)}` : ''}</div>
      <p class="ws-summary">${esc(entry.summary)}</p>
      <div class="ws-tags">${(entry.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>
      <div class="ws-foot">${wsFoot(entry)}</div>
    </div>
  </article>`;
}

function workshopSkeleton() {
  return `<div class="ws-grid">${Array.from({ length: 6 })
    .map(
      () => `<div class="ws-card skeleton"><div class="ws-cover"></div><div class="ws-body">
        <div class="sk-line w60"></div><div class="sk-line w40"></div><div class="sk-line"></div><div class="sk-line w80"></div>
      </div></div>`
    )
    .join('')}</div>`;
}

function nexusPanel() {
  const st = state();
  const nx = S.nexus;
  if (!nx.open) return '';
  return `<div class="card nexus-panel section-gap">
    <div class="card-head">
      <div class="card-title">${icon('search')} بحث حي في Nexus Mods</div>
      <button class="btn btn-sm btn-ghost" data-act="toggleNexus">إخفاء</button>
    </div>
    <div class="card-pad">
      ${
        !st.nexus.hasKey
          ? `<div class="banner warn" style="margin-bottom:12px">${icon('key')}
              <div><strong>مفتاح Nexus (مجاني) للبحث فقط.</strong> حطه مرة وحدة ونبحث لك في كل المودات. التحميل صار من داخل اللانشر عبر رابط مجاني أو من ملف — بدون اشتراك.</div>
            </div>
            <div class="nexus-key-row">
              <input class="input mono" id="nexusKey" placeholder="مفتاح Nexus الشخصي…" />
              <button class="btn btn-primary" data-act="saveNexusKey">${icon('save')} حفظ المفتاح</button>
              <button class="btn" data-act="openNexusSite">${icon('link')} فتح Nexus</button>
            </div>
            <div class="hint small" style="margin-top:10px">تجيب المفتاح من Nexus: User Settings → API Access → Personal API Key.</div>`
          : `<div class="nexus-search-row">
              <div class="search-bar grow">
                <span class="search-icon">${icon('search')}</span>
                <input class="input" id="nexusQuery" value="${esc(nx.query)}" placeholder="دوّر في كل مودات إلدن رينق…" />
              </div>
              <button class="btn btn-primary" data-act="nexusSearch">${icon('search')} بحث</button>
              <button class="btn btn-ghost" data-act="openNexusSite">${icon('link')} الموقع</button>
            </div>
            ${nx.loading ? `<div class="loading-line"><span class="spinner"></span> ندور في Nexus…</div>` : ''}
            ${nx.error ? `<div class="banner danger" style="margin-top:12px">${icon('alert')}<div>${esc(nx.error)}</div></div>` : ''}
            ${
              nx.results.length
                ? `<div class="nexus-results">
                    <div class="tiny muted">${nx.results.length} نتيجة من Nexus</div>
                    ${nx.results
                      .map(
                        (m) => `<div class="nexus-row">
                          <div class="nexus-cover">${m.image ? `<img src="${esc(m.image)}" alt="" loading="lazy" />` : `<div class="mod-cover-empty">${icon('layers')}</div>`}</div>
                          <div class="nexus-main">
                            <div class="nexus-name">${esc(m.name)}</div>
                            <div class="nexus-summary">${esc(m.summary || 'مود من Nexus')}</div>
                            <div class="nexus-meta"><span>${fmtNum(m.downloads)} تحميل</span>${m.version ? `<span>${esc(m.version)}</span>` : ''}</div>
                          </div>
                          <div class="nexus-actions">
                            <button class="btn btn-sm btn-primary" data-act="nexusDownload" data-id="${esc(m.id)}" data-name="${esc(m.name)}" ${nx.downloading ? 'disabled' : ''}>${nx.downloading === m.id ? 'ينزل…' : 'تحميل'}</button>
                            <button class="btn btn-sm btn-ghost" data-act="nexusOpen" data-id="${esc(m.id)}">الصفحة</button>
                          </div>
                        </div>`
                      )
                      .join('')}
                  </div>`
                : `<div class="empty small-empty" style="margin-top:12px">${icon('search')}<div>${nx.source === 'rest' ? 'ما لقينا نتائج بالاسم — جرّب كلمة ثانية.' : 'اكتب اسم المود ودوس بحث.'}</div></div>`
            }`
      }
    </div>
  </div>`;
}

function viewModsLegacy2() {
  const st = state();
  const g = st.game;
  const mods = st.mods;
  const ws = S.workshop.data;
  const tab = S.workshop.tab;
  const enabled = mods.filter((m) => m.enabled && m.compatible).length;
  const installing = !!S.workshop.installing;
  const me2Entry = ws?.items?.find((i) => i.id === 'mod-engine-2');

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">الورشة · Elden Ring Mods</div>
      <h1 class="view-title">ورشة المودات</h1>
      <div class="view-sub">اختر مود، خلّ التحميل يخلص، ويطلع في «موداتي» — فعّله بضغطة.</div>
    </div>
    <div class="head-actions">
      <button class="btn" data-act="toggleNexus">${icon('search')} بحث Nexus</button>
      <button class="btn" data-act="wsImportUrl">${icon('link')} من رابط</button>
      <button class="btn btn-primary" data-act="installMod">${icon('upload')} من ملف</button>
    </div>
  </div>

  <section class="ws-hero">
    <div class="ws-hero-bg" style="background-image:url('../../assets/workshop/erdtree-bg.jpg')"></div>
    <div class="ws-hero-body">
      <div class="eyebrow">The Lands Between · Workshop</div>
      <h2>اختر… نزّل… فعّل</h2>
      <p>مودات إلدن رينغ المعروفة بمكان واحد: تحميل مباشر للي نقدر نوفرّه، وفتح Nexus لباقي المودات مع تركيب من ملف.</p>
      <div class="ws-stats">
        ${pill(`${ws?.counts?.total ?? 0} مود بالورشة`, 'gold')}
        ${pill(`${ws?.counts?.installed ?? mods.length} مثبّت`, 'ok')}
        ${pill(`${ws?.counts?.direct ?? 0} تحميل مباشر`)}
        ${g.hasModEngine2 ? pill('Mod Engine 2 جاهز', 'ok') : pill('Mod Engine 2 مو موجود', 'warn')}
      </div>
      <div class="ws-hero-actions">
        <button class="btn btn-primary" data-act="wsTab" data-tab="discover">${icon('layers')} تصفح الورشة</button>
        ${g.hasModEngine2 ? '' : `<button class="btn" data-act="wsInstall" data-ws="mod-engine-2">${icon('cpu')} ثبّت Mod Engine 2</button>`}
      </div>
    </div>
  </section>

  <div class="ws-tabs section-gap">
    <button class="ws-tab ${tab === 'discover' ? 'active' : ''}" data-act="wsTab" data-tab="discover">${icon('box')} اكتشف <span>${ws?.counts?.total ?? 0}</span></button>
    <button class="ws-tab ${tab === 'installed' ? 'active' : ''}" data-act="wsTab" data-tab="installed">${icon('check')} موداتي <span>${mods.length}</span></button>
    <div class="ws-tabs-line"></div>
    <button class="btn btn-sm btn-ghost" data-act="wsRefresh" ${S.workshop.loading ? 'disabled' : ''}>${icon('refresh')} تحديث</button>
  </div>

  ${
    S.workshop.importOpen
      ? `<div class="card ws-import section-gap">
          <div class="card-head"><div class="card-title">${icon('link')} تركيب من رابط مباشر</div><button class="btn btn-sm btn-ghost" data-act="wsImportUrl">إغلاق</button></div>
          <div class="card-pad">
            <div class="nexus-search-row">
              <div class="search-bar grow"><span class="search-icon">${icon('download')}</span>
                <input class="input mono" id="wsUrl" value="${esc(S.workshop.url)}" placeholder="https://…/mod.zip" />
              </div>
              <button class="btn btn-primary" data-act="wsImportUrlGo">${icon('download')} نزّل وثبّت</button>
            </div>
            <div class="hint small" style="margin-top:8px">الرابط لازم يكون ملف ZIP/7z/RAR مباشر (من GitHub أو مرآة). ملفات Nexus تحتاج تسجيل دخول — نزّلها من المتصفح واستخدم «من ملف».</div>
          </div>
        </div>`
      : ''
  }

  ${S.workshop.error ? `<div class="banner danger section-gap">${icon('alert')}<div>${esc(S.workshop.error)}</div><button class="btn btn-sm btn-ghost" data-act="wsClearError">إخفاء</button></div>` : ''}

  ${nexusPanel()}

  ${
    tab === 'installed'
      ? `${
          g.found && !g.hasModEngine2 && mods.length
            ? `<div class="banner warn section-gap">${icon('alert')}<div><strong>موداتك ما راح تشتغل بدون Mod Engine 2.</strong> ثبّته مرة وحدة من الورشة — تحميل مباشر.</div><button class="btn btn-sm btn-primary" data-act="wsInstall" data-ws="mod-engine-2">ثبّت المحرك</button></div>`
            : ''
        }
        ${
          mods.length
            ? `<div class="mods-head">
                 <div class="mods-head-copy">
                   <div class="tiny muted">${enabled} مفعّل · ${mods.length - enabled} موقوف · ${mods.length} مود</div>
                   <div class="mods-head-title">${icon('box')} موداتي المثبتة</div>
                 </div>
                 <div class="mods-head-actions">
                   <button class="btn btn-sm btn-ghost" data-act="wsRepair" title="يعيد نسخ المودات المفعّلة داخل اللعبة ويكتب TOML من جديد">${icon('refresh')} إصلاح</button>
                   <button class="btn btn-sm btn-ghost" data-act="wsRefresh" ${S.workshop.loading ? 'disabled' : ''}>${icon('layers')} تحديث</button>
                 </div>
               </div>
               <div class="mod-grid">${mods.map(modCard).join('')}</div>`
            : `<div class="card"><div class="empty">
                ${icon('box')}
                <div class="empty-title">ما فيه مودات مثبتة بعد</div>
                <div class="small">روح «اكتشف» واختر مود، أو ثبّت واحد من ملف. بمجرد ما يخلص التحميل يطلع هنا.</div>
                <button class="btn btn-primary" data-act="wsTab" data-tab="discover" style="margin-top:12px">${icon('layers')} تصفح الورشة</button>
              </div></div>`
        }
        <div class="sync-bar section-gap">
          <div class="tiny muted">${g.found ? `ينسخ المفعّل إلى: <span class="mono">${esc(g.modDir)}</span>` : 'حدد ملف اللعبة أول عشان نطبق المودات.'}</div>
          <button class="btn btn-primary" data-act="syncMods" ${g.found ? '' : 'disabled'}>${icon('refresh')} تطبيق على اللعبة</button>
        </div>`
      : `${
          S.workshop.loading && !ws
            ? workshopSkeleton()
            : !ws
              ? `<div class="banner danger section-gap">${icon('alert')}<div>ما قدرنا نحمّل الورشة.</div></div>`
              : `<div class="ws-toolbar section-gap">
                  <div class="ws-toolbar-top">
                    <div class="search-bar ws-search">
                      <span class="search-icon">${icon('search')}</span>
                      <input class="input" id="wsSearch" value="${esc(S.workshop.query)}" placeholder="دوّر بالورشة… أو الصق رابط مود مباشر" />
                    </div>
                    <span class="ws-result-count" id="wsCount">${(ws.items || []).length} مود</span>
                  </div>
                  <div class="ws-cats">
                    <button class="ws-cat ${S.workshop.category === 'all' ? 'active' : ''}" data-act="wsCat" data-cat="all">الكل</button>
                    ${(ws.categories || [])
                      .filter((c) => c.id !== 'all')
                      .map(
                        (c) => `<button class="ws-cat ${S.workshop.category === c.id ? 'active' : ''}" data-act="wsCat" data-cat="${esc(c.id)}">${icon(c.icon || 'layers')} ${esc(c.name)}</button>`
                      )
                      .join('')}
                  </div>
                  <div class="ws-sort-row">
                    <span class="ws-sort-label">${icon('sort')} ترتيب</span>
                    <button class="ws-sort ${S.workshop.sort === 'featured' ? 'active' : ''}" data-act="wsSort" data-sort="featured">${icon('star')} المختارة</button>
                    <button class="ws-sort ${S.workshop.sort === 'az' ? 'active' : ''}" data-act="wsSort" data-sort="az">أ–ي</button>
                    <button class="ws-sort ${S.workshop.sort === 'direct' ? 'active' : ''}" data-act="wsSort" data-sort="direct">${icon('download')} مباشر أولاً</button>
                    <button class="ws-sort ${S.workshop.sort === 'installed' ? 'active' : ''}" data-act="wsSort" data-sort="installed">${icon('check')} المثبتة أولاً</button>
                  </div>
                </div>
                <div class="ws-source-note">
                  <span>${icon('download')} «تحميل مباشر» ينزل ويثبت من داخل اللانشر.</span>
                  <span>${icon('link')} «Nexus» يحتاج رابط مجاني أو ملف — بدون اشتراك.</span>
                </div>
                ${
                  !g.found
                    ? `<div class="banner warn section-gap">${icon('alert')}<div>مسار اللعبة مو محدد — تقدر تتصفح، لكن التثبيت داخل اللعبة يحتاج مسار صحيح.</div></div>`
                    : ''
                }
                <div class="ws-grid" id="wsGrid">${(ws.items || []).map(wsCard).join('')}</div>
                <div class="empty small-empty ws-empty" id="wsEmpty" style="display:none">${icon('search')}<div>ما لقينا مود بهذا الوصف. جرّب كلمة ثانية أو «بحث Nexus».</div></div>
                ${me2Entry && me2Entry.state !== 'installed' && !g.hasModEngine2 ? `<div class="hint small" style="margin-top:14px">نصيحة: ابدأ بـ Mod Engine 2 — أغلب مودات Nexus ما تشتغل بدونه.</div>` : ''}`
        }`
  }`;
}

function filterWorkshopDomLegacy() {
  const query = S.workshop.query.trim().toLowerCase();
  const cat = S.workshop.category;
  const grid = document.getElementById('wsGrid');
  const cards = [...document.querySelectorAll('[data-ws-card]')];
  const byName = (a, b) => (a.dataset.name || '').localeCompare(b.dataset.name || '');
  const num = (el, key) => Number(el.dataset[key]) || 0;
  const sorters = {
    featured: (a, b) => num(b, 'featured') - num(a, 'featured') || num(b, 'installed') - num(a, 'installed') || byName(a, b),
    az: byName,
    direct: (a, b) => num(b, 'direct') - num(a, 'direct') || byName(a, b),
    installed: (a, b) => num(b, 'installed') - num(a, 'installed') || num(b, 'featured') - num(a, 'featured') || byName(a, b),
  };
  const sorter = sorters[S.workshop.sort] || sorters.featured;
  if (grid) cards.sort(sorter).forEach((card) => grid.appendChild(card));
  let visible = 0;
  cards.forEach((card) => {
    const okCat = cat === 'all' || card.dataset.cat === cat;
    const okText = !query || (card.dataset.wsSearch || '').includes(query);
    const show = okCat && okText;
    card.style.display = show ? '' : 'none';
    if (show) visible += 1;
  });
  const empty = document.getElementById('wsEmpty');
  if (empty) empty.style.display = cards.length && !visible ? '' : 'none';
  const count = document.getElementById('wsCount');
  if (count) count.textContent = visible === cards.length ? `${visible} مود` : `${visible} من ${cards.length} مود`;
}

async function loadWorkshopLegacy(force = false) {
  if (S.workshop.loading) return;
  if (S.workshop.data && !force) return;
  S.workshop.loading = true;
  S.workshop.error = '';
  if (S.view === 'mods') render();
  try {
    S.workshop.data = await call('workshop.list', {}, { silent: true });
    if (S.state && S.workshop.data) {
      S.state.workshop = {
        ...(S.state.workshop || {}),
        installedCount: S.workshop.data.installed.length,
        hasModEngine2: S.workshop.data.hasModEngine2,
      };
    }
  } catch (err) {
    S.workshop.error = err.message;
  } finally {
    S.workshop.loading = false;
    if (S.view === 'mods') render();
  }
}

async function installWorkshopEntryLegacy(id) {
  if (!id || S.workshop.installing) return;
  S.workshop.installing = id;
  S.workshop.error = '';
  render();
  let stop = false;
  const timer = setInterval(async () => {
    if (stop) return;
    try {
      const jobs = await call('workshop.progress', {}, { silent: true });
      const job = (jobs || []).find((j) => j.id === id);
      if (job) {
        const fill = document.querySelector(`[data-ws-prog="${id}"] [data-ws-fill]`);
        const text = document.querySelector(`[data-ws-prog="${id}"] [data-ws-text]`);
        if (fill) fill.style.width = `${wsPct(job)}%`;
        if (text) text.textContent = `${wsJobLabel(job)}${job.total ? ` · ${wsPct(job)}%` : ''}`;
      }
    } catch {
      /* ignore polling hiccups */
    }
  }, 600);
  try {
    const result = await call('workshop.install', { id }, { silent: true });
    stop = true;
    clearInterval(timer);
    S.workshop.installing = '';
    S.workshop.data = result.workshop;
    if (result.state) {
      S.state = result.state;
      S.version = S.state.version;
    }
    const name = result.name || 'المود';
    if (result.version) toast(`تم تثبيت ${name} ${result.version}.`, 'ok');
    else toast(`تم تثبيت ${name}.`, 'ok');
    if (id === 'seamless-coop') toast('Seamless جاهز — كلمة السر محفوظة بالورشة وتنطبق عند التشغيل.', 'ok');
    render();
  } catch (err) {
    stop = true;
    clearInterval(timer);
    S.workshop.installing = '';
    S.workshop.error = err.message;
    if (S.view === 'mods') render();
    toast(err.message, 'error');
  }
}

function wsDetailsLegacy(id) {
  const entry = S.workshop.data?.items?.find((i) => i.id === id);
  if (!entry) return;
  const installed = entry.state === 'installed';
  const jobs = entry.job && !entry.job.done;
  openModal({
    title: entry.name,
    body: `<div class="ws-detail">
      <div class="ws-detail-cover" style="background-image:url('${wsCover(entry)}')"></div>
      <div class="ws-detail-meta">
        ${pill(entry.author || 'مجتمع', 'gold')}
        ${pill(entry.direct ? 'تحميل مباشر' : 'Nexus', entry.direct ? 'ok' : '')}
        ${entry.version ? pill(entry.version) : ''}
        ${installed ? pill('مثبّت', 'ok') : ''}
      </div>
      <p>${esc(entry.description || entry.summary)}</p>
      ${entry.requirements ? `<div class="ws-detail-line">${icon('alert')} <span>${esc(entry.requirements)}</span></div>` : ''}
      ${entry.downloadNote ? `<div class="ws-detail-line">${icon('download')} <span>${esc(entry.downloadNote)}</span></div>` : ''}
      <div class="ws-tags">${(entry.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>
      ${entry.nexusUrl ? `<div class="hint small" style="margin-top:10px">المصدر: <span class="mono">${esc(entry.nexusUrl)}</span></div>` : ''}
    </div>`,
    actions: [
      { label: 'إغلاق', cls: 'btn-ghost' },
      ...(entry.direct && !installed && !jobs
        ? [
            {
              label: 'تثبيت الآن',
              cls: 'btn-primary',
              onClick: () => {
                setTimeout(() => installWorkshopEntry(entry.id), 200);
                return true;
              },
            },
          ]
        : []),
      ...(installed && entry.modId
        ? [
            {
              label: 'إزالة (سلة المحذوفات)',
              cls: 'btn btn-danger',
              onClick: async () => {
                try {
                  const result = await call('workshop.uninstall', { id: entry.modId }, { silent: true });
                  if (result.workshop) S.workshop.data = result.workshop;
                  if (result.state) {
                    S.state = result.state;
                    S.version = S.state.version;
                  }
                  render();
                  toast(result.message || 'انتقل المود إلى سلة المحذوفات.', 'ok');
                } catch (err) {
                  toast(err.message, 'error');
                }
                return true;
              },
            },
          ]
        : []),
    ],
  });
}

/* ---------------- workshop 2.0 (download -> MY MODS -> activate) ---------------- */
function wsEntry(id) {
  return (S.workshop.data?.items || []).find((item) => item.id === String(id)) || null;
}

function wsImage(entry) {
  return entry && entry.img ? `../../assets/workshop/${entry.img}` : '';
}

function wsInitials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function wsDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function wsEndorsements(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/,/g, '');
  const num = parseFloat(raw);
  if (!Number.isFinite(num)) return 0;
  if (raw.endsWith('k')) return Math.round(num * 1000);
  if (raw.endsWith('m')) return Math.round(num * 1000000);
  return Math.round(num);
}

function wsJobText(job) {
  if (!job) return 'Working…';
  if (job.phase === 'resolve') return 'Finding the file…';
  if (job.phase === 'nexus') return 'Waiting for your click in the Nexus window';
  if (job.phase === 'download') return 'Downloading';
  if (job.phase === 'save') return 'Saving to your profile';
  if (job.phase === 'setup') return 'Setting up — extracting into your mod library';
  if (job.phase === 'done') return 'Ready';
  if (job.phase === 'error') return job.error || 'Download failed';
  return 'Working…';
}

function wsBusyEntry(entry) {
  return !!(entry && (S.workshop.busy === entry.id || (entry.job && !entry.job.done)));
}

function wsProgressBlock(entry) {
  const job = entry.job || null;
  const pct = job && job.total ? Math.min(100, Math.round((job.received / job.total) * 100)) : 0;
  return `<div class="ws-progress-wrap" data-ws-prog="${esc(entry.id)}">
    <div class="ws-progress"><i data-ws-fill style="width:${pct}%"></i></div>
    <div class="ws-progress-label" data-ws-text>${esc(wsJobText(job))}${job && job.total ? ` · ${pct}%` : ''}</div>
  </div>`;
}

function wsCoverBlock(entry) {
  const src = wsImage(entry);
  return `<div class="ws-cover">
    <div class="ws-cover-fallback">${esc(wsInitials(entry.name))}</div>
    ${src ? `<img src="${esc(src)}" alt="" loading="lazy" />` : ''}
    <span class="ws-cover-shade"></span>
    ${entry.state === 'active' ? '<span class="ws-state active">Active</span>' : ''}
    ${entry.state === 'downloaded' ? '<span class="ws-state downloaded">Downloaded</span>' : ''}
    ${
      entry.tool
        ? '<span class="ws-coop core">Co-op core</span>'
        : entry.coOp === 'high'
          ? '<span class="ws-coop">Co-op risk</span>'
          : '<span class="ws-coop low">Co-op safe</span>'
    }
  </div>`;
}

function wsCardActions(entry) {
  const details = `<button class="btn btn-ghost" data-act="wsDetails" data-ws="${esc(entry.id)}">Details</button>`;
  if (wsBusyEntry(entry)) return `<button class="btn" disabled>Working…</button>${details}`;
  if (entry.state === 'active') {
    if (entry.tool) return `<button class="btn" disabled>Installed</button>${details}`;
    return `<button class="btn" data-act="wsDeactivate" data-ws="${esc(entry.id)}">Deactivate</button>${details}`;
  }
  if (entry.state === 'downloaded') {
    return `<button class="btn btn-primary" data-act="wsActivate" data-ws="${esc(entry.id)}">Activate</button>${details}`;
  }
  if (entry.manual) {
    return `<button class="btn btn-primary" data-act="wsDownload" data-ws="${esc(entry.id)}">${icon('download')} Download</button>
      <button class="btn" data-act="wsImportFor" data-ws="${esc(entry.id)}">${icon('upload')} Import</button>
      <button class="btn btn-ghost ws-icon-btn" title="Details" data-act="wsDetails" data-ws="${esc(entry.id)}">${icon('book')}</button>`;
  }
  return `<button class="btn btn-primary" data-act="wsDownload" data-ws="${esc(entry.id)}">${icon('download')} Download</button>${details}`;
}

function wsCard(entry) {
  const search = `${entry.name} ${entry.author || ''} ${entry.blurb || ''} ${(entry.cats || []).join(' ')}`.toLowerCase();
  return `<article class="ws-card" data-ws-card data-id="${esc(entry.id)}" data-state="${esc(entry.state)}" data-search="${esc(search)}">
    ${wsCoverBlock(entry)}
    <div class="ws-body">
      <h3 class="ws-name">${esc(entry.name)}</h3>
      <div class="ws-author">${esc(entry.author || 'Community')}</div>
      <p class="ws-blurb">${esc(entry.blurb || 'A community mod for Elden Ring.')}</p>
      ${entry.manual ? `<div class="ws-manual-note">${icon('link')} Nexus — one login, one click in the launcher window; we finish the rest</div>` : ''}
      <div class="ws-meta">
        <span>${icon('gift')} ${esc(entry.endorsements || '—')}</span>
        <span>${icon('clock')} ${esc(wsDate(entry.updated))}</span>
        ${entry.size ? `<span>${icon('layers')} ${esc(entry.size)}</span>` : ''}
      </div>
      ${wsBusyEntry(entry) ? wsProgressBlock(entry) : ''}
    </div>
    <div class="ws-card-actions">${wsCardActions(entry)}</div>
  </article>`;
}

function wsFilterMatch(entry) {
  const filter = S.workshop.filter;
  const category = S.workshop.category;
  const query = S.workshop.query.trim().toLowerCase();
  const cats = entry.cats || [];
  if (category !== 'all' && !cats.includes(category)) return false;
  if (filter === 'downloaded' && entry.state === 'available') return false;
  if (filter === 'activated' && entry.state !== 'active') return false;
  if (['graphics', 'gameplay', 'coop', 'fun'].includes(filter) && !cats.includes(filter)) return false;
  if (query) {
    const haystack = `${entry.name} ${entry.author || ''} ${entry.blurb || ''} ${cats.join(' ')}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function wsSortItems(items) {
  const filter = S.workshop.filter;
  if (filter === 'popular') {
    items.sort((a, b) => wsEndorsements(b.endorsements) - wsEndorsements(a.endorsements));
  } else if (filter === 'new') {
    items.sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  } else if (S.workshop.tab === 'mymods') {
    items.sort((a, b) => Number(b.state === 'active') - Number(a.state === 'active'));
  }
  return items;
}

function wsInstalledRow(mod) {
  const entry = mod.workshopId ? wsEntry(mod.workshopId) : null;
  const cover = entry?.img
    ? `<img src="${esc(wsImage(entry))}" alt="" loading="lazy" />`
    : mod.image
      ? `<img src="${esc(mod.image)}" alt="" loading="lazy" />`
      : `<div class="ws-modrow-fallback">${esc(wsInitials(mod.name))}</div>`;
  const sub = [
    mod.author || 'Community',
    mod.version || '',
    fmtBytesShort(mod.bytes || 0),
    mod.dllMode ? 'DLL mod' : '',
    mod.requiresReShade ? 'ReShade preset — needs the ReShade runtime' : '',
    mod.compatible === false ? mod.reason || 'Not compatible' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return `<div class="ws-modrow">
    <div class="ws-modrow-cover">${cover}</div>
    <div class="ws-modrow-main">
      <div class="ws-modrow-name">${esc(mod.name)}${mod.workshopId ? '' : ' <span class="ws-legacy">legacy</span>'}</div>
      <div class="ws-modrow-sub">${esc(sub)}</div>
    </div>
    <div class="ws-modrow-actions">
      <label class="ws-switch" title="${mod.enabled ? 'Switch off this mod' : 'Switch on this mod'}">
        <input type="checkbox" data-mod-toggle="${esc(mod.id)}" data-ws-reload="1" ${mod.enabled ? 'checked' : ''} ${mod.compatible === false ? 'disabled' : ''} />
        <span>${mod.enabled ? 'Active' : 'Off'}</span>
      </label>
      ${mod.workshopId ? `<button class="btn btn-ghost" data-act="wsDetails" data-ws="${esc(mod.workshopId)}">Details</button>` : ''}
      <button class="btn btn-ghost" data-act="wsRemoveMod" data-mod="${esc(mod.id)}">Remove</button>
    </div>
  </div>`;
}

function wsDownloadedRow(entry) {
  return `<div class="ws-modrow">
    <div class="ws-modrow-cover">${wsImage(entry) ? `<img src="${esc(wsImage(entry))}" alt="" loading="lazy" />` : `<div class="ws-modrow-fallback">${esc(wsInitials(entry.name))}</div>`}</div>
    <div class="ws-modrow-main">
      <div class="ws-modrow-name">${esc(entry.name)}</div>
      <div class="ws-modrow-sub">${esc(entry.author || 'Community')}${entry.size ? ` · ${esc(entry.size)}` : ''}${entry.tool ? ' · installs into the game folder' : ''}${
        entry.state === 'active' ? ' · running with PLAY' : entry.ready ? ' · ready, switched off' : ' · downloaded, not active'
      }</div>
      ${entry.setupError ? `<div class="ws-modrow-warn">${icon('alert')} Setup: ${esc(entry.setupError)} — press Activate to retry.</div>` : ''}
      ${wsBusyEntry(entry) ? wsProgressBlock(entry) : ''}
    </div>
    <div class="ws-modrow-actions">
      ${
        wsBusyEntry(entry)
          ? '<button class="btn" disabled>Working…</button>'
          : entry.state === 'active'
            ? entry.tool
              ? '<span class="ws-ready-pill">Installed</span>'
              : `<button class="btn btn-ghost" data-act="wsDeactivate" data-ws="${esc(entry.id)}">Deactivate</button>`
            : `<button class="btn btn-primary" data-act="wsActivate" data-ws="${esc(entry.id)}">Activate</button>`
      }
      <button class="btn btn-ghost" data-act="wsDetails" data-ws="${esc(entry.id)}">Details</button>
      <button class="btn btn-ghost btn-danger" data-act="wsDelete" data-ws="${esc(entry.id)}">Delete</button>
    </div>
  </div>`;
}

function wsFiltersBar(ws) {
  const filters = ws.filters || [];
  // Graphics / Gameplay / Co-op / Fun already exist as primary filters — showing
  // them again as categories duplicated the chip row.
  const filterIds = new Set(filters.map((filter) => filter.id));
  const categories = (ws.categories || []).filter((item) => item.id !== 'all' && !filterIds.has(item.id));
  return `<div class="ws-filter-row">
    ${filters
      .map(
        (filter) =>
          `<button class="ws-chip ${S.workshop.filter === filter.id ? 'on' : ''}" data-act="wsFilter" data-filter="${esc(filter.id)}">${esc(filter.name)}</button>`
      )
      .join('')}
    <span class="ws-chip-sep"></span>
    ${categories
      .map(
        (category) =>
          `<button class="ws-chip ${S.workshop.category === category.id ? 'on' : ''}" data-act="wsCat" data-cat="${esc(category.id)}">${esc(category.name)}</button>`
      )
      .join('')}
  </div>`;
}

function wsNexusBanner() {
  const id = S.workshop.busy;
  if (!id) return '';
  const entry = wsEntry(id);
  if (!entry || !entry.manual) return '';
  return `<div class="banner warn ws-fail section-gap">
    ${icon('link')}
    <div>
      <strong>Nexus window open — ${esc(entry.name)}.</strong>
      <div class="ws-fail-msg">Sign in once (the launcher remembers it), then press Nexus' own free download button once. The launcher captures the file, installs it and marks it Ready in MY MODS. No external browser, no payment.</div>
      <div class="ws-fail-actions">
        <button class="btn btn-sm btn-ghost" data-act="wsNexusCancel" data-ws="${esc(id)}">Cancel</button>
      </div>
    </div>
  </div>`;
}

function wsFailureBanner() {
  const failed = S.workshop.failed;
  if (!failed) return '';
  const entry = wsEntry(failed.id);
  const name = entry ? entry.name : failed.name || 'This mod';
  const manualSource = failed.code === 'NEXUS_MANUAL';
  return `<div class="banner danger ws-fail section-gap">
    ${icon('alert')}
    <div>
      <strong>${esc(name)} could not be downloaded.</strong>
      <div class="ws-fail-msg">${esc(failed.message)}</div>
      <div class="ws-fail-actions">
        ${manualSource ? '' : `<button class="btn btn-sm btn-primary" data-act="wsRetry" data-ws="${esc(failed.id)}">${icon('refresh')} Retry</button>`}
        ${entry && !entry.direct ? `<button class="btn btn-sm btn-ghost" data-act="wsLink" data-ws="${esc(failed.id)}">${icon('link')} Free mirror link</button>` : ''}
        <button class="btn btn-sm btn-ghost" data-act="wsImportFor" data-ws="${esc(failed.id)}">${icon('upload')} Import file instead</button>
        <button class="btn btn-sm btn-ghost" data-act="wsDismissFail">Dismiss</button>
      </div>
    </div>
  </div>`;
}

function viewMods() {
  const ws = S.workshop.data;
  const g = state().game;
  const tab = S.workshop.tab === 'mymods' ? 'mymods' : 'discover';
  const counts = ws?.counts || { total: 0, downloaded: 0, active: 0, direct: 0 };
  const items = (ws?.items || []).filter(wsFilterMatch);
  wsSortItems(items);
  const shown = items.slice(0, S.workshop.limit);
  const installed = ws?.installed || [];
  const catalogIds = new Set((ws?.items || []).map((item) => item.id));
  const downloadedRows = (ws?.items || []).filter((item) => item.state !== 'available');
  const legacyRows = installed.filter((mod) => !mod.workshopId || !catalogIds.has(String(mod.workshopId)));

  return `<div class="ws-view">
    <div class="ws-head">
      <div>
        <div class="ws-kicker">Elden Ring · Mods</div>
        <h1 class="ws-title">Workshop</h1>
        <div class="ws-sub">Real mods from NexusMods. Download first, it lands in MY MODS, then Activate — PLAY starts with exactly the mods you switched on.</div>
      </div>
      <div class="ws-head-actions">
        <button class="btn btn-primary" data-act="wsImportFile">${icon('upload')} Import file</button>
        <button class="btn btn-ghost" data-act="wsRefresh" ${S.workshop.loading ? 'disabled' : ''}>${icon('refresh')} Refresh</button>
      </div>
    </div>

    <div class="ws-tabs">
      <button class="ws-tab ${tab === 'discover' ? 'on' : ''}" data-act="wsTab" data-tab="discover">Discover <b>${counts.total}</b></button>
      <button class="ws-tab ${tab === 'mymods' ? 'on' : ''}" data-act="wsTab" data-tab="mymods">MY MODS <b>${counts.downloaded + counts.active}</b></button>
    </div>

    ${S.workshop.error ? `<div class="banner danger section-gap">${icon('alert')}<div>${esc(S.workshop.error)}</div><button class="btn btn-sm btn-ghost" data-act="wsClearError">Dismiss</button></div>` : ''}
    ${wsNexusBanner()}
    ${wsFailureBanner()}

    ${
      tab === 'discover'
        ? `${
            S.workshop.loading && !ws
              ? workshopSkeleton()
              : !ws
                ? `<div class="banner danger section-gap">${icon('alert')}<div>Could not load the Workshop catalogue.</div></div>`
                : `<div class="ws-note">${icon('download')}<div><b>One Download button on every mod — everything happens inside the launcher.</b> Mods with a free direct source (GitHub, ModDB, Google Drive or the author's mirror) download, extract and land in <b>MY MODS</b> switched off, ready for <b>Activate</b>. Nexus-only mods open a small Nexus window inside the launcher: sign in once, press Nexus' free download button once, and the launcher finishes the download and setup automatically. No external browser, no payment.</div></div>
                  ${!g.found ? `<div class="banner warn section-gap">${icon('alert')}<div>Set your game folder in Settings first — activation copies files into the game.</div></div>` : ''}
                  <div class="ws-toolbar">
                    <div class="ws-toolbar-top">
                      <div class="search-bar ws-search">
                        <span class="search-icon">${icon('search')}</span>
                        <input class="input" id="wsSearch" value="${esc(S.workshop.query)}" placeholder="Search 300 mods…" />
                      </div>
                      <span class="ws-result-count" id="wsCount">${items.length} mod${items.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  ${wsFiltersBar(ws)}
                  <div class="ws-grid" id="wsGrid">${shown.map(wsCard).join('')}</div>
                  <div class="ws-empty" id="wsEmpty" style="display:${shown.length ? 'none' : 'block'}">${icon('search')}No mods match these filters.</div>
                  ${
                    items.length > shown.length
                      ? `<div class="ws-more"><button class="btn" data-act="wsMore">Load ${Math.min(48, items.length - shown.length)} more</button></div>`
                      : ''
                  }`
          }`
        : `<div class="ws-toolbar">
            <div class="ws-toolbar-top">
              <div class="ws-result-count">${counts.downloaded + counts.active} mods in your library · ${counts.active} active</div>
              <div class="ws-head-actions">
                <button class="btn btn-sm btn-primary" data-act="wsActivateAll" ${S.workshop.busy ? 'disabled' : ''}>${icon('play')} Activate All</button>
                <button class="btn btn-sm btn-ghost" data-act="wsDeactivateAll" ${S.workshop.busy ? 'disabled' : ''}>${icon('pause')} Deactivate All</button>
                <button class="btn btn-sm btn-ghost" data-act="wsRepair">${icon('refresh')} Repair</button>
              </div>
            </div>
          </div>
          ${
            downloadedRows.length || legacyRows.length
              ? `<div class="ws-mymods">
                  ${downloadedRows.map(wsDownloadedRow).join('')}
                  ${legacyRows.map(wsInstalledRow).join('')}
                </div>
                <div class="ws-note" style="margin-top:16px">${icon('shieldCheck')}<div><b>Only active mods load with PLAY.</b> Deactivating keeps the download so you can switch it back on anytime. Deleting removes the download and the installed copy (the mod folder goes to the Recycle Bin).</div></div>`
              : `<div class="ws-empty" style="display:block">${icon('box')}<div>Nothing here yet. Open <b>Discover</b>, download a mod, and it will appear in MY MODS.</div><button class="btn btn-primary" data-act="wsTab" data-tab="discover" style="margin-top:12px">${icon('search')} Browse mods</button></div>`
          }`
    }
  </div>`;
}

async function loadWorkshop(force = false) {
  if (S.workshop.loading) return;
  if (S.workshop.data && !force) return;
  S.workshop.loading = true;
  S.workshop.error = '';
  if (S.view === 'mods') render();
  try {
    S.workshop.data = await call('workshop.list', {}, { silent: true });
    if (S.state && S.workshop.data) {
      S.state.workshop = { ...(S.state.workshop || {}), counts: S.workshop.data.counts };
    }
  } catch (err) {
    S.workshop.error = err.message;
  } finally {
    S.workshop.loading = false;
    if (S.view === 'mods') render();
  }
}

function filterWorkshopDom() {
  const query = S.workshop.query.trim().toLowerCase();
  const cards = [...document.querySelectorAll('[data-ws-card]')];
  let visible = 0;
  cards.forEach((card) => {
    const show = !query || (card.dataset.search || '').includes(query);
    card.style.display = show ? '' : 'none';
    if (show) visible += 1;
  });
  const empty = document.getElementById('wsEmpty');
  if (empty) empty.style.display = cards.length && !visible ? 'block' : 'none';
  const count = document.getElementById('wsCount');
  if (count) count.textContent = query ? `${visible} match${visible === 1 ? '' : 'es'}` : `${cards.length} mods`;
}

function wsDetails(id) {
  const entry = wsEntry(id);
  if (!entry) return;
  const tags = [...(entry.cats || []), entry.nexusCat || ''].filter(Boolean);
  const stats = [
    ['Endorsements', entry.endorsements || '—'],
    ['Size', entry.size || '—'],
    ['Updated', wsDate(entry.updated)],
    ['Source', entry.direct ? 'GitHub (direct)' : entry.freeLink ? 'Free mirror link' : 'NexusMods (in-app window)'],
  ];
  const howTo = entry.direct
    ? 'Press Download. The launcher fetches the archive, extracts it into your mod library and marks it Ready. Open MY MODS, switch it on, then PLAY — the mod loads with the game.'
    : entry.freeLink
      ? 'Press Download. The launcher fetches the free link you saved, extracts it into your mod library and marks it Ready. Open MY MODS, switch it on, then PLAY.'
      : 'Press Download. A small Nexus window opens inside the launcher: sign in once (it is remembered), press Nexus\' own free download button once, and the launcher takes over — it captures the file, extracts it into your mod library and marks it Ready in MY MODS. Prefer a mirror? Use "Free mirror link" below, or Import file for an archive you already have.';
  const coOpBlock =
    entry.tool
      ? `<div class="ws-safe">${icon('shieldCheck')}<div><b>Launcher-managed co-op tool.</b><br>This is one of the two core tools the launcher installs and keeps in sync for Seamless Co-op — safe to leave active.</div></div>`
      : entry.coOp === 'high'
      ? `<div class="ws-warning">${icon('alert')}<div><b>This mod may break Co-op — use it in Single Player only.</b><br>It changes gameplay that Seamless Co-op syncs between players. If you play with a friend, switch it off first.</div></div>`
      : `<div class="ws-safe">${icon('shieldCheck')}<div><b>Co-op friendly.</b><br>Reported to work alongside Seamless Co-op. Test it with a friend before a long session.</div></div>`;
  const actions = [{ label: 'Close', cls: 'btn-ghost' }];
  if (entry.state === 'available') {
    actions.push({
      label: 'Download',
      cls: 'btn-primary',
      onClick: () => {
        setTimeout(() => workshopDownload(entry.id), 180);
        return true;
      },
    });
    if (!entry.direct) {
      actions.push({
        label: 'Free mirror link',
        cls: 'btn',
        onClick: () => {
          setTimeout(() => wsLinkModal(entry.id), 180);
          return true;
        },
      });
    }
    actions.push({
      label: 'Import file',
      cls: 'btn',
      onClick: () => {
        setTimeout(() => workshopImport(entry.id), 180);
        return true;
      },
    });
  } else if (entry.state === 'downloaded') {
    actions.push({
      label: 'Activate',
      cls: 'btn-primary',
      onClick: () => {
        setTimeout(() => workshopActivate(entry.id), 180);
        return true;
      },
    });
  } else if (entry.state === 'active' && !entry.tool) {
    actions.push({
      label: 'Deactivate',
      cls: 'btn',
      onClick: () => {
        setTimeout(() => workshopDeactivate(entry.id), 180);
        return true;
      },
    });
  }
  if (entry.state !== 'available') {
    actions.push({
      label: 'Delete',
      cls: 'btn btn-danger',
      onClick: () => {
        setTimeout(() => workshopDelete(entry.id), 180);
        return true;
      },
    });
  }
  openModal({
    title: esc(entry.name),
    wide: true,
    body: `<div class="ws-detail">
      <div>
        <div class="ws-detail-art">${wsImage(entry) ? `<img src="${esc(wsImage(entry))}" alt="" />` : ''}</div>
        <div class="ws-stats" style="grid-template-columns:1fr 1fr;margin-top:12px">
          ${stats.map(([label, value]) => `<div class="ws-stat"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}
        </div>
      </div>
      <div>
        <h2 class="ws-detail-title">${esc(entry.name)}</h2>
        <div class="ws-detail-author">by ${esc(entry.author || 'Community')}${entry.state === 'active' ? ' · Active' : entry.state === 'downloaded' ? ' · Downloaded' : ''}</div>
        <div class="ws-detail-tags">${tags.map((tag) => `<span class="ws-detail-tag">${esc(tag)}</span>`).join('')}</div>
        ${coOpBlock}
        <div class="ws-detail-section"><h4>What it does</h4><p>${esc(entry.blurb || 'A community mod for Elden Ring.')}</p></div>
        <div class="ws-detail-section"><h4>How to use</h4><p>${howTo}</p></div>
        ${entry.url ? `<div class="ws-detail-section"><h4>Source</h4><p class="mono" style="font-size:11px;word-break:break-all">${esc(entry.url)}</p></div>` : ''}
      </div>
    </div>`,
    actions,
  });
}

async function workshopDownload(id) {
  if (S.workshop.busy) return;
  const entry = wsEntry(id);
  if (!entry) return;
  S.workshop.busy = id;
  S.workshop.error = '';
  S.workshop.failed = null;
  render();
  let stop = false;
  const timer = setInterval(async () => {
    if (stop) return;
    try {
      const jobs = await call('workshop.progress', {}, { silent: true });
      const job = (jobs || []).find((item) => item.id === id);
      if (!job) return;
      const pct = job.total ? Math.min(100, Math.round((job.received / job.total) * 100)) : 0;
      document.querySelectorAll(`[data-ws-prog="${id}"]`).forEach((box) => {
        const fill = box.querySelector('[data-ws-fill]');
        const text = box.querySelector('[data-ws-text]');
        if (fill) fill.style.width = `${pct}%`;
        if (text) text.textContent = `${wsJobText(job)}${job.total ? ` · ${pct}%` : ''}`;
      });
    } catch {
      /* polling hiccup */
    }
  }, 500);
  try {
    const result = await call('workshop.download', { id }, { silent: true });
    if (result.workshop) S.workshop.data = result.workshop;
    if (result.setupError) {
      S.workshop.failed = {
        id,
        name: entry.name,
        code: 'SETUP',
        message: `The download finished but setup failed: ${result.setupError}`,
      };
      toast('Downloaded — setup needs one more try. Press Activate in MY MODS.', 'info');
    } else {
      toast(`${entry.name} downloaded and set up — press Activate to load it with PLAY.`, 'ok');
    }
    S.workshop.tab = 'mymods';
  } catch (err) {
    S.workshop.failed = { id, name: entry.name, code: err.code || '', message: err.message };
    toast(err.message, 'error');
  } finally {
    stop = true;
    clearInterval(timer);
    S.workshop.busy = '';
    render();
  }
}

function wsLinkModal(id) {
  const entry = wsEntry(id);
  const name = entry ? entry.name : 'this mod';
  const current = entry?.freeLink || '';
  openModal({
    title: 'Free download link',
    body: `<div class="ws-key-modal">
      <p class="ws-key-lead">Optional alternative to the Nexus window: paste a free link for <b>${esc(name)}</b> — the author's mirror, a ModDB mirror, a Google Drive share link or a GitHub release. The launcher then downloads it in the background with one press: no window, no account, no payment.</p>
      <div class="field"><label class="field-label">Archive link</label>
        <input class="input mono" id="wsLinkInput" type="url" autocomplete="off" placeholder="https://…/mod.zip" value="${esc(current)}" />
        <div class="hint small" style="margin-top:8px">Point it at the archive itself (.zip, .7z, .rar). Google Drive and Dropbox share links are converted to direct links when possible.${current ? ' Saving replaces the current link.' : ''}</div>
      </div>
    </div>`,
    actions: [
      { label: 'Cancel', cls: 'btn-ghost' },
      ...(current
        ? [
            {
              label: 'Remove link',
              cls: 'btn btn-danger',
              onClick: async () => {
                try {
                  const result = await call('workshop.setLink', { id, url: '' }, { silent: true });
                  if (result.workshop) S.workshop.data = result.workshop;
                  render();
                  toast('Free mirror link removed.', 'ok');
                } catch (err) {
                  toast(err.message, 'error');
                  return false;
                }
                return true;
              },
            },
          ]
        : []),
      {
        label: 'Save & download',
        cls: 'btn-primary',
        onClick: async () => {
          const url = String(document.getElementById('wsLinkInput')?.value || '').trim();
          if (!url) {
            toast('Paste a download link first.', 'error');
            return false;
          }
          try {
            const result = await call('workshop.setLink', { id, url }, { silent: true });
            if (result.workshop) S.workshop.data = result.workshop;
          } catch (err) {
            toast(err.message, 'error');
            return false;
          }
          render();
          setTimeout(() => workshopDownload(id), 240);
          return true;
        },
      },
    ],
  });
}

async function workshopActivate(id) {
  if (S.workshop.busy) return;
  const entry = wsEntry(id);
  S.workshop.busy = id;
  S.workshop.error = '';
  render();
  try {
    const result = await call('workshop.activate', { id }, { silent: true });
    if (result.catalog) S.workshop.data = result.catalog;
    if (result.state) {
      S.state = result.state;
      S.version = S.state.version;
    }
    S.workshop.busy = '';
    S.workshop.tab = 'mymods';
    render();
    if (id === '510') toast('Seamless Co-op is active — PLAY starts it directly.', 'ok');
    else if (id === '117') toast('Elden Mod Loader installed into the game folder.', 'ok');
    else if (id === 'mod-engine-2') {
      toast(
        result.already
          ? 'Mod Engine 2 is already installed — PLAY uses it for your mods.'
          : 'Mod Engine 2 installed — PLAY now loads your mods.',
        'ok'
      );
    } else toast(`${entry?.name || 'Mod'} activated — PLAY starts with it.`, 'ok');
  } catch (err) {
    S.workshop.busy = '';
    S.workshop.error = err.message;
    render();
    toast(err.message, 'error');
  }
}

async function workshopDeactivate(id) {
  if (S.workshop.busy) return;
  const entry = wsEntry(id);
  S.workshop.busy = id;
  render();
  try {
    const result = await call('workshop.deactivate', { id }, { silent: true });
    if (result.catalog) S.workshop.data = result.catalog;
    if (result.state) {
      S.state = result.state;
      S.version = S.state.version;
    }
    S.workshop.busy = '';
    render();
    toast(`${entry?.name || 'Mod'} switched off — the download stays in MY MODS.`, 'ok');
  } catch (err) {
    S.workshop.busy = '';
    render();
    toast(err.message, 'error');
  }
}

async function workshopDelete(id) {
  const entry = wsEntry(id);
  if (!entry) return;
  const ok = await confirmModal({
    title: 'Delete this mod?',
    html: `The download and the installed copy of <b>${esc(entry.name)}</b> will be removed. The mod folder goes to the Recycle Bin, your save file is never touched.`,
    okLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  S.workshop.busy = id;
  render();
  try {
    const result = await call('workshop.delete', { id }, { silent: true });
    if (result.catalog) S.workshop.data = result.catalog;
    if (result.state) {
      S.state = result.state;
      S.version = S.state.version;
    }
    S.workshop.busy = '';
    render();
    toast(`${entry.name} deleted.`, 'ok');
  } catch (err) {
    S.workshop.busy = '';
    render();
    toast(err.message, 'error');
  }
}

async function workshopImport(id) {
  try {
    const result = await call('workshop.importFile', id ? { id } : {}, { silent: true });
    if (!result) return;
    if (result.catalog) S.workshop.data = result.catalog;
    if (result.state) {
      S.state = result.state;
      S.version = S.state.version;
    }
    S.workshop.tab = 'mymods';
    render();
    toast(id ? 'Archive imported — press Activate.' : 'Mod imported — it is in MY MODS, switched off.', 'ok');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function workshopBulk(mode) {
  if (S.workshop.busy) return;
  S.workshop.busy = mode;
  render();
  try {
    const result = await call(mode === 'activateAll' ? 'workshop.activateAll' : 'workshop.deactivateAll', {}, { silent: true });
    if (result.catalog) S.workshop.data = result.catalog;
    if (result.state) {
      S.state = result.state;
      S.version = S.state.version;
    }
    S.workshop.busy = '';
    S.workshop.tab = 'mymods';
    render();
    if (mode === 'activateAll') {
      toast(`Activated ${result.activated?.length || 0} mods — PLAY loads them now.`, 'ok');
      if (result.failed?.length) toast(result.failed[0].error, 'info');
    } else {
      toast(`Deactivated ${result.disabled?.length || 0} mods.`, 'ok');
    }
  } catch (err) {
    S.workshop.busy = '';
    render();
    toast(err.message, 'error');
  }
}

async function fixSeamlessFromWorkshop() {
  let entry = wsEntry('510');
  if (!entry) {
    await loadWorkshop(true);
    entry = wsEntry('510');
  }
  if (!entry) throw new Error('Seamless Co-op is not in the Workshop catalogue.');
  if (entry.state === 'available') await workshopDownload('510');
  entry = wsEntry('510');
  if (entry && entry.state !== 'active') await workshopActivate('510');
}

function dlssOption(option, selected, supported) {
  const disabled = !supported && option.id !== 'off';
  return `<label class="dlss-option ${selected ? 'active' : ''} ${disabled ? 'disabled' : ''}">
    <input type="radio" name="dlssMode" data-dlss="${esc(option.id)}" ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
    <span class="dlss-radio"></span>
    <span class="dlss-copy"><b data-i18n="dlss-${esc(option.id)}">${esc(option.name)}</b><span>${esc(option.desc)}</span></span>
  </label>`;
}

function seamlessReport(report) {
  if (!report) return '';
  const rows = (report.checks || [])
    .map((c) => {
      const cls = c.ok ? 'ok' : c.required ? 'bad' : 'warn';
      return `<div class="report-row ${cls}">${icon(c.ok ? 'check' : 'x')}<span class="report-label">${esc(c.label)}</span>${c.detail ? `<span class="report-detail tiny muted">${esc(c.detail)}</span>` : ''}</div>`;
    })
    .join('');
  return `<div class="seamless-report ${report.ready ? 'ok' : 'bad'}">
    <div class="report-head">${icon(report.ready ? 'check' : 'alert')}<b>${report.ready ? 'كل الملفات موجودة والإعدادات سليمة.' : 'فيه ملفات أو إعدادات ناقصة — شوف التفاصيل تحت.'}</b></div>
    <div class="report-list">${rows}</div>
    <div class="tiny muted" style="margin-top:8px">${report.ready ? 'Seamless جاهز — تقدر تدخل مع أخوياك بنفس كلمة السر.' : 'أصلح الناقص ثم اضغط Test Seamless مرة ثانية.'}</div>
  </div>`;
}

function viewSettings() {
  const st = state();
  const g = st.game;
  const settings = st.settings;
  const d = st.dlss;
  const save = st.saves.active;
  const cheatsOn = (st.trainer.cheats || []).filter((c) => c.enabled).length;

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">الاعدادات</div>
      <h1 class="view-title">الاعدادات</h1>
      <div class="view-sub">كل شي هنا ينحفظ لحاله — ما تحتاج تدوس حفظ.</div>
    </div>
  </div>

  <div class="settings-grid">
    <div class="card">
      <div class="card-head"><div class="card-title">${icon('play')} ملف تشغيل اللعبة</div>
        ${pill(g.exeExists ? 'جاهز' : 'غير محدد', g.exeExists ? 'ok' : 'warn')}
      </div>
      <div class="card-pad">
        <div class="path-chip" title="${esc(settings.gameExe || '')}">${settings.gameExe ? esc(settings.gameExe) : 'ما اخترت ملف التشغيل (nrcs)'}</div>
        <div class="scan-actions">
          <button class="btn btn-primary" data-act="pickGameExe">${icon('folder')} اختر ملف تشغيل اللعبة</button>
          <button class="btn" data-act="detectGame">${icon('search')} اكتشاف تلقائي</button>
          ${settings.gameExe ? `<button class="btn btn-ghost btn-danger" data-act="clearGameExe">مسح</button>` : ''}
        </div>
        <div class="hint">كل مرة تدوس <b>تشغيل اللعبة</b>، نستخدم هذا الملف مباشرة — بدون ما نروح لستيم. اختر ملف <b>nrcs</b> اللي عندك.</div>
        ${
          settings.gameExe && !g.exeExists
            ? `<div class="banner danger" style="margin-top:12px">${icon('alert')}<div>ملف اللعبة مو موجود، اختر المسار الصحيح من الاعدادات</div></div>`
            : ''
        }
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title">${icon('save')} الحفظ</div>
        ${pill(save ? 'موجود' : 'غير محدد', save ? 'ok' : 'warn')}
      </div>
      <div class="card-pad">
        <div class="path-chip" title="${esc(settings.saveFile || save?.path || '')}">${settings.saveFile ? esc(settings.saveFile) : save ? esc(save.path) : 'ما لقينا حفظ اللعبة'}</div>
        <div class="scan-actions">
          <button class="btn" data-act="pickSaveFile">${icon('folder')} حدد ملف الحفظ</button>
          <button class="btn" data-act="detectSave">${icon('search')} اكتشاف تلقائي</button>
          <button class="btn btn-ghost" data-act="openSaves">مدير الحفظ</button>
        </div>
        <div class="hint">تلقائياً نلقى حفظك في <span class="mono">AppData\\Roaming\\EldenRing</span>. تقدر تحدد ملف ثاني إذا تحب.</div>
      </div>
    </div>
  </div>

  <div class="card section-gap">
    <div class="card-head">
      <div class="card-title">${icon('book')} لغة اللانشر</div>
      ${pill(isEn() ? 'English' : 'العربية', 'ok')}
    </div>
    <div class="card-pad">
      <div class="lang-choice">
        <button class="lang-option ${!isEn() ? 'active' : ''}" data-act="setLanguage" data-lang="ar"><b>العربية</b><span>RTL · لانشر عربي</span></button>
        <button class="lang-option ${isEn() ? 'active' : ''}" data-act="setLanguage" data-lang="en"><b>English</b><span>LTR · English UI</span></button>
      </div>
      <div class="hint small" style="margin-top:10px">اختر لغة الواجهة. التغيير ينطبق فوراً وينحفظ.</div>
    </div>
  </div>

  <div class="card section-gap">
    <div class="card-head">
      <div class="card-title">${icon('users')} Seamless Co-op — اللعب الجماعي</div>
      ${pill(st.seamless.ready ? 'جاهز للعب' : 'ناقص ملفات', st.seamless.ready ? 'ok' : 'warn')}
      ${st.seamless.version ? pill(`v${esc(st.seamless.version)}`, 'gold') : ''}
    </div>
    <div class="card-pad">
      <div class="hint small" style="margin-bottom:12px">${
        st.seamless.gameDir
          ? `مثبّت في: <span class="mono">${esc(st.seamless.gameDir)}</span>`
          : 'ما لقينا مجلد اللعبة — حدد مسار اللعبة فوق.'
      }</div>
      <div class="seamless-grid">
        <label class="seamless-field">
          <span class="setting-label">كلمة سر الكو-أوب</span>
          <span class="setting-sub">كلمة سر مشتركة — اللي ما يعرفها ما يقدر يدخل جلستكم.</span>
          <input class="input" id="seamlessPassword" data-setting="seamlessPassword" value="${esc(settings.seamlessPassword)}" placeholder="كلمة سر الجلسة" autocomplete="off" spellcheck="false" />
        </label>
        <label class="seamless-field">
          <span class="setting-label">اسم اللاعب</span>
          <span class="setting-sub">الاسم اللي يشوفه أصحابك فوق شخصيتك.</span>
          <input class="input" id="seamlessPlayerName" data-setting="seamlessPlayerName" value="${esc(settings.seamlessPlayerName)}" placeholder="اسمك" maxlength="32" autocomplete="off" />
        </label>
        <label class="seamless-field">
          <span class="setting-label">أقصى عدد لاعبين</span>
          <span class="setting-sub">حجم الحفلة اللي تفضّله — Seamless 2.x يستقبل حتى 127 لاعب.</span>
          <select class="input" id="seamlessMaxPlayers" data-setting="seamlessMaxPlayers">
            ${[2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 32, 64, 127]
              .filter((n) => n >= Number(settings.seamlessMaxPlayers) || [2, 3, 4, 5, 6, 8, 10, 16, 32, 64, 127].includes(n))
              .map((n) => `<option value="${n}" ${Number(settings.seamlessMaxPlayers) === n ? 'selected' : ''}>${n}</option>`)
              .join('')}
          </select>
        </label>
      </div>
      <div class="hint small" style="margin-top:10px">كلمة السر تُكتب في <span class="mono">[PASSWORD] cooppassword</span> داخل <span class="mono">seamlesscoop.ini</span>. والاسم يُكتب في <span class="mono">steam_emu.ini (UserName)</span>. كل شي ينحفظ تلقائياً.</div>
      <div class="scan-actions" style="margin-top:12px">
        <button class="btn btn-primary" data-act="testSeamless" ${S.seamless.testing ? 'disabled' : ''}>${icon('shield')} ${S.seamless.testing ? '...' : 'اختبار Seamless'}</button>
        <button class="btn" data-act="repairSeamless" ${S.seamless.repairing ? 'disabled' : ''}>${icon('download')} ${S.seamless.repairing ? 'نصلح Seamless…' : 'إصلاح / إعادة تثبيت'}</button>
        <button class="btn" data-act="openSeamlessIni">${icon('pencil')} فتح seamlesscoop.ini</button>
        <button class="btn btn-ghost" data-act="openGameDir">${icon('folder')} فتح مجلد اللعبة</button>
      </div>
      <div class="hint small" style="margin-top:8px">الإصلاح ينزّل نسخة رسمية جديدة من GitHub ويتحقق من سلامتها (SHA-256) ثم يعيد التثبيت — كلمة السر واسم اللاعب ينحفظان.</div>
      ${S.seamless.test ? seamlessReport(S.seamless.test) : ''}
    </div>
  </div>

  <div class="card section-gap">
    <div class="card-head">
      <div class="card-title">${icon('cpu')} تحسين الأداء — DLSS</div>
      ${pill(d.gpu.name, d.dlssSupported ? 'ok' : 'warn')}
    </div>
    <div class="card-pad">
      ${
        !d.dlssSupported
          ? `<div class="banner danger" style="margin-bottom:14px">${icon('alert')}<div><strong>كرتك ما يدعم DLSS</strong><br><span class="small">تقدر تختار «إيقاف» بس. باقي الخيارات تظهر لك عشان تعرف وش تسوي على كرت يدعم DLSS.</span></div></div>`
          : `<div class="hint" style="margin-bottom:14px">${esc(d.note)}</div>`
      }
      <div class="dlss-grid">
        ${d.modes.map((m) => dlssOption(m, settings.dlssMode === m.id, d.dlssSupported)).join('')}
      </div>
      <div class="setting-row frame-row">
        <div>
          <div class="setting-label">توليد فريمات — Frame Generation</div>
          <div class="setting-sub">${d.frameGenSupported ? d.frameGenNote : 'كرتك ما يدعم توليد الفريمات.'}</div>
        </div>
        <label class="switch ${d.frameGenSupported ? '' : 'disabled'}">
          <input type="checkbox" data-setting="frameGeneration" ${settings.frameGeneration ? 'checked' : ''} ${d.frameGenSupported ? '' : 'disabled'} />
          <span></span>
        </label>
      </div>
      <div class="tiny muted" style="margin-top:10px">${esc(d.gpu.name)} · الاختيار ينحفظ تلقائياً.</div>
    </div>
  </div>

  <div dir="ltr">${controllerCard()}</div>

  <div class="card section-gap">
    <div class="card-head"><div class="card-title">${icon('folder')} المجلدات</div></div>
    <div class="card-pad">
      <div class="setting-row">
        <div><div class="setting-label">بيانات اللانشر</div><div class="setting-sub mono">${esc(st.paths.userData)}</div></div>
        <button class="btn btn-sm" data-act="openUserData">فتح</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">مجلد المودات</div><div class="setting-sub mono">${esc(st.paths.modsRoot)}</div></div>
        <button class="btn btn-sm" data-act="openModsRoot">فتح</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">نسخ الحفظ</div><div class="setting-sub mono">${esc(st.paths.savesRoot)}</div></div>
        <button class="btn btn-sm" data-act="openSavesRoot">فتح</button>
      </div>
    </div>
  </div>

  <div class="card section-gap">
    <div class="card-head"><div class="card-title">${icon('wand')} أدوات إضافية</div></div>
    <div class="card-pad">
      <div class="setting-row">
        <div><div class="setting-label">التعديلات</div><div class="setting-sub">${cheatsOn} تعديل مفعّل من ${st.trainer.cheats.length} — أوفلاين بس</div></div>
        <button class="btn btn-sm" data-act="go" data-view="trainer">فتح</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">الشخصيات</div><div class="setting-sub">${st.characters.characters.length ? `${st.characters.characters.length} شخصية من حفظك` : 'ما لقينا شخصيات بعد'}</div></div>
        <button class="btn btn-sm" data-act="go" data-view="characters">فتح</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">مدير الحفظ والنسخ الاحتياطية</div><div class="setting-sub">نسخ واسترجاع آمن مع نسخة تلقائية قبل أي استرجاع</div></div>
        <button class="btn btn-sm" data-act="openSaves">فتح</button>
      </div>
    </div>
  </div>

  <div class="card section-gap">
    <div class="card-head"><div class="card-title">${icon('spark')} معالج الإعداد</div>${pill(settings.setupDone ? 'خلصت الإعداد' : 'لسى', settings.setupDone ? 'ok' : 'warn')}</div>
    <div class="card-pad">
      <div class="hint small" style="margin-bottom:12px">يرجع يفتح خطوات الإعداد: ربط اللعبة، كلمة سر Seamless، ووضع التشغيل. مفيد أول ما ترسل اللانشر لأخوياك.</div>
      <button class="btn btn-primary" data-act="openWizard">${icon('spark')} افتح معالج الإعداد</button>
    </div>
  </div>

  <div dir="ltr">${updatesCard()}</div>

  <div class="card section-gap">
    <div class="card-head"><div class="card-title">${icon('shield')} عن اللانشر</div>${pill(`v${esc(st.version)}`)}</div>
    <div class="card-pad">
      <div class="hint">لانشر أوفلاين بسيط. ما يتجاوز Easy Anti-Cheat ولا يحاول يخفي نفسه. التعديل أونلاين مسؤوليته على المستخدم.</div>
      <div class="setting-row">
        <div><div class="setting-label">تحذير قبل التعديل</div><div class="setting-sub">يظهر تنبيه الأوفلاين قبل أول تعديل</div></div>
        <label class="switch"><input type="checkbox" data-setting="warnOnline" ${settings.warnOnline ? 'checked' : ''} /><span></span></label>
      </div>
    </div>
  </div>`;
}

/* ---------------- friends & invites ---------------- */
const STATUS_META = {
  ingame: { label: 'In Game', cls: 'ingame' },
  menu: { label: 'Main Menu', cls: 'menu' },
  online: { label: 'Online', cls: 'online' },
  offline: { label: 'Offline', cls: 'offline' },
};

function socialInitial(name) {
  return String(name || 'T').trim().charAt(0).toUpperCase() || 'T';
}

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.offline;
}

function chatFriend() {
  return S.social?.friends?.find((friend) => friend.code === S.chatWith) || null;
}

function socialStats(stats) {
  const s = stats || {};
  return [
    { key: 'level', label: 'Level', value: s.level || 0 },
    { key: 'characters', label: 'Characters', value: s.characters || 0 },
    { key: 'mods', label: 'Mods', value: s.mods || 0 },
    { key: 'builds', label: 'Builds', value: s.builds || 0 },
  ];
}

function friendStatsLine(friend) {
  const stats = friend?.stats;
  if (!stats) return '';
  const bits = [];
  if (stats.level) bits.push(`Lv ${stats.level}`);
  if (stats.characters) bits.push(`${stats.characters} characters`);
  if (stats.mods) bits.push(`${stats.mods} mods`);
  if (stats.builds) bits.push(`${stats.builds} builds`);
  return bits.slice(0, 3).join(' · ');
}

function editProfileModal() {
  const me = S.social?.identity || {};
  openModal({
    title: 'Edit Profile',
    body: `<div class="profile-edit" dir="ltr">
      <label class="profile-field">
        <span class="profile-label">Display name</span>
        <input class="input" id="profileName" maxlength="28" value="${esc(me.name || '')}" placeholder="Tarnished" />
      </label>
      <label class="profile-field">
        <span class="profile-label">About me</span>
        <textarea class="input profile-textarea" id="profileAbout" maxlength="300" rows="4" placeholder="What do you play? Favourite build? Co-op hours?">${esc(me.about || '')}</textarea>
      </label>
      <div class="hint small">Shown on your friend card and in chat. Keep it short and friendly.</div>
      <div class="profile-stats-edit">
        ${socialStats(me.stats)
          .map((stat) => `<div class="me-stat ${stat.value ? '' : 'empty'}"><b>${stat.value || '—'}</b><span>${stat.label}</span></div>`)
          .join('')}
      </div>
      <div class="hint tiny">Stats update automatically from your save, characters, mods and builds.</div>
    </div>`,
    actions: [
      { label: 'Cancel', cls: 'btn-ghost' },
      {
        label: 'Save Profile',
        cls: 'btn-primary',
        onClick: async (btn) => {
          const name = String(document.getElementById('profileName')?.value || '').trim();
          const about = String(document.getElementById('profileAbout')?.value || '').trim();
          setBusy(btn, true);
          try {
            if (name && name !== (S.social?.identity?.name || '')) {
              S.social = await call('social.setName', { name }, { silent: true });
            }
            const result = await call('social.about', { text: about }, { silent: true });
            if (result.social) S.social = result.social;
            if (result.state) {
              S.state = result.state;
              S.version = S.state.version;
            }
            render();
            toast('Profile updated.', 'ok');
            return true;
          } catch (err) {
            toast(err.message, 'error');
            setBusy(btn, false);
            return false;
          }
        },
      },
    ],
  });
}

let friendSearchTimer = null;
function scheduleFriendSearch() {
  clearTimeout(friendSearchTimer);
  const query = String(S.addFriendQuery || '').trim();
  const matches = document.getElementById('addMatches');
  if (matches && query.length < 2) matches.innerHTML = '';
  friendSearchTimer = setTimeout(async () => {
    const value = String(S.addFriendQuery || '').trim();
    if (value.length < 2 || /^ER-/i.test(value) || /^https?:/i.test(value)) return;
    try {
      const results = await call('social.search', { query: value }, { silent: true });
      if (String(S.addFriendQuery || '').trim() !== value) return;
      S.addMatches = Array.isArray(results) ? results : [];
      const box = document.getElementById('addMatches');
      if (!box) return;
      box.innerHTML = S.addMatches.length
        ? S.addMatches.map(
            (match) => `<button class="add-match" data-act="addMatch" data-code="${esc(match.code)}">
              <span class="friend-avatar tiny">${socialInitial(match.name)}</span>
              <span class="add-match-main">
                <span class="add-match-name">${esc(match.name)}${match.level ? `<span class="friend-level">Lv ${match.level}</span>` : ''}</span>
                ${match.about ? `<span class="add-match-about">${esc(match.about)}</span>` : `<span class="mono tiny muted">${esc(match.code)}</span>`}
              </span>
              <span class="add-match-cta">${match.friend ? 'Friend' : match.outgoing ? 'Pending' : 'Add'}</span>
            </button>`
          ).join('')
        : `<div class="add-match-empty">No Tarnished online with that name. Add by friend code instead.</div>`;
    } catch {
      /* ignore search errors while typing */
    }
  }, 380);
}

function viewFriends() {
  const soc = S.social;
  if (!soc) {
    return `<div class="loading-screen"><span class="spinner"></span><div>Connecting to the relay…</div></div>`;
  }
  const friend = chatFriend();
  const incoming = soc.requests?.incoming || [];
  const outgoing = soc.requests?.outgoing || [];
  const friends = soc.friends || [];
  const me = soc.identity || {};
  const meStats = socialStats(me.stats);
  const settings = S.state?.settings || {};
  return `
  <div dir="ltr" class="social-view">
    <div class="social-head">
      <div>
        <div class="view-kicker">The Lands Between · Co-op</div>
        <h1 class="view-title social-title">Friends</h1>
        <div class="view-sub">Invite, join and chat without leaving the game. Steam-style, Seamless-ready.</div>
      </div>
      <div class="social-head-actions">
        <span class="relay-pill ${soc.connected ? 'on' : 'off'}"><i></i>${soc.connected ? 'Relay connected' : 'Connecting…'}</span>
        <button class="btn btn-primary" data-act="toggleAddFriend">${icon('plus')} Add Friend</button>
      </div>
    </div>

    <div class="social-layout">
      <section class="friends-panel">
        <div class="me-card">
          <div class="friend-avatar me">${socialInitial(me.name)}</div>
          <div class="me-main">
            <div class="me-name">${esc(me.name || 'Tarnished')}</div>
            <button class="code-chip" data-act="copyCode" title="Copy your friend code">${esc(me.code || '')} ${icon('copy')}</button>
            <div class="me-about">${me.about ? esc(me.about) : 'No bio yet — tell friends what you play.'}</div>
          </div>
          <button class="btn btn-sm" data-act="editProfile">${icon('pencil')} Edit Profile</button>
        </div>
        <div class="me-stats">
          ${meStats
            .map(
              (stat) => `<div class="me-stat ${stat.value ? '' : 'empty'}" title="${esc(stat.label)}">
                <b>${stat.value || '—'}</b><span>${esc(stat.label)}</span>
              </div>`
            )
            .join('')}
        </div>

        ${
          S.addFriendOpen
            ? `<div class="add-friend-box">
                <div class="add-friend-row">
                  <input class="input" id="addFriendInput" placeholder="Friend name or code — ER-XXXX-XXXX" value="${esc(S.addFriendQuery)}" maxlength="40" autocomplete="off" />
                  <button class="btn btn-primary" data-act="submitAddFriend">${icon('send')} Send</button>
                </div>
                <div class="add-matches" id="addMatches">${S.addMatches
                  .map(
                    (match) => `<button class="add-match" data-act="addMatch" data-code="${esc(match.code)}">
                      <span class="friend-avatar tiny">${socialInitial(match.name)}</span>
                      <span class="add-match-main">
                        <span class="add-match-name">${esc(match.name)}${match.level ? `<span class="friend-level">Lv ${match.level}</span>` : ''}</span>
                        ${match.about ? `<span class="add-match-about">${esc(match.about)}</span>` : `<span class="mono tiny muted">${esc(match.code)}</span>`}
                      </span>
                      <span class="add-match-cta">${match.friend ? 'Friend' : match.outgoing ? 'Pending' : 'Add'}</span>
                    </button>`
                  )
                  .join('')}</div>
                <div class="hint tiny">Add by friend code instantly, or type a name to search Tarnished online right now.</div>
              </div>`
            : ''
        }

        ${
          incoming.length || outgoing.length
            ? `<div class="request-block">
                <div class="block-label">Friend requests</div>
                ${incoming
                  .map(
                    (request) => `<div class="request-row">
                      <span class="friend-avatar tiny">${socialInitial(request.name)}</span>
                      <div class="request-main">
                        <div class="friend-name">${esc(request.name)}</div>
                        <div class="friend-activity">wants to be friends</div>
                      </div>
                      <button class="btn btn-sm btn-primary" data-act="acceptRequest" data-code="${esc(request.code)}">Accept</button>
                      <button class="btn btn-sm btn-ghost" data-act="declineRequest" data-code="${esc(request.code)}">Decline</button>
                    </div>`
                  )
                  .join('')}
                ${outgoing
                  .map(
                    (request) => `<div class="request-row pending">
                      <span class="friend-avatar tiny">${socialInitial(request.name)}</span>
                      <div class="request-main">
                        <div class="friend-name">${esc(request.name)}</div>
                        <div class="friend-activity">Request sent — waiting for them</div>
                      </div>
                      <span class="pending-pill">Pending</span>
                    </div>`
                  )
                  .join('')}
              </div>`
            : ''
        }

        <div class="friends-list">
          <div class="block-label">Friends · ${friends.length}</div>
          ${
            friends.length
              ? friends
                  .map((item) => {
                    const meta = statusMeta(item.status);
                    return `<div class="friend-row ${meta.cls}">
                      <div class="friend-avatar">${socialInitial(item.name)}<i class="presence ${meta.cls}"></i></div>
                      <div class="friend-main">
                        <div class="friend-name">${esc(item.name)}${item.stats?.level ? `<span class="friend-level">Lv ${item.stats.level}</span>` : ''}</div>
                        <div class="friend-activity">${esc(item.activity || (item.status === 'offline' ? 'Offline' : 'In the launcher'))}</div>
                      </div>
                      <span class="status-label ${meta.cls}">${meta.label}</span>
                      <div class="friend-actions">
                        <button class="btn btn-sm ${item.status === 'offline' ? 'is-disabled' : ''}" data-act="inviteFriend" data-code="${esc(item.code)}" ${item.status === 'offline' ? 'disabled' : ''}>Invite</button>
                        <button class="btn btn-sm ${item.status === 'offline' ? 'is-disabled' : ''}" data-act="joinFriend" data-code="${esc(item.code)}" ${item.status === 'offline' ? 'disabled' : ''}>Join</button>
                        <button class="btn btn-sm btn-ghost" data-act="chatFriend" data-code="${esc(item.code)}">Chat${item.unread ? `<span class="unread-dot">${item.unread}</span>` : ''}</button>
                      </div>
                    </div>`;
                  })
                  .join('')
              : `<div class="social-empty">
                  ${icon('friends')}
                  <div class="empty-title">No Tarnished yet</div>
                  <div class="empty-sub">Share your code <span class="mono">${esc(soc.identity?.code || '')}</span> or add a friend by name.</div>
                </div>`
          }
        </div>

        <div class="social-prefs">
          <div class="pref-label">${icon('bell')} Notifications</div>
          <div class="pref-row">
            <div>
              <div class="pref-name">In-game popups</div>
              <div class="pref-sub">Invites, requests and messages appear over Elden Ring</div>
            </div>
            <label class="switch"><input type="checkbox" data-setting="notifyPopups" ${settings.notifyPopups !== false ? 'checked' : ''} /><span></span></label>
          </div>
          <div class="pref-row">
            <div>
              <div class="pref-name">Notification sound</div>
              <div class="pref-sub">A soft chime when a Tarnished reaches out</div>
            </div>
            <label class="switch"><input type="checkbox" data-setting="notifySound" ${settings.notifySound !== false ? 'checked' : ''} /><span></span></label>
          </div>
        </div>
      </section>

      ${
        friend
          ? `<aside class="chat-panel">
              <div class="chat-head">
                <div class="friend-avatar">${socialInitial(friend.name)}<i class="presence ${statusMeta(friend.status).cls}"></i></div>
                <div class="chat-head-main">
                  <div class="friend-name">${esc(friend.name)}${friend.stats?.level ? `<span class="friend-level">Lv ${friend.stats.level}</span>` : ''}</div>
                  <div class="friend-activity">${esc(friend.activity || statusMeta(friend.status).label)}</div>
                </div>
                <button class="btn btn-icon btn-ghost" data-act="closeChat" aria-label="Close chat">${icon('x')}</button>
              </div>
              ${
                friend.about || friend.stats
                  ? `<div class="chat-profile">
                      ${friend.about ? `<div class="chat-about">${esc(friend.about)}</div>` : ''}
                      ${
                        friendStatsLine(friend)
                          ? `<div class="chat-stats-line">${icon('shield')} <span>${esc(friendStatsLine(friend))}</span></div>`
                          : ''
                      }
                    </div>`
                  : ''
              }
              <div class="chat-body" id="chatBody">
                ${(friend.messages || []).length
                  ? friend.messages
                      .map(
                        (message) => `<div class="chat-bubble ${message.from === 'me' ? 'mine' : 'theirs'}">
                          <div class="bubble-text">${esc(message.text)}</div>
                          <div class="bubble-time">${fmtTime(message.at)}</div>
                        </div>`
                      )
                      .join('')
                  : `<div class="chat-empty">Say hello to ${esc(friend.name)}. Messages arrive in-game too.</div>`}
              </div>
              <div class="chat-compose">
                <input class="input" id="chatInput" placeholder="Write a message…" maxlength="2000" value="${esc(S.chatDraft)}" autocomplete="off" />
                <button class="btn btn-primary" data-act="sendChat">${icon('send')}</button>
              </div>
            </aside>`
          : `<aside class="social-side">
              <div class="social-side-art">${icon('friends')}</div>
              <div class="social-side-title">Your co-op hub</div>
              <div class="social-side-text">Pick a friend to open the chat. Invites and messages reach you inside Elden Ring through the overlay.</div>
              <div class="social-tip"><b>Tip</b> Share your friend code once — after that, invites are one click.</div>
              <div class="social-side-code">
                <span>Your friend code</span>
                <button class="code-chip" data-act="copyCode">${esc(soc.identity?.code || '')} ${icon('copy')}</button>
              </div>
            </aside>`
      }
    </div>
  </div>`;
}

/* ---------------- best builds ---------------- */
function buildImagePath(image) {
  const clean = String(image || 'assets/builds/bleed.jpg').replace(/^\/+/, '');
  return `../../${clean}`;
}

function statName(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

const BUILD_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'beginner', label: 'Beginner Friendly' },
  { id: 'strongest', label: 'Strongest' },
  { id: 'pvp', label: 'PvP' },
  { id: 'boss', label: 'Boss Killer' },
  { id: 'fun', label: 'Fun' },
];

function buildTypes(build) {
  return Array.isArray(build.types) ? build.types : [];
}

function buildCard(build) {
  const types = buildTypes(build).join(' ');
  const search = `${build.name || ''} ${build.role || ''} ${(build.weapon || []).map((item) => item.name).join(' ')} ${build.tagline || ''}`.toLowerCase();
  const rating = Number(build.rating);
  return `<article class="build-card" data-act="openBuild" data-id="${esc(build.id)}" data-build-card data-types="${esc(types)}" data-search="${esc(search)}" style="--accent:${esc(build.accent || '#c9a86a')}">
    <div class="build-art">
      <img src="${esc(buildImagePath(build.image))}" alt="${esc(build.name)}" loading="lazy" />
      <div class="build-art-shade"></div>
      <span class="build-role">${esc(build.role || 'Build')}</span>
      ${build.saved ? '<span class="build-saved">My Build</span>' : ''}
      <div class="build-power"><b>${esc(build.power ?? '—')}</b><span>/10</span></div>
      ${Number.isFinite(rating) ? `<div class="build-rating">${icon('star')}<b>${rating.toFixed(1)}</b><span>/5</span></div>` : ''}
    </div>
    <div class="build-body">
      <h3>${esc(build.name)}</h3>
      <p>${esc(build.tagline || '')}</p>
      <div class="build-chips">
        ${(build.weapon || []).slice(0, 2).map((item) => `<span>${esc(item.name)}</span>`).join('')}
      </div>
      <div class="build-open">View build ${icon('chevron')}</div>
    </div>
  </article>`;
}

function viewBuilds() {
  if (!S.builds) {
    return `<div class="loading-screen"><span class="spinner"></span><div>Forging builds…</div></div>`;
  }
  const all = S.builds.builds || [];
  const curated = all.filter((build) => !build.saved);
  const mine = all.filter((build) => build.saved);
  const filters = BUILD_FILTERS.map(
    (item) => `<button class="build-filter ${S.buildFilter === item.id ? 'on' : ''}" data-act="buildFilter" data-filter="${esc(item.id)}">${esc(item.label)}</button>`
  ).join('');
  return `
  <div dir="ltr" class="builds-view">
    <div class="social-head">
      <div>
        <div class="view-kicker">The Lands Between · Meta</div>
        <h1 class="view-title social-title">Best Builds</h1>
        <div class="view-sub">${curated.length} end-game loadouts with full gear, stats and where to find every item. One click applies the build to a character.</div>
      </div>
      <div class="social-head-actions">
        <span class="relay-pill" id="buildCount">${all.length} builds</span>
        ${mine.length ? `<span class="relay-pill on"><i></i>${mine.length} saved build${mine.length === 1 ? '' : 's'}</span>` : ''}
        <button class="btn btn-primary" data-act="myBuilds">${icon('bookmark')} My Builds</button>
      </div>
    </div>
    <div class="build-toolbar">
      <div class="build-filters">${filters}</div>
      <label class="build-search">
        ${icon('search')}
        <input class="input" id="buildSearch" value="${esc(S.buildQuery)}" placeholder="Search builds, weapons, roles…" spellcheck="false" />
      </label>
    </div>
    <div class="build-grid">${curated.map(buildCard).join('')}</div>
    <div class="build-empty" id="buildEmpty" style="display:none">No builds match that filter. Try another type or clear the search.</div>
    ${mine.length ? `<div class="build-section-label" id="buildMineLabel">My Builds</div><div class="build-grid" id="buildMineGrid">${mine.map(buildCard).join('')}</div>` : ''}
  </div>`;
}

function viewBuildDetail() {
  const build = (S.builds?.builds || []).find((item) => item.id === S.buildDetail);
  if (!build) return viewBuilds();
  const stats = build.stats || {};
  const level = build.level || Object.values(stats).reduce((sum, value) => sum + (Number(value) || 0), 0) - 79;
  return `
  <div dir="ltr" class="build-detail" style="--accent:${esc(build.accent || '#c9a86a')}">
    <button class="btn btn-ghost btn-sm build-back" data-act="backBuilds">${icon('arrowLeft')} All builds</button>
    <div class="build-hero">
      <div class="build-hero-art"><img src="${esc(buildImagePath(build.image))}" alt="${esc(build.name)}" /></div>
      <div class="build-hero-shade"></div>
      <div class="build-hero-body">
        <div class="build-hero-meta">
          <span class="build-role solid">${esc(build.role || 'Build')}</span>
          ${build.saved ? '<span class="build-saved solid">My Build</span>' : ''}
          ${Number.isFinite(Number(build.rating)) ? `<span class="build-level">${icon('star')} ${Number(build.rating).toFixed(1)}/5</span>` : ''}
          <span class="build-level">Level ${esc(level)}</span>
        </div>
        <h1>${esc(build.name)}</h1>
        <div class="build-powerline">${icon('star')} <b>${esc(build.power ?? '—')}/10</b> <span>${esc(build.tagline || '')}</span></div>
        <p class="build-desc">${esc(build.description || '')}</p>
      </div>
    </div>

    <div class="build-detail-grid">
      <div class="build-panel">
        <div class="block-label">Attributes</div>
        <div class="stat-grid">
          ${['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane']
            .map(
              (key) => `<div class="stat-cell">
                <span>${statName(key)}</span>
                <b>${esc(stats[key] ?? 10)}</b>
              </div>`
            )
            .join('')}
        </div>
        <div class="stat-total">Rune level <b>${esc(level)}</b></div>
        <div class="block-label" style="margin-top:18px">Playstyle</div>
        <p class="build-playstyle">${esc(build.playstyle || '')}</p>
      </div>

      <div class="build-panel">
        <div class="block-label">Required gear</div>
        ${[
          ['Weapon', build.weapon],
          ['Armor', build.armor],
          ['Talismans', build.talismans],
          ['Spells', build.spells],
        ]
          .map(
            ([label, items]) => `<div class="gear-group">
              <div class="gear-label">${label}</div>
              <div class="gear-list">${
                (items || []).length
                  ? items
                      .map(
                        (item) => `<div class="gear-item"><span>${esc(item.name)}</span>${item.note ? `<em>${esc(item.note)}</em>` : ''}</div>`
                      )
                      .join('')
                  : '<div class="gear-item muted">None</div>'
              }</div>
            </div>`
          )
          .join('')}
      </div>
    </div>

    <div class="build-actions">
      <button class="btn" data-act="howToGet" data-id="${esc(build.id)}">${icon('map')} How to Get It</button>
      <button class="btn btn-primary btn-lg" data-act="takeBuild" data-id="${esc(build.id)}">${icon('gift')} Take This Build</button>
      ${
        build.saved
          ? `<button class="btn btn-ghost" data-act="editBuild" data-id="${esc(build.id)}">${icon('pencil')} Edit</button>
             <button class="btn btn-ghost btn-danger" data-act="deleteBuild" data-id="${esc(build.id)}">${icon('trash')} Delete</button>`
          : `<button class="btn btn-ghost" data-act="saveBuild" data-id="${esc(build.id)}">${icon('bookmark')} Save as My Build</button>`
      }
    </div>
    <div class="build-legal">Take This Build applies attributes and level live through the launcher's verified memory bridge, and stores the full loadout on the character.</div>
  </div>`;
}

/* ---------------- build dialogs ---------------- */
function openTakeBuild(buildId) {
  const build = (S.builds?.builds || []).find((item) => item.id === buildId);
  if (!build) return;
  const roster = S.builds?.characters?.characters || [];
  if (!roster.length) {
    toast('No characters found. Load a save first so the launcher can read your slots.', 'error');
    return;
  }
  S.buildApply = { buildId, characterId: roster.find((c) => c.active)?.id || roster[0].id };
  openModal({
    title: `Take ${esc(build.name)}`,
    wide: true,
    body: `<div class="take-build">
      <div class="take-sub">Choose the character that will receive this build.</div>
      <div class="take-chars" data-take-chars>
        ${roster
          .map(
            (character) => `<button class="take-char ${S.buildApply.characterId === character.id ? 'active' : ''}" data-take-char="${esc(character.id)}">
              <span class="take-char-avatar">${socialInitial(character.name)}</span>
              <span class="take-char-main">
                <span class="take-char-name">${esc(character.name)}</span>
                <span class="take-char-meta">Slot ${esc(character.slot)}${character.level ? ` · Level ${esc(character.level)}` : ''}${character.active ? ' · In-game' : ''}</span>
              </span>
              <span class="take-check">${icon('check')}</span>
            </button>`
          )
          .join('')}
      </div>
      <div class="take-note">${icon('shieldCheck')} Attributes and level are written live when you're connected. The weapon, armor, talisman and spell loadout is saved on this character in the launcher.</div>
    </div>`,
    actions: [
      { label: 'Cancel', cls: 'btn-ghost' },
      {
        label: 'Confirm',
        cls: 'btn-primary',
        onClick: async (btn) => {
          const target = S.buildApply;
          if (!target) return false;
          setBusy(btn, true);
          try {
            const result = await call('builds.apply', { buildId: target.buildId, characterId: target.characterId });
            if (result.state) {
              S.state = result.state;
              S.version = S.state.version;
            }
            S.builds = await call('builds.list', {}, { silent: true });
            S.buildDetail = '';
            closeModal();
            openBuildSuccess(result, build);
            return false;
          } catch (err) {
            toast(err.message, 'error');
            setBusy(btn, false);
            return false;
          }
        },
      },
    ],
  });
  const root = document.getElementById('modalRoot');
  root.querySelectorAll('[data-take-char]').forEach((button) => {
    button.addEventListener('click', () => {
      S.buildApply.characterId = button.dataset.takeChar;
      root.querySelectorAll('[data-take-char]').forEach((node) => node.classList.toggle('active', node === button));
    });
  });
}

function openBuildSuccess(result, build) {
  openModal({
    title: 'Build Added Successfully',
    body: `<div class="build-success" dir="ltr">
      <div class="success-ring">${icon('check')}</div>
      <div class="success-title">${esc(build.name)} is ready</div>
      <div class="success-line">Applied to <b>${esc(result.character?.name || 'your character')}</b> · Level ${esc(result.level)}</div>
      <div class="success-meta">
        ${
          result.live
            ? 'Attributes and level were written into the live game.'
            : 'Attributes are queued and apply the moment the launcher connects to a loaded character.'
        }
        <br />Weapon, armor, talismans and spells are stored on the character loadout.
      </div>
    </div>`,
    actions: [
      {
        label: 'Back to Characters',
        cls: 'btn-primary',
        onClick: () => {
          go('characters');
          return true;
        },
      },
    ],
  });
}

function openHowToGet(buildId) {
  const build = (S.builds?.builds || []).find((item) => item.id === buildId);
  if (!build) return;
  openModal({
    title: `${build.name} — How to Get It`,
    wide: true,
    body: `<div class="howto">
      <div class="block-label">Step by step</div>
      <ol class="howto-steps">${(build.howTo || []).map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
      <div class="block-label" style="margin-top:18px">Piece by piece</div>
      <div class="howto-table">
        ${(build.acquisition || [])
          .map(
            (row) => `<div class="howto-row">
              <div class="howto-item">${esc(row.item)}</div>
              <div class="howto-place"><span>${esc(row.location)}</span><em>${esc(row.boss)}</em></div>
              <div class="howto-how">${esc(row.how)}</div>
            </div>`
          )
          .join('')}
      </div>
    </div>`,
    actions: [{ label: 'Close', cls: 'btn-ghost' }],
  });
}

function openBuildEditor(build) {
  const isNew = !build?.saved;
  const stats = build?.stats || { vigor: 60, mind: 20, endurance: 25, strength: 20, dexterity: 20, intelligence: 20, faith: 20, arcane: 20 };
  S.buildEditor = { id: build?.id || '', baseId: isNew ? build?.id : build?.baseId || '' };
  openModal({
    title: isNew ? 'Save as My Build' : 'Edit My Build',
    wide: true,
    body: `<div class="build-editor">
      <label class="setting-label">Build name</label>
      <input class="input" id="buildName" maxlength="40" value="${esc(isNew ? `${build?.name || 'My Build'} — Mine` : build?.name || '')}" />
      <label class="setting-label" style="margin-top:14px">Description</label>
      <textarea class="input" id="buildDescription" rows="3" maxlength="900">${esc(build?.description || '')}</textarea>
      <div class="block-label" style="margin-top:18px">Attributes</div>
      <div class="editor-stats">
        ${['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane']
          .map(
            (key) => `<label class="editor-stat"><span>${statName(key)}</span><input class="input" id="stat-${key}" type="number" min="1" max="99" value="${esc(stats[key] ?? 20)}" /></label>`
          )
          .join('')}
      </div>
      <div class="hint tiny">Gear, talismans and spells are copied from the base build. Name it, tune the stats, and save.</div>
    </div>`,
    actions: [
      { label: 'Cancel', cls: 'btn-ghost' },
      {
        label: 'Save Build',
        cls: 'btn-primary',
        onClick: async () => {
          const root = document.getElementById('modalRoot');
          const name = root.querySelector('#buildName').value.trim();
          if (!name) {
            toast('Give your build a name.', 'error');
            return false;
          }
          const nextStats = {};
          for (const key of ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane']) {
            nextStats[key] = Math.max(1, Math.min(99, Number(root.querySelector(`#stat-${key}`).value) || 10));
          }
          const result = await call('builds.save', {
            build: {
              ...S.buildEditor,
              name,
              description: root.querySelector('#buildDescription').value,
              stats: nextStats,
            },
          });
          S.builds = { ...(S.builds || {}), builds: result.builds, applied: result.applied };
          S.buildDetail = result.build?.id || S.buildDetail;
          render();
          toast('Build saved.', 'ok');
          return true;
        },
      },
    ],
  });
}

/* ---------------- updates ---------------- */
function fmtBytesShort(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function showUpdateModal(update) {
  if (!update || !update.available) return;
  S.updatePrompted = update.latest;
  openModal({
    title: `New Update Available — v${esc(update.latest)}`,
    wide: true,
    body: `<div class="update-modal" dir="ltr">
      <div class="update-version"><span>v${esc(update.current)}</span>${icon('arrowLeft')}<b>v${esc(update.latest)}</b></div>
      <div class="update-changes">${(update.notes || []).map((note) => `<div class="update-note">${icon('check')}<span>${esc(note)}</span></div>`).join('')}</div>
      <div class="update-meta">
        Official package from GitHub Releases${update.bytes || update.lastResult?.bytes ? ` (${fmtBytesShort(update.bytes || update.lastResult.bytes)})` : ''} — its SHA-256 checksum is verified before anything is installed.
        Your settings, characters, friends, builds and saves are preserved.
      </div>
      <div id="updateModalProgress"></div>
    </div>`,
    actions: [
      { label: 'Later', cls: 'btn-ghost' },
      {
        label: 'Update Now',
        cls: 'btn-primary',
        onClick: async (btn) => {
          setBusy(btn, true);
          try {
            await call('updates.download');
            S.updates = await call('updates.state', {}, { silent: true });
            toast('Update downloaded and verified. Restarting to install…', 'ok');
            await call('updates.install', {}, { silent: true }).catch(() => {});
            return true;
          } catch (err) {
            toast(err.message, 'error');
            setBusy(btn, false);
            return false;
          }
        },
      },
    ],
  });
}

function updateModalProgress(u) {
  const mount = document.getElementById('updateModalProgress');
  if (!mount) return;
  if (!u || u.status !== 'downloading') {
    mount.innerHTML = '';
    return;
  }
  const pct = Math.max(0, Math.min(100, Number(u.progress) || 0));
  const size = u.totalBytes ? ` (${fmtBytesShort(u.downloadedBytes || 0)} / ${fmtBytesShort(u.totalBytes)})` : '';
  mount.innerHTML = `<div class="setting-sub" style="margin:12px 0 6px">Downloading from GitHub… ${pct}%${size}</div>
    <div style="height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#c8a24a,#e6c877);transition:width .2s"></div>
    </div>`;
}

function controllerCard() {
  const c = S.state?.controller;
  if (!c) return '';
  const statusPill =
    c.status === 'ready'
      ? pill('Ready', 'ok')
      : c.status === 'needs-setup'
        ? pill('Optional setup', 'warn')
        : c.status === 'error'
          ? pill('Scan failed', 'warn')
          : c.status === 'unsupported'
            ? pill('Windows only', 'warn')
            : pill('Not detected', 'warn');
  const pads = (c.controllers || [])
    .map(
      (pad) => `<div class="setting-row">
        <div>
          <div class="setting-label">${esc(pad.modelLabel)}</div>
          <div class="setting-sub">${esc(pad.connectionLabel)} · ${esc(pad.name)}</div>
        </div>
        ${pill(pad.recognized ? 'Recognized by Windows' : 'Windows reports a problem', pad.recognized ? 'ok' : 'warn')}
      </div>`
    )
    .join('');
  const env = `<div class="controller-env" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
      ${pill(c.vigem ? 'ViGEmBus installed' : 'ViGEmBus not installed', c.vigem ? 'ok' : '')}
      ${pill(c.ds4windows ? 'DS4Windows running' : 'DS4Windows not running', c.ds4windows ? 'ok' : '')}
      ${pill(c.steam ? 'Steam running' : 'Steam not running', c.steam ? 'ok' : '')}
    </div>`;
  const guidance = (c.guidance || [])
    .map((line) => `<div class="hint small" style="margin-top:8px">${esc(line)}</div>`)
    .join('');
  return `<div class="card section-gap" id="controllerCard">
    <div class="card-head">
      <div class="card-title">${icon('gamepad')} Controller Support — PS4 / PS5</div>
      ${statusPill}
    </div>
    <div class="card-pad">
      <div class="setting-label" style="margin-bottom:6px">${esc(c.headline)}</div>
      ${pads}
      ${env}
      ${guidance}
      <div class="setting-row" style="margin-top:14px">
        <div><div class="setting-label">Re-scan controllers</div><div class="setting-sub">Connect a pad by USB or pair it over Bluetooth, then refresh.</div></div>
        <button class="btn" data-act="refreshController">${icon('refresh')} Refresh</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">DS4Windows (optional)</div><div class="setting-sub">Free, open-source. Maps a PlayStation pad to a virtual Xbox pad for direct launch. The launcher never installs it for you.</div></div>
        <button class="btn ${c.needsSoftware ? 'btn-primary' : ''}" data-act="openDs4Windows">${icon('link')} Official download</button>
      </div>
      <div class="tiny muted" style="margin-top:10px">${esc(c.note)}</div>
    </div>
  </div>`;
}

function updatesCard() {
  const u = S.updates || S.state?.updates || {};
  const available = !!u.available;
  const downloading = u.status === 'downloading';
  const pct = Math.max(0, Math.min(100, Number(u.progress) || 0));
  const repo = S.state.settings.updateRepo || u.repo || '';
  const progressBar = (percent, bytes, total) => `<div style="height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden">
      <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,#c8a24a,#e6c877);transition:width .2s"></div>
    </div>${total ? `<div class="setting-sub" style="margin-top:6px">${fmtBytesShort(bytes || 0)} / ${fmtBytesShort(total)}</div>` : ''}`;
  return `<div class="card section-gap" id="updatesCard">
    <div class="card-head">
      <div class="card-title">${icon('cloud')} Updates</div>
      ${pill(`v${esc(S.version)}`, 'gold')}
      ${available ? pill(`v${esc(u.latest)} ready`, 'ok') : ''}
    </div>
    <div class="card-pad">
      <div class="update-row">
        <div>
          <div class="setting-label">Version ${esc(S.version)}</div>
          <div class="setting-sub">${u.checkedAt ? `Last checked ${esc(new Date(u.checkedAt).toLocaleTimeString(dateLocale()))}` : 'Automatic check runs when the launcher opens.'}</div>
        </div>
        <button class="btn btn-primary" data-act="checkUpdates">${icon('refresh')} Check for Updates</button>
      </div>
      ${
        downloading
          ? `<div class="update-progress" style="margin-top:12px">
              <div class="setting-label" style="margin-bottom:6px">Downloading v${esc(u.latest)} from GitHub… ${pct}%</div>
              ${progressBar(pct, u.downloadedBytes, u.totalBytes)}
            </div>`
          : ''
      }
      ${
        available
          ? `<div class="update-available-box">
              <div><b>v${esc(u.latest)}</b> is available on GitHub${u.lastResult?.bytes ? ` (${fmtBytesShort(u.lastResult.bytes)})` : ''}.</div>
              <button class="btn btn-primary btn-sm" data-act="updateNow">${icon('download')} Update Now</button>
            </div>
            ${(u.notes || []).length ? `<ul class="update-notes">${u.notes.map((note) => `<li>${esc(note)}</li>`).join('')}</ul>` : ''}`
          : u.status === 'error'
            ? `<div class="banner danger" style="margin-top:12px">${icon('alert')}<div>${esc(u.error || 'Could not reach GitHub.')}</div></div>`
            : ''
      }
      <div class="setting-row" style="margin-top:14px">
        <div><div class="setting-label">Check automatically</div><div class="setting-sub">Check GitHub Releases for a new version every time the launcher opens.</div></div>
        <label class="switch"><input type="checkbox" data-setting="autoUpdate" ${S.state.settings.autoUpdate ? 'checked' : ''} /><span></span></label>
      </div>
      <label class="update-feed">
        <span class="setting-label">GitHub repository</span>
        <span class="setting-sub">Official update source — GitHub Releases. Set it once; every future release is detected automatically.</span>
        <div class="update-feed-row">
          <input class="input mono" id="updateRepoInput" value="${esc(repo)}" placeholder="owner/repository" spellcheck="false" />
          <button class="btn" data-act="saveUpdateRepo">Save</button>
        </div>
      </label>
      <div class="hint tiny">Updates download the release package from GitHub, verify its SHA-256 checksum, then install and relaunch. Your settings, characters, friends, builds and saves are never touched.</div>
    </div>
  </div>`;
}

function fmtTime(value) {
  const date = new Date(Number(value) || value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
}

function scrollChat() {
  const body = document.getElementById('chatBody');
  if (body) body.scrollTop = body.scrollHeight;
}

function render() {
  const mount = document.getElementById('viewMount');
  if (!S.state) {
    mount.innerHTML = `<div class="loading-screen"><span class="spinner"></span><div>نجهّز الشجرة…</div></div>`;
    return;
  }
  const views = {
    home: viewHome,
    friends: viewFriends,
    builds: viewBuilds,
    buildDetail: viewBuildDetail,
    trainer: viewTrainer,
    characters: viewCharacters,
    characterDetail: viewCharacterDetail,
    saves: viewSaves,
    mysaves: viewMySaves,
    unlocks: viewUnlocks,
    mods: viewMods,
    settings: viewSettings,
  };
  mount.innerHTML = (views[currentView()] || viewHome)();
  updateChrome();
  const main = document.getElementById('main');
  if (main) main.scrollTop = S.scroll[S.view] || 0;
  filterCharacterDom();
  filterBuildsDom();
  if (S.view === 'friends' && S.chatWith) scrollChat();
}

function filterBuildsDom() {
  const query = S.buildQuery.trim().toLowerCase();
  const filter = S.buildFilter || 'all';
  const cards = [...document.querySelectorAll('[data-build-card]')];
  let visible = 0;
  cards.forEach((card) => {
    const okType = filter === 'all' || (card.dataset.types || '').split(' ').includes(filter);
    const okText = !query || (card.dataset.search || '').includes(query);
    const show = okType && okText;
    card.style.display = show ? '' : 'none';
    if (show) visible += 1;
  });
  const empty = document.getElementById('buildEmpty');
  if (empty) empty.style.display = cards.length && !visible ? '' : 'none';
  const count = document.getElementById('buildCount');
  if (count) count.textContent = `${visible} build${visible === 1 ? '' : 's'}`;
  const mineGrid = document.getElementById('buildMineGrid');
  const mineLabel = document.getElementById('buildMineLabel');
  if (mineGrid) {
    const mineShown = [...mineGrid.querySelectorAll('[data-build-card]')].some((card) => card.style.display !== 'none');
    mineGrid.style.display = mineShown ? '' : 'none';
    if (mineLabel) mineLabel.style.display = mineShown ? '' : 'none';
  }
}

function filterCharacterDom() {
  const query = S.charQuery.trim().toLowerCase();
  const cards = document.querySelectorAll('.character-card');
  let visible = 0;
  cards.forEach((card) => {
    const match = !query || (card.dataset.charName || '').includes(query);
    card.style.display = match ? '' : 'none';
    if (match) visible += 1;
  });
  const empty = document.getElementById('charEmpty');
  if (empty) empty.style.display = cards.length && !visible ? '' : 'none';
}

function go(view) {
  if (!S.state) return;
  S.scroll[S.view] = document.getElementById('main').scrollTop;
  S.view = view;
  S.detail = null;
  S.savesOpen = false;
  S.buildDetail = '';
  if (view !== 'friends') {
    S.chatWith = '';
    S.addFriendOpen = false;
    S.addMatches = [];
  }
  render();
  if (view === 'mods') loadWorkshop();
  if (view === 'friends') loadSocial();
  if (view === 'builds') loadBuilds();
  call('social.activity', { view }, { silent: true }).catch(() => {});
  refreshState()
    .then(() => {
      if (S.view === view && !S.detail && !S.savesOpen) render();
    })
    .catch(() => {});
}

async function loadSocial({ keepFocus = false } = {}) {
  const activeId = keepFocus ? document.activeElement?.id : '';
  let caret = 0;
  if (activeId) {
    try {
      caret = document.activeElement.selectionStart || 0;
    } catch {
      caret = 0;
    }
  }
  try {
    S.social = await call('social.state', {}, { silent: true });
  } catch (err) {
    toast(err.message, 'error');
    return;
  }
  if (S.view === 'friends') render();
  else updateChrome();
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        /* not a text input */
      }
    }
  }
}

async function loadBuilds({ fresh = false } = {}) {
  if (S.builds && !fresh) return S.builds;
  try {
    S.builds = await call('builds.list', {}, { silent: true });
  } catch (err) {
    toast(err.message, 'error');
    return null;
  }
  if (S.view === 'builds') render();
  return S.builds;
}

async function refreshState() {
  S.state = await call('state', {}, { silent: true });
  S.version = S.state.version;
  return S.state;
}

async function updateStateFrom(payload, { rerender = true } = {}) {
  if (payload?.state) {
    S.state = payload.state;
    S.version = S.state.version;
  } else {
    await refreshState();
  }
  if (rerender) render();
}

/* ---------------- actions ---------------- */
async function actionSwitch(act, el) {
  switch (act) {
    case 'go': {
      go(el.dataset.view);
      return true;
    }
    case 'toggleAddFriend': {
      S.addFriendOpen = !S.addFriendOpen;
      S.addMatches = [];
      render();
      setTimeout(() => document.getElementById('addFriendInput')?.focus(), 60);
      return true;
    }
    case 'submitAddFriend': {
      const input = document.getElementById('addFriendInput');
      const query = String(input?.value || S.addFriendQuery || '').trim();
      if (!query) {
        toast('Type a friend name or their code.', 'info');
        return true;
      }
      setBusy(el, true);
      try {
        const result = await call('social.add', { query }, { silent: true });
        S.addFriendQuery = query;
        if (result.mode === 'matches') {
          S.addMatches = result.matches || [];
          render();
          return true;
        }
        if (result.mode === 'sent') {
          S.addFriendOpen = false;
          S.addFriendQuery = '';
          S.addMatches = [];
          toast(`Friend request sent to ${result.code}.`, 'ok');
        } else {
          S.addMatches = [];
          toast(result.message || 'No Tarnished found with that name.', 'info');
        }
        if (result.social) S.social = result.social;
        render();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'addMatch': {
      setBusy(el, true);
      try {
        const result = await call('social.add', { query: el.dataset.code }, { silent: true });
        if (result.social) S.social = result.social;
        S.addMatches = [];
        S.addFriendOpen = false;
        toast('Friend request sent.', 'ok');
        render();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'editProfile': {
      editProfileModal();
      return true;
    }
    case 'renameSelf': {
      const current = S.social?.identity?.name || 'Tarnished';
      const name = await promptModal({
        title: 'Your friend name',
        label: 'Display name',
        value: current,
        placeholder: 'Tarnished',
        okLabel: 'Save',
        hint: 'This is the name your friends see in their list and on invites.',
      });
      if (!name) return true;
      try {
        S.social = await call('social.setName', { name });
        render();
        toast('Name updated.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      }
      return true;
    }
    case 'copyCode': {
      const code = S.social?.identity?.code || '';
      try {
        await navigator.clipboard.writeText(code);
        toast(`Friend code ${code} copied.`, 'ok');
      } catch {
        toast(code, 'info');
      }
      return true;
    }
    case 'inviteFriend': {
      setBusy(el, true);
      try {
        const result = await call('social.invite', { code: el.dataset.code }, { silent: true });
        toast(`Invite sent to ${result.name}. It pops up in-game.`, 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'joinFriend': {
      setBusy(el, true);
      try {
        const result = await call('social.join', { code: el.dataset.code }, { silent: true });
        toast(`Join request sent to ${result.name} — their invite will appear in your overlay.`, 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'chatFriend': {
      S.chatWith = el.dataset.code;
      try {
        S.social = await call('social.markRead', { code: S.chatWith }, { silent: true });
      } catch {
        /* keep local view */
      }
      render();
      setTimeout(() => document.getElementById('chatInput')?.focus(), 80);
      return true;
    }
    case 'closeChat': {
      S.chatWith = '';
      S.chatDraft = '';
      render();
      return true;
    }
    case 'sendChat': {
      const input = document.getElementById('chatInput');
      const text = String(input?.value || '').trim();
      if (!text) return true;
      setBusy(el, true);
      try {
        const result = await call('social.chat', { code: S.chatWith, text }, { silent: true });
        S.social = result.social;
        S.chatDraft = '';
        render();
        setTimeout(() => document.getElementById('chatInput')?.focus(), 40);
      } catch (err) {
        toast(err.message, 'error');
        setBusy(el, false);
      }
      return true;
    }
    case 'acceptRequest': {
      setBusy(el, true);
      try {
        S.social = await call('social.respond', { code: el.dataset.code, accept: true }, { silent: true });
        render();
        toast('Friend added.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'declineRequest': {
      try {
        S.social = await call('social.respond', { code: el.dataset.code, accept: false }, { silent: true });
        render();
      } catch (err) {
        toast(err.message, 'error');
      }
      return true;
    }
    case 'openBuild': {
      S.buildDetail = el.dataset.id;
      S.scroll.builds = 0;
      render();
      document.getElementById('main').scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    case 'backBuilds': {
      S.buildDetail = '';
      render();
      return true;
    }
    case 'myBuilds': {
      const label = document.querySelector('.build-section-label');
      if (label) label.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else toast('Save a build first — it will appear here.', 'info');
      return true;
    }
    case 'buildFilter': {
      S.buildFilter = el.dataset.filter || 'all';
      document.querySelectorAll('.build-filter').forEach((chip) => {
        chip.classList.toggle('on', chip.dataset.filter === S.buildFilter);
      });
      filterBuildsDom();
      return true;
    }
    case 'takeBuild': {
      openTakeBuild(el.dataset.id);
      return true;
    }
    case 'howToGet': {
      openHowToGet(el.dataset.id);
      return true;
    }
    case 'saveBuild':
    case 'editBuild': {
      const build = (S.builds?.builds || []).find((item) => item.id === el.dataset.id);
      if (build) openBuildEditor(build);
      return true;
    }
    case 'deleteBuild': {
      const ok = await confirmModal({
        title: 'Delete this build?',
        html: 'Your saved build will be removed. Characters and the game are not touched.',
        okLabel: 'Delete',
        danger: true,
      });
      if (!ok) return true;
      try {
        const result = await call('builds.remove', { id: el.dataset.id }, { silent: true });
        S.builds = { ...(S.builds || {}), builds: result.builds, applied: result.applied };
        S.buildDetail = '';
        render();
        toast('Build deleted.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      }
      return true;
    }
    case 'checkUpdates': {
      setBusy(el, true);
      try {
        const result = await call('updates.check', {}, { silent: true });
        S.updates = result.state;
        if (S.state) S.state.updates = result.state;
        render();
        if (result.result?.available) showUpdateModal({ ...result.result, ...result.state });
        else if (result.result?.configured === false) toast('Add the GitHub repository first.', 'info');
        else toast(result.result?.message || 'You are on the latest version.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
        S.updates = await call('updates.state', {}, { silent: true }).catch(() => S.updates);
        render();
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'updateNow': {
      showUpdateModal(S.updates);
      return true;
    }
    case 'saveUpdateRepo': {
      const input = document.getElementById('updateRepoInput');
      const repo = String(input?.value || '').trim();
      setBusy(el, true);
      try {
        const next = await call('settings.update', { updateRepo: repo }, { silent: true });
        S.state = next;
        S.version = next.version;
        S.updates = next.updates;
        render();
        toast(repo ? 'GitHub repository saved.' : 'GitHub repository cleared.', 'ok');
        if (repo) {
          const result = await call('updates.check', {}, { silent: true });
          S.updates = result.state;
          S.state.updates = result.state;
          render();
          if (result.result?.available) showUpdateModal({ ...result.result, ...result.state });
        }
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'launch': {
      setBusy(el, true);
      try {
        const result = await call('game.launch');
        await updateStateFrom(result, { rerender: false });
        if (result.warning) toast(result.warning, 'info');
        if (result.via === 'modengine2+seamless') {
          toast(`بنشغّل Seamless + ${result.modCount} مود عبر Mod Engine 2.`, 'ok');
        } else if (result.via === 'modengine2') {
          toast(`بنشغّل اللعبة مع ${result.modCount} مود عبر Mod Engine 2.`, 'ok');
        } else {
          toast(result.mode === 'seamless' ? 'بنشغّل Seamless مباشرة — بدون ستيم.' : 'بنشغّل الوضع العادي — بدون ستيم.', 'ok');
        }
        pollRunning();
        render();
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'pickGameExe': {
      setBusy(el, true);
      try {
        const next = await call('settings.pickGameExe');
        if (next) {
          S.state = next;
          render();
          toast('انحفظ مسار اللعبة.', 'ok');
        }
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'detectGame': {
      setBusy(el, true);
      try {
        const result = await call('game.detect');
        await updateStateFrom(result, { rerender: false });
        if (result.found) toast('لقينا اللعبة وحفظنا المسار.', 'ok');
        else toast('ما لقينا اللعبة تلقائياً — اختر الملف يدوي.', 'error');
        render();
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'clearGameExe': {
      const ok = await confirmModal({
        title: 'مسح مسار اللعبة؟',
        html: 'بنمسح مسار ملف التشغيل. تقدر تحطه مرة ثانية من الإعدادات.',
        okLabel: 'مسح',
        danger: true,
      });
      if (!ok) return true;
      const next = await call('settings.clearGameExe');
      S.state = next;
      render();
      return true;
    }
    case 'pickSaveFile': {
      setBusy(el, true);
      try {
        const next = await call('settings.pickSaveFile');
        if (next) {
          S.state = next;
          render();
          toast('انحفظ مسار الحفظ.', 'ok');
        }
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'detectSave': {
      setBusy(el, true);
      try {
        const result = await call('settings.detectSave', {}, { silent: true }).catch((err) => {
          toast(err.message, 'error');
          return null;
        });
        if (result) {
          S.state = result;
          render();
          toast('لقينا حفظك تلقائياً.', 'ok');
        }
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'attachTrainer': {
      const ok = await ensureOffline();
      if (!ok) return true;
      setBusy(el, true);
      try {
        const status = await call('trainer.attach', undefined, { silent: true });
        S.state.trainer = status;
        S.lastAttachError = '';
        render();
        if (status.warnings?.length) toast(status.warnings[0], 'info');
        else toast('تم الاتصال باللعبة.', 'ok');
      } catch (err) {
        const msg = err?.message || 'ما قدرنا نتصل باللعبة.';
        S.lastAttachError = msg;
        if (/مسؤول|صلاحيات|الوصول/.test(msg)) {
          const go = await confirmModal({
            title: 'نحتاج صلاحيات مسؤول',
            html: 'اللعبة شغالة بصلاحيات أعلى من اللانشر، وويندوز يمنعنا نقرأ ذاكرتها.<br>نقدر نعيد تشغيل اللانشر كمسؤول الحين — بعدها ارجع واضغط «اتصال باللعبة».',
            okLabel: 'إعادة التشغيل كمسؤول',
          });
          if (go) {
            await call('app.relaunchAdmin', undefined, { silent: true }).catch((e2) =>
              toast(e2.message, 'error')
            );
          }
        } else {
          toast(msg, 'error');
        }
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'detachTrainer': {
      const status = await call('trainer.detach');
      S.state.trainer = status;
      render();
      toast('انفصلنا عن اللعبة.', 'ok');
      return true;
    }
    case 'allCheats': {
      const enabled = el.dataset.enabled === '1';
      if (enabled) {
        const ok = await ensureOffline();
        if (!ok) return true;
      }
      const result = await call('trainer.all', { enabled });
      S.state.trainer = result.status;
      render();
      if (result.warnings?.length) toast(result.warnings[0], 'info');
      else toast(enabled ? 'شغّلنا كل التعديلات.' : 'وقّفنا كل التعديلات.', 'ok');
      return true;
    }
    case 'saveLoadout': {
      const name = await promptModal({
        title: 'حفظ تشكيلتي',
        label: 'اسم التشكيلة',
        placeholder: 'مثال: تشكيلة القتال',
        hint: 'بنحفظ التعديلات المفعّلة الحين، وتقدر ترجع لها من البريستات.',
      });
      if (!name) return true;
      const result = await call('trainer.saveProfile', { name });
      S.state.trainer = result.status;
      render();
      toast('انحفظت تشكيلتك.', 'ok');
      return true;
    }
    case 'applyPreset': {
      const ok = await ensureOffline();
      if (!ok) return true;
      const status = await call('trainer.preset', { id: el.dataset.id });
      S.state.trainer = status;
      render();
      toast('تم تفعيل البريست.', 'ok');
      return true;
    }
    case 'deletePreset': {
      const ok = await confirmModal({
        title: 'حذف التشكيلة؟',
        html: 'بنحذف التشكيلة المحفوظة. التعديلات نفسها ما تنحذف.',
        okLabel: 'حذف',
        danger: true,
      });
      if (!ok) return true;
      const result = await call('trainer.deleteProfile', { id: el.dataset.id });
      S.state.trainer = result.status;
      render();
      return true;
    }
    case 'cheatAction': {
      setBusy(el, true);
      try {
        const result = await call('trainer.toggle', { id: el.dataset.id, enabled: true });
        S.state.trainer = result.status;
        render();
        toast(result.warnings?.length ? result.warnings[0] : 'تمت التعبئة داخل اللعبة ✓', result.warnings?.length ? 'info' : 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'verifyCheats': {
      setBusy(el, true);
      const report = [];
      try {
        for (const id of ['no-dead', 'runes']) {
          try {
            const res = await call('trainer.verify', { id }, { silent: true });
            report.push(`${res.ok ? '✓' : '✗'} ${id === 'no-dead' ? 'رايات الدم' : 'الراونز'} (${res.detail})`);
          } catch (err) {
            report.push(`✗ ${id}: ${err.message}`);
          }
        }
        const st = await call('trainer.live', {}, { silent: true }).catch(() => null);
        if (st) {
          S.state.trainer = st;
          render();
        }
        toast(report.join(' · '), report.every((r) => r.startsWith('✓')) ? 'ok' : 'info');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'saveOffsets': {
      return true;
    }
    case 'scanStart': {
      const type = document.getElementById('scanType')?.value || 'int32';
      const value = document.getElementById('scanValue')?.value || '';
      if (!value) {
        toast('اكتب القيمة اللي تشوفها في اللعبة.', 'error');
        return true;
      }
      S.scan.type = type;
      S.scan.value = value;
      S.scan.loading = true;
      render();
      try {
        const result = await call('trainer.scan.start', { type, value: Number(value) });
        S.scan.started = true;
        S.scan.count = result.count;
        S.scan.typeLabel = type;
        S.scan.truncated = result.truncated;
        S.scan.offset = 0;
        await loadScanPage(0);
      } catch {
        S.scan.loading = false;
        render();
      }
      return true;
    }
    case 'scanNext': {
      const mode = document.getElementById('scanMode')?.value || 'exact';
      const value = document.getElementById('scanNextValue')?.value || document.getElementById('scanValue')?.value || '';
      if (mode === 'exact' && !value) {
        toast('اكتب القيمة الجديدة أول.', 'error');
        return true;
      }
      S.scan.mode = mode;
      S.scan.nextValue = value;
      S.scan.loading = true;
      render();
      try {
        const result = await call('trainer.scan.next', { mode, value: Number(value) });
        S.scan.count = result.count;
        S.scan.truncated = result.truncated;
        S.scan.offset = 0;
        await loadScanPage(0);
      } catch {
        S.scan.loading = false;
        render();
      }
      return true;
    }
    case 'scanReset': {
      await call('trainer.scan.reset');
      S.scan = { ...S.scan, started: false, count: 0, rows: [], offset: 0, truncated: false, loading: false };
      render();
      return true;
    }
    case 'scanPage': {
      const offset = Number(el.dataset.offset) || 0;
      await loadScanPage(offset);
      return true;
    }
    case 'scanWrite': {
      const address = Number(el.dataset.addr);
      const value = await promptModal({
        title: 'تغيير القيمة',
        label: 'الرقم الجديد',
        placeholder: 'اكتب القيمة الجديدة',
        okLabel: 'غيّرها',
      });
      if (!value) return true;
      const result = await call('trainer.scan.write', { address, type: S.scan.type, value: Number(value) });
      toast(`تم التغيير — القيمة الحين ${fmtNum(result.value)}`, 'ok');
      return true;
    }
    case 'installMod': {
      setBusy(el, true);
      try {
        const result = await call('mods.installFiles');
        if (result) {
          await updateStateFrom(result, { rerender: true });
          const count = result.installed?.length || 0;
          const bad = result.installed?.filter((m) => m.compatible === false) || [];
          if (count) toast(`تم تركيب ${count} مود.`, 'ok');
          if (bad.length) toast(`انركب ${bad.length} مود بس فيه تحذير توافق.`, 'info');
          if (result.failed?.length) toast(result.failed[0].error, 'error');
        }
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'removeMod': {
      const ok = await confirmModal({
        title: 'إزالة المود؟',
        html: 'المود بينتقل إلى <b>سلة المحذوفات</b> — تقدر ترجعه منها إذا غيّرت رأيك. إذا كان مفعّل، تأثيره يختفي بعد ما تطبق على اللعبة من جديد.',
        okLabel: 'إزالة',
        danger: true,
      });
      if (!ok) return true;
      setBusy(el, true);
      try {
        const result = await call('workshop.uninstall', { id: el.dataset.id }, { silent: true });
        if (result.workshop) S.workshop.data = result.workshop;
        if (result.state) {
          S.state = result.state;
          S.version = S.state.version;
        }
        render();
        toast(result.message || 'انتقل المود إلى سلة المحذوفات.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'openMod': {
      await call('mods.open', { id: el.dataset.id });
      return true;
    }
    case 'syncMods': {
      setBusy(el, true);
      try {
        const result = await call('mods.sync', {}, { silent: true }).catch((err) => {
          toast(err.message, 'error');
          return null;
        });
        if (result) {
          await updateStateFrom(result, { rerender: false });
          render();
          toast(`تم التطبيق — ${result.copied} مود.`, 'ok');
          if (result.warnings?.length) toast(result.warnings[0], 'info');
        }
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'toggleNexus': {
      S.nexus.open = !S.nexus.open;
      S.nexus.error = '';
      render();
      return true;
    }
    case 'wsTab': {
      S.workshop.tab = el.dataset.tab === 'mymods' ? 'mymods' : 'discover';
      render();
      if (S.workshop.tab === 'discover') loadWorkshop();
      return true;
    }
    case 'wsFilter': {
      S.workshop.filter = el.dataset.filter || 'all';
      S.workshop.limit = 48;
      render();
      return true;
    }
    case 'wsCat': {
      S.workshop.category = el.dataset.cat || 'all';
      S.workshop.limit = 48;
      render();
      return true;
    }
    case 'wsMore': {
      S.workshop.limit += 48;
      render();
      return true;
    }
    case 'wsRepair': {
      setBusy(el, true);
      try {
        const result = await call('workshop.repair', {}, { silent: true });
        if (result.workshop) S.workshop.data = result.workshop;
        if (result.state) {
          S.state = result.state;
          S.version = S.state.version;
        }
        render();
        toast(`Repair finished — ${result.copied ?? 0} mods copied into the game.`, 'ok');
        if (result.warnings?.length) toast(result.warnings[0], 'info');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'wsRefresh': {
      setBusy(el, true);
      await loadWorkshop(true);
      setBusy(el, false);
      toast('Workshop refreshed.', 'ok');
      return true;
    }
    case 'wsDownload': {
      await workshopDownload(el.dataset.ws);
      return true;
    }
    case 'wsRetry': {
      await workshopDownload(el.dataset.ws);
      return true;
    }
    case 'wsInstall': {
      // One-click tool install (Mod Engine 2): download from the official
      // source, then install into the game folder.
      const id = el.dataset.ws;
      if (S.workshop.busy) return true;
      const entry = wsEntry(id);
      setBusy(el, true);
      S.workshop.busy = id;
      S.workshop.error = '';
      render();
      try {
        const dl = await call('workshop.download', { id }, { silent: true });
        if (dl.workshop) S.workshop.data = dl.workshop;
        const result = await call('workshop.activate', { id }, { silent: true });
        if (result.catalog) S.workshop.data = result.catalog;
        if (result.state) {
          S.state = result.state;
          S.version = S.state.version;
        }
        S.workshop.busy = '';
        render();
        if (result.already) toast('Mod Engine 2 is already installed — nothing to do.', 'ok');
        else toast(`${entry?.name || 'Tool'} installed — PLAY now loads your mods.`, 'ok');
      } catch (err) {
        S.workshop.busy = '';
        S.workshop.error = err.message;
        render();
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'wsLink': {
      wsLinkModal(el.dataset.ws);
      return true;
    }
    case 'wsNexusCancel': {
      call('workshop.nexusCancel', {}, { silent: true }).catch(() => {});
      return true;
    }
    case 'wsDismissFail': {
      S.workshop.failed = null;
      render();
      return true;
    }
    case 'wsActivate': {
      await workshopActivate(el.dataset.ws);
      return true;
    }
    case 'wsDeactivate': {
      await workshopDeactivate(el.dataset.ws);
      return true;
    }
    case 'wsDelete': {
      await workshopDelete(el.dataset.ws);
      return true;
    }
    case 'wsImportFile': {
      await workshopImport();
      return true;
    }
    case 'wsImportFor': {
      await workshopImport(el.dataset.ws);
      return true;
    }
    case 'wsActivateAll': {
      await workshopBulk('activateAll');
      return true;
    }
    case 'wsDeactivateAll': {
      await workshopBulk('deactivateAll');
      return true;
    }
    case 'wsRemoveMod': {
      const ok = await confirmModal({
        title: 'Remove this mod?',
        html: 'The mod folder moves to the <b>Recycle Bin</b> — you can restore it from there. Your save file is never touched.',
        okLabel: 'Remove',
        danger: true,
      });
      if (!ok) return true;
      setBusy(el, true);
      try {
        const result = await call('workshop.uninstall', { id: el.dataset.mod }, { silent: true });
        if (result.workshop) S.workshop.data = result.workshop;
        if (result.state) {
          S.state = result.state;
          S.version = S.state.version;
        }
        render();
        toast(result.message || 'Mod moved to the Recycle Bin.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'wsDetails': {
      wsDetails(el.dataset.ws);
      return true;
    }
    case 'wsClearError': {
      S.workshop.error = '';
      render();
      return true;
    }
    case 'saveNexusKey': {
      const input = document.getElementById('nexusKey') || document.getElementById('settingsNexusKey');
      const key = input?.value || '';
      if (!key.trim()) {
        toast('الصق مفتاح Nexus أول.', 'error');
        return true;
      }
      setBusy(el, true);
      try {
        const result = await call('nexus.saveKey', { key }, { silent: true }).catch((err) => {
          toast(err.message, 'error');
          return null;
        });
        if (result) {
          S.state = result.state;
          if (input) input.value = '';
          render();
          toast('المفتاح صحيح — يُستخدم للبحث في Nexus.', 'ok');
        }
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'clearNexusKey': {
      const next = await call('nexus.clearKey');
      S.state = next;
      render();
      return true;
    }
    case 'openCharacter': {
      S.detail = el.dataset.id;
      S.savesOpen = false;
      render();
      return true;
    }
    case 'backCharacters': {
      S.detail = null;
      S.savesOpen = false;
      render();
      return true;
    }
    case 'toggleCharacter': {
      const active = el.dataset.active === '1';
      if (!active) {
        const ok = await ensureOffline();
        if (!ok) return true;
      }
      setBusy(el, true);
      try {
        const result = await call('characters.setActive', { id: el.dataset.id, active: !active });
        S.state = result.state;
        render();
        toast(active ? 'تم إيقاف الشخصية.' : 'تم تفعيل الشخصية وتطبيق تعديلاتها.', 'ok');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'useSave': {
      setBusy(el, true);
      try {
        const result = await call('characters.setActive', { id: el.dataset.id, active: true }, { silent: true });
        S.state = result.state;
        const ch = (S.state.characters?.characters || []).find((c) => c.id === el.dataset.id);
        render();
        toast(
          `${ch?.label || ch?.name || 'Character'} is now your active character — press PLAY. Elden Ring still shows its own character select screen.`,
          'ok'
        );
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'renameCharacter': {
      const chars = S.state?.characters?.characters || [];
      const ch = chars.find((c) => c.id === el.dataset.id);
      if (!ch) return true;
      const label = await promptModal({
        title: 'Rename in launcher',
        label: 'Launcher label',
        value: ch.label || ch.name,
        placeholder: 'My Bleed Build',
        okLabel: 'Save label',
        hint: 'Shown only inside the launcher. The in-game name and the save file are not modified.',
      });
      if (label === null) return true;
      try {
        const result = await call('characters.rename', { id: el.dataset.id, label }, { silent: true });
        S.state = result.state;
        render();
        toast('Launcher label saved.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      }
      return true;
    }
    case 'hideCharacter': {
      const name = el.dataset.name || 'this character';
      const ok = await confirmModal({
        title: 'Are you sure?',
        html: `<b>${esc(name)}</b> will be hidden from MY SAVES. This only changes the launcher list — your save file and the character are <b>not</b> deleted. You can show it again at any time.`,
        okLabel: 'Hide from list',
        danger: true,
      });
      if (!ok) return true;
      try {
        const result = await call('characters.hide', { id: el.dataset.id, hidden: true }, { silent: true });
        S.state = result.state;
        render();
        toast('Hidden from the launcher — the save is untouched.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      }
      return true;
    }
    case 'restoreCharacter': {
      try {
        const result = await call('characters.hide', { id: el.dataset.id, hidden: false }, { silent: true });
        S.state = result.state;
        render();
        toast('Character shown again.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      }
      return true;
    }
    case 'openRestorePicker': {
      await openRestorePicker();
      return true;
    }
    case 'createSaveSlot': {
      const name = await promptModal({
        title: 'Create a save slot',
        label: 'Slot name',
        placeholder: 'Before Radahn — power stance',
        okLabel: 'Create slot',
        hint: 'A full copy of your current save, restorable with one click. The game itself still creates characters in-game.',
      });
      if (name === null) return true;
      setBusy(el, true);
      try {
        const result = await call('saves.createSlot', { name }, { silent: true });
        await updateStateFrom(result, { rerender: true });
        toast(`Save slot “${name}” created.`, 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'openSavesFolder': {
      await call('saves.openRoot', {}, { silent: true }).catch((err) => toast(err.message, 'error'));
      return true;
    }
    case 'unlockApply': {
      if (S.unlocks.busy) return true;
      S.unlocks = { busy: 'apply', error: '', warnings: [] };
      render();
      try {
        const result = await call('unlocks.apply', {}, { silent: true });
        if (result.workshop) S.workshop.data = result.workshop;
        if (result.state) {
          S.state = result.state;
          S.version = S.state.version;
        }
        const errors = result.errors || [];
        S.unlocks = { busy: '', error: errors.length ? errors[0].message : '', warnings: result.warnings || [] };
        render();
        if (errors.length) toast(errors[0].message, 'error');
        else toast('Unlock applied — head to the Twin Maiden Husks in game and everything is free.', 'ok');
      } catch (err) {
        S.unlocks = { busy: '', error: err.message, warnings: [] };
        render();
        toast(err.message, 'error');
      }
      return true;
    }
    case 'unlockRemove': {
      if (S.unlocks.busy) return true;
      S.unlocks = { busy: 'remove', error: '', warnings: [] };
      render();
      try {
        const result = await call('unlocks.remove', {}, { silent: true });
        if (result.workshop) S.workshop.data = result.workshop;
        if (result.state) {
          S.state = result.state;
          S.version = S.state.version;
        }
        const errors = result.errors || [];
        S.unlocks = { busy: '', error: errors.length ? errors[0].message : '', warnings: result.warnings || [] };
        render();
        if (errors.length) toast(errors[0].message, 'error');
        else toast(result.statsRestored ? 'Unlock removed — the merchant mod is off and your old stats are back.' : 'Unlock removed — the merchant mod is off and rune freeze is stopped.', 'ok');
      } catch (err) {
        S.unlocks = { busy: '', error: err.message, warnings: [] };
        render();
        toast(err.message, 'error');
      }
      return true;
    }
    case 'openSaves': {
      S.savesOpen = true;
      S.detail = null;
      S.view = 'characters';
      render();
      refreshState().then(() => {
        if (S.savesOpen) render();
      }).catch(() => {});
      return true;
    }
    case 'backupSave': {
      setBusy(el, true);
      try {
        const result = await call('saves.backup', { name: '' });
        await updateStateFrom(result, { rerender: true });
        toast('انحفظت نسخة احتياطية.', 'ok');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'restoreSave': {
      const ok = await confirmModal({
        title: 'ترجع لهذه النسخة؟',
        html: 'بنستبدل حفظك الحالي بهذه النسخة. بنسوي نسخة تلقائية من حفظك الحالي قبل الاسترجاع.<br><br><b>سكّر اللعبة أول.</b>',
        okLabel: 'رجّعها',
        danger: true,
      });
      if (!ok) return true;
      const result = await call('saves.restore', { id: el.dataset.id }, { silent: true }).catch((err) => {
        toast(err.message, 'error');
        return null;
      });
      if (result) {
        await updateStateFrom(result, { rerender: true });
        toast('تم استرجاع النسخة.', 'ok');
      }
      return true;
    }
    case 'copySave': {
      setBusy(el, true);
      try {
        const result = await call('saves.duplicate', { id: el.dataset.id });
        await updateStateFrom(result, { rerender: true });
        toast('انسوت نسخة من النسخة الاحتياطية.', 'ok');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'deleteSave': {
      const ok = await confirmModal({
        title: 'حذف النسخة الاحتياطية؟',
        html: 'بنحذف هذه النسخة من النسخ الاحتياطية. الحفظ الحالي ما ينحذف.',
        okLabel: 'حذف',
        danger: true,
      });
      if (!ok) return true;
      const result = await call('saves.remove', { id: el.dataset.id });
      await updateStateFrom(result, { rerender: true });
      toast('انحذفت النسخة.', 'ok');
      return true;
    }
    case 'setLaunchMode': {
      const mode = el.dataset.mode === 'seamless' ? 'seamless' : 'normal';
      setBusy(el, true);
      try {
        const next = await call('settings.update', { launchMode: mode });
        S.state = next;
        render();
        toast(mode === 'seamless' ? 'تم اختيار Seamless — بنشغّله مباشرة بدون ستيم.' : 'تم اختيار الوضع العادي — بنشغّله مباشرة بدون ستيم.', 'ok');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'setLanguage': {
      const lang = el.dataset.lang === 'en' ? 'en' : 'ar';
      if (lang === (isEn() ? 'en' : 'ar')) return true;
      const next = await call('settings.update', { language: lang });
      S.state = next;
      if (window.I18N) I18N.setLang(lang);
      render();
      toast(lang === 'en' ? 'Language set to English.' : 'تم تحويل اللغة إلى العربية.', 'ok');
      return true;
    }
    case 'saveCoopPassword': {
      const input = document.getElementById('coopPassword');
      const password = input ? input.value.trim().slice(0, 127) : '';
      if (!password) {
        toast('اكتب كلمة السر أول — نفسها لازم تكون عند أخوياك.', 'error');
        return true;
      }
      setBusy(el, true);
      try {
        const next = await call('settings.update', { seamlessPassword: password });
        S.state = next;
        render();
        toast('انحفظت كلمة السر وانكتبت في Seamless — شاركها مع أخوياك.', 'ok');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'copyCoopPassword': {
      const password = state().settings.seamlessPassword || '';
      if (!password) {
        toast('ما فيه كلمة سر محفوظة بعد.', 'error');
        return true;
      }
      try {
        await navigator.clipboard.writeText(password);
        toast('انكتبت كلمة السر في الحافظة — أرسلها لأخوياك.', 'ok');
      } catch {
        const input = document.getElementById('coopPassword');
        if (input) {
          input.value = password;
          input.select();
          document.execCommand('copy');
          toast('انكتبت كلمة السر في الحافظة — أرسلها لأخوياك.', 'ok');
        } else {
          toast(`كلمة السر: ${password}`, 'info');
        }
      }
      return true;
    }
    case 'fixSeamless': {
      if (S.workshop.busy) return true;
      try {
        await fixSeamlessFromWorkshop();
      } catch (err) {
        toast(err.message, 'error');
      }
      render();
      return true;
    }
    case 'openWizard': {
      openWizard(1);
      return true;
    }
    case 'testSeamless': {
      S.seamless.testing = true;
      S.seamless.test = null;
      render();
      try {
        const report = await call('seamless.test');
        S.seamless.test = report;
        if (report.state) S.state = report.state;
        render();
        toast(report.ready ? 'Seamless جاهز — كل الملفات موجودة.' : 'Seamless فيه ملفات أو إعدادات ناقصة — شوف التفاصيل تحت.', report.ready ? 'ok' : 'error');
      } finally {
        S.seamless.testing = false;
        render();
      }
      return true;
    }
    case 'openSeamlessIni': {
      await call('seamless.openIni');
      return true;
    }
    case 'repairSeamless': {
      if (S.seamless.repairing) return true;
      const ok = await confirmModal({
        title: 'إصلاح / إعادة تثبيت Seamless؟',
        html: 'بننزّل نسخة رسمية جديدة من GitHub ونتحقق من سلامتها، ثم نعيد تثبيت Seamless في مجلد اللعبة. <b>كلمة السر واسم اللاعب ينحفظان</b>، وملفاتك الحالية تنسخ احتياطياً. ملفات الحفظ ما تنلمس.',
        okLabel: 'إعادة التثبيت',
      });
      if (!ok) return true;
      S.seamless.repairing = true;
      render();
      try {
        const result = await call('workshop.repairTool', { id: '510' });
        if (result.workshop) S.workshop.data = result.workshop;
        if (result.state) {
          S.state = result.state;
          S.version = S.state.version;
        }
        S.seamless.test = null;
        render();
        toast('Seamless انصلح — نسخة رسمية جديدة مثبّتة وكلمة السر محفوظة.', 'ok');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        S.seamless.repairing = false;
        render();
      }
      return true;
    }
    case 'refreshController': {
      setBusy(el, true);
      try {
        const result = await call('controller.detect', {}, { silent: true });
        await updateStateFrom(result);
        const c = result.controller || S.state?.controller;
        toast(c?.headline || 'Controller status refreshed.', c?.status === 'ready' ? 'ok' : 'info');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(el, false);
      }
      return true;
    }
    case 'openDs4Windows': {
      const url = S.state?.controller?.ds4windowsUrl || 'https://github.com/Ryochan7/DS4Windows/releases/latest';
      await call('shell.openExternal', { url });
      return true;
    }
    case 'openGameDir': {
      await call('mods.openGameDir');
      return true;
    }
    case 'openUserData': {
      await call('app.openUserData');
      return true;
    }
    case 'openModsRoot': {
      await call('mods.openRoot');
      return true;
    }
    case 'openSavesRoot': {
      await call('saves.openRoot');
      return true;
    }
    default:
      return false;
  }
}

async function loadScanPage(offset) {
  try {
    const page = await call('trainer.scan.page', { offset, limit: 50 });
    S.scan.rows = page.rows || [];
    S.scan.count = page.count;
    S.scan.offset = offset;
    S.scan.loading = false;
  } catch {
    S.scan.loading = false;
  }
  render();
}

/* ---------------- status polling ---------------- */
async function pollRunning() {
  try {
    S.running = await api.invoke('game.running');
    updateChrome();
  } catch {
    /* transient */
  }
}

function startPolling() {
  if (S.polling) {
    pollRunning();
    return;
  }
  S.polling = true;
  pollRunning();
  setInterval(pollRunning, 4000);
}

/* ---------------- events ---------------- */
function bindEvents() {
  const authRoot = document.getElementById('authRoot');
  authRoot.addEventListener('click', (event) => {
    const el = event.target.closest('[data-auth]');
    if (!el) return;
    const act = el.dataset.auth;
    if (act === 'mode') {
      S.auth.mode = el.dataset.mode;
      S.auth.error = '';
      S.auth.draft = {};
      if (el.dataset.mode === 'forgot') S.auth.resetStep = 1;
      renderAuth();
      return;
    }
    if (act === 'submit') {
      submitAuth();
      return;
    }
    if (act === 'guest') {
      guestLogin();
      return;
    }
    if (act === 'copyCode') {
      const code = S.auth.recoveryCode || '';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(code)
          .then(() => toast('Recovery code copied.', 'ok'))
          .catch(() => toast('Copy the code manually.', 'info'));
      } else {
        toast('Copy the code manually.', 'info');
      }
      return;
    }
    if (act === 'enter') {
      startApp();
      return;
    }
    if (act === 'useSaved') {
      const input = document.getElementById('authIdentifier');
      if (input) {
        input.value = el.dataset.name || '';
        document.getElementById('authPassword')?.focus();
      }
    }
  });
  authRoot.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
      event.preventDefault();
      submitAuth();
    }
  });
  authRoot.addEventListener('input', (event) => {
    const input = event.target;
    if (!input || !input.id || input.type === 'checkbox') return;
    if (!S.auth.draft) S.auth.draft = {};
    S.auth.draft[input.id] = input.value;
  });

  const accountChip = document.getElementById('accountChip');
  if (accountChip) accountChip.addEventListener('click', openAccountMenu);
  const globalSearch = document.getElementById('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runGlobalSearch(event.target.value).catch((err) => toast(err.message, 'error'));
      }
    });
  }

  document.getElementById('nav').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-nav]');
    if (!btn) return;
    go(btn.dataset.nav);
  });

  document.getElementById('viewMount').addEventListener('click', async (event) => {
    const el = event.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    event.preventDefault();
    try {
      await actionSwitch(act, el);
    } catch (err) {
      if (err && err.message) toast(err.message, 'error');
    }
  });

  document.getElementById('viewMount').addEventListener('change', async (event) => {
    const unlockToggle = event.target.closest('[data-unlock-toggle]');
    if (unlockToggle) {
      const id = unlockToggle.dataset.unlockToggle;
      try {
        const result = await call('unlocks.select', { patch: { [id]: unlockToggle.checked } }, { silent: true });
        if (result.unlocks) S.state.unlocks = result.unlocks;
        render();
      } catch (err) {
        unlockToggle.checked = !unlockToggle.checked;
        toast(err.message, 'error');
      }
      return;
    }

    const cheatToggle = event.target.closest('[data-cheat-toggle]');
    if (cheatToggle) {
      const enabled = cheatToggle.checked;
      if (enabled) {
        const ok = await ensureOffline();
        if (!ok) {
          cheatToggle.checked = false;
          return;
        }
      }
      try {
        const result = await call('trainer.toggle', { id: cheatToggle.dataset.cheatToggle, enabled });
        S.state.trainer = result.status;
        render();
        if (result.warnings?.length) toast(result.warnings[0], 'info');
      } catch {
        cheatToggle.checked = !enabled;
      }
      return;
    }

    const charToggle = event.target.closest('[data-char-cheat]');
    if (charToggle) {
      const enabled = charToggle.checked;
      if (enabled) {
        const ok = await ensureOffline();
        if (!ok) {
          charToggle.checked = false;
          return;
        }
      }
      try {
        const result = await call('characters.cheat', {
          id: charToggle.dataset.charId,
          cheatId: charToggle.dataset.charCheat,
          enabled,
        });
        S.state = result.state;
        render();
        if (result.warnings?.length) toast(result.warnings[0], 'info');
      } catch {
        charToggle.checked = !enabled;
      }
      return;
    }

    const modToggle = event.target.closest('[data-mod-toggle]');
    if (modToggle) {
      try {
        const result = await call('mods.toggle', { id: modToggle.dataset.modToggle, enabled: modToggle.checked });
        await updateStateFrom(result, { rerender: true });
        if (result.sync?.error) toast(`انفعّل المود لكن التطبيق فشل: ${result.sync.error}`, 'error');
        else if (result.sync) toast(modToggle.checked ? 'المود مفعّل داخل اللعبة.' : 'المود انوقف.', 'ok');
        if (S.view === 'mods' && modToggle.dataset.wsReload) loadWorkshop(true);
      } catch (err) {
        modToggle.checked = !modToggle.checked;
        toast(err.message, 'error');
      }
      return;
    }

    const dlssRadio = event.target.closest('[data-dlss]');
    if (dlssRadio) {
      try {
        const result = await call('settings.update', { dlssMode: dlssRadio.dataset.dlss }, { silent: true });
        S.state = result;
        render();
      } catch (err) {
        toast(err.message, 'error');
        render();
      }
      return;
    }

    const setting = event.target.closest('[data-setting]');
    if (setting) {
      const key = setting.dataset.setting;
      const value = setting.type === 'checkbox' ? setting.checked : setting.value;
      try {
        const result = await call('settings.update', { [key]: value }, { silent: true });
        S.state = result;
        render();
      } catch (err) {
        toast(err.message, 'error');
        render();
      }
    }
  });

  document.getElementById('viewMount').addEventListener('input', (event) => {
    if (event.target.id === 'charSearch') {
      S.charQuery = event.target.value;
      filterCharacterDom();
    } else if (event.target.id === 'nexusQuery') {
      S.nexus.query = event.target.value;
    } else if (event.target.id === 'wsSearch') {
      S.workshop.query = event.target.value;
      filterWorkshopDom();
    } else if (event.target.id === 'wsUrl') {
      S.workshop.url = event.target.value;
    } else if (event.target.id === 'scanValue') {
      S.scan.value = event.target.value;
    } else if (event.target.id === 'scanNextValue') {
      S.scan.nextValue = event.target.value;
    } else if (event.target.id === 'addFriendInput') {
      S.addFriendQuery = event.target.value;
      scheduleFriendSearch();
    } else if (event.target.id === 'chatInput') {
      S.chatDraft = event.target.value;
    } else if (event.target.id === 'buildSearch') {
      S.buildQuery = event.target.value;
      filterBuildsDom();
    }
  });

  // Workshop thumbnails can fail if a file is missing — fall back to the
  // monogram instead of showing a broken image icon.
  document.getElementById('viewMount').addEventListener(
    'error',
    (event) => {
      if (event.target && event.target.tagName === 'IMG') event.target.style.display = 'none';
    },
    true
  );

  document.getElementById('viewMount').addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (event.target.id === 'addFriendInput') {
      event.preventDefault();
      const btn = document.querySelector('[data-act="submitAddFriend"]');
      if (btn) await actionSwitch('submitAddFriend', btn).catch(() => {});
    } else if (event.target.id === 'chatInput') {
      event.preventDefault();
      const btn = document.querySelector('[data-act="sendChat"]');
      if (btn) await actionSwitch('sendChat', btn).catch(() => {});
    } else if (event.target.id === 'wsSearch') {
      event.preventDefault();
      filterWorkshopDom();
    }
  });

  document.getElementById('viewMount').addEventListener('change', (event) => {
    if (event.target.id === 'scanType') S.scan.type = event.target.value;
    if (event.target.id === 'scanMode') S.scan.mode = event.target.value;
  });

  document.getElementById('viewMount').addEventListener('toggle', (event) => {
    const panel = event.target.closest('[data-panel]');
    if (panel) S.openPanels[panel.dataset.panel] = panel.open;
  }, true);

  document.getElementById('modalRoot').addEventListener('click', (event) => {
    const wizAct = event.target.closest('[data-wiz-act]');
    if (wizAct) {
      const act = wizAct.dataset.wizAct;
      if (act === 'installSeamless' || act === 'next' || act === 'finish' || act === 'skip' || act === 'back') {
        wizVals();
      }
      handleWizard(act, wizAct).catch((err) => {
        S.setup.error = err.message;
        if (S.setup.open) renderWizard();
      });
      return;
    }
    if (event.target.id === 'modalRoot' && !S.setup.open) closeModal();
  });

  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      actionSwitch('setLanguage', { dataset: { lang: isEn() ? 'ar' : 'en' } }).catch((err) => {
        if (err && err.message) toast(err.message, 'error');
      });
    });
  }

  document.getElementById('winControls').addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-win]');
    if (!btn) return;
    await api.window(btn.dataset.win);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !S.setup.open) closeModal();
  });

  document.addEventListener('error', (event) => {
    const img = event.target;
    if (img && img.tagName === 'IMG') {
      img.style.display = 'none';
      const parent = img.parentElement;
      if (parent) parent.classList.add('img-failed');
    }
  }, true);

  document.getElementById('main').addEventListener('scroll', () => {
    S.scroll[S.view] = document.getElementById('main').scrollTop;
  });
}

function applyTrainerLive(tr) {
  const live = tr.live || {};
  const pct = (v, m) => (m > 0 ? Math.max(0, Math.min(100, (Number(v) / Number(m)) * 100)) : 0);
  const fill = (key, v, m) => {
    const el = document.querySelector(`[data-live-fill="${key}"]`);
    if (el) el.style.width = `${pct(v, m).toFixed(1)}%`;
    const num = document.querySelector(`[data-live-num="${key}"]`);
    if (num) num.textContent = fmtNum(v);
  };
  fill('hp', live.hp, live.maxHp);
  fill('fp', live.fp, live.maxFp);
  fill('sp', live.stamina, live.maxStamina);
  const runes = document.querySelector('[data-live-runes]');
  if (runes && Number.isFinite(Number(live.runes))) runes.textContent = fmtNum(live.runes);
  const level = document.querySelector('[data-live-level]');
  if (level && Number.isFinite(Number(live.level))) level.textContent = fmtNum(live.level);
  const pillEl = document.getElementById('trainerStatePill');
  if (pillEl) {
    pillEl.textContent = tr.inGame ? 'داخل اللعبة' : tr.attached ? 'بانتظار الشخصية' : 'غير متصل';
    pillEl.className = `pill ${tr.inGame ? 'ok' : tr.attached ? 'warn' : ''}`;
  }
  // The live block changes shape when the player loads / leaves the world.
  if (S.trainerInGame !== undefined && S.trainerInGame !== !!tr.inGame && S.view === 'trainer') {
    S.trainerInGame = !!tr.inGame;
    render();
    return;
  }
  S.trainerInGame = !!tr.inGame;
}

/* ---------------- launcher events (friends / builds / updates) ---------------- */
let socialRefreshTimer = null;
let inviteModalOpen = false;

function scheduleSocial(delay = 320) {
  clearTimeout(socialRefreshTimer);
  socialRefreshTimer = setTimeout(() => {
    loadSocial({ keepFocus: true });
  }, delay);
}

function clipText(value, max = 90) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function showInvitePrompt(invite) {
  if (!invite || inviteModalOpen) return;
  if (document.getElementById('modalRoot')?.innerHTML) return;
  inviteModalOpen = true;
  openModal({
    title: 'Game Invite',
    body: `<div class="invite-modal" dir="ltr">
      <div class="invite-modal-avatar">${icon('friends')}</div>
      <div class="invite-modal-copy">
        <b>${esc(invite.name || 'A friend')}</b> invites you to play
        <span class="invite-modal-game">${esc(invite.activity || 'Elden Ring')}</span>
        <span class="invite-modal-hint">Accept to sync the co-op password and join without typing anything.</span>
      </div>
    </div>`,
    actions: [
      {
        label: 'Decline',
        cls: 'btn-ghost',
        onClick: async () => {
          inviteModalOpen = false;
          await call('social.decline', {}, { silent: true }).catch(() => {});
          scheduleSocial(80);
          return true;
        },
      },
      {
        label: 'Accept',
        cls: 'btn-primary',
        onClick: async (btn) => {
          setBusy(btn, true);
          try {
            const result = await call('social.accept');
            inviteModalOpen = false;
            if (result.state) {
              S.state = result.state;
              S.version = S.state.version;
            }
            S.social = result.social || S.social;
            render();
            const message = result.joined
              ? result.launched
                ? 'Seamless Co-op is starting. You are in the session.'
                : result.message || 'Session password synced.'
              : result.message || 'Invite accepted.';
            toast(message, 'ok');
            return true;
          } catch (err) {
            toast(err.message, 'error');
            setBusy(btn, false);
            return false;
          }
        },
      },
    ],
    onClose: () => {
      inviteModalOpen = false;
    },
  });
}

let launcherAudio = null;
function launcherChime() {
  try {
    launcherAudio = launcherAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (launcherAudio.state === 'suspended') launcherAudio.resume().catch(() => {});
    const now = launcherAudio.currentTime;
    [880, 1174.66].forEach((freq, index) => {
      const osc = launcherAudio.createOscillator();
      const gain = launcherAudio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + index * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);
      osc.connect(gain).connect(launcherAudio.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    /* audio unavailable */
  }
}

const SOCIAL_CHIME_EVENTS = new Set(['social:chat', 'social:invite', 'social:request', 'social:joinRequest']);

function handleLauncherEvent(payload) {
  if (!payload || !payload.type) return;
  if (payload.sound !== false && document.hasFocus() && SOCIAL_CHIME_EVENTS.has(payload.type)) {
    launcherChime();
  }
  switch (payload.type) {
    case 'social:presence':
    case 'social:link':
    case 'social:friend':
    case 'social:requests':
    case 'social:inviteResolved':
      scheduleSocial();
      break;
    case 'social:request':
      scheduleSocial();
      break;
    case 'social:chat': {
      const sameChat = S.view === 'friends' && S.chatWith === payload.code;
      scheduleSocial(sameChat ? 90 : 260);
      if (!sameChat && document.hasFocus()) {
        toast(`${payload.name || 'Friend'}: ${clipText(payload.message?.text)}`, 'info');
      }
      break;
    }
    case 'social:invite':
      scheduleSocial(90);
      if (document.hasFocus()) showInvitePrompt(payload.invite);
      else toast(`${payload.invite?.name || 'A friend'} invites you to play.`, 'ok');
      break;
    case 'social:joinRequest':
      if (document.hasFocus()) toast(`${payload.name || 'A friend'} wants to join your game.`, 'info');
      break;
    case 'update:state':
      S.updates = payload.state || S.updates;
      if (S.state) S.state.updates = S.updates;
      if (S.view === 'settings' && !document.activeElement?.id) render();
      updateModalProgress(S.updates);
      break;
    case 'update:available': {
      const next = { ...(S.updates || {}), ...(payload.result || {}) };
      S.updates = next;
      if (S.state) S.state.updates = next;
      if (next.available && S.updatePrompted !== next.latest && document.hasFocus()) {
        showUpdateModal(next);
      }
      break;
    }
    case 'build:applied':
      refreshState()
        .then(() => {
          if (S.view === 'characters' || S.view === 'characterDetail') render();
        })
        .catch(() => {});
      break;
    case 'saves:autoBackup':
      refreshState()
        .then(() => {
          if (S.view === 'mysaves') render();
        })
        .catch(() => {});
      if (document.hasFocus()) toast('Auto backup saved — the game closed.', 'ok');
      break;
    case 'unlocks:applied':
      refreshState()
        .then(() => {
          if (S.view === 'unlocks') render();
        })
        .catch(() => {});
      break;
    default:
      break;
  }
}

/* ---------------- account & auth ---------------- */
const AUTH_BRAND = `
  <svg class="auth-brand-mark" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <circle cx="60" cy="60" r="46" stroke="currentColor" stroke-width="1.1" opacity=".85" />
    <circle cx="60" cy="60" r="37" stroke="currentColor" stroke-width=".6" stroke-dasharray="3 7" opacity=".6" />
    <circle cx="60" cy="60" r="25" stroke="currentColor" stroke-width="1.3" />
    <circle cx="60" cy="60" r="17" stroke="currentColor" stroke-width=".6" opacity=".6" />
    <path d="M60 8v14M60 98v14M8 60h14M98 60h14" stroke="currentColor" stroke-width="1" opacity=".75" />
    <path d="M60 43v34M43 60h34" stroke="currentColor" stroke-width=".7" opacity=".45" />
  </svg>`;

const AUTH_POINTS = [
  ['users', 'Friends & invites', 'Presence, chat and one-click co-op invites'],
  ['builds', 'Personal builds', 'Save, edit and apply end-game builds'],
  ['layers', 'Mods & workshop', 'Download, activate and launch with mods'],
  ['shieldCheck', 'Private profile', 'Settings and backups per account'],
];

function showAuth(mode = 'login') {
  S.auth.mode = mode;
  S.auth.error = '';
  S.auth.busy = '';
  S.auth.draft = {};
  const root = document.getElementById('authRoot');
  const shell = document.getElementById('appShell');
  if (root) root.hidden = false;
  if (shell) shell.hidden = true;
  renderAuth();
  setTimeout(() => root?.querySelector('input')?.focus(), 90);
}

function hideAuth() {
  const root = document.getElementById('authRoot');
  const shell = document.getElementById('appShell');
  if (root) root.hidden = true;
  if (shell) shell.hidden = false;
}

function savedAccountChip(account) {
  return `<button class="auth-saved-account" type="button" data-auth="useSaved" data-name="${esc(account.username)}">
    <span class="auth-saved-avatar">${
      account.avatar ? `<img src="${esc(account.avatar)}" alt="" />` : accountInitial(account.username)
    }</span>
    ${esc(account.username)}
  </button>`;
}

function authField(id, label, type = 'text', placeholder = '', extra = '') {
  return `<div class="auth-field">
    <label for="${id}">${label}</label>
    <input class="input" id="${id}" type="${type}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false" ${extra} />
  </div>`;
}

function renderAuth() {
  const root = document.getElementById('authRoot');
  if (!root) return;
  const session = S.auth.session || {};
  const mode = S.auth.mode;
  const busy = S.auth.busy;
  const saved = (session.saved || []).slice(0, 4);
  const disable = busy ? 'disabled' : '';
  const errorBox = S.auth.error
    ? `<div class="auth-error">${icon('alert')}<div>${esc(S.auth.error)}</div></div>`
    : '';

  let card = '';
  if (mode === 'login') {
    card = `
      <div class="auth-tabs">
        <button class="auth-tab on" data-auth="mode" data-mode="login" type="button">Log in</button>
        <button class="auth-tab" data-auth="mode" data-mode="register" type="button">Create account</button>
      </div>
      ${saved.length ? `<div class="auth-saved">${saved.map(savedAccountChip).join('')}</div>` : ''}
      ${errorBox}
      ${authField('authIdentifier', 'Email or username', 'text', 'tarnished@lands.between')}
      ${authField('authPassword', 'Password', 'password', '••••••••')}
      <div class="auth-row">
        <label class="auth-check"><input type="checkbox" id="authRemember" ${S.auth.remember ? 'checked' : ''} /> Remember me</label>
        <button class="auth-link" data-auth="mode" data-mode="forgot" type="button">Forgot password?</button>
      </div>
      <button class="btn btn-primary auth-submit ${busy ? 'loading' : ''}" data-auth="submit" type="button" ${disable}>Enter the Lands Between</button>
      <div class="auth-divider">or</div>
      <button class="btn auth-guest" data-auth="guest" type="button" ${disable}>${icon('user')} Continue as Guest</button>
      <p class="auth-note">Guest can play with the same game and mods, but friends, builds, settings and backups are not saved.</p>`;
  } else if (mode === 'register') {
    card = `
      <div class="auth-tabs">
        <button class="auth-tab" data-auth="mode" data-mode="login" type="button">Log in</button>
        <button class="auth-tab on" data-auth="mode" data-mode="register" type="button">Create account</button>
      </div>
      ${errorBox}
      ${authField('authUsername', 'Username', 'text', '3–24 letters or numbers')}
      ${authField('authEmail', 'Email', 'email', 'you@example.com')}
      ${authField('authPassword', 'Password', 'password', 'At least 8 characters')}
      ${authField('authConfirm', 'Confirm password', 'password', 'Type it again')}
      <div class="auth-row">
        <label class="auth-check"><input type="checkbox" id="authRemember" ${S.auth.remember ? 'checked' : ''} /> Keep me signed in</label>
      </div>
      <button class="btn btn-primary auth-submit ${busy ? 'loading' : ''}" data-auth="submit" type="button" ${disable}>Create account</button>
      <p class="auth-note">Accounts are stored on this PC only — nothing is uploaded. You get a recovery code you can use if you forget your password.</p>`;
  } else if (mode === 'forgot') {
    const stepOne = S.auth.resetStep !== 2;
    card = `
      <h1>Reset password</h1>
      <p class="auth-sub">${stepOne ? 'Enter the email or username on your account.' : 'Enter the recovery code you saved at signup.'}</p>
      ${errorBox}
      ${
        stepOne
          ? authField('authIdentifier', 'Email or username', 'text', 'tarnished@lands.between')
          : `${authField('authCode', 'Recovery code', 'text', 'ERD-XXXX-XXXX-XXXX', 'style="text-transform:uppercase"')}
             ${authField('authNewPassword', 'New password', 'password', 'At least 8 characters')}
             ${authField('authConfirm', 'Confirm new password', 'password', 'Type it again')}`
      }
      <button class="btn btn-primary auth-submit ${busy ? 'loading' : ''}" data-auth="submit" type="button" ${disable}>${
        stepOne ? 'Find my account' : 'Set new password'
      }</button>
      <p class="auth-note"><button class="auth-link" data-auth="mode" data-mode="login" type="button">Back to log in</button></p>`;
  } else if (mode === 'recovery') {
    card = `
      <h1>Save your recovery code</h1>
      <p class="auth-sub">${esc(S.auth.error || 'This is the only way to reset your password — there is no email recovery on this PC.')}</p>
      <div class="recovery-box">
        <div class="recovery-code">${esc(S.auth.recoveryCode)}</div>
        <div class="recovery-hint">Write it down or copy it somewhere safe.</div>
      </div>
      <button class="btn auth-submit" data-auth="copyCode" type="button">${icon('copy')} Copy code</button>
      <button class="btn btn-primary auth-submit" data-auth="enter" type="button">Enter the launcher</button>`;
  }

  root.innerHTML = `
    <div class="auth-shell">
      <div class="auth-brand">
        ${AUTH_BRAND}
        <div class="auth-brand-title">ERDTREE</div>
        <div class="auth-brand-sub">Launcher</div>
        <p class="auth-brand-copy">One launcher for Elden Ring: launch the game, browse real mods, keep your builds and play Seamless co-op with friends.</p>
        <ul class="auth-points">
          ${AUTH_POINTS.map(
            ([iconName, title, sub]) => `<li>${icon(iconName)}<div>${title}<span>${sub}</span></div></li>`
          ).join('')}
        </ul>
      </div>
      <div class="auth-card">${card}</div>
    </div>`;
  // Keep what the user already typed when the card is re-rendered (busy or
  // error states) so a wrong password does not wipe the whole form.
  const draft = S.auth.draft || {};
  root.querySelectorAll('input[id]').forEach((input) => {
    if (draft[input.id] != null && input.type !== 'checkbox') input.value = draft[input.id];
  });
}

function authRead(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}

function authError(message) {
  S.auth.error = message;
  S.auth.busy = '';
  renderAuth();
}

async function finishLogin(result) {
  if (result?.session) S.auth.session = result.session;
  S.auth.error = '';
  S.auth.busy = '';
  S.auth.draft = {};
  if (result?.recoveryCode) {
    S.auth.recoveryCode = result.recoveryCode;
    S.auth.mode = 'recovery';
    renderAuth();
    return;
  }
  await startApp();
}

async function submitAuth() {
  if (S.auth.busy) return;
  const mode = S.auth.mode;
  const remember = document.getElementById('authRemember')?.checked ?? true;
  const identifier = authRead('authIdentifier');
  const username = authRead('authUsername');
  const email = authRead('authEmail');
  const password = document.getElementById('authPassword')?.value || '';
  const confirm = document.getElementById('authConfirm')?.value || '';
  const code = authRead('authCode');
  const newPassword = document.getElementById('authNewPassword')?.value || '';
  S.auth.remember = remember;
  S.auth.busy = mode;
  S.auth.error = '';
  renderAuth();
  try {
    if (mode === 'login') {
      if (!identifier || !password) throw new Error('Enter your username/email and password.');
      const result = await api.account('login', { identifier, password, remember });
      await finishLogin(result);
      return;
    }
    if (mode === 'register') {
      if (password !== confirm) throw new Error('The two passwords do not match.');
      const result = await api.account('register', { username, email, password, remember });
      await finishLogin(result);
      return;
    }
    if (mode === 'forgot') {
      if (S.auth.resetStep !== 2) {
        if (!identifier) throw new Error('Enter your email or username.');
        await api.account('forgot', { identifier });
        S.auth.identifier = identifier;
        S.auth.resetStep = 2;
        S.auth.busy = '';
        renderAuth();
        setTimeout(() => document.getElementById('authCode')?.focus(), 80);
        return;
      }
      if (newPassword !== confirm) throw new Error('The two passwords do not match.');
      if (!code) throw new Error('Enter your recovery code.');
      const result = await api.account('resetPassword', { identifier: S.auth.identifier, code, newPassword });
      S.auth.recoveryCode = result.recoveryCode;
      S.auth.resetStep = 1;
      S.auth.error = 'Password updated. Here is your new recovery code — the old one no longer works.';
      S.auth.mode = 'recovery';
      S.auth.busy = '';
      renderAuth();
      return;
    }
  } catch (err) {
    authError(err.message || 'Something went wrong.');
  }
}

async function guestLogin() {
  if (S.auth.busy) return;
  S.auth.busy = 'guest';
  S.auth.error = '';
  renderAuth();
  try {
    const result = await api.account('guest');
    await finishLogin(result);
  } catch (err) {
    authError(err.message || 'Guest mode failed.');
  }
}

async function logoutAccount() {
  closeModal();
  try {
    await api.account('logout');
  } catch {
    /* already signed out */
  }
  S.state = null;
  S.builds = null;
  S.workshop.data = null;
  S.social = null;
  S.auth.session = null;
  showAuth('login');
}

function openAccountMenu() {
  const session = S.auth.session;
  if (!session?.loggedIn) return;
  const account = session.account || {};
  const level = currentLevel();
  openModal({
    title: 'Account',
    body: `<div class="account-menu">
      <div class="account-menu-head">
        ${accountAvatarHtml(session)}
        <div>
          <div class="account-menu-name">${esc(account.username || 'Tarnished')}</div>
          <div class="account-menu-sub">${esc(account.email || (session.guest ? 'Guest session — nothing is saved' : ''))}${level ? ` · Level ${level}` : ''}</div>
        </div>
      </div>
      <div class="account-menu-list">
        ${
          session.guest
            ? `<button class="account-menu-item" data-menu="createAccount">${icon('user')} Create an account</button>`
            : `<button class="account-menu-item" data-menu="profile">${icon('pencil')} Edit profile</button>
               <button class="account-menu-item" data-menu="avatar">${icon('camera')} Change profile picture</button>`
        }
        <button class="account-menu-item" data-menu="settings">${icon('gear')} Launcher settings</button>
        <button class="account-menu-item danger" data-menu="logout">${icon('arrowLeft')} Sign out</button>
      </div>
    </div>`,
  });
  const root = document.getElementById('modalRoot');
  root.querySelectorAll('[data-menu]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.menu;
      if (action === 'logout') {
        await logoutAccount();
        return;
      }
      if (action === 'createAccount') {
        closeModal();
        showAuth('register');
        return;
      }
      if (action === 'settings') {
        closeModal();
        go('settings');
        return;
      }
      if (action === 'avatar') {
        await pickAvatar(true);
        return;
      }
      if (action === 'profile') {
        openProfileModal();
      }
    });
  });
}

async function pickAvatar(fromMenu = false) {
  try {
    const picked = await api.account('pickAvatar');
    if (!picked?.data) return;
    const result = await api.account('update', { avatar: picked.data });
    S.auth.session = result.session;
    renderAccountChip();
    toast('Profile picture updated.', 'ok');
    if (fromMenu) openProfileModal();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function openProfileModal() {
  const session = S.auth.session;
  if (!session?.loggedIn) return;
  const account = session.account || {};
  openModal({
    title: 'Edit profile',
    body: `<div class="account-menu" dir="ltr">
      <div class="avatar-picker">
        ${accountAvatarHtml(session)}
        <div>
          <button class="btn btn-sm" data-profile-act="avatar" type="button">${icon('camera')} Choose picture</button>
          <div class="hint tiny" style="margin-top:6px">PNG, JPG or WebP. Stored on this PC.</div>
        </div>
      </div>
      <div class="auth-field" style="margin:0">
        <label>Username</label>
        <input class="input" id="profileUsername" value="${esc(account.username || '')}" maxlength="24" />
      </div>
      <div class="auth-field" style="margin:0">
        <label>Email</label>
        <input class="input" id="profileEmail" value="${esc(account.email || '')}" />
      </div>
    </div>`,
    actions: [
      { label: 'Cancel', cls: 'btn-ghost' },
      {
        label: 'Save profile',
        cls: 'btn-primary',
        onClick: async (btn) => {
          setBusy(btn, true);
          try {
            const username = document.getElementById('profileUsername')?.value.trim();
            const email = document.getElementById('profileEmail')?.value.trim();
            const result = await api.account('update', { username, email });
            S.auth.session = result.session;
            renderAccountChip();
            toast('Profile saved.', 'ok');
            return true;
          } catch (err) {
            toast(err.message, 'error');
            setBusy(btn, false);
            return false;
          }
        },
      },
    ],
  });
  document.querySelectorAll('[data-profile-act="avatar"]').forEach((btn) => {
    btn.addEventListener('click', () => pickAvatar(false).then(() => openProfileModal()));
  });
}

async function runGlobalSearch(raw) {
  const query = String(raw || '').trim();
  if (!query) return;
  const lower = query.toLowerCase();
  const buildHit = (S.builds?.builds || []).some(
    (b) => `${b.name} ${b.tagline || ''} ${(b.tags || []).join(' ')}`.toLowerCase().includes(lower)
  );
  const friendHit = (S.social?.friends || []).some((f) => String(f.name || '').toLowerCase().includes(lower));
  if (!S.workshop.data) {
    await loadWorkshop().catch(() => null);
  }
  const modHit = (S.workshop.data?.items || []).some((m) => m.name.toLowerCase().includes(lower));
  if (buildHit && !modHit) {
    S.buildQuery = query;
    go('builds');
    return;
  }
  if (modHit) {
    S.workshop.tab = 'discover';
    S.workshop.query = query;
    S.workshop.filter = 'all';
    S.workshop.limit = 48;
    go('mods');
    return;
  }
  if (friendHit) {
    go('friends');
    return;
  }
  S.workshop.tab = 'discover';
  S.workshop.query = query;
  go('mods');
}


async function startApp() {
  hideAuth();
  try {
    S.state = await call('state', {}, { silent: false });
    S.version = S.state.version;
    S.updates = S.state.updates || null;
    if (window.I18N) I18N.setLang(S.state.settings?.language || 'ar');
    render();
    startPolling();
    loadSocial().catch(() => {});
    loadBuilds().catch(() => {});
    if (!S.chromeTimer) {
      S.chromeTimer = setInterval(() => {
        if (S.view === 'home' || S.view === 'trainer') updateChrome();
      }, 5000);
    }
    if (S.state?.workshop?.needsSetup && !S.wizDismissed) {
      setTimeout(() => {
        if (!S.setup.open && S.state?.workshop?.needsSetup && !S.wizDismissed) openWizard(1);
      }, 350);
    }
    if (!S.liveTimer) {
      S.liveTimer = setInterval(async () => {
        if (S.view !== 'trainer' || !S.state?.trainer?.attached) return;
        try {
          const live = await call('trainer.live', {}, { silent: true });
          S.state.trainer = live;
          applyTrainerLive(live);
        } catch {
          /* game closed or helper busy — next tick will retry */
        }
      }, 2500);
    }
  } catch (err) {
    document.getElementById('viewMount').innerHTML = `<div class="banner danger" style="margin:24px">${icon('alert')}<div>Could not load the launcher: ${esc(err.message)}</div></div>`;
  }
}

async function boot() {
  bindEvents();
  if (typeof api.onEvent === 'function') api.onEvent(handleLauncherEvent);
  if (typeof api.onAccount === 'function') {
    api.onAccount((session) => {
      S.auth.session = session;
      if (session?.loggedIn) {
        renderAccountChip();
      } else if (S.state) {
        S.state = null;
        showAuth('login');
      }
    });
  }
  try {
    const session = await api.account('status');
    S.auth.session = session;
    if (!session.loggedIn) {
      showAuth('login');
      return;
    }
    await startApp();
  } catch (err) {
    showAuth('login');
    authError(err.message || 'Could not reach the account service.');
  }
}

boot();
