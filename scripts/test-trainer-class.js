// Exercises the real Trainer class against the live game.
const path = require('path');
const { Trainer } = require('../src/main/trainer');

(async () => {
  const trainer = new Trainer({
    userData: path.join(__dirname, '..', 'test', 'tmp-userdata'),
    scriptPath: path.join(__dirname, '..', 'src', 'main', 'memory.ps1'),
  });
  try {
    const st = await trainer.attach();
    console.log('ATTACH', { attached: st.attached, inGame: st.inGame, anchors: st.anchors, live: st.live });

    const on = await trainer.setEnabled('no-dead', true);
    console.log('ON no-dead', { warnings: on.warnings, applied: on.status.cheats.find((c) => c.id === 'no-dead') });
    await new Promise((r) => setTimeout(r, 2000));

    const on2 = await trainer.setEnabled('inf-stamina', true);
    console.log('ON inf-stamina', on2.status.cheats.find((c) => c.id === 'inf-stamina'));

    const v = await trainer.verify('no-dead');
    console.log('VERIFY no-dead', v);
    const v2 = await trainer.verify('runes');
    console.log('VERIFY runes', v2);

    const act = await trainer.setEnabled('hp-full', true);
    console.log('ACTION hp-full', { warnings: act.warnings, live: act.status.live });

    const st2 = await trainer.refreshLive();
    console.log('LIVE', st2.live);

    await trainer.setEnabled('no-dead', false);
    await trainer.setEnabled('inf-stamina', false);
    const st3 = await trainer.status();
    console.log('AFTER-OFF', st3.cheats.filter((c) => c.enabled).map((c) => c.id), st3.live);
    await trainer.detach();
    console.log('DETACHED');
  } catch (err) {
    console.error('FAIL', err.message);
  } finally {
    trainer.shutdown();
  }
})();
