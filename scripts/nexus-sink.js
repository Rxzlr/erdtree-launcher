// Tiny local sink used once to move scraped Nexus metadata from the browser
// page into the workspace. Not part of the app.
const http = require('http');
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'tmp-nexus-catalog.json');
const BACK = 'https://www.nexusmods.com/eldenring/mods/topalltime?adult=2&cat=0';

function save(data) {
  fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf8');
  console.log('saved', data.length, 'entries', new Date().toISOString());
}

const server = http.createServer({ maxHeaderSize: 8 * 1024 * 1024 }, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  const requestUrl = new URL(req.url, 'http://127.0.0.1:8765');
  if (req.method === 'GET' && requestUrl.pathname === '/collect') {
    try {
      save(JSON.parse(requestUrl.searchParams.get('data') || '[]'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>saved</h1>');
    } catch (err) {
      res.writeHead(400);
      res.end(String(err.message));
    }
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ready');
    return;
  }
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    try {
      let body = Buffer.concat(chunks).toString('utf8').trim();
      // text/plain form posts arrive as `data=<json>`; raw fetch posts arrive as
      // plain JSON. Accept both.
      if (body.startsWith('data=')) body = body.slice(5).trim();
      const data = JSON.parse(body);
      save(data);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<meta http-equiv="refresh" content="0;url=${BACK}"><h1>saved</h1>`);
    } catch (err) {
      console.log('bad POST', String(err.message).slice(0, 300));
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>bad</h1><pre>${String(err.message).slice(0, 500)}</pre>`);
    }
  });
});

server.listen(8765, '127.0.0.1', () => console.log('sink on 8765'));
setTimeout(() => process.exit(0), 20 * 60 * 1000);
