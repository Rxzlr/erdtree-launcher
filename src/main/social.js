const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RELAYS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const TOPIC_ROOT = 'erdtree/v1';
const HEARTBEAT_MS = 15000;
const PROFILE_MS = 60000;
const OFFLINE_MS = 75000;
const MAX_MESSAGES = 120;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `ER-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

function normalizeCode(raw) {
  const clean = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const match = clean.match(/^(?:ER)?([A-Z0-9]{8})$/);
  if (!match) return '';
  const code = match[1];
  return `ER-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

function seal(secret, payload) {
  if (!secret) return { plain: payload };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sha256(secret), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {
    enc: body.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function unseal(secret, sealed) {
  if (!sealed) return null;
  if (sealed.plain) return sealed.plain;
  if (!secret || !sealed.enc) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', sha256(secret), Buffer.from(sealed.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
    const text = Buffer.concat([decipher.update(Buffer.from(sealed.enc, 'base64')), decipher.final()]).toString('utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function encodeLength(length) {
  const bytes = [];
  let value = length;
  do {
    let byte = value % 128;
    value = Math.floor(value / 128);
    if (value > 0) byte |= 0x80;
    bytes.push(byte);
  } while (value > 0);
  return Buffer.from(bytes);
}

function mqttString(value) {
  const body = Buffer.from(String(value), 'utf8');
  const head = Buffer.alloc(2);
  head.writeUInt16BE(body.length, 0);
  return Buffer.concat([head, body]);
}

function packet(type, body) {
  return Buffer.concat([Buffer.from([type]), encodeLength(body.length), body]);
}

class MqttLink {
  constructor({ getUrl, onMessage, onStatus }) {
    this.getUrl = getUrl;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.ws = null;
    this.buffer = Buffer.alloc(0);
    this.ready = false;
    this.closed = false;
    this.timers = [];
    this.subs = new Set();
    this.relayIndex = 0;
    this.retry = 0;
    this.clientId = `erdtree-${crypto.randomBytes(6).toString('hex')}`;
  }

  url() {
    if (typeof this.getUrl === 'function') {
      const custom = this.getUrl();
      if (custom) return custom;
    }
    return RELAYS[this.relayIndex % RELAYS.length];
  }

  start() {
    this.closed = false;
    this.connect();
  }

  connect() {
    if (this.closed) return;
    const url = this.url();
    let ws;
    try {
      ws = new WebSocket(url, ['mqtt']);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    this.buffer = Buffer.alloc(0);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      const body = Buffer.concat([
        mqttString('MQTT'),
        Buffer.from([4, 0x02, 0, 60]),
        mqttString(this.clientId),
      ]);
      ws.send(packet(0x10, body));
    };
    ws.onmessage = async (event) => {
      try {
        const data = event.data;
        const chunk = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(await data.arrayBuffer());
        this.consume(chunk);
      } catch {
        /* ignore malformed frame */
      }
    };
    ws.onerror = () => {
      /* close handler reconnects */
    };
    ws.onclose = () => {
      const wasReady = this.ready;
      this.ready = false;
      this.ws = null;
      this.clearTimers();
      if (this.onStatus) this.onStatus({ connected: false, relay: url });
      if (wasReady) this.retry = 0;
      this.scheduleReconnect();
    };
  }

  scheduleReconnect() {
    if (this.closed) return;
    this.retry += 1;
    const delay = Math.min(30000, 1200 * this.retry);
    const timer = setTimeout(() => {
      if (!this.closed) {
        this.relayIndex += 1;
        this.connect();
      }
    }, delay);
    this.timers.push(timer);
  }

  clearTimers() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  consume(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      let multiplier = 1;
      let length = 0;
      let index = 1;
      let byte = 0;
      do {
        if (index >= this.buffer.length) return;
        byte = this.buffer[index++];
        length += (byte & 0x7f) * multiplier;
        multiplier *= 128;
        if (multiplier > 128 * 128 * 128) return;
      } while (byte & 0x80);
      if (this.buffer.length < index + length) return;
      const type = this.buffer[0] >> 4;
      const body = this.buffer.subarray(index, index + length);
      this.buffer = this.buffer.subarray(index + length);
      this.handlePacket(type, body);
    }
  }

  handlePacket(type, body) {
    if (type === 2) {
      this.ready = true;
      this.retry = 0;
      this.pingTimer = setInterval(() => {
        try {
          this.ws?.send(packet(0xc0, Buffer.alloc(0)));
        } catch {
          /* ignore */
        }
      }, 25000);
      this.pingTimer.unref?.();
      if (this.onStatus) this.onStatus({ connected: true, relay: this.url() });
      for (const topic of this.subs) this.sendSubscribe(topic);
      return;
    }
    if (type === 3) {
      const topicLength = body.readUInt16BE(0);
      const topic = body.subarray(2, 2 + topicLength).toString('utf8');
      const payload = body.subarray(2 + topicLength).toString('utf8');
      if (this.onMessage) this.onMessage(topic, payload);
    }
  }

  sendSubscribe(topic) {
    if (!this.ready || !this.ws) return;
    const id = Math.floor(Math.random() * 60000) + 1;
    const packetId = Buffer.alloc(2);
    packetId.writeUInt16BE(id, 0);
    const body = Buffer.concat([packetId, mqttString(topic), Buffer.from([0])]);
    try {
      this.ws.send(packet(0x82, body));
    } catch {
      /* ignore */
    }
  }

  subscribe(topic) {
    if (this.subs.has(topic)) return;
    this.subs.add(topic);
    this.sendSubscribe(topic);
  }

  publish(topic, payload, { retain = false } = {}) {
    if (!this.ready || !this.ws) return false;
    const body = Buffer.concat([mqttString(topic), Buffer.from(String(payload), 'utf8')]);
    try {
      this.ws.send(packet(retain ? 0x31 : 0x30, body));
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.closed = true;
    this.ready = false;
    this.clearTimers();
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}

function cleanStats(raw) {
  const stats = raw && typeof raw === 'object' ? raw : {};
  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  };
  return {
    level: Math.min(number(stats.level), 713),
    characters: Math.min(number(stats.characters), 999),
    mods: Math.min(number(stats.mods), 9999),
    builds: Math.min(number(stats.builds), 9999),
    hours: Math.min(number(stats.hours), 99999),
  };
}

class Social {
  constructor({ userData, getGameStatus, joining, getProfile, setAbout }) {
    this.file = path.join(userData, 'social.json');
    this.getGameStatus = getGameStatus || (() => ({ running: false, inGame: false, activity: '' }));
    this.getProfile = getProfile || (() => ({ about: '', stats: {} }));
    this.setAboutHook = typeof setAbout === 'function' ? setAbout : null;
    this.joining = joining || null;
    this.events = null;
    this.data = this.load();
    this.ensureIdentity();
    this.profiles = new Map();
    this.incomingInvite = null;
    this.connected = false;
    this.relay = '';
    this.activity = '';
    this.link = new MqttLink({
      getUrl: () => this.data.relayUrl,
      onMessage: (topic, payload) => this.handleMessage(topic, payload),
      onStatus: (status) => this.handleLinkStatus(status),
    });
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        version: 1,
        identity: parsed.identity || null,
        relayUrl: parsed.relayUrl || '',
        friends: Array.isArray(parsed.friends) ? parsed.friends : [],
        outgoing: Array.isArray(parsed.outgoing) ? parsed.outgoing : [],
        incoming: Array.isArray(parsed.incoming) ? parsed.incoming : [],
        messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
        name: parsed.name || '',
        sharedPassword: String(parsed.sharedPassword || '').slice(0, 127),
      };
    } catch {
      return {
        version: 1,
        identity: null,
        relayUrl: '',
        friends: [],
        outgoing: [],
        incoming: [],
        messages: {},
        name: '',
        sharedPassword: '',
      };
    }
  }

  ensureIdentity() {
    if (!this.data.identity) {
      this.data.identity = { id: crypto.randomUUID(), code: randomCode(), createdAt: Date.now() };
      this.persist();
    }
    if (!this.data.name) this.data.name = 'Tarnished';
  }

  persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  setEvents(callback) {
    this.events = callback;
  }

  emit(payload) {
    if (typeof this.events === 'function') {
      try {
        this.events(payload);
      } catch {
        /* ignore renderer errors */
      }
    }
  }

  topic(code, kind) {
    return `${TOPIC_ROOT}/id/${code.replace(/-/g, '').toLowerCase()}/${kind}`;
  }

  get code() {
    return this.data.identity.code;
  }

  start() {
    this.link.start();
  }

  stop() {
    this.link.stop();
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.friendTimer) clearInterval(this.friendTimer);
    if (this.profileTimer) clearInterval(this.profileTimer);
  }

  handleLinkStatus({ connected, relay }) {
    const first = connected && !this.connected;
    this.connected = !!connected;
    this.relay = relay || '';
    if (connected) {
      this.link.subscribe(this.topic(this.code, 'inbox'));
      this.link.subscribe(`${TOPIC_ROOT}/id/+/profile`);
      for (const friend of this.data.friends) {
        this.link.subscribe(this.topic(friend.code, 'presence'));
      }
      if (first) {
        this.publishProfile();
        this.publishPresence();
      }
      if (!this.heartbeat) {
        this.heartbeat = setInterval(() => this.publishPresence(), HEARTBEAT_MS);
        this.heartbeat.unref?.();
      }
      if (!this.profileTimer) {
        this.profileTimer = setInterval(() => this.publishProfile(), PROFILE_MS);
        this.profileTimer.unref?.();
      }
      if (!this.friendTimer) {
        this.friendTimer = setInterval(() => this.prunePresence(), 10000);
        this.friendTimer.unref?.();
      }
    }
    this.emit({ type: 'social:link', connected: this.connected, relay: this.relay });
  }

  profileSnapshot() {
    let raw = {};
    try {
      raw = this.getProfile() || {};
    } catch {
      raw = {};
    }
    return {
      about: String(raw.about || '').trim().slice(0, 300),
      stats: cleanStats(raw.stats),
    };
  }

  publishPresence() {
    if (!this.connected) return;
    const status = this.getGameStatus() || {};
    const profile = this.profileSnapshot();
    const payload = {
      v: 1,
      code: this.code,
      name: this.data.name,
      status: status.inGame ? 'ingame' : status.running ? 'menu' : 'online',
      activity: status.inGame
        ? 'In-game — Elden Ring'
        : this.activity || status.activity || (status.running ? 'At the main menu' : 'In the launcher'),
      about: profile.about,
      stats: profile.stats,
      at: Date.now(),
    };
    this.link.publish(this.topic(this.code, 'presence'), JSON.stringify(payload), { retain: true });
  }

  publishProfile() {
    if (!this.connected) return;
    const profile = this.profileSnapshot();
    const payload = {
      v: 1,
      code: this.code,
      name: this.data.name,
      about: profile.about,
      stats: profile.stats,
      at: Date.now(),
    };
    this.link.publish(this.topic(this.code, 'profile'), JSON.stringify(payload), { retain: true });
  }

  prunePresence() {
    const now = Date.now();
    let changed = false;
    for (const friend of this.data.friends) {
      if (friend.status !== 'offline' && friend.lastSeen && now - friend.lastSeen > OFFLINE_MS) {
        friend.status = 'offline';
        friend.activity = '';
        friend.game = '';
        changed = true;
        this.emit({ type: 'social:presence', code: friend.code, status: 'offline' });
      }
    }
    if (changed) this.persist();
  }

  handleMessage(topic, raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (!message || message.v !== 1) return;
    if (topic.endsWith('/profile')) {
      if (message.code && message.code !== this.code) {
        this.profiles.set(message.code, {
          code: message.code,
          name: message.name || message.code,
          about: String(message.about || '').slice(0, 300),
          stats: cleanStats(message.stats),
          at: message.at || Date.now(),
        });
      }
      return;
    }
    if (topic.endsWith('/presence')) {
      this.handlePresence(message);
      return;
    }
    if (!topic.endsWith('/inbox')) return;
    if (message.to && message.to !== this.code) return;
    switch (message.t) {
      case 'req':
        this.handleRequest(message);
        break;
      case 'accept':
        this.handleAccept(message);
        break;
      case 'decline':
        this.data.outgoing = this.data.outgoing.filter((item) => item.code !== message.from?.code);
        this.persist();
        this.emit({ type: 'social:requests', requests: this.requests() });
        break;
      case 'chat':
        this.handleChat(message);
        break;
      case 'invite':
        this.handleInvite(message);
        break;
      case 'join':
        this.handleJoinRequest(message);
        break;
      default:
        break;
    }
  }

  handlePresence(message) {
    const friend = this.data.friends.find((item) => item.code === message.code);
    if (!friend) return;
    const next = {
      name: message.name || friend.name,
      status: message.status || 'online',
      activity: message.activity || '',
    };
    const changed =
      friend.name !== next.name || friend.status !== next.status || friend.activity !== next.activity;
    friend.name = next.name;
    friend.status = next.status;
    friend.activity = next.activity;
    friend.lastSeen = message.at || Date.now();
    if (changed) {
      this.persist();
      this.emit({
        type: 'social:presence',
        code: friend.code,
        status: friend.status,
        activity: friend.activity,
        name: friend.name,
      });
    }
  }

  handleRequest(message) {
    if (!message.from?.code || message.from.code === this.code) return;
    if (this.data.friends.some((item) => item.code === message.from.code)) return;
    const existing = this.data.incoming.find((item) => item.code === message.from.code);
    if (existing) return;
    this.data.incoming.push({
      code: message.from.code,
      name: message.from.name || message.from.code,
      secret: message.secret || '',
      at: message.at || Date.now(),
    });
    this.persist();
    this.emit({ type: 'social:request', request: message.from, requests: this.requests() });
  }

  handleAccept(message) {
    if (!message.from?.code) return;
    const secret = message.secret || '';
    let friend = this.data.friends.find((item) => item.code === message.from.code);
    if (!friend) {
      friend = {
        code: message.from.code,
        name: message.from.name || message.from.code,
        secret,
        status: 'online',
        activity: '',
        lastSeen: Date.now(),
      };
      this.data.friends.push(friend);
    } else {
      friend.name = message.from.name || friend.name;
      if (secret) friend.secret = secret;
    }
    this.data.outgoing = this.data.outgoing.filter((item) => item.code !== message.from.code);
    this.persist();
    this.link.subscribe(this.topic(friend.code, 'presence'));
    this.emit({ type: 'social:friend', friend: this.publicFriend(friend) });
  }

  handleChat(message) {
    const friend = this.data.friends.find((item) => item.code === message.from?.code);
    if (!friend) return;
    const body = unseal(friend.secret, message.sealed);
    if (!body || !body.text) return;
    const entry = {
      id: message.id || crypto.randomUUID(),
      from: 'them',
      text: String(body.text).slice(0, 2000),
      at: message.at || Date.now(),
      read: false,
    };
    this.pushMessage(friend.code, entry);
    this.emit({ type: 'social:chat', code: friend.code, name: friend.name, message: entry });
  }

  handleInvite(message) {
    const friend = this.data.friends.find((item) => item.code === message.from?.code);
    if (!friend) return;
    const body = unseal(friend.secret, message.sealed) || {};
    this.incomingInvite = {
      id: message.id || crypto.randomUUID(),
      code: friend.code,
      name: message.from?.name || friend.name,
      password: String(body.password || ''),
      activity: String(body.activity || 'Elden Ring'),
      at: message.at || Date.now(),
    };
    this.emit({ type: 'social:invite', invite: this.incomingInvite });
  }

  handleJoinRequest(message) {
    if (!message.from?.code) return;
    const friend = this.data.friends.find((item) => item.code === message.from.code);
    if (!friend) return;
    this.emit({ type: 'social:joinRequest', code: friend.code, name: friend.name });
    // Auto-answer with an invite so the friend gets a one-click popup.
    try {
      this.invite(friend.code);
    } catch {
      /* ignore */
    }
  }

  setActivity(text) {
    const clean = String(text || '').trim().slice(0, 80);
    if (this.activity === clean) return {};
    this.activity = clean;
    this.publishPresence();
    return {};
  }

  pushMessage(code, entry) {
    if (!this.data.messages[code]) this.data.messages[code] = [];
    this.data.messages[code].push(entry);
    if (this.data.messages[code].length > MAX_MESSAGES) {
      this.data.messages[code] = this.data.messages[code].slice(-MAX_MESSAGES);
    }
    this.persist();
  }

  publicFriend(friend) {
    const messages = this.data.messages[friend.code] || [];
    const remote = this.profiles.get(friend.code) || null;
    return {
      code: friend.code,
      name: friend.name,
      status: friend.status || 'offline',
      activity: friend.activity || '',
      lastSeen: friend.lastSeen || null,
      about: remote?.about || '',
      stats: remote?.stats || null,
      profileAt: remote?.at || null,
      unread: messages.filter((m) => m.from === 'them' && !m.read).length,
      messages: messages.slice(-40),
    };
  }

  requests() {
    return {
      incoming: this.data.incoming.map((item) => ({ code: item.code, name: item.name, at: item.at })),
      outgoing: this.data.outgoing.map((item) => ({ code: item.code, name: item.name, at: item.at })),
    };
  }

  state() {
    const friends = this.data.friends
      .map((friend) => this.publicFriend(friend))
      .sort((a, b) => {
        const rank = { ingame: 0, online: 1, menu: 2, offline: 3 };
        return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || a.name.localeCompare(b.name);
      });
    return {
      identity: {
        code: this.code,
        name: this.data.name,
        about: this.profileSnapshot().about,
        stats: this.profileSnapshot().stats,
      },
      connected: this.connected,
      relay: this.relay,
      friends,
      requests: this.requests(),
      incomingInvite: this.incomingInvite,
      profiles: this.profiles.size,
      unread: friends.reduce((sum, friend) => sum + friend.unread, 0),
      pending: this.data.outgoing.length + this.data.incoming.length + (this.incomingInvite ? 1 : 0),
      activity: this.activity || '',
    };
  }

  search(query) {
    const needle = String(query || '').trim().toLowerCase();
    if (needle.length < 2) return [];
    return [...this.profiles.values()]
      .filter((profile) => {
        if (!profile || profile.code === this.code) return false;
        return (
          String(profile.name || '').toLowerCase().includes(needle) ||
          String(profile.code || '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .slice(0, 6)
      .map((profile) => ({
        code: profile.code,
        name: profile.name,
        about: String(profile.about || '').slice(0, 80),
        level: profile.stats?.level || 0,
        friend: this.data.friends.some((item) => item.code === profile.code),
        outgoing: this.data.outgoing.some((item) => item.code === profile.code),
      }));
  }

  setAbout(text) {
    const clean = String(text || '').trim().slice(0, 300);
    if (this.setAboutHook) this.setAboutHook(clean);
    this.publishProfile();
    this.publishPresence();
    return this.state();
  }

  setName(name) {
    const clean = String(name || '').trim().slice(0, 28);
    if (!clean) throw new Error('Enter your friend name first.');
    this.data.name = clean;
    this.persist();
    this.publishProfile();
    this.publishPresence();
    return this.state();
  }

  addFriend(raw, { name = '' } = {}) {
    const query = String(raw || '').trim();
    if (!query) throw new Error('Enter a friend name or code.');
    const code = normalizeCode(query);
    if (code) {
      if (code === this.code) throw new Error("That's your own code. Share it with a friend instead.");
      if (this.data.friends.some((item) => item.code === code)) throw new Error('This Tarnished is already in your friends list.');
      if (this.data.outgoing.some((item) => item.code === code)) throw new Error('A friend request is already on its way.');
      const secret = crypto.randomBytes(24).toString('hex');
      this.data.outgoing.push({ code, name: name || code, secret, at: Date.now() });
      this.persist();
      this.sendInbox(code, {
        v: 1,
        t: 'req',
        id: crypto.randomUUID(),
        from: { code: this.code, name: this.data.name },
        to: code,
        secret,
        at: Date.now(),
      });
      this.emit({ type: 'social:requests', requests: this.requests() });
      return { mode: 'sent', code };
    }
    const needle = query.toLowerCase();
    const matches = [...this.profiles.values()]
      .filter((profile) => profile.code !== this.code && String(profile.name || '').toLowerCase().includes(needle))
      .slice(0, 8)
      .map((profile) => ({ code: profile.code, name: profile.name }));
    if (matches.length) return { mode: 'matches', matches };
    return {
      mode: 'none',
      message: 'No Tarnished with that name is online right now. Ask for their friend code and add it directly.',
    };
  }

  respondRequest(code, accept) {
    const request = this.data.incoming.find((item) => item.code === code);
    if (!request) throw new Error('This request is gone.');
    this.data.incoming = this.data.incoming.filter((item) => item.code !== code);
    if (accept) {
      const friend = {
        code: request.code,
        name: request.name,
        secret: request.secret || crypto.randomBytes(24).toString('hex'),
        status: 'online',
        activity: '',
        lastSeen: Date.now(),
      };
      this.data.friends.push(friend);
      this.sendInbox(friend.code, {
        v: 1,
        t: 'accept',
        id: crypto.randomUUID(),
        from: { code: this.code, name: this.data.name },
        to: friend.code,
        secret: friend.secret,
        at: Date.now(),
      });
      this.link.subscribe(this.topic(friend.code, 'presence'));
      this.persist();
      this.emit({ type: 'social:friend', friend: this.publicFriend(friend) });
    } else {
      this.persist();
    }
    this.emit({ type: 'social:requests', requests: this.requests() });
    return this.state();
  }

  sendInbox(code, payload) {
    return this.link.publish(this.topic(code, 'inbox'), JSON.stringify(payload));
  }

  sendChat(code, text) {
    const clean = String(text || '').trim().slice(0, 2000);
    if (!clean) throw new Error('Type a message first.');
    const friend = this.data.friends.find((item) => item.code === code);
    if (!friend) throw new Error('Add this friend first.');
    const entry = { id: crypto.randomUUID(), from: 'me', text: clean, at: Date.now(), read: true };
    this.pushMessage(code, entry);
    this.sendInbox(code, {
      v: 1,
      t: 'chat',
      id: entry.id,
      from: { code: this.code, name: this.data.name },
      to: code,
      at: entry.at,
      sealed: seal(friend.secret, { text: clean }),
    });
    return { message: entry, friend: this.publicFriend(friend) };
  }

  invite(code) {
    const friend = this.data.friends.find((item) => item.code === code);
    if (!friend) throw new Error('Add this friend first.');
    const status = this.getGameStatus() || {};
    const password = String(this.data.sharedPassword || '').slice(0, 127);
    this.sendInbox(code, {
      v: 1,
      t: 'invite',
      id: crypto.randomUUID(),
      from: { code: this.code, name: this.data.name },
      to: code,
      at: Date.now(),
      sealed: seal(friend.secret, { password, activity: status.activity || 'Elden Ring' }),
    });
    return { ok: true, code, name: friend.name };
  }

  join(code) {
    const friend = this.data.friends.find((item) => item.code === code);
    if (!friend) throw new Error('Add this friend first.');
    if (friend.status === 'offline') throw new Error(`${friend.name} is offline right now.`);
    this.sendInbox(code, {
      v: 1,
      t: 'join',
      id: crypto.randomUUID(),
      from: { code: this.code, name: this.data.name },
      to: code,
      at: Date.now(),
    });
    return { ok: true, name: friend.name };
  }

  async acceptInvite() {
    const invite = this.incomingInvite;
    if (!invite) throw new Error('No pending invite.');
    const result = await this.joining(invite);
    this.incomingInvite = null;
    this.emit({ type: 'social:inviteResolved', invite });
    return result;
  }

  declineInvite() {
    this.incomingInvite = null;
    this.emit({ type: 'social:inviteResolved' });
    return this.state();
  }

  markRead(code) {
    const messages = this.data.messages[code] || [];
    for (const message of messages) {
      if (message.from === 'them') message.read = true;
    }
    this.persist();
    return this.state();
  }

  setSharedPassword(password) {
    this.data.sharedPassword = String(password || '').slice(0, 127);
    this.persist();
  }

  clearInvite() {
    this.incomingInvite = null;
  }
}

module.exports = { Social, MqttLink, normalizeCode, RELAYS };
