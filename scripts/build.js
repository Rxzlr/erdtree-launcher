const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const mode = process.argv[2] === 'win' ? 'win' : 'dir';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function canClean(dir) {
  if (!fs.existsSync(dir)) return true;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// نستخدم release إذا كان نظيفاً. إذا كان مقفولاً (مضاد فيروسات/فهرس)،
// نبني في مجلد جديد عشان ما نوقف عملية التغليف.
let output = path.join(root, 'release');
if (!canClean(output)) {
  output = path.join(root, `release-${stamp}`);
  console.log(`[build] مجلد release مقفول حالياً، بنبني في: ${path.basename(output)}`);
}

const args = ['electron-builder'];
if (mode === 'win') args.push('--win', '--x64');
else args.push('--dir');
args.push(`--config.directories.output=${output}`);

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) process.exit(result.status || 1);
console.log(`\n[build] تم البناء بنجاح في:\n${output}\n`);
