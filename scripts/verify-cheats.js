// Live in-game verification of the cheat engine.
// Usage: node scripts/verify-cheats.js
const { spawn, execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'src', 'main', 'memory.ps1');
const SHOT = path.join(ROOT, 'test', 'real-shots');
const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT], {
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
});
proc.stdout.setEncoding('utf8');
proc.stderr.setEncoding('utf8');
proc.stderr.on('data', (d) => process.stderr.write(d));

let buffer = '';
let seq = 0;
const pending = new Map();
let ready;
const readyPromise = new Promise((resolve) => { ready = resolve; });

proc.stdout.on('data', (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, i).replace(/\r$/, '').trim();
    buffer = buffer.slice(i + 1);
    if (!line.startsWith('@@')) continue;
    const msg = JSON.parse(line.slice(2));
    if (msg.event === 'ready') { ready(); continue; }
    const p = pending.get(msg.id);
    if (!p) continue;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.data || {});
    else p.reject(new Error(msg.error));
  }
});

function call(payload, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('timeout ' + payload.cmd)); }, timeout);
    pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    proc.stdin.write(`${JSON.stringify({ ...payload, id })}\n`);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
function shot(tag) {
  shotN += 1;
  const out = path.join(SHOT, `verify-${tag}.png`);
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts', 'focus-capture-game.ps1'), '-OutFile', out], { stdio: 'ignore' });
    console.log('SHOT', out);
  } catch (e) {
    console.log('SHOT_FAILED', e.message);
  }
}

(async () => {
  await readyPromise;
  try {
    const info = await call({ cmd: 'attach', process: 'eldenring.exe' });
    console.log('attached', info);

    const gd = await call({ cmd: 'aobScan', pattern: '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 05 48 8B 40 58 C3 C3', resolveRip: true, instrLen: 7 });
    const gdAddr = Number(String(gd.addresses).split(',')[0]);
    const wc = await call({ cmd: 'aobScan', pattern: '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 0F 48 39 88', resolveRip: true, instrLen: 7 });
    const wcAddr = Number(String(wc.addresses).split(',')[0]);
    console.log('anchors', { gdAddr, wcAddr });

    const read = (addr, chain, type) => call({ cmd: 'read', addr, chain, type });
    const write = (addr, chain, type, value) => call({ cmd: 'write', addr, chain, type, value });

    const hpChain = [0x10ef8, 0, 0x190, 0, 0x138];
    const maxHpChain = [0x10ef8, 0, 0x190, 0, 0x13c];
    const fpChain = [0x10ef8, 0, 0x190, 0, 0x148];
    const maxFpChain = [0x10ef8, 0, 0x190, 0, 0x150];
    const spChain = [0x10ef8, 0, 0x190, 0, 0x154];
    const flagsChain = [0x10ef8, 0, 0x190, 0, 0x19b];
    const runesChain = [0x8, 0x6c];

    const hp0 = (await read(wcAddr, hpChain, 'int32')).value;
    const maxHp = (await read(wcAddr, maxHpChain, 'int32')).value;
    const fp0 = (await read(wcAddr, fpChain, 'int32')).value;
    const maxFp = (await read(wcAddr, maxFpChain, 'int32')).value;
    const sp0 = (await read(wcAddr, spChain, 'int32')).value;
    const runes0 = (await read(gdAddr, runesChain, 'int32')).value;
    const flags0 = (await read(wcAddr, flagsChain, 'int8')).value;
    console.log('BEFORE', { hp0, maxHp, fp0, maxFp, sp0, runes0, flags0 });

    shot('before');

    // 1) HP write test
    const testHp = Math.max(1, Math.round(maxHp * 0.2));
    await write(wcAddr, hpChain, 'int32', testHp);
    await sleep(1200);
    const hpAfterWrite = (await read(wcAddr, hpChain, 'int32')).value;
    console.log('HP_WRITE', { wrote: testHp, readBack: hpAfterWrite });
    shot('hp-low');
    await sleep(1500);
    const hpAfterWait = (await read(wcAddr, hpChain, 'int32')).value;
    console.log('HP_AFTER_WAIT', { value: hpAfterWait });

    // 2) Restore HP to max
    await write(wcAddr, hpChain, 'int32', maxHp);
    const hpRestored = (await read(wcAddr, hpChain, 'int32')).value;
    console.log('HP_RESTORE', { value: hpRestored });
    shot('hp-full');

    // 3) Flags bit test (NoDead bit0 + NoDamage bit1)
    const f = Number(flags0) | 0x03;
    await write(wcAddr, flagsChain, 'int8', f);
    await sleep(600);
    const flags1 = (await read(wcAddr, flagsChain, 'int8')).value;
    console.log('FLAGS_SET', { before: flags0, wrote: f, readBack: flags1 });
    const restoredFlags = flags1 & ~0x03;
    await write(wcAddr, flagsChain, 'int8', restoredFlags);
    const flags2 = (await read(wcAddr, flagsChain, 'int8')).value;
    console.log('FLAGS_RESTORED', { value: flags2 });

    // 4) Runes write test
    await write(gdAddr, runesChain, 'int32', 123456789);
    await sleep(500);
    const runes1 = (await read(gdAddr, runesChain, 'int32')).value;
    console.log('RUNES_TEST', { before: runes0, wrote: 123456789, readBack: runes1 });
    await write(gdAddr, runesChain, 'int32', runes0);

    console.log('DONE');
  } catch (err) {
    console.error('VERIFY ERROR', err.message);
  } finally {
    try { await call({ cmd: 'detach' }, 3000); } catch { /* ignore */ }
    proc.kill();
  }
})();
