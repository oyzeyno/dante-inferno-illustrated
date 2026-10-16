// Downloads all 78 public-domain paintings from Wikimedia Commons into images/paintings/
// Prompts the user with details about the process and asks for consent before downloading.
// Usage:
//   node tools/download-assets.js          (interactive prompt)
//   node tools/download-assets.js --yes    (skip prompt, e.g. automated setup)
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'InfernoIllustratedBook/1.0 (personal educational project)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'data', 'paintings.js'), 'utf8'));
const P = window.PAINTINGS;

const IMG_DIR = path.join(__dirname, '..', 'images', 'paintings');
const META_FILE = path.join(__dirname, '..', 'data', 'commons-metadata.json');

const fileTitle = p => 'File:' + decodeURIComponent(p.source.split('/wiki/')[1]).replace(/^File:/, '').replace(/_/g, ' ');

const extForTitle = t => {
  const m = t.match(/\.(jpe?g|png|gif|webp|svg)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
};

function askConsent(missingCount) {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    return Promise.resolve(true);
  }

  console.log('\n======================================================================');
  console.log("  Dante's Inferno — Illustrated Edition: Local Artwork Downloader");
  console.log('======================================================================');
  console.log('To keep the Git repository lightweight, the painting files are not');
  console.log('stored in Git and can be downloaded locally onto your machine.\n');
  console.log('Process details:');
  console.log('  • Source:      Wikimedia Commons (upload.wikimedia.org)');
  console.log('  • License:     Public Domain / CC0 (verified in data/commons-metadata.json)');
  console.log(`  • Files:       ${missingCount} of ${P.length} image files to download`);
  console.log('  • Destination: images/paintings/ (~128 MB total for all 78 images)');
  console.log('  • Rate limit:  Polite 2s pause between requests (~2–3 minutes total)');
  console.log('======================================================================\n');

  if (!process.stdin.isTTY) {
    console.log('Non-interactive shell detected. Skipping automatic download.');
    console.log('Run `npm run download-paintings` in your terminal to give consent and download.\n');
    return Promise.resolve(false);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('Do you consent to downloading these files to your computer now? [y/N]: ', answer => {
      rl.close();
      const ok = /^y(es)?$/i.test(answer.trim());
      resolve(ok);
    });
  });
}

async function fetchMeta(titles) {
  let meta = {};
  if (fs.existsSync(META_FILE)) {
    try { meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch {}
  }
  const missing = titles.filter(t => !meta[t]);
  for (let i = 0; i < missing.length; i += 40) {
    if (i > 0) await sleep(2000);
    const batch = missing.slice(i, i + 40);
    const q = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'extmetadata|url',
      iiurlwidth: '1280',
      titles: batch.join('|')
    });
    const res = await fetch(API + '?' + q, { headers: UA });
    if (!res.ok) throw new Error(`Metadata HTTP ${res.status}`);
    const j = await res.json();
    const norm = {};
    (j.query.normalized || []).forEach(n => norm[n.to] = n.from);
    Object.values(j.query.pages).forEach(pg => {
      if (pg.imageinfo && pg.imageinfo[0]) {
        const key = norm[pg.title] || pg.title;
        meta[key] = {
          extmetadata: pg.imageinfo[0].extmetadata || {},
          thumburl: pg.imageinfo[0].thumburl || pg.imageinfo[0].url,
          url: pg.imageinfo[0].url,
          descriptionurl: pg.imageinfo[0].descriptionurl
        };
      }
    });
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
    console.log(`Fetched metadata batch ${i / 40 + 1} (${Object.keys(meta).length}/${titles.length})`);
  }
  return meta;
}

async function downloadFile(url, dest) {
  const cleanUrl = url.split('?')[0];
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await sleep(6000 * attempt);
    const res = await fetch(cleanUrl, { headers: UA });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      return buf.length;
    }
    if (res.status === 429 || res.status >= 500) {
      const ra = parseInt(res.headers.get('retry-after') || '0', 10);
      console.log(`  HTTP ${res.status} on ${path.basename(dest)}, waiting ${ra || 6 * (attempt + 1)}s...`);
      if (ra > 0) await sleep(ra * 1000);
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${cleanUrl}`);
  }
  throw new Error(`Failed after retries: ${cleanUrl}`);
}

(async () => {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const titles = P.map(fileTitle);

  // Check how many files are actually missing before prompting
  const missingIndices = [];
  for (let i = 0; i < P.length; i++) {
    const ext = extForTitle(titles[i]);
    const dest = path.join(IMG_DIR, `${P[i].id}.${ext}`);
    if (!fs.existsSync(dest) || fs.statSync(dest).size <= 1024) {
      missingIndices.push(i);
    }
  }

  if (missingIndices.length === 0) {
    console.log(`All ${P.length} paintings are already downloaded in images/paintings/.`);
    return;
  }

  const consented = await askConsent(missingIndices.length);
  if (!consented) {
    console.log('Download cancelled. You can download the paintings anytime by running:');
    console.log('  npm run download-paintings\n');
    return;
  }

  console.log('\nStarting download...\n');
  const meta = await fetchMeta(titles);

  let downloaded = 0;
  const skipped = P.length - missingIndices.length;

  for (const i of missingIndices) {
    const p = P[i];
    const t = titles[i];
    const m = meta[t] || {};
    const remoteUrl = m.url || m.thumburl || p.full || p.image;
    const ext = extForTitle(t);
    const filename = `${p.id}.${ext}`;
    const dest = path.join(IMG_DIR, filename);

    await sleep(2000);
    try {
      const bytes = await downloadFile(remoteUrl, dest);
      downloaded++;
      console.log(`[${i + 1}/${P.length}] Saved ${filename} (${Math.round(bytes / 1024)} KB)`);
    } catch (err) {
      console.error(`[${i + 1}/${P.length}] ERROR ${filename}: ${err.message}`);
    }
  }
  console.log(`\nDone. Downloaded: ${downloaded}, already present: ${skipped}, total: ${P.length}`);
})();
