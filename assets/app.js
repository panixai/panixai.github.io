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
  document.querySelectorAll('[data-tabs], [data-demo]').forEach(function (box) {
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.tab');
      if (!b || !box.contains(b)) return;
      box.querySelectorAll('.tab').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      box.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === b.dataset.tab); });
      if (box.hasAttribute('data-demo')) { stop(); animateRows(box.querySelector('.pane.on')); }
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

  // Hero demo: rows stream in, tabs rotate until the user picks one
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var demo = document.querySelector('[data-demo]'), timer = null;
  function animateRows(pane) {
    if (reduce || !pane) return;
    pane.querySelectorAll('tbody tr').forEach(function (r, i) {
      r.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, delay: 120 + i * 110, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  if (demo && !reduce) {
    animateRows(demo.querySelector('.pane.on'));
    var tabs = demo.querySelectorAll('.tab'), i = 0;
    timer = setInterval(function () {
      i = (i + 1) % tabs.length;
      tabs.forEach(function (x, k) { x.classList.toggle('on', k === i); x.setAttribute('aria-selected', k === i); });
      demo.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === tabs[i].dataset.tab); });
      animateRows(demo.querySelector('.pane.on'));
    }, 4500);
    demo.addEventListener('mouseenter', stop);
  }

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
