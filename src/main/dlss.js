const { execFile } = require('child_process');

const DLSS_MODES = [
  {
    id: 'off',
    name: 'إيقاف',
    short: 'بدون تحسين',
    desc: 'الصورة تبقى على طبيعتها بدون أي تغيير.',
  },
  {
    id: 'quality',
    name: 'جودة',
    short: 'أفضل شكل',
    desc: 'أفضل صورة ممكنة، والفريمات تزيد شوي بس.',
  },
  {
    id: 'balanced',
    name: 'متوازن',
    short: 'شكل وفريمات',
    desc: 'توازن حلو بين جودة الصورة وسرعة اللعب.',
  },
  {
    id: 'performance',
    name: 'أداء',
    short: 'فريمات أعلى',
    desc: 'فريمات أعلى وجودة أقل — مناسب للأجهزة المتوسطة.',
  },
  {
    id: 'ultra',
    name: 'أداء فائق',
    short: 'أعلى فريمات',
    desc: 'أعلى فريمات وأقل جودة — للعب السلس على حساب الشكل.',
  },
];

const FRAME_GEN_NOTE = 'توليد الفريمات يخلي الحركة أنعم، ويحتاج كرت من الجيل الجديد.';

function runPowerShell(script) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 12000 },
      (err, stdout) => resolve(err ? '' : String(stdout || '').trim())
    );
  });
}

function classifyGpu(name) {
  const gpuName = String(name || '').trim();
  const upper = gpuName.toUpperCase();
  const isNvidia = /NVIDIA|GEFORCE|RTX|GTX|QUADRO/.test(upper);
  const dlss =
    isNvidia &&
    (/RTX\s*(20|30|40|50)/.test(upper) ||
      /GTX\s*16/.test(upper) ||
      /GEFORCE\s*(20|30|40|50)/.test(upper));
  const frameGen = isNvidia && /RTX\s*(40|50)/.test(upper);
  return {
    name: gpuName || 'ما قدرنا نتعرف على الكرت',
    isNvidia,
    dlss: !!dlss,
    frameGen: !!frameGen,
    rayTracing: isNvidia && /RTX\s*(20|30|40|50)/.test(upper),
  };
}

async function detectGpu() {
  const override = process.env.ERDTREE_GPU_NAME;
  if (override) return classifyGpu(override);
  if (process.platform !== 'win32') return classifyGpu('');
  const raw = await runPowerShell(
    "Get-CimInstance Win32_VideoController | Select-Object -First 1 -ExpandProperty Name"
  );
  return classifyGpu(raw);
}

async function info() {
  const gpu = await detectGpu();
  return {
    gpu,
    modes: DLSS_MODES.map((m) => ({
      ...m,
      supported: m.id === 'off' ? true : gpu.dlss,
    })),
    dlssSupported: gpu.dlss,
    frameGenSupported: gpu.frameGen,
    unsupportedMessage: 'كرتك ما يدعم DLSS',
    frameGenNote: FRAME_GEN_NOTE,
    note: gpu.dlss
      ? 'يُحفظ اختيارك ويُطبّق عند تشغيل اللعبة مع مود DLSS.'
      : 'اختيارات DLSS تظهر للعرض فقط لأن كرتك ما يدعمها.',
  };
}

module.exports = { DLSS_MODES, detectGpu, info, classifyGpu };
