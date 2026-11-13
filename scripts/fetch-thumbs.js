// One-off helper: downloads the real NexusMods thumbnails for the scraped
// catalogue into assets/workshop/thumbs so the launcher shows genuine cover art
// without hitting the network at runtime. Not part of the app.
const fs = require('fs');
const path = require('path');

const catalog = require('../tmp-nexus-catalog.json');
const outDir = path.join(__dirname, '..', 'assets', 'workshop', 'thumbs');
fs.mkdirSync(outDir, { recursive: true });

const jobs = catalog
  .filter((mod) => mod.thumb && /staticdelivery\.nexusmods\.com/.test(mod.thumb))
  .map((mod) => {
    const ext = /\.jpe?g$/i.test(mod.thumb) ? '.jpg' : '.png';
    return { id: String(mod.id), url: mod.thumb, file: path.join(outDir, `${mod.id}${ext}`) };
  });

let index = 0;
let done = 0;
let failed = 0;

async function worker() {
  while (index < jobs.length) {
    const job = jobs[index++];
    if (fs.existsSync(job.file) && fs.statSync(job.file).size > 500) {
      done++;
      continue;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(job.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Referer: 'https://www.nexusmods.com/eldenring',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 400) throw new Error(`tiny ${buf.length}`);
      fs.writeFileSync(job.file, buf);
      done++;
    } catch (err) {
      failed++;
      console.log('fail', job.id, err.message);
    }
  }
}

Promise.all(Array.from({ length: 8 }, worker)).then(() => {
  console.log(`thumbs done=${done} failed=${failed} total=${jobs.length}`);
});
