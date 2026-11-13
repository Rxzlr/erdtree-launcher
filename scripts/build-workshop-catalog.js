// One-off generator: turns the scraped NexusMods catalogue (tmp-nexus-catalog.json)
// into src/main/workshop-catalog.js with real names, authors, art, sizes, dates
// and honest co-op risk flags. Not part of the app.
const fs = require('fs');
const path = require('path');

const raw = require('../tmp-nexus-catalog.json');

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function isoDate(text) {
  const match = String(text || '').match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (!match) return '';
  const day = match[1].padStart(2, '0');
  const month = MONTHS[match[2].toLowerCase()] || '01';
  return `${match[3]}-${month}-${day}`;
}

function blurb(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 150) return clean;
  const cut = clean.slice(0, 150);
  const stop = cut.lastIndexOf(' ');
  return `${cut.slice(0, stop > 90 ? stop : 150).replace(/[,;:\s.]+$/, '')}…`;
}

const DIRECT = {
  510: {
    install: 'game',
    special: 'seamless',
    direct: {
      repo: 'LukeYui/EldenRingSeamlessCoopRelease',
      asset: '(ersc_release|seamless).*\\.zip$',
      fallback: 'https://github.com/yuiamoroll/EldenRingSeamlessCoopRelease/releases/download/v2.0.3/_ersc_release_2_0_3.zip',
      fallbackName: '_ersc_release_2_0_3.zip',
    },
  },
  117: {
    install: 'game',
    direct: {
      repo: 'techiew/EldenRingModLoader',
      asset: 'EldenModLoader\\.zip$',
      fallback: 'https://github.com/techiew/EldenRingModLoader/releases/download/Binary/EldenModLoader.zip',
      fallbackName: 'EldenModLoader.zip',
    },
  },
};

function categories(mod) {
  const name = `${mod.name} ${mod.desc}`.toLowerCase();
  const cats = [];
  const add = (id) => {
    if (!cats.includes(id)) cats.push(id);
  };
  if (/co-?op|seamless|multiplayer|invasion|pvp/.test(name)) add('coop');
  if (/new boss|boss rush|bosses|boss mod/.test(name)) add('bosses');
  if (/boss/.test(name)) add('boss');
  if (/reshade|texture|graphic|hdr|lighting|vignette|chromatic|cine|bloom|sky|color|colour|visual/.test(name)) add('graphics');
  if (mod.cat === 'Visuals') add('graphics');
  if (/sound|music|audio|sfx/.test(name)) add('sound');
  if (/map|minimap|compass/.test(name)) add('map');
  if (/cheat|merchant|easy mode|randomiz|god mode|loot|gacha|meme|fun/.test(name)) add('fun');
  if (/fps|frame ?rate|stutter|performance|pause|skip|camera|save|fov|hud|ui\b|quality of life/.test(name)) add('qol');
  if (mod.cat === 'Utilities' || mod.cat === 'User Interface') add('qol');
  if (/weapon|armor|armour|armament|sword|katana|armour set/.test(name) || mod.cat === 'Weapons' || mod.cat === 'Armour') add('weapons');
  if (!cats.length) add('gameplay');
  const gameplayish = /overhaul|randomiz|moveset|regulation|reforged|convergence|combat|spell|incantation|stat|damage|enemy/.test(name);
  if (gameplayish || mod.cat === 'Gameplay') add('gameplay');
  return cats;
}

function coOpRisk(cats, mod) {
  const high = cats.includes('gameplay') || cats.includes('bosses') || cats.includes('weapons') || cats.includes('boss');
  return high ? 'high' : 'low';
}

