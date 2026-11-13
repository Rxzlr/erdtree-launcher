const fs = require('fs');
const path = require('path');

const CATALOG_FILE = path.join(__dirname, '..', 'data', 'items.json');

let cache = null;

function catalog() {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  }
  return cache;
}

function selectedText(entries) {
  const lines = [];
  for (const entry of entries || []) {
    const id = Number(entry.id);
    const qty = Math.max(1, Math.min(9999, Number(entry.qty) || 1));
    if (!Number.isFinite(id) || id <= 0) continue;
    lines.push(`${id}\t${qty}\t${String(entry.name || '').replace(/\s+/g, ' ').trim()}`);
  }
  return lines.join('\r\n');
}

module.exports = { catalog, selectedText };