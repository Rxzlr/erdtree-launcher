/* Erdtree Launcher — Friends relay self-test (two real clients).
 *
 * Spins up two Social instances with separate user-data folders and talks to
 * the public MQTT relay exactly like two installed launchers would:
 *   friend request → accept → chat → invite → accept (password sync) → join.
 *
 * Requires internet access to broker.emqx.io / broker.hivemq.com.
 * Run: node scripts/test-social.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Social } = require('../src/main/social');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(predicate, timeout = 25000, step = 250) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return true;
    await wait(step);
  }
  return false;
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-social-'));
  const events = { a: [], b: [] };
  let accepted = null;

  const make = (dir, slot) => {
    let about = dir === 'a' ? 'Moon sorcerer of Raya Lucaria' : 'Starscourge of Caelid';
    const social = new Social({
      userData: path.join(root, dir),
      getGameStatus: () => ({ running: true, inGame: dir === 'b', activity: '' }),
      getProfile: () => ({
        about,
        stats: { level: dir === 'a' ? 150 : 200, characters: 2, mods: 5, builds: 3 },
      }),
      setAbout: (text) => {
        about = text;
      },
      joining: async (invite) => {
        accepted = { slot, invite };
        return { joined: true, launched: false, password: invite.password };
      },
    });
    social.setName(dir === 'a' ? 'Rennala' : 'Radahn');
    social.setSharedPassword('moon-session');
    social.setEvents((payload) => events[slot].push(payload));
    social.start();
    return social;
  };

  const a = make('a', 'a');
  const b = make('b', 'b');
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
  };

  const bothOnline = await until(() => a.connected && b.connected, 30000);
  check('both clients reach the relay', bothOnline, `${a.relay || 'A'} / ${b.relay || 'B'}`);

  // Friend request by code.
  a.addFriend(b.code);
  const gotRequest = await until(() => b.state().requests.incoming.some((r) => r.code === a.code), 15000);
  check('friend request delivered', gotRequest);
  if (gotRequest) b.respondRequest(a.code, true);
  const becameFriends = await until(
    () => a.state().friends.some((f) => f.code === b.code) && b.state().friends.some((f) => f.code === a.code),
    15000
  );
  check('accept creates the friend on both sides', becameFriends);

  // Presence: B reports In Game.
  const sawPresence = await until(() => a.state().friends.find((f) => f.code === b.code)?.status === 'ingame', 20000);
  check('in-game presence shows up', sawPresence, a.state().friends.find((f) => f.code === b.code)?.status);

  // Chat.
  a.sendChat(b.code, 'Meet me at the Erdtree');
  const gotChat = await until(
    () => b.state().friends.find((f) => f.code === a.code)?.messages.some((m) => m.text === 'Meet me at the Erdtree'),
    15000
  );
  check('encrypted chat delivered', gotChat);

  // Profile card data (about + real stats) published over the retained topic.
  const profileSeen = await until(
    () => b.search('Rennala').some((p) => p.code === a.code && p.level === 150 && /Raya Lucaria/.test(p.about)),
    15000
  );
  check('published profile (about + stats) reaches friends', profileSeen, JSON.stringify(b.search('Rennala')[0] || null));
  a.setAbout("Ranni's chosen consort");
  const aboutSync = await until(
    () => b.search('Rennala').some((p) => p.code === a.code && /Ranni/.test(p.about)),
    15000
  );
  check('About me updates live on the friend card', aboutSync);

  // Invite A → B, accept on B (password sync).
  a.invite(b.code);
  const gotInvite = await until(() => b.state().incomingInvite?.code === a.code, 15000);
  check('invite popup delivered', gotInvite);
  if (gotInvite) await b.acceptInvite();
  check('accept runs the join handler with the host password', accepted?.slot === 'b' && accepted.invite.password === 'moon-session', JSON.stringify(accepted));

  // Join B → A: A auto-answers with an invite, B gets it.
  b.join(a.code);
  const autoInvite = await until(() => b.state().incomingInvite?.code === a.code, 15000);
  check('join request auto-answered with an invite', autoInvite);
  check('host sees the join request event', events.a.some((e) => e.type === 'social:joinRequest'));

  // Mark read + persistence.
  b.markRead(a.code);
  const reloaded = new Social({ userData: path.join(root, 'b'), getGameStatus: () => ({}) });
  check('friends + messages persist on disk', reloaded.state().friends.some((f) => f.code === a.code));
  check('shared password persists', reloaded.data.sharedPassword === 'moon-session');

  a.stop();
  b.stop();
  await wait(400);
  fs.rmSync(root, { recursive: true, force: true });

  const failed = results.filter((item) => !item.ok);
  console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${results.length - failed.length}/${results.length} checks`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
