// Real, in-game verified Elden Ring cheats.
// Every entry points at a stable pointer chain taken from The Grand Archives
// cheat table (v1.19.3, App Ver 1.17.2) and is auto-bound at runtime through
// AOB signatures, so the user never types an address.
//
// kind:
//   bit    -> toggle one bit inside a byte (flag based cheats)
//   set    -> write a value; `freeze` keeps rewriting it while enabled
//   full   -> copy a max value into the current value (one shot refill)
//
// anchor: 'worldchr' (WorldChrMan, only valid while a character is loaded)
//         'gamedata' (GameDataMan, valid at the title screen too)
const GROUPS = ['اللاعب', 'القتال', 'الموارد', 'المتعة'];

const CATALOG = [
  {
    id: 'no-dead',
    group: 'اللاعب',
    name: 'منع الموت',
    desc: 'حتى لو نزل دمك للصفر ما تموت — اللعبة تعتبرك حي.',
    icon: 'heart',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0, 0x19b],
    bit: 0,
    type: 'int8',
  },
  {
    id: 'no-damage',
    group: 'اللاعب',
    name: 'بدون ضرر',
    desc: 'الضربات ما تنقص دمك نهائياً.',
    icon: 'shield',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0, 0x19b],
    bit: 1,
    type: 'int8',
  },
  {
    id: 'inf-fp',
    group: 'اللاعب',
    name: 'فوكس لا نهائي',
    desc: 'الفوكس (FP) ما ينقص — استخدم المهارات براحتك.',
    icon: 'spark',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0, 0x19b],
    bit: 2,
    type: 'int8',
  },
  {
    id: 'inf-stamina',
    group: 'اللاعب',
    name: 'ستامينا لا نهائية',
    desc: 'تقدر تجري وتضرب بدون ما توقف ستامينا.',
    icon: 'bolt',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0, 0x19b],
    bit: 3,
    type: 'int8',
  },
  {
    id: 'hp-full',
    group: 'اللاعب',
    name: 'تعبئة الدم',
    desc: 'يرجّع دمك كامل ١٠٠٪ بضغطة — مرة وحدة.',
    icon: 'heart',
    kind: 'full',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0, 0x138],
    sourceChain: [0x10ef8, 0, 0x190, 0, 0x13c],
    type: 'int32',
  },
  {
    id: 'fp-full',
    group: 'اللاعب',
    name: 'تعبئة الفوكس',
    desc: 'يرجّع الفوكس كامل بضغطة — مرة وحدة.',
    icon: 'spark',
    kind: 'full',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0, 0x148],
    sourceChain: [0x10ef8, 0, 0x190, 0, 0x150],
    type: 'int32',
  },
  {
    id: 'stamina-full',
    group: 'اللاعب',
    name: 'تعبئة الستامينا',
    desc: 'يرجّع الستامينا كاملة بضغطة — مرة وحدة.',
    icon: 'bolt',
    kind: 'full',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0, 0x154],
    sourceChain: [0x10ef8, 0, 0x190, 0, 0x158],
    type: 'int32',
  },
  {
    id: 'no-goods',
    group: 'القتال',
    name: 'الأدوات ما تنقص',
    desc: 'أي أداة تستخدمها (جرعات، سهام، أغراض) ما ينقص عددها.',
    icon: 'flask',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x53a],
    bit: 0,
    type: 'int8',
  },
  {
    id: 'no-attack',
    group: 'القتال',
    name: 'تعطيل هجومك',
    desc: 'يمنع شخصيتك من الهجوم — للتجارب والتصوير.',
    icon: 'sword',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x538],
    bit: 4,
    type: 'int8',
    warn: true,
  },
  {
    id: 'no-move',
    group: 'القتال',
    name: 'تجميد الحركة',
    desc: 'توقف شخصيتك عن الحركة — للتجارب.',
    icon: 'freeze',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x538],
    bit: 5,
    type: 'int8',
    warn: true,
  },
  {
    id: 'no-update',
    group: 'القتال',
    name: 'تجميد الشخصية',
    desc: 'يوقف تحديث شخصيتك (No Update) — تجربة متقدمة.',
    icon: 'pause',
    kind: 'bit',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x539],
    bit: 0,
    type: 'int8',
    warn: true,
  },
  {
    id: 'runes',
    group: 'الموارد',
    name: 'رونز ٩٩٩ مليون',
    desc: 'يثبّت رصيد الرونز على ٩٩٩,٩٩٩,٩٩٩ — يبقى ثابت.',
    icon: 'coin',
    kind: 'set',
    anchor: 'gamedata',
    chain: [0x8, 0x6c],
    type: 'int32',
    value: 999999999,
    freeze: true,
  },
  {
    id: 'anim-speed',
    group: 'المتعة',
    name: 'تسريع الحركة',
    desc: 'يخلي حركات شخصيتك أسرع (سرعة الأنميشن ×١.٦).',
    icon: 'run',
    kind: 'set',
    anchor: 'worldchr',
    chain: [0x10ef8, 0, 0x190, 0x28, 0x17c8],
    type: 'float',
    value: 1.6,
    freeze: true,
  },
];

const BUILTIN_PRESETS = [
  {
    id: 'undying',
    name: 'الخالد',
    desc: 'ما تموت، بدون ضرر، وفوكس وستامينا لا نهائية.',
    icon: 'shield',
    cheats: ['no-dead', 'no-damage', 'inf-fp', 'inf-stamina'],
  },
  {
    id: 'explorer',
    name: 'المستكشف',
    desc: 'منع الموت وستامينا لا نهائية وحركة أسرع — تنقّل حر.',
    icon: 'map',
    cheats: ['no-dead', 'inf-stamina', 'anim-speed'],
  },
  {
    id: 'rich',
    name: 'ثري الحرب',
    desc: 'رونز ٩٩٩ مليون ثابتة — اشترِ اللي تبي.',
    icon: 'coin',
    cheats: ['runes'],
  },
  {
    id: 'lab',
    name: 'غرفة التجارب',
    desc: 'تحكم كامل بالشخصية: بدون هجوم أو حركة أو تحديث.',
    icon: 'wand',
    cheats: ['no-attack', 'no-move', 'no-update'],
  },
];

const TYPES = ['int8', 'int16', 'int32', 'int64', 'float', 'double'];
const TYPE_LABELS = {
  int8: 'بايت',
  int16: 'عدد صغير',
  int32: 'عدد صحيح',
  int64: 'عدد كبير',
  float: 'عشري',
  double: 'عشري مزدوج',
};

function cloneCatalog() {
  return CATALOG.map((c) => ({ ...c, chain: [...c.chain], sourceChain: c.sourceChain ? [...c.sourceChain] : null }));
}

function presetList(saved = []) {
  return [...BUILTIN_PRESETS, ...saved.map((p) => ({ ...p, saved: true }))];
}

module.exports = { GROUPS, CATALOG, BUILTIN_PRESETS, TYPES, TYPE_LABELS, cloneCatalog, presetList };
