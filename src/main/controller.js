const { execFile } = require('child_process');

// PlayStation controller support for Elden Ring.
//
// Honest model of how the game reads pads:
//   * Elden Ring reads XInput (Xbox-style) controllers natively.
//   * A DualShock 4 / DualSense plugged straight into Windows appears as a
//     generic HID / DirectInput device, so the game often ignores it.
//   * Two legitimate bridges exist: Steam Input (no install, but the game must
//     run through Steam) or DS4Windows + ViGEmBus (a virtual Xbox pad, works for
//     a direct launch from this launcher).
//
// This module ONLY detects and explains. It never installs drivers or software
// and never touches an existing controller configuration.

const DS4WINDOWS_URL = 'https://github.com/Ryochan7/DS4Windows/releases/latest';

// Sony USB vendor id. Product ids identify the exact pad.
const SONY_VID = '054C';
const SONY_PIDS = {
  '05C4': { model: 'ds4v1', label: 'DualShock 4 (v1)' },
  '09CC': { model: 'ds4v2', label: 'DualShock 4 (v2)' },
  '0CE6': { model: 'dualsense', label: 'DualSense (PS5)' },
  '0DF2': { model: 'dualsense-edge', label: 'DualSense Edge (PS5)' },
};

function runPowerShell(script) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 15000 },
      (err, stdout) => resolve(err ? '' : String(stdout || '').trim())
    );
  });
}

// One combined query: present Sony pads + the ViGEmBus driver + whether the
// DS4Windows / Steam clients are running. ViGEm is detected by its service and
// its "Nefarius Virtual Gamepad Emulation Bus" device — NOT by the Windows
// "XBOX Synthetic Gamepad Bus", which is a built-in present on most PCs and
// would be a false positive.
const DETECT_SCRIPT = [
  "$ErrorActionPreference = 'SilentlyContinue'",
  '$sony = @(Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match \'VID_054C\' } | ForEach-Object { [pscustomobject]@{ name = $_.FriendlyName; id = $_.InstanceId; status = [string]$_.Status; class = $_.Class } })',
  "$svc = Get-Service -Name 'ViGEmBus'",
  "$dev = Get-PnpDevice -PresentOnly | Where-Object { $_.FriendlyName -match 'ViGEm|Nefarius|Virtual Gamepad Emulation' } | Select-Object -First 1",
  "$ds4 = Get-Process -Name 'DS4Windows' | Select-Object -First 1",
  "$steam = Get-Process -Name 'steam' | Select-Object -First 1",
  '[pscustomobject]@{ sony = $sony; vigem = [bool]($svc -or $dev); ds4windows = [bool]$ds4; steam = [bool]$steam } | ConvertTo-Json -Depth 4 -Compress',
].join('\n');

