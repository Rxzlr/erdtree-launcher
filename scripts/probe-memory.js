// Probe Elden Ring memory using the launcher's memory engine.
// Usage: node scripts/probe-memory.js
const { spawn } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'src', 'main', 'memory.ps1');
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('timeout')); }, timeout);
    pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    proc.stdin.write(`${JSON.stringify({ ...payload, id })}\n`);
  });
}

function resolveChain(base, chain) {
  // mirror memory.ps1 Resolve
  return call({ cmd: 'read', addr: base, chain, type: 'int32' });
}

(async () => {
  await readyPromise;
  try {
    const info = await call({ cmd: 'attach', process: 'eldenring.exe' });
    console.log('attached', info);

    const gd = await call({ cmd: 'aobScan', pattern: '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 05 48 8B 40 58 C3 C3', resolveRip: true, instrLen: 7 });
    console.log('GameDataMan global', gd.addresses);
    const wc = await call({ cmd: 'aobScan', pattern: '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 0F 48 39 88', resolveRip: true, instrLen: 7 });
    console.log('WorldChrMan global', wc.addresses);
    const wc2 = await call({ cmd: 'aobScan', pattern: '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 ?? 48 39 88', resolveRip: true, instrLen: 7 });
    console.log('WorldChrMan alt', wc2.addresses);

    const gdAddr = Number(String(gd.addresses).split(',')[0]);
    if (gdAddr) {
      for (const [name, chain] of [['runes', [0x8, 0x6c]], ['level', [0x8, 0x68]], ['vigor', [0x8, 0x3c]]]) {
        try { console.log(name, await resolveChain(gdAddr, chain)); } catch (e) { console.log(name, 'ERR', e.message); }
      }
    }
    const wcAddr = Number(String(wc.addresses || wc2.addresses).split(',')[0]);
    if (wcAddr) {
      for (const [name, chain] of [
        ['hp', [0x10ef8, 0, 0x190, 0, 0x138]],
        ['maxhp', [0x10ef8, 0, 0x190, 0, 0x13c]],
        ['fp', [0x10ef8, 0, 0x190, 0, 0x148]],
        ['stamina', [0x10ef8, 0, 0x190, 0, 0x154]],
        ['flags', [0x10ef8, 0, 0x190, 0, 0x19b]],
      ]) {
        try { console.log(name, await resolveChain(wcAddr, chain)); } catch (e) { console.log(name, 'ERR', e.message); }
      }
      try { console.log('worldchr direct', await call({ cmd: 'readAbs', addr: wcAddr, type: 'int64' })); } catch (e) { console.log('worldchr direct ERR', e.message); }
    }
  } catch (err) {
    console.error('PROBE ERROR', err.message);
  } finally {
    try { await call({ cmd: 'detach' }, 3000); } catch { /* ignore */ }
    proc.kill();
  }
})();
