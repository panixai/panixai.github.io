(function () {
  var doc = document.documentElement;

  // Theme toggle
  var t = document.getElementById('theme');
  if (t) t.addEventListener('click', function () {
    var next = doc.dataset.theme === 'dark' ? 'light' : 'dark';
    doc.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Tabs (code blocks and hero demo)
  document.querySelectorAll('[data-tabs]').forEach(function (box) {
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.tab');
      if (!b || !box.contains(b)) return;
      box.querySelectorAll('.tab').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      box.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === b.dataset.tab); });
    });
  });

  // Copy buttons
  document.querySelectorAll('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var pane = b.closest('.code').querySelector('.pane.on code');
      navigator.clipboard.writeText(pane.textContent).then(function () {
        b.classList.add('copied'); setTimeout(function () { b.classList.remove('copied'); }, 1400);
      });
    });
  });

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Playground: each tool plays input -> run -> dataset rows -> uses -> integrations, then the next tool. Loops; click any tab.
  var pg = document.querySelector('[data-pg]');
  if (pg) (function () {
    var data = JSON.parse(document.getElementById('pg-data').textContent);
    var tabsEl = pg.querySelector('.pg-tabs'), tabs = [].slice.call(pg.querySelectorAll('.pg-tab'));
    var code = pg.querySelector('.pg-json code'), st = pg.querySelector('.pg-status'), stText = st.querySelector('span');
    var thead = pg.querySelector('.pg-table thead tr'), tbody = pg.querySelector('.pg-table tbody');
    var link = pg.querySelector('.pg-link'), arrow = link.querySelector('svg').outerHTML, outNote = pg.querySelector('.pg-out .label .muted');
    var uses = pg.querySelector('.pg-uses'), tiles = [].slice.call(pg.querySelectorAll('.pg-tile')), flow = pg.querySelector('.pg-flow'), flowText = flow.querySelector('span');
    var G = window.gsap, auto = !reduce && !!G, cur = 0, tl = null, hover = false, waiting = false, visible = true;
    var HOLD = 7.5; // seconds per tool
    if (!G) pg.classList.add('is-static');
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

    function render(d) {
      code.innerHTML = d.inputHtml;
      thead.innerHTML = d.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('');
      tbody.innerHTML = d.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td title="' + esc(c).replace(/"/g, '&quot;') + '">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('');
      link.innerHTML = esc(d.name) + ' ' + arrow; link.href = d.page;
      outNote.textContent = '· ' + (d.sample ? 'sample' : 'from a real run');
      uses.innerHTML = d.use.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('');
      flowText.textContent = d.flow;
    }
    function setTab(i) {
      tabs.forEach(function (t, k) { var on = k === i; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      var t = tabs[i], left = t.offsetLeft - (tabsEl.clientWidth - t.offsetWidth) / 2;
      tabsEl.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
    }
    function sync() { if (tl) { if (visible && !document.hidden) tl.play(); else tl.pause(); } }
    function done(n) { st.dataset.st = 'done'; stText.textContent = 'Succeeded · ' + n + ' rows'; }

    function go(i) {
      cur = (i + data.length) % data.length;
      var d = data[cur];
      if (tl) { tl.kill(); tl = null; }
      waiting = false;
      setTab(cur); render(d);
      if (!G || reduce) { done(d.rows.length); tiles.forEach(function (t) { t.classList.add('on'); }); return; }
      G.set(pg.querySelectorAll('.pg-bar'), { scaleX: 0 });
      tiles.forEach(function (t) { t.classList.remove('on'); });
      st.dataset.st = 'idle'; stText.textContent = 'Ready';
      var lines = code.querySelectorAll('.ln'), trs = tbody.querySelectorAll('tr'), lis = uses.querySelectorAll('li');
      var rowsEnd = 1.25 + trs.length * 0.14;
      tl = G.timeline({ paused: true, onComplete: function () { if (!auto) return; if (hover) waiting = true; else go(cur + 1); } });
      tl.fromTo(tabs[cur].querySelector('.pg-bar'), { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: 'none' }, 0)
        .from(lines, { opacity: 0, x: -8, duration: 0.3, stagger: 0.045, ease: 'power2.out' }, 0.05)
        .call(function () { st.dataset.st = 'run'; stText.textContent = 'Running'; }, null, 0.75)
        .from(thead.children, { opacity: 0, y: -4, duration: 0.3, stagger: 0.05 }, 0.95)
        .from(trs, { opacity: 0, y: 10, duration: 0.45, stagger: 0.14, ease: 'power3.out' }, 1.2)
        .call(function () { done(trs.length); }, null, rowsEnd)
        .from(lis, { opacity: 0, x: 10, duration: 0.4, stagger: 0.16, ease: 'power2.out' }, rowsEnd + 0.2);
      tiles.forEach(function (t, k) { tl.call(function () { t.classList.add('on'); }, null, rowsEnd + 0.75 + k * 0.12); });
      tl.from(flow, { opacity: 0, y: 6, duration: 0.4, ease: 'power2.out' }, rowsEnd + 1.6);
      sync();
    }

    tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    tabsEl.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return; e.preventDefault(); go(cur + k); tabs[cur].focus();
    });
    // While the mouse is over the panel, finish the current tool but don't move on until it leaves.
    pg.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    pg.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; hover = false; if (waiting) go(cur + 1); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(pg);
    go(0);
  })();

  // Demo videos: play while visible, pause button, respect reduced motion
  document.querySelectorAll('video[data-autoplay]').forEach(function (v) {
    var wrap = v.parentNode, btn = wrap.querySelector('.video-btn'), userPaused = reduce;
    var sync = function () { wrap.classList.toggle('paused', v.paused); btn.setAttribute('aria-label', v.paused ? 'Play video' : 'Pause video'); };
    v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
    btn.addEventListener('click', function () { if (v.paused) { userPaused = false; v.play(); } else { userPaused = true; v.pause(); } });
    v.addEventListener('click', function () { btn.click(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !userPaused) { v.preload = 'auto'; var p = v.play(); if (p) p.catch(function () {}); }
          else if (!e.isIntersecting) v.pause();
        });
      }, { threshold: 0.35 }).observe(v);
    }
  });

  // Demo video switcher
  document.querySelectorAll('.vid-tabs').forEach(function (bar) {
    var sec = bar.closest('section');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      bar.querySelectorAll('[data-v]').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      sec.querySelectorAll('.vid-pane').forEach(function (p) {
        var on = p.dataset.vid === b.dataset.v, v = p.querySelector('video');
        p.hidden = !on; p.classList.toggle('on', on);
        if (v) { if (on) { v.currentTime = 0; v.preload = 'auto'; var pr = v.play(); if (pr) pr.catch(function () {}); } else v.pause(); }
      });
    });
  });

  // Tool search and category filter
  var q = document.getElementById('q'), grid = document.getElementById('grid');
  if (q && grid) {
    var cards = [].slice.call(grid.querySelectorAll('.card')), segs = [].slice.call(document.querySelectorAll('.seg-b'));
    var empty = document.getElementById('empty'), cat = new URLSearchParams(location.search).get('c') || '';
    var apply = function () {
      var term = q.value.trim().toLowerCase(), shown = 0;
      cards.forEach(function (c) {
        var ok = (!cat || c.dataset.cat === cat) && (!term || term.split(/\s+/).every(function (w) { return c.dataset.q.indexOf(w) > -1; }));
        c.hidden = !ok; if (ok) shown++;
      });
      segs.forEach(function (s) { var on = s.dataset.c === cat; s.classList.toggle('on', on); s.setAttribute('aria-selected', on); });
      empty.hidden = shown > 0;
    };
    q.addEventListener('input', apply);
    segs.forEach(function (s) { s.addEventListener('click', function () { cat = s.dataset.c; apply(); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== q && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
      if (e.key === 'Escape' && document.activeElement === q) { q.value = ''; apply(); q.blur(); }
    });
    apply();
  }
})();
