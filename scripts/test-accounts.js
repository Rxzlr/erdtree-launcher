/* Erdtree Launcher — accounts self-test (plain Node).
 *
 * Proves the local account system end to end:
 *   - register / login / wrong password / remember-me restore;
 *   - per-account profile folders never overlap;
 *   - guest sessions save nothing and are wiped on logout;
 *   - the one-time recovery code resets the password and rotates itself.
 *
 * Run: node scripts/test-accounts.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { AccountManager } = require('../src/main/accounts');

function main() {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
  };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'erdtree-accounts-'));
  const accounts = new AccountManager(tmp);

  check('بدون حسابات في البداية', accounts.hasAccounts() === false);

  const reg = accounts.register({
    username: 'tarnished_one',
    email: 'one@erdtree.test',
    password: 'golden-order-1',
  });
  check('إنشاء حساب ينجح ويعيد كود استرجاع', /^ERD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(reg.recoveryCode), reg.recoveryCode);
  check('الجلسة تبدأ بعد التسجيل', !!accounts.current && accounts.current.username === 'tarnished_one');
  check('الحساب العام ما يكشف كلمة السر', !('hash' in reg.account) && !('salt' in reg.account));
  const aliceRoot = accounts.dataRoot();
  fs.mkdirSync(aliceRoot, { recursive: true });
  check('لكل حساب مجلد بيانات خاص', aliceRoot.includes('profiles') && fs.existsSync(aliceRoot));

  accounts.logout();
  check('تسجيل الخروج يمسح الجلسة', accounts.current === null);

  let wrong = '';
  try {
    accounts.login({ identifier: 'tarnished_one', password: 'wrong-password' });
  } catch (err) {
    wrong = err.message;
  }
  check('كلمة السر الغلط مرفوضة', wrong === 'Incorrect password.', wrong);

  const login = accounts.login({ identifier: 'one@erdtree.test', password: 'golden-order-1' });
  check('الدخول بالإيميل ينجح', login.account.username === 'tarnished_one');
  check('Remember Me يكتب session.json', fs.existsSync(path.join(tmp, 'session.json')));

  const restored = new AccountManager(tmp).restore();
  check('الجلسة ترجع بعد إعادة تشغيل اللانشر', !!restored && restored.account.username === 'tarnished_one');

  // Second account gets its own folder.
  accounts.logout();
  const reg2 = accounts.register({
    username: 'ranni_moon',
    email: 'ranni@erdtree.test',
    password: 'dark-moon-22',
  });
  const bobRoot = accounts.dataRoot();
  fs.mkdirSync(bobRoot, { recursive: true });
  check('حسابان لهما مجلدين مختلفين', aliceRoot !== bobRoot && fs.existsSync(bobRoot));
  check('قائمة الحسابات المحفوظة فيها الاثنين', accounts.savedAccounts().length === 2);

  // Guest saves nothing and is wiped on logout.
  accounts.startGuest();
  const guestRoot = accounts.dataRoot();
  fs.mkdirSync(guestRoot, { recursive: true });
  fs.writeFileSync(path.join(guestRoot, 'scratch.txt'), 'temporary');
  check('جلسة الضيف تعمل', accounts.current.guest === true);
  check('الضيف ما يكتب session.json', !fs.existsSync(path.join(tmp, 'session.json')));
  let guestUpdate = '';
  try {
    accounts.update({ username: 'guest_name' });
  } catch (err) {
    guestUpdate = err.message;
  }
  check('الضيف ما يقدر يحفظ بروفايل', /temporary/i.test(guestUpdate), guestUpdate);
  accounts.logout();
  check('تسجيل خروج الضيف يمسح مجلده المؤقت', !fs.existsSync(guestRoot));

  // Recovery code flow.
  const beforeHash = accounts.find('tarnished_one').hash;
  const started = accounts.recoverStart({ identifier: 'tarnished_one' });
  check('نسيت كلمة السر يلقى الحساب', started.found === true && started.username === 'tarnished_one');

  let badCode = '';
  try {
    accounts.recoverReset({ identifier: 'tarnished_one', code: 'ERD-0000-0000-0000', newPassword: 'new-order-33' });
  } catch (err) {
    badCode = err.message;
  }
  check('كود الاسترجاع الغلط مرفوض', /not correct/i.test(badCode), badCode);

  const reset = accounts.recoverReset({
    identifier: 'tarnished_one',
    code: reg.recoveryCode,
    newPassword: 'new-order-33',
  });
  check('كود الاسترجاع الصحيح يغيّر كلمة السر', reset.ok === true && !!reset.recoveryCode);
  check('كود الاسترجاع القديم يبطل', (() => {
    try {
      accounts.recoverReset({ identifier: 'tarnished_one', code: reg.recoveryCode, newPassword: 'another-44' });
      return false;
    } catch {
      return true;
    }
  })());
  accounts.login({ identifier: 'tarnished_one', password: 'new-order-33' });
  check('الدخول بكلمة السر الجديدة ينجح', accounts.current.username === 'tarnished_one');
  const after = accounts.find('tarnished_one');
  check('كلمة السر المخزّنة تجزئة جديدة', beforeHash !== after.hash);
  check('reg2 غير مستخدم', !!reg2.account.id);

  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((item) => !item.ok);
  console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${results.length - failed.length}/${results.length} checks`);
  process.exit(failed.length ? 1 : 0);
}

main();