function normalizeSony(raw) {
  // Windows PowerShell 5.1 collapses a single-element array to a scalar in
  // ConvertTo-Json, so accept object | array | null.
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function classifyDevice(dev) {
  const id = String(dev && dev.id ? dev.id : '').toUpperCase();
  const name = String(dev && dev.name ? dev.name : '').trim() || 'PlayStation controller';
  const pidMatch = id.match(/PID_([0-9A-F]{4})/);
  const pid = pidMatch ? pidMatch[1] : '';
  const known = SONY_PIDS[pid];
  let connection = 'unknown';
  if (/^USB[\\\/]/.test(id)) connection = 'usb';
  else if (/^BTH(ENUM|LE)/.test(id)) connection = 'bluetooth';
  const status = String(dev && dev.status ? dev.status : '').trim() || 'Unknown';
  return {
    id: String(dev && dev.id ? dev.id : ''),
    name,
    pid,
    model: known ? known.model : 'sony-other',
    modelLabel: known ? known.label : 'PlayStation controller',
    connection,
    connectionLabel:
      connection === 'usb' ? 'USB' : connection === 'bluetooth' ? 'Bluetooth' : 'Unknown link',
    status,
    // Windows reports OK when the device is enumerated and its driver loaded.
    recognized: status.toUpperCase() === 'OK',
  };
}

async function readRaw() {
  // Test / offline override: inject the exact raw shape the PowerShell returns.
  const override = process.env.ERDTREE_CONTROLLER_JSON;
  if (override) {
    try {
      return JSON.parse(override);
    } catch {
      return { sony: [], vigem: false, ds4windows: false, steam: false };
    }
  }
  if (process.platform !== 'win32') return null;
  const out = await runPowerShell(DETECT_SCRIPT);
  if (!out) return { sony: [], vigem: false, ds4windows: false, steam: false, failed: true };
  try {
    return JSON.parse(out);
  } catch {
    return { sony: [], vigem: false, ds4windows: false, steam: false, failed: true };
  }
}

function buildGuidance({ controllers, hasSony, anyProblem, vigem, ds4windows, steam }) {
  const lines = [];
  if (anyProblem) {
    lines.push(
      'Windows reports a problem with one of the pads (status not OK). Try a different USB port / cable, or re-pair over Bluetooth, then press Refresh.'
    );
  }
  return lines;
}

async function info() {
  const supported = process.platform === 'win32' || !!process.env.ERDTREE_CONTROLLER_JSON;
  const raw = await readRaw();
  const failed = !!(raw && raw.failed);
  const controllers = normalizeSony(raw && raw.sony).map(classifyDevice);
  const hasSony = controllers.length > 0;
  const anyProblem = controllers.some((c) => !c.recognized);
  const vigem = !!(raw && raw.vigem);
  const ds4windows = !!(raw && raw.ds4windows);
  const steam = !!(raw && raw.steam);

  let status = 'no-controller';
  let recommendation = 'none';
  let needsSoftware = false;
  let headline = 'No PlayStation controller detected';
  const guidance = buildGuidance({ controllers, hasSony, anyProblem, vigem, ds4windows, steam });

  if (!supported) {
    status = 'unsupported';
    headline = 'Controller detection runs on Windows only';
    guidance.push('Open the launcher on Windows to detect a DualShock 4 or DualSense.');
  } else if (failed) {
    status = 'error';
    headline = 'Could not read controller status';
    guidance.push('Windows did not return device information. Press Refresh to try again.');
  } else if (!hasSony) {
    status = 'no-controller';
    recommendation = 'none';
    headline = 'No PlayStation controller detected';
    guidance.push(
      'Connect a DualShock 4 or DualSense with a USB cable, or pair it over Bluetooth: hold the PS + Share (PS4) / PS + Create (PS5) buttons until the light bar flashes, then add it in Windows Bluetooth settings.'
    );
    guidance.push('Press Refresh after connecting. Xbox-style controllers already work in Elden Ring with no extra software.');
  } else if (ds4windows) {
    status = 'ready';
    recommendation = 'ds4windows-active';
    headline = 'Ready — DS4Windows is mapping your controller';
    guidance.push(
      'DS4Windows is running and presents your PlayStation pad as an Xbox controller, which Elden Ring reads natively — including a direct launch from this launcher.'
    );
    guidance.push('Keep DS4Windows running while you play. Nothing else needs to be installed; no duplicate driver is added.');
  } else if (steam) {
    status = 'ready';
    recommendation = 'steam';
    headline = 'Ready — Steam Input can handle it (no install needed)';
    guidance.push(
      'Steam is running. The simplest no-install path is to launch Elden Ring through Steam with PlayStation Configuration Support enabled (Steam → Settings → Controller). Steam then presents your pad as an Xbox controller to the game.'
    );
    guidance.push(
      'Note: this launcher’s PLAY button starts the game directly, outside Steam. For a direct launch, Steam Input may not apply — in that case DS4Windows is the reliable option (optional, official link below).'
    );
    if (vigem) {
      guidance.push('ViGEmBus is already installed on this PC, so DS4Windows would not add a duplicate driver.');
    }
  } else {
    status = 'needs-setup';
    recommendation = 'ds4windows';
    needsSoftware = true;
    headline = vigem
      ? 'Almost ready — ViGEmBus is installed, DS4Windows is the last step'
      : 'One optional step for direct (non-Steam) play';
    guidance.push(
      'Elden Ring reads Xbox-style (XInput) controllers. A PlayStation pad connected straight to Windows appears as a generic HID device, so a direct launch from this launcher may not respond to it.'
    );
    guidance.push(
      'Two honest options: (a) launch the game through Steam and let Steam Input translate the pad — no install; or (b) install DS4Windows (free, open-source) which creates a virtual Xbox pad and works for a direct launch.'
    );
    guidance.push(
      vigem
        ? 'The ViGEmBus driver is already installed, so DS4Windows will not add a duplicate driver.'
        : 'DS4Windows installs the signed ViGEmBus driver (Nefarius) as part of its own setup. We never install anything automatically.'
    );
    guidance.push('If you choose option (b), use the official DS4Windows link below. HidHide is optional and not required.');
  }

  return {
    supported,
    platform: process.platform,
    controllers,
    count: controllers.length,
    hasSony,
    anyProblem,
    vigem,
    ds4windows,
    steam,
    needsSoftware,
    recommendation,
    status,
    headline,
    guidance,
    ds4windowsUrl: DS4WINDOWS_URL,
    note: 'Detection only — the launcher never installs drivers or changes your existing controller setup.',
  };
}

module.exports = {
  SONY_VID,
  SONY_PIDS,
  DS4WINDOWS_URL,
  classifyDevice,
  normalizeSony,
  info,
};