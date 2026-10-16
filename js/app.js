(() => {
  const CANTOS = window.INFERNO || [];
  const PAINTINGS = window.PAINTINGS || [];
  const $ = id => document.getElementById(id);
  const ROMAN = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV'][n];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byCanto = n => PAINTINGS.filter(p => p.canto === n).sort((a, b) => (a.lines ? a.lines[0] : 0) - (b.lines ? b.lines[0] : 0));
  const artistOf = p => p.artist || 'Artist not stated in source';
  const isTouch = matchMedia('(hover: none)').matches;

  /* ---------- embers ---------- */
  const emb = document.querySelector('.embers');
  for (let i = 0; i < 28; i++) {
    const e = document.createElement('i');
    e.style.left = Math.random() * 100 + '%';
    e.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    e.style.animationDuration = 9 + Math.random() * 14 + 's';
    e.style.animationDelay = -Math.random() * 20 + 's';
    e.style.transform = `scale(${0.5 + Math.random()})`;
    emb.appendChild(e);
  }

  /* ---------- language ---------- */
  const setLang = l => {
    document.body.classList.remove('lang-en', 'lang-it', 'lang-both');
    document.body.classList.add('lang-' + l);
    document.querySelectorAll('.lang-toggle button').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
    localStorage.setItem('inferno-lang', l);
  };
  document.querySelectorAll('.lang-toggle button').forEach(b => b.onclick = () => setLang(b.dataset.lang));
  setLang(localStorage.getItem('inferno-lang') || 'both');

  /* ---------- home ---------- */
  $('toc').innerHTML = CANTOS.map(c => {
    const ps = byCanto(c.n);
    const img = ps[0] ? `style="background-image:url('${ps[0].image}')"` : '';
    return `<li><a href="#canto-${c.n}" id="toc-canto-${c.n}"><div class="thumb" ${img}></div>
      <div class="body"><div class="num">Canto ${ROMAN(c.n)}</div><div class="desc">${esc(c.title)}</div>
      <div class="count">${ps.length} painting${ps.length === 1 ? '' : 's'}</div></div></a></li>`;
  }).join('');

  $('sidebar').innerHTML = CANTOS.map(c =>
    `<a href="#canto-${c.n}" id="side-canto-${c.n}"><b>${ROMAN(c.n)}</b><span>${esc(c.title.split('.')[0])}</span></a>`).join('');

  /* ---------- canto reader ---------- */
  let current = null; // paintings of the current canto
  function renderCanto(n) {
    const c = CANTOS[n - 1];
    if (!c) return route('');
    current = byCanto(n);
    $('canto-eyebrow').textContent = `Inferno · Canto ${n} of 34`;
    $('canto-title').textContent = 'Canto ' + ROMAN(n);
    $('canto-desc').textContent = c.title;
    $('canto-strip').innerHTML = current.map((p, i) =>
      `<img src="${p.image}" alt="${esc(p.title)}" title="${esc(p.title + ' — ' + artistOf(p))}" data-i="${i}" loading="lazy">`).join('');

    // map line -> painting indices
    const map = {};
    current.forEach((p, i) => { if (p.lines) for (let l = p.lines[0]; l <= p.lines[1]; l++) (map[l] = map[l] || []).push(i); });

    const line = (txt, ln, cls) => {
      const ps = map[ln];
      const attr = ps ? ` data-ps="${ps.join(',')}" data-ln="${ln}"` : '';
      const num = ln % 3 === 1 || ps ? `<span class="ln">${ln}</span>` : '';
      return `<span class="vline ${cls}${ps ? ' ill' : ''}"${attr}>${num}${esc(txt)}</span>`;
    };
    let html = '';
    const len = Math.max(c.en.length, c.it.length);
    for (let i = 0; i < len; i += 3) {
      let en = '', it = '';
      for (let j = i; j < Math.min(i + 3, len); j++) {
        if (c.it[j] !== undefined) it += line(c.it[j], j + 1, '');
        if (c.en[j] !== undefined) en += line(c.en[j], j + 1, '');
      }
      html += `<div class="tercet"><div class="col-it" lang="it">${it}</div><div class="col-en" lang="en">${en}</div></div>`;
    }
    $('verses').innerHTML = html;

    const prev = $('prev-canto'), next = $('next-canto');
    prev.href = '#canto-' + (n - 1); prev.classList.toggle('disabled', n === 1);
    next.href = '#canto-' + (n + 1); next.classList.toggle('disabled', n === 34);
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.toggle('active', a.id === 'side-canto-' + n));
    $('side-canto-' + n).scrollIntoView({ block: 'nearest' });
    document.title = `Inferno · Canto ${ROMAN(n)} — Illustrated Edition`;
  }

  /* ---------- hover preview ---------- */
  const pv = $('preview');
  let hoverEl = null;
  const hotLines = on => {
    if (!hoverEl) return;
    const ps = hoverEl.dataset.ps;
    document.querySelectorAll(`.vline[data-ps="${ps}"]`).forEach(el => el.classList.toggle('hot', on));
  };
  $('verses').addEventListener('mouseover', e => {
    const el = e.target.closest('.vline.ill');
    if (el === hoverEl) return;
    hotLines(false); hoverEl = el;
    if (!el || isTouch) { pv.classList.remove('show'); return; }
    hotLines(true);
    const p = current[+el.dataset.ps.split(',')[0]];
    const n = el.dataset.ps.split(',').length;
    $('preview-img').src = p.image;
    $('preview-title').textContent = p.title;
    $('preview-artist').textContent = `${artistOf(p)}${p.date ? ', ' + p.date : ''}` + (n > 1 ? ` · +${n - 1} more` : '');
    pv.classList.add('show');
  });
  $('verses').addEventListener('mouseleave', () => { hotLines(false); hoverEl = null; pv.classList.remove('show'); });
  document.addEventListener('mousemove', e => {
    if (!pv.classList.contains('show')) return;
    const w = pv.offsetWidth, h = pv.offsetHeight, pad = 18;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > innerWidth - 10) x = e.clientX - w - pad;
    if (y + h > innerHeight - 10) y = Math.max(10, innerHeight - h - 10);
    pv.style.left = x + 'px'; pv.style.top = y + 'px';
  });

  /* ---------- lightbox ---------- */
  let lbList = [], lbIdx = 0;
  const lb = $('lightbox');
  function openLB(list, idx) {
    lbList = list; lbIdx = idx; pv.classList.remove('show');
    lb.hidden = false; document.body.style.overflow = 'hidden'; showLB();
  }
  function showLB() {
    const p = lbList[lbIdx];
    const img = $('lb-img');
    img.style.opacity = 0; img.onload = () => img.style.transition = 'opacity .4s'; img.src = p.image; img.alt = p.title;
    img.onload = () => { img.style.transition = 'opacity .4s'; img.style.opacity = 1; };
    $('lb-ref').textContent = `Canto ${ROMAN(p.canto)} · ` + (p.lines ? `lines ${p.lines[0]}–${p.lines[1]}` : 'whole canto');
    $('lb-title').textContent = p.title;
    $('lb-artist').textContent = artistOf(p);
    $('lb-date').textContent = p.date || 'Not stated in source';
    $('lb-medium').textContent = p.description || '';
    document.querySelectorAll('.lb-med').forEach(e => e.hidden = !p.description);
    $('lb-location').textContent = '';
    document.querySelectorAll('.lb-loc').forEach(e => e.hidden = true);
    const c = CANTOS[p.canto - 1];
    const lang = document.body.classList.contains('lang-it') ? 'it' : 'en';
    $('lb-verse').innerHTML = p.lines ? c[lang].slice(p.lines[0] - 1, p.lines[1]).map(esc).join('<br>') : '';
    $('lb-verse').hidden = !p.lines;
    $('lb-source').href = p.source;
    $('lb-prev').disabled = lbIdx === 0;
    $('lb-next').disabled = lbIdx === lbList.length - 1;
  }
  const closeLB = () => { lb.hidden = true; document.body.style.overflow = ''; };
  $('lb-close').onclick = closeLB;
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  $('lb-prev').onclick = () => { if (lbIdx > 0) { lbIdx--; showLB(); } };
  $('lb-next').onclick = () => { if (lbIdx < lbList.length - 1) { lbIdx++; showLB(); } };
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') $('lb-prev').click();
    if (e.key === 'ArrowRight') $('lb-next').click();
  });
  $('verses').addEventListener('click', e => {
    const el = e.target.closest('.vline.ill');
    if (el) openLB(current, +el.dataset.ps.split(',')[0]);
  });
  $('canto-strip').addEventListener('click', e => { if (e.target.dataset.i) openLB(current, +e.target.dataset.i); });

  /* ---------- gallery ---------- */
  const artists = [...new Set(PAINTINGS.map(artistOf))];
  let filter = 'All';
  function renderGallery() {
    $('filters').innerHTML = ['All', ...artists].map(a =>
      `<button class="${a === filter ? 'active' : ''}" data-a="${esc(a)}">${esc(a)}</button>`).join('');
    const list = PAINTINGS.filter(p => filter === 'All' || artistOf(p) === filter);
    $('gallery').innerHTML = list.map((p, i) =>
      `<div class="card" data-i="${i}"><img src="${p.image}" alt="${esc(p.title)}" loading="lazy">
       <div><strong>${esc(p.title)}</strong><span>${esc(artistOf(p))}${p.date ? ', ' + esc(p.date) : ''} · Canto ${ROMAN(p.canto)}</span></div></div>`).join('');
    $('gallery').onclick = e => { const c = e.target.closest('.card'); if (c) openLB(list, +c.dataset.i); };
  }
  $('filters').addEventListener('click', e => { if (e.target.dataset.a) { filter = e.target.dataset.a; renderGallery(); } });

  /* ---------- routing ---------- */
  function route() {
    const h = location.hash.slice(1);
    const m = h.match(/^canto-(\d+)$/);
    ['home', 'canto', 'gallery'].forEach(v => $('view-' + v).hidden = true);
    closeLB();
    if (m) { $('view-canto').hidden = false; renderCanto(+m[1]); }
    else if (h === 'gallery') { $('view-gallery').hidden = false; renderGallery(); document.title = 'Gallery — Inferno Illustrated'; }
    else { $('view-home').hidden = false; document.title = "Inferno — An Illustrated Edition of Dante's Divine Comedy"; }
    scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  route();
})();
