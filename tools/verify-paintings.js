// Verifies data/paintings.js against its sources and rewrites it.
//  - Reads cached Wikimedia Commons extmetadata from data/commons-metadata.json
//    (only contacts Wikimedia API if --refresh is passed or an entry is missing from cache)
//  - artist / date / title / description / license come ONLY from Wikimedia Commons extmetadata
//  - fields not present in the source are left empty (no hand-written values)
//  - line ranges are checked against the Gutenberg text (data/inferno.js)
//  - verifies local image files in images/paintings/ and sets p.image to local path
const fs = require('fs');
const path = require('path');
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'InfernoIllustratedBook/1.0 (personal educational project)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'data', 'inferno.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'data', 'paintings.js'), 'utf8'));
const CANTOS = window.INFERNO, P = window.PAINTINGS;

const META_FILE = path.join(__dirname, '..', 'data', 'commons-metadata.json');
const IMG_DIR = path.join(__dirname, '..', 'images', 'paintings');

const strip = h => (h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

// Keyword that must appear in the assigned lines (EN or IT) for the range to count as verified.
const KEY = {
  'The Dark Wood': /forest dark|selva oscura/i, 'The Panther': /panther|lonza/i, 'The Lion': /lion|leone/i,
  'Dante Meets Virgil': /Virgilius|Virgilio|Mantua/i, 'Minos': /Minos/i, 'Charon, the Ferryman': /Charon|Caron/i,
  'Cerberus': /Cerberus|Cerbero/i, 'Plutus': /Plutus|Pluto/i, 'Phlegyas': /Phlegyas|Flegi/i,
  'The Barque of Dante': /Argenti|mud|fango/i, 'The Furies': /Furies|Erine|Megaera/i,
  'Farinata degli Uberti': /Farinata/i, 'The Tomb of Pope Anastasius': /Anastasius|Anastasio/i,
  'The Minotaur': /Crete|Creti|Minotaur/i, 'The Infamy of Crete': /Crete|Creti/i,
  'Capaneus': /Capaneus|Capaneo/i, 'Capaneus the Blasphemer': /Capaneus|Capaneo/i,
  'Brunetto Latini': /Brunetto/i, 'Geryon': /Geryon|Gerion|beast|fiera/i, 'Thaïs': /Thais|Taide/i,
  'Pope Nicholas III': /Boniface|Bonifazio|mantle|manto/i, 'Ulysses and Diomedes': /Ulysses|Ulisse/i,
  'Ulysses and Diomed Swathed in the Same Flame': /Ulysses|Ulisse/i, 'Bertran de Born': /Bertram|Bertram|Bertran/i,
  'Myrrha': /Myrrha|Mirra/i, 'The Titans': /giants|giganti/i, 'Antaeus Lowering Dante and Virgil': /Antaeus|Anteo/i,
  'Antaeus Setting Down Dante and Virgil': /Antaeus|Anteo/i, 'Bocca degli Abati': /Bocca/i,
  'Ugolino and Archbishop Ruggieri': /Ugolino|Ruggier|repast|pasto/i, 'Lucifer, King of Hell': /Emperor|imperador|Dis/i,
  'Lucifer': /Emperor|imperador|Dis|Judas|Giuda/i, 'Behold Dis': /Dis/i, 'Francesca da Rimini': /Francesca|two|due/i,
  'Homer and the Ancient Poets': /Homer|Omero/i, 'Beatrice': /Beatrice/i, 'The Gate of Hell': /hope|speranza/i,
  'The Inscription over the Gate': /hope|speranza/i, 'Hoarders and Wasters': /weights|pesi/i,
  'The Wrathful in the Styx': /mire|fango|belletta/i, 'The Harpies in the Wood of the Suicides': /Harpies|Arpie/i,
  'The Wood of the Self-Murderers: The Harpies and the Suicides': /Harpies|Arpie/i,
  'Cacus': /Cacus|Caco/i, 'The Simoniac Pope': /Boniface|Bonifazio/i, 'Count Ugolino and his Sons in Prison': /sons|figli/i,
  'Count Ugolino and his Children in the Dungeon': /sons|figli|hands|mani/i, 'Mahomet': /Mahomet|Maometto/i,
  'The Hurricane of Souls': /hurricane|bufera/i, 'Francesca da Rimini II': /Francesca/i,
  'The Death of Francesca da Rimini and Paolo Malatesta': /death|morte/i, 'Francesca and Paolo': /Galeotto|Gallehault|book|libro/i,
  'The Ghosts of Paolo and Francesca Appear to Dante and Virgil': /Galeotto|Gallehault|book|libro/i,
  'Paolo and Francesca da Rimini': /Galeotto|Gallehault|book|libro|kiss|bocca/i, 'Paolo and Francesca': /Galeotto|Gallehault|book|libro/i,
  'And fell, even as a dead body falls': /dead body|corpo morto/i, 'The Circle of the Lustful (The Whirlwind of Lovers)': /dead body|corpo morto/i,
  'Into the Abyss on Geryon\'s Back': /Geryon|Gerion/i, 'Ciampolo the Navarrese': /Navarr/i,
  'The Baffled Devils Fighting': /Alichino|Calcabrina/i, 'The Hypocrites': /hypocrites|ipocriti|cloaks|cappe/i,
  'The Thieves and the Serpents': /serpents|serpi/i, 'The Six-Footed Serpent Attacking Agnolo Brunelleschi': /six feet|sei piè|Agnel/i,
  'Agnello Changing into a Serpent': /Agnel/i, 'Dante and Virgil': /Schicchi/i, 'Virgil Reproves Dante\'s Pity': /pity|pietà|piety/i,
  'Limbo – The Virtuous Pagans': /sighs|sospiri/i, 'Dante among the Great Poets': /sixth|sesto/i,
  'Charon Herds the Sinners onto his Boat': /Charon|Caron/i, 'The Doomed Souls Cross the Acheron': /dusky|bruna/i,
  'The Punishment of the Simonists': /holes|fóri|feet|piedi/i, 'The Demons Threaten Virgil': /gates|porte|fallen from Heaven|piovuti/i,
  'The Pit of Disease: The Falsifiers': /lamentations|lamenti|disease|infirm/i,
  'Thence we came forth to rebehold the stars': /stars|stelle/i, 'Then he moved on, and I behind him followed': /moved on|mosse/i,
  'Day was departing': /Day was departing|giorno se n'andava/i,
  'Dante Running from the Three Beasts': /she-wolf|lupa|wolf/i, 'Malebolge (Inferno XVIII)': /Malebolge/i,
};

// Clean Commons values: remove Wikidata QS suffixes; reject uploader credits and upload timestamps.
const cleanDate = d => {
  d = d.replace(/\s*date QS:.*$/, '').trim();
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(d) && +d.slice(0, 4) > 1950) return ''; // upload/scan timestamp
  d = d.replace(/;?\s*\d{4}-\d{2}-\d{2} \(scan and upload\)/, '').trim();
  return d;
};
const cleanArtist = (a, desc) => {
  if (/Dor[eé]/i.test(a)) return 'Gustave Doré';
  if (/uploaded by|scanned/i.test(a)) return /Dor[eé]/i.test(desc) ? 'Gustave Doré' : '';
  return a.replace(/\s*\(\d{4}\s*[–-]\s*\d{4}\)\s*$/, '').trim();
};

