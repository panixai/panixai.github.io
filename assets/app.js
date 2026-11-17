(function () {
  // Filter + search
  var q = document.getElementById('q'), cards = [].slice.call(document.querySelectorAll('.card')), chips = [].slice.call(document.querySelectorAll('.chip')), cat = '';
  function apply() {
    var t = q.value.toLowerCase();
    cards.forEach(function (c) {
      c.style.display = (!cat || c.dataset.cat === cat) && c.dataset.text.indexOf(t) > -1 ? '' : 'none';
    });
  }
  q.addEventListener('input', apply);
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); cat = b.dataset.c; apply();
    });
  });

  // Hero demo: type an input, stream rows
  var typed = document.getElementById('typed'), rows = document.getElementById('rows');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var demos = [
    { input: '{ "keyword": "data engineer", "location": "Berlin" }', rows: ['Data Engineer | Acme GmbH | EUR 70-85k', 'Analytics Engineer | Nordly | EUR 65-80k', 'ML Engineer | Brightway | EUR 80-95k', 'BI Developer | Kaufland | EUR 60-72k'] },
    { input: '{ "query": "wireless earbuds", "country": "US" }', rows: ['Earbuds Pro | $39.99 | 4.6 stars', 'AirTune 2 | $24.50 | 4.3 stars', 'SoundBud X | $59.00 | 4.7 stars', 'BassGo | $18.99 | 4.1 stars'] },
    { input: '{ "videoUrl": "youtube.com/watch?v=..." }', rows: ['00:00 Welcome to the show', '00:07 Today we cover pricing', '00:19 Let us look at the data', '00:31 Thanks for watching'] }
  ];
  var i = 0;
  function show(d) {
    typed.textContent = d.input; rows.innerHTML = '';
    d.rows.forEach(function (r) { var e = document.createElement('div'); e.className = 'row'; e.textContent = r; rows.appendChild(e); });
  }
  if (reduce || !window.gsap) { show(demos[0]); return; }
  function play() {
    var d = demos[i++ % demos.length];
    typed.textContent = ''; rows.innerHTML = '';
    var o = { n: 0 }, tl = gsap.timeline({ onComplete: function () { gsap.delayedCall(1.8, play); } });
    tl.to(o, { n: d.input.length, duration: 1.6, ease: 'none', onUpdate: function () { typed.textContent = d.input.slice(0, Math.round(o.n)); } });
    tl.add(function () {
      d.rows.forEach(function (r) { var e = document.createElement('div'); e.className = 'row'; e.textContent = r; rows.appendChild(e); });
    });
    tl.from('#rows .row', { opacity: 0, x: -20, stagger: 0.25, duration: 0.4 });
  }
  play();
})();
