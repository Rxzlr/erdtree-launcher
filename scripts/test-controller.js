// Focused tests for the PS4/PS5 controller detection module.
// Run: node scripts/test-controller.js
// Uses the ERDTREE_CONTROLLER_JSON override so no real hardware is required.
const assert = require('assert');
const controller = require('../src/main/controller');

let passed = 0;
function ok(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (err) {
    console.error('FAIL', name, '-', err.message);
    process.exitCode = 1;
  }
}

async function okAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log('PASS', name);
  } catch (err) {
    console.error('FAIL', name, '-', err.message);
    process.exitCode = 1;
  }
}

function setRaw(obj) {
  process.env.ERDTREE_CONTROLLER_JSON = JSON.stringify(obj);
}

// --- classifyDevice: exact ids Windows reports for Sony pads ---
const USB_DS = 'USB\\VID_054C&PID_0CE6\\6&2a1b3c4d&0&2';
const BTH_DS4 = 'BTHENUM\\VID_054C&PID_09CC\\7&1a2b3c4d&0&1';

ok('DualSense over USB is classified', () => {
  const d = controller.classifyDevice({ name: 'Wireless Controller', id: USB_DS, status: 'OK', class: 'HIDClass' });
  assert.strictEqual(d.model, 'dualsense');
  assert.strictEqual(d.modelLabel, 'DualSense (PS5)');
  assert.strictEqual(d.connection, 'usb');
  assert.strictEqual(d.connectionLabel, 'USB');
  assert.strictEqual(d.recognized, true);
});

ok('DualShock 4 v2 over Bluetooth is classified', () => {
  const d = controller.classifyDevice({ name: 'Wireless Controller', id: BTH_DS4, status: 'OK', class: 'HIDClass' });
  assert.strictEqual(d.model, 'ds4v2');
  assert.strictEqual(d.connection, 'bluetooth');
  assert.strictEqual(d.connectionLabel, 'Bluetooth');
});

ok('DualShock 4 v1 and DualSense Edge pids map', () => {
  assert.strictEqual(controller.classifyDevice({ id: 'USB\\VID_054C&PID_05C4\\x', status: 'OK' }).model, 'ds4v1');
  assert.strictEqual(controller.classifyDevice({ id: 'USB\\VID_054C&PID_0DF2\\x', status: 'OK' }).model, 'dualsense-edge');
});

ok('non-OK status is not recognized', () => {
  const d = controller.classifyDevice({ id: USB_DS, status: 'Error', class: 'HIDClass' });
  assert.strictEqual(d.recognized, false);
});

ok('normalizeSony accepts scalar, array and null', () => {
  assert.deepStrictEqual(controller.normalizeSony(null), []);
  assert.strictEqual(controller.normalizeSony({ id: 'a' }).length, 1);
  assert.strictEqual(controller.normalizeSony([{ id: 'a' }, { id: 'b' }]).length, 2);
});

(async () => {
  await okAsync('no Sony pad -> no-controller', async () => {
    setRaw({ sony: [], vigem: false, ds4windows: false, steam: false });
    const i = await controller.info();
    assert.strictEqual(i.status, 'no-controller');
    assert.strictEqual(i.hasSony, false);
    assert.strictEqual(i.needsSoftware, false);
  });

  await okAsync('DualSense + DS4Windows running -> ready, no install', async () => {
    setRaw({ sony: [{ name: 'Wireless Controller', id: USB_DS, status: 'OK', class: 'HIDClass' }], vigem: true, ds4windows: true, steam: false });
    const i = await controller.info();
    assert.strictEqual(i.status, 'ready');
    assert.strictEqual(i.recommendation, 'ds4windows-active');
    assert.strictEqual(i.needsSoftware, false);
    assert.strictEqual(i.count, 1);
  });

  await okAsync('DualSense + Steam (no DS4Windows) -> ready via Steam Input', async () => {
    setRaw({ sony: [{ name: 'Wireless Controller', id: USB_DS, status: 'OK', class: 'HIDClass' }], vigem: true, ds4windows: false, steam: true });
    const i = await controller.info();
    assert.strictEqual(i.status, 'ready');
    assert.strictEqual(i.recommendation, 'steam');
    assert.strictEqual(i.needsSoftware, false);
  });

  await okAsync('DualSense, no Steam, no DS4Windows -> needs-setup (optional)', async () => {
    setRaw({ sony: [{ name: 'Wireless Controller', id: USB_DS, status: 'OK', class: 'HIDClass' }], vigem: false, ds4windows: false, steam: false });
    const i = await controller.info();
    assert.strictEqual(i.status, 'needs-setup');
    assert.strictEqual(i.recommendation, 'ds4windows');
    assert.strictEqual(i.needsSoftware, true);
    assert.ok(i.ds4windowsUrl.includes('github.com/Ryochan7/DS4Windows'));
    assert.ok(i.guidance.some((g) => /never install anything automatically/i.test(g)));
  });

  await okAsync('ViGEm already present is reported (no duplicate driver)', async () => {
    setRaw({ sony: [{ name: 'Wireless Controller', id: USB_DS, status: 'OK', class: 'HIDClass' }], vigem: true, ds4windows: false, steam: false });
    const i = await controller.info();
    assert.strictEqual(i.vigem, true);
    assert.ok(i.guidance.some((g) => /already installed/i.test(g) && /duplicate driver/i.test(g)));
  });

  await okAsync('problem device surfaces a warning', async () => {
    setRaw({ sony: [{ name: 'Wireless Controller', id: USB_DS, status: 'Error', class: 'HIDClass' }], vigem: false, ds4windows: false, steam: false });
    const i = await controller.info();
    assert.strictEqual(i.anyProblem, true);
    assert.ok(i.guidance.some((g) => /reports a problem/i.test(g)));
  });

  delete process.env.ERDTREE_CONTROLLER_JSON;
  console.log(`\n${passed} checks passed${process.exitCode ? ' (with failures)' : ''}.`);
})();