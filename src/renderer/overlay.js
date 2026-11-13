/* Erdtree — in-game overlay for invites, friend requests and chat. */
const api = window.erdOverlay;
const card = document.getElementById('card');
let current = null;
let hideTimer = null;

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const initial = (name) => String(name || 'T').trim().charAt(0).toUpperCase() || 'T';

let audioCtx = null;
function chime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const now = audioCtx.currentTime;
    [880, 1174.66].forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + index * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    /* audio unavailable */
  }
}

function resize() {
  requestAnimationFrame(() => {
    const shell = document.querySelector('.overlay-shell');
    if (!shell) return;
    api.resize(Math.ceil(shell.getBoundingClientRect().height) + 4);
  });
}

function clearTimer() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
}

function close(delay = 0) {
  clearTimer();
  if (!delay) {
    api.hide();
    return;
  }
  hideTimer = setTimeout(() => api.hide(), delay);
}

function header(label) {
  return `<div class="eyebrow"><span class="dot"></span><span>${esc(label)}</span></div>`;
}

function who(name, sub) {
  return `<div class="who">
    <div class="avatar">${esc(initial(name))}</div>
    <div>
      <div class="name">${esc(name || 'Tarnished')}</div>
      <div class="sub">${sub}</div>
    </div>
  </div>`;
}

function status(text, error = false) {
  return `<div class="status ${error ? 'error' : ''}"><span class="mark">${error ? '!' : '✓'}</span><span>${esc(text)}</span></div>`;
}

function setBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = busy;
  if (busy) btn.dataset.label = btn.textContent;
  btn.textContent = busy ? 'Working…' : btn.dataset.label || btn.textContent;
}

function renderInvite(payload) {
  const invite = payload.invite || {};
  card.innerHTML = `
    ${header('Seamless Co-op invite')}
    ${who(invite.name, `<b>invites you to play</b> — ${esc(invite.activity || 'Elden Ring')}`)}
    <div class="row">
      <button class="btn gold" data-role="accept">Accept</button>
      <button class="btn ghost" data-role="decline">Decline</button>
    </div>
    <div class="hint">Accepting syncs the host's session password and joins you without a password prompt.</div>`;
  card.querySelector('[data-role="accept"]').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    setBusy(btn, true);
    try {
      const result = await api.invoke('social.accept');
      clearTimer();
      card.innerHTML = `
        ${header('Session joined')}
        ${who(invite.name, '<b>party ready</b>')}
        ${status(
          result.launched
            ? 'Password synced. Launching Elden Ring in Seamless co-op.'
            : result.message || 'Password synced. Use the in-game effigy to enter their world.'
        )}
        <div class="row"><button class="btn ghost" data-role="dismiss">Dismiss</button></div>`;
      card.querySelector('[data-role="dismiss"]').addEventListener('click', () => close());
      close(9000);
    } catch (err) {
      card.querySelector('.row').insertAdjacentHTML('afterend', status(err.message || 'Could not join.', true));
      setBusy(btn, false);
    }
    resize();
  });
  card.querySelector('[data-role="decline"]').addEventListener('click', async () => {
    try {
      await api.invoke('social.decline');
    } catch {
      /* ignore */
    }
    close();
  });
  resize();
}

function renderChat(payload) {
  const message = payload.message || {};
  clearTimer();
  card.innerHTML = `
    ${header('Message received')}
    ${who(payload.name, `<b>says</b>`)}
    <div class="message">${esc(message.text || '')}</div>
    <div class="reply">
      <input type="text" maxlength="2000" placeholder="Reply to ${esc(payload.name || 'friend')}…" data-role="input" />
      <button class="btn gold small" data-role="send">Send</button>
    </div>
    <div class="row"><button class="btn ghost small" data-role="dismiss">Close</button></div>`;
  const input = card.querySelector('[data-role="input"]');
  const send = async () => {
    const text = String(input.value || '').trim();
    if (!text) return;
    const btn = card.querySelector('[data-role="send"]');
    setBusy(btn, true);
    try {
      await api.invoke('social.chat', { code: payload.code, text });
      card.querySelector('.reply').innerHTML = status('Message sent.');
      close(1400);
    } catch (err) {
      setBusy(btn, false);
      card.querySelector('.reply').insertAdjacentHTML('afterend', status(err.message || 'Could not send.', true));
      resize();
    }
  };
  card.querySelector('[data-role="send"]').addEventListener('click', send);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') send();
  });
  card.querySelector('[data-role="dismiss"]').addEventListener('click', () => close());
  setTimeout(() => input.focus(), 60);
  resize();
}

function renderJoinRequest(payload) {
  card.innerHTML = `
    ${header('Co-op request')}
    ${who(payload.name, `<b>wants to join your world</b>`)}
    <div class="hint">Your session password was sent automatically. If they missed it, send it again.</div>
    <div class="row">
      <button class="btn gold" data-role="invite">Send Invite</button>
      <button class="btn ghost" data-role="dismiss">Dismiss</button>
    </div>`;
  card.querySelector('[data-role="invite"]').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    setBusy(btn, true);
    try {
      await api.invoke('social.invite', { code: payload.code });
      btn.textContent = 'Invite Sent';
    } catch (err) {
      btn.textContent = 'Failed';
      card.querySelector('.row').insertAdjacentHTML('afterend', status(err.message, true));
    }
    resize();
  });
  card.querySelector('[data-role="dismiss"]').addEventListener('click', () => close());
  resize();
}

function renderFriendRequest(payload) {
  const request = payload.request || {};
  card.innerHTML = `
    ${header('Friend request')}
    ${who(request.name, `<b>wants to be friends</b>`)}
    <div class="row">
      <button class="btn gold" data-role="accept">Accept</button>
      <button class="btn ghost" data-role="decline">Decline</button>
    </div>`;
  card.querySelector('[data-role="accept"]').addEventListener('click', async (event) => {
    setBusy(event.currentTarget, true);
    try {
      await api.invoke('social.respond', { code: request.code, accept: true });
      card.innerHTML = `${header('Friend added')}${who(request.name, '<b>is now your friend</b>')}`;
      close(1600);
    } catch (err) {
      card.innerHTML += status(err.message, true);
      resize();
    }
  });
  card.querySelector('[data-role="decline"]').addEventListener('click', async () => {
    try {
      await api.invoke('social.respond', { code: request.code, accept: false });
    } catch {
      /* ignore */
    }
    close();
  });
  resize();
}

function handle(payload) {
  if (!payload || !payload.type) return;
  // An invite stays on screen until the player accepts or declines it — a
  // chat that arrives afterwards must not replace the popup.
  if (current && current.type === 'social:invite' && payload.type !== 'social:invite' && payload.type !== 'social:inviteResolved') {
    return;
  }
  clearTimer();
  current = payload;
  if (payload.sound !== false && payload.type !== 'social:inviteResolved') chime();
  switch (payload.type) {
    case 'social:invite':
      renderInvite(payload);
      break;
    case 'social:chat':
      renderChat(payload);
      break;
    case 'social:joinRequest':
      renderJoinRequest(payload);
      break;
    case 'social:request':
      renderFriendRequest(payload);
      break;
    case 'social:inviteResolved':
      close();
      break;
    default:
      break;
  }
}

api.on(handle);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && current && current.type !== 'social:invite') close();
});