(async () => {
  const titles = P.map(p => 'File:' + decodeURIComponent(p.source.split('/wiki/')[1]).replace(/^File:/, '').replace(/_/g, ' '));
  let cache = {};
  const forceRefresh = process.argv.includes('--refresh');
  if (!forceRefresh && fs.existsSync(META_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch {}
  }

  const missing = titles.filter(t => !cache[t]);
  for (let i = 0; i < missing.length; i += 40) {
    await sleep(2000);
    const q = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'extmetadata|url', iiurlwidth: '1280',
      titles: missing.slice(i, i + 40).join('|') });
    const j = await (await fetch(API + '?' + q, { headers: UA })).json();
    const norm = {}; (j.query.normalized || []).forEach(n => norm[n.to] = n.from);
    Object.values(j.query.pages).forEach(pg => {
      if (pg.imageinfo && pg.imageinfo[0]) {
        cache[norm[pg.title] || pg.title] = {
          extmetadata: pg.imageinfo[0].extmetadata || {},
          thumburl: pg.imageinfo[0].thumburl || pg.imageinfo[0].url,
          url: pg.imageinfo[0].url,
          descriptionurl: pg.imageinfo[0].descriptionurl
        };
      }
    });
    fs.writeFileSync(META_FILE, JSON.stringify(cache, null, 2));
  }

  const report = [];
  P.forEach((p, i) => {
    const entry = cache[titles[i]] || {};
    const m = entry.extmetadata || entry || {};
    const desc = strip(m.ImageDescription && m.ImageDescription.value);
    const artist = cleanArtist(strip(m.Artist && m.Artist.value), desc + ' ' + titles[i]);
    const date = cleanDate(strip(m.DateTimeOriginal && m.DateTimeOriginal.value));
    const objName = strip(m.ObjectName && m.ObjectName.value);
    const licShort = strip(m.LicenseShortName && m.LicenseShortName.value);
    const usageTerms = strip(m.UsageTerms && m.UsageTerms.value);
    const license = licShort || usageTerms || '';
    const issues = [];
    if (!artist) issues.push('no artist in source');
    if (!date) issues.push('no date in source');
    if (!license) issues.push('no license in source');

    // keep only source-backed values
    p.artist = artist;
    p.artistVerified = !!artist;
    p.date = date;
    p.license = license;
    p.description = desc.slice(0, 400);
    if (objName) p.sourceTitle = objName;
    delete p.medium; delete p.location;

    // check local image file
    const extMatch = titles[i].match(/\.(jpe?g|png|gif|webp|svg)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
    const localRel = `images/paintings/${p.id}.${ext}`;
    const localAbs = path.join(__dirname, '..', localRel);
    if (fs.existsSync(localAbs) && fs.statSync(localAbs).size > 1024) {
      p.image = localRel;
      p.full = localRel;
    } else {
      issues.push(`missing local image ${localRel}`);
    }

    // line range: explicit verse numbers in filename win
    const fv = titles[i].match(/Canto (\d+) verses? (\d+)(?:-(\d+))?/i);
    if (!p.lines) { p.linesVerified = ''; issues.push('no line range'); }
    else if (fv && +fv[1] === p.canto) { p.lines = [+fv[2], +(fv[3] || fv[2])]; p.linesVerified = 'filename'; }
    else {
      const c = CANTOS[p.canto - 1];
      const txt = c.en.slice(p.lines[0] - 1, p.lines[1]).join(' ') + ' ' + c.it.slice(p.lines[0] - 1, p.lines[1]).join(' ');
      const k = KEY[p.title];
      if (k && k.test(txt)) p.linesVerified = 'text';
      else if (k) {
        // relocate to the line nearest the old range where the subject is actually named
        const hits = [];
        for (let n = 0; n < c.en.length; n++) if (k.test(c.en[n] + ' ' + (c.it[n] || ''))) hits.push(n + 1);
        if (hits.length) {
          const mid = (p.lines[0] + p.lines[1]) / 2;
          const best = hits.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
          issues.push(`relocated ${p.lines.join('-')} -> ${best}-${Math.min(best + 2, c.en.length)}`);
          p.lines = [best, Math.min(best + 2, c.en.length)]; p.linesVerified = 'text';
        } else { p.linesVerified = ''; issues.push('subject not found in canto text'); }
      } else { p.linesVerified = ''; issues.push('no keyword to check range'); }
    }
    const lineStr = p.lines ? p.lines.join('-') : 'canto';
    report.push(`${issues.length ? 'WARN' : 'OK  '} C${p.canto} ${lineStr} ${p.title} | ${p.artist} | ${p.date} | ${p.license} | ${p.image}${issues.length ? '  <- ' + issues.join('; ') : ''}`);
  });

  const kept = P;
  kept.forEach(p => { if (!p.linesVerified) { p.lines = null; report.push(`CANTO-LEVEL C${p.canto} ${p.title} (no verifiable line range; shown for the whole canto)`); } });
  kept.filter(p => !p.artistVerified).forEach(p => report.push(`NO ARTIST C${p.canto} ${p.title} (artist not stated in source)`));
  kept.forEach((p, i) => p.id = 'p' + (i + 1));
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'paintings.js'),
    '// Public-domain artworks; artist/date/description/license taken from cached Wikimedia Commons metadata (data/commons-metadata.json)\nwindow.PAINTINGS = ' + JSON.stringify(kept, null, 1) + ';\n');
  fs.writeFileSync(path.join(__dirname, 'verify-report.txt'), report.join('\n'));
  console.log(report.join('\n'));
})();
