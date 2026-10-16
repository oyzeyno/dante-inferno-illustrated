// Builds data/inferno.js from Project Gutenberg public-domain texts.
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\r/g, '');

function parse(lines, headingRe, startIdx, endIdx) {
  const cantos = [];
  let cur = null;
  for (let i = startIdx; i < endIdx; i++) {
    const l = lines[i];
    if (headingRe.test(l.trim())) { cur = []; cantos.push(cur); continue; }
    if (!cur) continue;
    const t = l.trim();
    if (!t || /^(Inferno|INFERNO)$/.test(t)) continue;
    cur.push(t);
  }
  return cantos;
}

const en = read('en.txt').split('\n');
const enStart = en.findIndex(l => /^Inferno: Canto I$/.test(l.trim()));
const enEnd = en.findIndex(l => l.includes('*** END'));
const enC = parse(en, /^Inferno: Canto [IVXL]+$/, enStart, enEnd);

const it = read('it.txt').split('\n');
const itStart = it.findIndex((l, i) => i > 140 && l.trim() === 'Canto I');
const itEnd = it.findIndex((l, i) => i > itStart && l.trim() === 'PURGATORIO');
const itC = parse(it, /^Canto [IVXL]+$/, itStart, itEnd);

// Canto titles from the English contents list
const titles = en.filter(l => /^Canto [IVXL]+\. /.test(l)).slice(0, 34)
  .map(l => l.replace(/^Canto [IVXL]+\.\s*/, '').trim());

console.log('EN cantos', enC.length, 'IT cantos', itC.length);
enC.forEach((c, i) => { if (c.length !== (itC[i] || []).length) console.log('canto', i + 1, 'en', c.length, 'it', (itC[i] || []).length); });

const out = enC.map((c, i) => ({ n: i + 1, title: titles[i] || '', en: c, it: itC[i] || [] }));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'inferno.js'),
  '// Longfellow (1867) & Italian original — public domain, via Project Gutenberg #1001 / #1000\nwindow.INFERNO = ' + JSON.stringify(out) + ';\n');
