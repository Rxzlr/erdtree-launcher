/**
 * Minimal CDP driver for the running Erdtree Launcher.
 * Usage:
 *   node scripts/cdp.js eval "<expression>"      -> prints JSON result
 *   node scripts/cdp.js shot <outfile.png>       -> saves a page screenshot
 *   node scripts/cdp.js click "<css selector>"   -> clicks first match
 *   node scripts/cdp.js text "<css selector>"    -> prints textContent
 *   node scripts/cdp.js info                     -> target info
 */
const fs = require('fs');
const http = require('http');

const PORT = process.env.CDP_PORT || 9222;

function getJSON(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (d) => (data += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error('bad json: ' + data.slice(0, 200)));
          }
        });
      })
      .on('error', reject);
  });
}

async function main() {
  const cmd = process.argv[2];
  const arg = process.argv.slice(3).join(' ');
  const list = await getJSON('/json/list');
  const page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url || '')) || list.find((t) => t.type === 'page');
  if (!page) {
    console.error('NO_PAGE');
    process.exit(2);
  }
  if (cmd === 'info') {
    console.log(JSON.stringify({ id: page.id, title: page.title, url: page.url }, null, 2));
    return;
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('ws connect failed'));
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  };

  if (cmd === 'eval') {
    const value = await evaluate(arg);
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  } else if (cmd === 'text') {
    const value = await evaluate(`(document.querySelector(${JSON.stringify(arg)})||{}).textContent || ''`);
    console.log(value.trim());
  } else if (cmd === 'click') {
    const value = await evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(arg)}); if (!el) return 'NOT_FOUND'; el.click(); return 'CLICKED'; })()`
    );
    console.log(value);
  } else if (cmd === 'shot') {
    const res = await send('Page.enable');
    void res;
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(arg, Buffer.from(shot.data, 'base64'));
    console.log('SAVED ' + arg);
  } else {
    console.error('unknown command');
    process.exit(1);
  }
  ws.close();
}

main().catch((err) => {
  console.error('ERR ' + err.message);
  process.exit(1);
});