const seen = new Set();
const catalog = raw
  .filter((mod) => {
    if (!mod.id || seen.has(String(mod.id))) return false;
    seen.add(String(mod.id));
    return true;
  })
  .map((mod) => {
    const cats = categories(mod);
    const direct = DIRECT[Number(mod.id)];
    const thumbUrl = String(mod.thumb || '');
    const file = thumbUrl.split('/').pop() || '';
    const ext = /\.jpe?g$/i.test(file) ? 'jpg' : 'png';
    const hasArt = /staticdelivery\.nexusmods\.com/.test(thumbUrl);
    const entry = {
      id: String(mod.id),
      name: String(mod.name || '').trim(),
      author: String(mod.author || 'Unknown').trim(),
      cats,
      nexusCat: mod.cat || 'Miscellaneous',
      endorsements: mod.end !== '--' ? mod.end : '',
      downloads: mod.dl && mod.dl !== '--' ? mod.dl : '',
      updated: isoDate(mod.date),
      size: mod.size || '',
      blurb: blurb(mod.desc || mod.name),
      img: hasArt ? `thumbs/${mod.id}.${ext}` : '',
      url: `https://www.nexusmods.com/eldenring/mods/${mod.id}`,
      coOp: coOpRisk(cats, mod),
    };
    if (direct) {
      entry.install = direct.install;
      entry.special = direct.special || '';
      entry.direct = direct.direct;
    }
    return entry;
  });

const lines = [];
lines.push('// Real NexusMods catalogue for Elden Ring (scraped from the public');
lines.push('// top-all-time listing). Names, authors, sizes, dates, endorsement counts');
lines.push('// and cover art are genuine; nothing here is invented.');
lines.push('// `direct` marks the few mods whose authors ship release archives on GitHub,');
lines.push('// which the launcher can download without a Nexus account.');
lines.push('const CATALOG = [');
for (const entry of catalog) {
  lines.push(`  ${JSON.stringify(entry)},`);
}
lines.push('];');
lines.push('');
lines.push('// Browse chips for the workshop grid. `filter` ids match CATALOG[].cats.');
lines.push('const CATEGORIES = [');
lines.push("  { id: 'all', name: 'All' },");
lines.push("  { id: 'gameplay', name: 'Gameplay' },");
lines.push("  { id: 'graphics', name: 'Graphics' },");
lines.push("  { id: 'coop', name: 'Co-op' },");
lines.push("  { id: 'boss', name: 'Boss' },");
lines.push("  { id: 'qol', name: 'Quality of Life' },");
lines.push("  { id: 'fun', name: 'Cheat / Fun' },");
lines.push("  { id: 'weapons', name: 'New Weapons' },");
lines.push("  { id: 'bosses', name: 'New Bosses' },");
lines.push("  { id: 'map', name: 'Map' },");
lines.push("  { id: 'sound', name: 'Sound' },");
lines.push('];');
lines.push('');
lines.push('// Quick filter row required by the workshop UI.');
lines.push('const FILTERS = [');
lines.push("  { id: 'all', name: 'All' },");
lines.push("  { id: 'downloaded', name: 'Downloaded' },");
lines.push("  { id: 'activated', name: 'Activated' },");
lines.push("  { id: 'popular', name: 'Popular' },");
lines.push("  { id: 'new', name: 'New' },");
lines.push("  { id: 'graphics', name: 'Graphics' },");
lines.push("  { id: 'gameplay', name: 'Gameplay' },");
lines.push("  { id: 'coop', name: 'Co-op' },");
lines.push("  { id: 'fun', name: 'Fun' },");
lines.push('];');
lines.push('');
lines.push('function nexusSearch(query) {');
lines.push("  return `https://www.nexusmods.com/eldenring/search/?gsearch=${encodeURIComponent(String(query || ''))}`;");
lines.push('}');
lines.push('');
lines.push('module.exports = { CATALOG, CATEGORIES, FILTERS, nexusSearch };');
lines.push('');

const out = path.join(__dirname, '..', 'src', 'main', 'workshop-catalog.js');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log('wrote', catalog.length, 'entries', fs.statSync(out).size, 'bytes');
const counts = {};
for (const entry of catalog) for (const cat of entry.cats) counts[cat] = (counts[cat] || 0) + 1;
console.log(counts);
