const fs = require('fs');
const path = require('path');

const TYPES = {
  '4 Bytes': 'int32',
  '8 Bytes': 'int64',
  'Float': 'float',
  'Double': 'double',
  '2 Bytes': 'int16',
  'Byte': 'int8',
};

const TYPE_LABELS = {
  int8: 'بايت',
  int16: 'عدد صغير',
  int32: 'عدد صحيح 32',
  uint32: 'عدد صحيح 32',
  int64: 'عدد صحيح 64',
  float: 'عشري',
  double: 'عشري مزدوج',
};

const DEFAULT_CHEATS = [
  {
    id: 'runes',
    name: 'الرونات',
    group: 'الشخصية',
    type: 'int32',
    mode: 'static',
    staticOffset: '',
    chain: [],
    note: 'إجمالي الرونات الحالية في الحفظ.',
  },
  {
    id: 'level',
    name: 'المستوى',
    group: 'الشخصية',
    type: 'int32',
    mode: 'static',
    staticOffset: '',
    chain: [],
    note: 'مستوى الشخصية الحالي.',
  },
  {
    id: 'hp',
    name: 'الصحة القصوى',
    group: 'الموارد',
    type: 'float',
    mode: 'static',
    staticOffset: '',
    chain: [],
    note: 'قيمة عشرية — استخدم البحث بدقة.',
  },
  {
    id: 'fp',
    name: 'الفوكس الأقصى',
    group: 'الموارد',
    type: 'float',
    mode: 'static',
    staticOffset: '',
    chain: [],
  },
  {
    id: 'stamina',
    name: 'الستامينا القصوى',
    group: 'الموارد',
    type: 'float',
    mode: 'static',
    staticOffset: '',
    chain: [],
  },
  {
    id: 'flask',
    name: 'قوارير الدم',
    group: 'الموارد',
    type: 'int32',
    mode: 'static',
    staticOffset: '',
    chain: [],
  },
  {
    id: 'item-qty',
    name: 'كمية غرض/مادة',
    group: 'الأغراض',
    type: 'int32',
    mode: 'static',
    staticOffset: '',
    chain: [],
    note: 'ابحث عن كمية المادة اللي معك ثم احفظ النتيجة هنا — يخلي تكرار الأغراض سهل.',
  },
];

function parseHexOrDec(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  if (/^[0-9]+$/.test(s)) return parseInt(s, 10);
  if (/^[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  return null;
}

function parseCtAddress(text) {
  const raw = String(text || '').trim();
  const moduleMatch = raw.match(/^"?(.+?)"?\s*\+\s*([0-9A-Fa-fx]+)$/);
  if (moduleMatch) {
    const module = moduleMatch[1].trim();
    if (!/^eldenring(\.exe)?$/i.test(module)) return { external: true };
    const value = parseHexOrDec(moduleMatch[2]);
    return value === null ? null : { mode: 'static', staticOffset: value };
  }
  const value = parseHexOrDec(raw);
  if (value === null) return null;
  if (value > 0x100000000) return { mode: 'absolute', staticOffset: value };
  return { mode: 'static', staticOffset: value };
}

function slugId(name, used) {
  let base = String(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'cheat';
  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  used.add(id);
  return id;
}

function importCheatTable(xml, { reverseOffsets = true } = {}) {
  const entries = [];
  const blocks = String(xml).match(/<CheatEntry>[\s\S]*?<\/CheatEntry>/g) || [];
  let skipped = 0;
  const used = new Set(DEFAULT_CHEATS.map((c) => c.id));

  for (const block of blocks) {
    const descMatch = block.match(/<Description>([\s\S]*?)<\/Description>/);
    const typeMatch = block.match(/<VariableType>([\s\S]*?)<\/VariableType>/);
    const addrMatch = block.match(/<Address>([\s\S]*?)<\/Address>/);
    if (!descMatch || !typeMatch || !addrMatch) {
      skipped++;
      continue;
    }
    const name = descMatch[1].replace(/^"|"$/g, '').trim();
    const type = TYPES[typeMatch[1].trim()];
    const parsed = parseCtAddress(addrMatch[1]);
    if (parsed && parsed.external) {
      skipped++;
      continue;
    }
    if (!type || !parsed || !name) {
      skipped++;
      continue;
    }
    let chain = [];
    const offsetsBlock = block.match(/<Offsets>([\s\S]*?)<\/Offsets>/);
    if (offsetsBlock) {
      const raw = offsetsBlock[1].match(/<Offset>([\s\S]*?)<\/Offset>/g) || [];
      chain = raw
        .map((o) => o.replace(/<\/?Offset>/g, '').trim())
        .map((o) => (/^-?\d+$/.test(o) ? parseInt(o, 10) : parseHexOrDec(o)))
        .filter((v) => v !== null);
      if (reverseOffsets) chain.reverse();
    }
    entries.push({
      id: slugId(name, used),
      name,
      group: 'مستورد من CE',
      type,
      mode: parsed.mode,
      staticOffset: `0x${parsed.staticOffset.toString(16).toUpperCase()}`,
      chain,
      note: 'مستورد من جدول Cheat Engine — تحقق من القيمة قبل الكتابة.',
      imported: true,
    });
  }
  return { cheats: entries, skipped, total: blocks.length };
}

function defaultCheats() {
  return DEFAULT_CHEATS.map((c) => ({ ...c, chain: [...c.chain] }));
}

function normalizeCheat(input) {
  const cheat = {
    id: String(input.id || '').trim(),
    name: String(input.name || '').trim(),
    group: String(input.group || 'عام').trim(),
    type: TYPE_LABELS[input.type] ? input.type : 'int32',
    mode: input.mode === 'absolute' ? 'absolute' : 'static',
    staticOffset: String(input.staticOffset || '').trim(),
    chain: Array.isArray(input.chain) ? input.chain.map((v) => Number(v) || 0) : [],
    note: String(input.note || '').trim(),
  };
  if (!cheat.id) throw new Error('المعرّف مطلوب');
  if (!cheat.name) throw new Error('الاسم مطلوب');
  if (cheat.staticOffset) {
    const value = parseHexOrDec(cheat.staticOffset);
    if (value === null) {
      throw new Error(cheat.mode === 'absolute' ? 'العنوان المطلق غير صالح' : 'الإوفست غير صالح — مثال: 0x2F1A4B8');
    }
    cheat.staticOffset = `0x${value.toString(16).toUpperCase()}`;
  }
  if (cheat.chain.some((v) => !Number.isFinite(v))) throw new Error('سلسلة الإوفستات غير صالحة');
  return cheat;
}

module.exports = {
  DEFAULT_CHEATS,
  TYPE_LABELS,
  defaultCheats,
  importCheatTable,
  normalizeCheat,
  parseHexOrDec,
};