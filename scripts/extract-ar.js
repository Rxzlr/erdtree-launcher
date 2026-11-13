const fs = require('fs');
const s = fs.readFileSync('src/renderer/app.js', 'utf8');
const set = new Set();
// Simple scanner: collect single/double quoted and template literal contents.
let i = 0;
while (i < s.length) {
  const ch = s[i];
  if (ch === '"' || ch === "'" || ch === '`') {
    const quote = ch;
    let j = i + 1;
    let out = '';
    while (j < s.length) {
      if (s[j] === '\\') {
        out += s[j] + s[j + 1];
        j += 2;
        continue;
      }
      if (s[j] === quote) break;
      out += s[j];
      j += 1;
    }
    if (/[\u0600-\u06FF]/.test(out)) {
      set.add(out.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim());
    }
    i = j + 1;
    continue;
  }
  i += 1;
}
console.log([...set].sort((a, b) => a.length - b.length).join('\n---\n'));
