// Static site generator for panixai.github.io
// Data: data/store.json (public Apify Store API, refresh with `node scripts/fetch-assets.mjs`)
//       d:/PANIX/actors/*/.actor/*.json (input and output schemas)
// Run:  node build.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const SRC = process.env.ACTORS_DIR || 'd:/PANIX/actors';
const BASE = 'https://panixai.github.io';
const BRAND = 'Panix AI Labs';
const PROFILE = 'https://apify.com/panix';
const EMAIL = 'saoud.pro@gmail.com';
const V = Date.now().toString(36); // cache-busting for css/js

const CATS = [
  ['jobs', 'Jobs & hiring', ['ats-jobs-scraper', 'linkedin-jobs-scraper', 'upwork-jobs-scraper', 'linkedin-company-scraper', 'resume-cv-json-parser']],
  ['ads', 'Ad intelligence', ['facebook-ads-library-scraper', 'google-ads-transparency-scraper', 'linkedin-ad-library-scraper', 'tiktok-ads-scraper']],
  ['commerce', 'E-commerce', ['amazon-product-scraper', 'amazon-arbitrage-finder', 'walmart-scraper', 'aliexpress-scraper']],
  ['social', 'Social & video', ['youtube-scraper', 'youtube-comments-scraper', 'tiktok-scraper', 'pinterest-scraper', 'threads-scraper']],
  ['transcripts', 'Transcripts', ['youtube-transcript-scraper', 'video-transcript-scraper', 'instagram-reel-transcript']],
  ['more', 'Travel, news & sports', ['booking-scraper', 'airbnb-scraper', 'google-news-scraper', 'flashscore-scraper', 'espn-sports-scraper']],
  ['docs', 'Documents', ['invoice-table-json-extractor']]
];
const catOf = n => CATS.find(c => c[2].includes(n)) || ['more', 'Other', []];

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const fmtUsd = n => '$' + (n >= 1 ? n.toFixed(2).replace(/\.00$/, '') : n >= 0.1 ? n.toFixed(2) : String(+n.toFixed(4)));
const plural = w => /(s|x|ch|sh)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's';
const unitOf = t => t.replace(/\s+delivered$/i, '').toLowerCase();

function pricing(a) {
  const ev = a.currentPricingInfo?.pricingPerEvent?.actorChargeEvents || {};
  const price = v => v.eventTieredPricingUsd?.FREE?.tieredEventPriceUsd ?? v.eventPriceUsd ?? 0;
  const tiers = v => v.eventTieredPricingUsd ? Object.entries(v.eventTieredPricingUsd).map(([k, x]) => [k, x.tieredEventPriceUsd]) : null;
  const events = Object.entries(ev).filter(([k]) => k !== 'apify-actor-start')
    .map(([k, v]) => ({ key: k, title: v.eventTitle, desc: v.eventDescription, price: price(v), tiers: tiers(v), primary: !!v.isPrimaryEvent }));
  const primary = events.find(e => e.primary) || events[0];
  const start = ev['apify-actor-start'] ? price(ev['apify-actor-start']) : null;
  let line = '';
  if (primary) {
    const unit = unitOf(primary.title);
    line = primary.price >= 0.01 ? `${fmtUsd(primary.price)} per ${unit}` : `${fmtUsd(primary.price * 1000)} / 1,000 ${plural(unit)}`;
  }
  return { events, primary, start, line };
}

// sample input from schema prefills, plus required fields
function sampleInput(schema) {
  if (!schema?.properties) return {};
  const out = {};
  for (const [k, p] of Object.entries(schema.properties)) {
    if (p.prefill !== undefined) out[k] = p.prefill;
    else if ((schema.required || []).includes(k) && p.default !== undefined) out[k] = p.default;
  }
  return out;
}

function outputFields(ds) {
  const views = ds?.views ? Object.values(ds.views) : [];
  const v = views[0];
  const fields = v?.transformation?.fields || Object.keys(ds?.fields?.properties || {});
  const props = ds?.fields?.properties || {};
  return fields.slice(0, 24).map(f => ({ name: f, desc: props[f]?.description || '' }));
}

// ---------- load data ----------
const store = readJson(path.join(ROOT, 'data', 'store.json'));
if (!store) throw new Error('data/store.json missing. Run: node scripts/fetch-assets.mjs');

// Public Apify tasks per Actor (data/tasks.json, refresh with `python scripts/fetch-tasks.py`)
const TASKS = readJson(path.join(ROOT, 'data', 'tasks.json')) || {};
const tasksHtml = a => {
  const list = TASKS[a.slug] || [];
  if (!list.length) return '';
  const first = s => { const m = String(s).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : s; };
  return `<section class="sec" id="tasks"><div class="tk-head"><div><h2>Ready-made tasks</h2><p class="muted">${list.length} pre-configured ${list.length === 1 ? 'task' : 'tasks'} for real use cases. Pick one, press Try for free, and it opens on Apify with the same settings in your own account.</p></div>
  <div class="tk-nav"><button class="icon-btn tk-prev" type="button" aria-label="Previous tasks"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button><button class="icon-btn tk-next" type="button" aria-label="Next tasks"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button></div></div>
  <div class="tk" data-carousel><div class="tk-track" tabindex="0" role="group" aria-label="${esc(a.short)} tasks">${list.map((t, i) => `<article class="tk-card"><span class="tk-n">${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}</span><h3>${esc(t.title)}</h3><p>${esc(first(t.desc))}</p><a class="btn tk-cta" href="${esc(t.url)}" target="_blank" rel="noopener" aria-label="Try for free: ${esc(t.title)}">Try for free ${ICON.arrow}</a></article>`).join('')}</div>
  <div class="tk-dots" aria-hidden="true"></div></div></section>`;
};

const local = {};
for (const d of fs.readdirSync(SRC)) {
  const dir = path.join(SRC, d, '.actor');
  const aj = readJson(path.join(dir, 'actor.json'));
  if (!aj) continue;
  local[aj.name] = { input: readJson(path.join(dir, 'input_schema.json')), dataset: readJson(path.join(dir, 'dataset_schema.json')) };
}

const actors = store.map(a => {
  // Titles without ':' get a short name and tagline here.
  const SPLIT = { 'booking-scraper': ['Booking.com Scraper', 'Hotel Prices, Price Calendar & Tracker'] };
  const [short, ...rest] = SPLIT[a.name] || a.title.split(/:\s+/);
  const c = catOf(a.name);
  const r = a.stats?.publicActorRunStats30Days || {};
  const icon = fs.existsSync(path.join(ROOT, 'assets', 'img', a.name + '.png')) ? `/assets/img/${a.name}.png` : null;
  return {
    slug: a.name, id: a.id, title: a.title, short, tagline: rest.join(': '), desc: a.description,
    catKey: c[0], cat: c[1], icon, url: a.url, apiId: `panix~${a.name}`,
    runs: r.TOTAL || 0, ok: r.SUCCEEDED || 0,
    price: pricing(a), input: sampleInput(local[a.name]?.input), fields: outputFields(local[a.name]?.dataset)
  };
}).sort((x, y) => CATS.findIndex(c => c[0] === x.catKey) - CATS.findIndex(c => c[0] === y.catKey) || x.short.localeCompare(y.short));

for (const a of actors) a.video = fs.existsSync(path.join(ROOT, 'videos', `${a.slug}.mp4`));
const videoTag = a => `<div class="video-wrap"><video class="video" data-autoplay src="/videos/${a.slug}.mp4"${fs.existsSync(path.join(ROOT, 'videos', `${a.slug}.jpg`)) ? ` poster="/videos/${a.slug}.jpg"` : ''} muted loop playsinline preload="none" aria-label="${esc(a.short)} demo: input, output rows and match details"></video>
<button class="video-btn" type="button" aria-label="Pause video"><span class="i-pause"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg></span><span class="i-play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></button></div>`;

const totalRuns = actors.reduce((s, a) => s + a.runs, 0);
const totalOk = actors.reduce((s, a) => s + a.ok, 0);
const successPct = totalRuns ? (Math.floor(totalOk / totalRuns * 1000) / 10) : null;
const minPer1k = Math.min(...actors.filter(a => a.price.primary).map(a => a.price.primary.price * 1000));

// ---------- shared chrome ----------
const ICON = {
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  ext: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
};

const avatar = (a, size = 40) => a.icon
  ? `<img class="av" src="${a.icon}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`
  : `<span class="av av-mono" style="width:${size}px;height:${size}px">${esc(a.short[0])}</span>`;

const head = ({ title, desc, url, jsonld }) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">
<meta property="og:type" content="website"><meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${BASE}/assets/img/logo-512.png">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<script>(function(){try{var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}})()</script>
<link rel="stylesheet" href="/assets/style.css?v=${V}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="wrap nav-in">
  <a class="brand" href="/" aria-label="${BRAND} home"><img src="/assets/img/logo-64.png" width="28" height="28" alt=""><span>${BRAND}</span></a>
  <nav class="links" aria-label="Main">
    <a href="/#tools">Tools</a><a href="/#api">API</a><a href="/#faq">FAQ</a><a href="/#custom">Custom work</a>
  </nav>
  <div class="nav-r">
    <button class="icon-btn" id="theme" type="button" aria-label="Toggle dark mode"><span class="i-sun">${ICON.sun}</span><span class="i-moon">${ICON.moon}</span></button>
    <a class="btn btn-sm" href="${PROFILE}" target="_blank" rel="noopener">Apify Store ${ICON.ext}</a>
  </div>
</div></header>
<main id="main">`;

const foot = `</main>
<footer class="foot"><div class="wrap foot-in">
  <div class="foot-brand"><img src="/assets/img/logo-64.png" width="24" height="24" alt=""><span>${BRAND}</span></div>
  <p class="muted">Web data tools on Apify. Public pages only, pay per result.</p>
  <nav class="foot-links" aria-label="Footer"><a href="${PROFILE}" target="_blank" rel="noopener">Apify profile</a><a href="mailto:${EMAIL}">${EMAIL}</a><a href="/sitemap.xml">Sitemap</a></nav>
</div></footer>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
<script src="/assets/app.js?v=${V}" defer></script>
</body></html>`;

function codeTabs(a) {
  const input = JSON.stringify(a.input, null, 2);
  const inputPy = JSON.stringify(a.input, null, 4).replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None');
  const curl = `curl -X POST "https://api.apify.com/v2/acts/${a.apiId}/run-sync-get-dataset-items?token=$APIFY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(a.input)}'`;
  const py = `from apify_client import ApifyClient

client = ApifyClient("APIFY_TOKEN")
run = client.actor("panix/${a.slug}").call(run_input=${inputPy.replace(/\n/g, '\n')})

for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)`;
  const js = `import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const run = await client.actor('panix/${a.slug}').call(${input});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);`;
  const tab = (id, label, code, on) => `<button class="tab${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-tab="${id}">${label}</button>`;
  const pane = (id, code, on) => `<pre class="pane${on ? ' on' : ''}" data-pane="${id}"><code>${esc(code)}</code></pre>`;
  return `<div class="code" data-tabs>
  <div class="code-bar"><div class="tabs" role="tablist">${tab('curl', 'cURL', curl, true)}${tab('py', 'Python', py)}${tab('js', 'JavaScript', js)}</div>
  <button class="icon-btn copy" type="button" aria-label="Copy code"><span class="i-copy">${ICON.copy}</span><span class="i-check">${ICON.check}</span></button></div>
  ${pane('curl', curl, true)}${pane('py', py)}${pane('js', js)}
</div>`;
}

// ---------- actor pages ----------
fs.rmSync(path.join(ROOT, 'tools'), { recursive: true, force: true });
fs.mkdirSync(path.join(ROOT, 'tools'), { recursive: true });

for (const a of actors) {
  const related = actors.filter(x => x.catKey === a.catKey && x.slug !== a.slug).slice(0, 3);
  const p = a.price;
  const video = a.video ? `<section class="sec sec-video">${videoTag(a)}</section>` : '';
  const rate = a.runs >= 5 ? `${Math.floor(a.ok / a.runs * 1000) / 10}%` : null;
  const priceRows = p.events.map(e => `<tr><td><span class="ev">${esc(e.title)}</span>${e.primary ? '' : '<span class="tag">optional</span>'}</td><td class="num">${fmtUsd(e.price)}</td></tr>`).join('');
  const tierRow = p.primary?.tiers ? `<details class="tiers"><summary>Lower prices on paid Apify plans</summary><table>${p.primary.tiers.map(([t, v]) => `<tr><td>${t[0] + t.slice(1).toLowerCase()}</td><td class="num">${fmtUsd(v)}</td></tr>`).join('')}</table></details>` : '';

  const html = `${head({
    title: `${a.title} | ${BRAND}`, desc: a.desc, url: `${BASE}/tools/${a.slug}.html`,
    jsonld: { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: a.title, description: a.desc, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: a.url, publisher: { '@type': 'Organization', name: BRAND, url: BASE }, offers: p.primary ? { '@type': 'Offer', price: p.primary.price, priceCurrency: 'USD' } : undefined }
  })}
<div class="wrap">
  <nav class="crumb" aria-label="Breadcrumb"><a href="/#tools">Tools</a><span>/</span><a href="/?c=${a.catKey}#tools">${esc(a.cat)}</a></nav>
  <div class="tool">
    <div class="tool-top">
      <header class="tool-head">${avatar(a, 56)}<div><h1>${esc(a.short)}</h1><p class="lead">${esc(a.tagline)}</p></div></header>
      <p class="desc">${esc(a.desc)}</p>
    </div>
    <div class="tool-main">
      ${video}
      ${tasksHtml(a)}
      <section class="sec"><h2>Example input</h2><p class="muted">Paste this into the Actor's JSON input, or send it with the API call below.</p>
        <pre class="json"><code>${esc(JSON.stringify(a.input, null, 2))}</code></pre></section>
      ${a.fields.length ? `<section class="sec"><h2>Output fields</h2><p class="muted">Every row has the same fields. Export as JSON, CSV, Excel or XML.</p>
        <ul class="fields">${a.fields.map(f => `<li${f.desc ? ` title="${esc(f.desc)}"` : ''}><code>${esc(f.name)}</code></li>`).join('')}</ul></section>` : ''}
      <section class="sec"><h2>Run it from code</h2><p class="muted">Use your <a href="https://console.apify.com/settings/integrations" target="_blank" rel="noopener">Apify API token</a>. The call waits for the run and returns the rows.</p>${codeTabs(a)}</section>
      ${related.length ? `<section class="sec"><h2>Related tools</h2><div class="grid grid-3">${related.map(card).join('')}</div></section>` : ''}
    </div>
    <aside class="tool-side"><div class="panel">
      <div class="price-big">${esc(p.line)}</div>
      <p class="muted small">Pay only for results. Empty searches cost nothing. Set a spend limit on every run.</p>
      <a class="btn btn-block" href="${a.url}" target="_blank" rel="noopener">Run on Apify ${ICON.ext}</a>
      <a class="btn btn-ghost btn-block" href="${a.url}/api" target="_blank" rel="noopener">API reference</a>
      <table class="price-t"><thead><tr><th>Event</th><th class="num">Price</th></tr></thead><tbody>${priceRows}${p.start ? `<tr><td><span class="ev">Run start</span></td><td class="num">${fmtUsd(p.start)}</td></tr>` : ''}</tbody></table>
      ${tierRow}
      <dl class="facts">
        ${rate ? `<div><dt>Runs succeeded, 30 days</dt><dd>${rate}</dd></div>` : ''}
        <div><dt>Login needed</dt><dd>No</dd></div>
        <div><dt>Free to try</dt><dd>With Apify's free monthly credit</dd></div>
      </dl>
    </div></aside>
  </div>
</div>
${foot}`;
  fs.writeFileSync(path.join(ROOT, 'tools', `${a.slug}.html`), html);
}

function card(a) {
  return `<a class="card" href="/tools/${a.slug}.html" data-cat="${a.catKey}" data-q="${esc((a.title + ' ' + a.desc + ' ' + a.cat).toLowerCase())}">
  <div class="card-top">${avatar(a, 40)}<span class="card-cat">${a.video ? '<span class="badge">Video</span>' : ''}${esc(a.cat)}</span></div>
  <h3>${esc(a.short)}</h3>
  <p>${esc(a.tagline || a.desc)}</p>
  <div class="card-foot"><span class="price">${esc(a.price.line)}</span><span class="go">${ICON.arrow}</span></div>
</a>`;
}

// ---------- home ----------
// Videos: newest first. Text per video lives in VIDEO_META.
const VIDEO_META = {
  'amazon-product-scraper': { label: 'Amazon Product Scraper', len: '30 seconds', points: ['Search any product on any of 16 Amazon stores', 'Get price, rating, rank and units bought per month', 'See which Best Sellers earn the most', 'Build product research, price trackers or deal sites'] },
  'amazon-arbitrage-finder': { label: 'Amazon Arbitrage Finder', len: '30 seconds', points: ['Search Walmart or Target and compare with Amazon', 'See profit and ROI after Amazon fees and shipping', 'Buy, Maybe or Skip for every product', 'Build sourcing tools, deal alerts or reseller software'] },
  'google-news-scraper': { label: 'Google News', len: '30 seconds', points: ['Type a topic, brand or person', 'Get headlines with the real publisher link and full text', 'Schedule it and receive only new articles', 'Build alerts, news feeds for AI agents or media monitoring'] },
  'facebook-ads-library-scraper': { label: 'Facebook Ads Library', len: '30 seconds', points: ['Type a keyword, brand or paste a Facebook page link', 'Get every ad with copy, format, link and days running', 'Filter for winning ads that ran 30+ days', 'Build competitor tracking, swipe files or ad alerts'] },
  'linkedin-jobs-scraper': { label: 'LinkedIn Jobs', len: '30 seconds', points: ['Type job titles and places in any country', 'Get salary, skills, applicants and work mode per job', 'Skip recruiting agencies and get only new jobs', 'Build job boards, salary benchmarks or hiring-signal leads'] },
  'pinterest-scraper': { label: 'Pinterest', len: '30 seconds', points: ['Type a keyword or paste a profile, board or pin link', 'Get pins with saves, price, creator and the real link', 'Filter for pins that link to Etsy or your shop niche', 'Build trend research, product ideas or creator lists'] },
  'upwork-jobs-scraper': { label: 'Upwork Jobs', len: '30 seconds', points: ['Type keywords or paste an Upwork search link', 'Get every job with client spend, hires and proposals', 'See a hiring score from 0 to 100 and why', 'Build job alerts, lead pipelines or auto-proposal drafts'] },
  'booking-scraper': { len: '30 seconds', points: ['Type a city and pick your dates', 'Get every hotel with its real price', 'Find the cheapest dates with a price calendar', 'Build a travel SaaS, rate tracker or price alerts'] },
  'flashscore-scraper': { len: '30 seconds', points: ['Pick sports, days and extras', 'Get every match in the same fields', 'Add stats, incidents, form and odds', 'Build live score apps, odds models or fantasy tools'] },
  'espn-sports-scraper': { label: 'ESPN', len: '30 seconds', points: ['Pick the leagues and the days', 'Get scores, closing spread and total for every game', 'Add box scores, player stats and opening and closing odds', 'Build betting models, injury alerts, fantasy tools or a recap newsletter'] },
  'linkedin-company-scraper': { label: "LinkedIn Company", len: '30 seconds', points: ["Paste company names, websites or links","Get size, followers, industry and headquarters","Add recent posts, engagement and similar pages","Build CRM enrichment, lead scoring or market research"] },
  'ats-jobs-scraper': { label: "ATS Jobs", len: '30 seconds', points: ["Paste any company career page","Get jobs and pay ranges straight from the employer","Works with Greenhouse, Lever, Ashby, Workday and more","Build job boards, hiring alerts or salary data"] },
  'walmart-scraper': { label: "Walmart", len: '30 seconds', points: ["Search products or paste a deals page","Get price, was-price, discount, seller and stock","Catch clearance and rollback prices","Build price alerts, reseller sourcing or deal sites"] },
  'aliexpress-scraper': { label: "AliExpress", len: '30 seconds', points: ["Type a product and where you ship to","Get price, discount, rating and exact sold counts","Find best sellers with a wide price gap","Build dropshipping research or price trackers"] },
  'youtube-scraper': { label: "YouTube", len: '30 seconds', points: ["Search with filters for date, length and views","Get views, likes, comments and channel size","Also scrapes channels, Shorts and playlists","Build trend research, creator lists or video databases"] },
  'youtube-comments-scraper': { label: "YouTube Comments", len: '30 seconds', points: ["Paste a video, channel or playlist link","Get top or newest comments with likes and replies","See the author, pinned and creator-hearted flags","Build audience research, sentiment tools or brand alerts"] },
  'youtube-transcript-scraper': { label: "YouTube Transcript", len: '30 seconds', points: ["Paste a video, playlist or channel link","Get the full transcript with timestamps and chapters","Choose a language and get AI-ready chunks","Build RAG apps, summaries or content repurposing"] },
  'video-transcript-scraper': { label: "Video & Podcast Transcript", len: '30 seconds', points: ["Paste links from TikTok, X, Vimeo, TED and more","Get captions, or speech to text when there are none","Download SRT, VTT, Markdown and chunks","Build AI pipelines, subtitles or social video research"] },
  'instagram-reel-transcript': { label: "Instagram Reel Transcript", len: '30 seconds', points: ["Paste reel links or profile names","Get what the reel says plus likes and captions","Pay only for reels that were transcribed","Build content research, repurposing or brand monitoring"] },
  'airbnb-scraper': { label: "Airbnb", len: '30 seconds', points: ["Type a city and pick your dates","Get every listing with its real price and rating","Splits big cities into map tiles for more results","Build host pricing tools, ROI research or travel apps"] },
  'tiktok-scraper': { label: "TikTok", len: '30 seconds', points: ["Type a profile name or paste a video link","Get views, likes, shares, saves and engagement","Add the spoken transcript of every video","Build trend research, influencer vetting or reports"] },
  'threads-scraper': { label: "Threads", len: '30 seconds', points: ["Type a profile name or a search","Get posts with likes, replies and reposts","Get only new posts on a schedule","Build brand alerts, social listening or sentiment tools"] },
  'google-ads-transparency-scraper': { label: "Google Ads", len: '30 seconds', points: ["Type a brand or advertiser name","Get every ad with its headline, text and dates","See how many days each ad has been shown","Build competitor research, agency audits or ad alerts"] },
  'linkedin-ad-library-scraper': { label: "LinkedIn Ads", len: '30 seconds', points: ["Type a company name or paste its link","Get every ad with copy, impressions and targeting","See where each ad runs and for how long","Build B2B competitor research or new-campaign alerts"] },
  'tiktok-ads-scraper': { label: "TikTok Ads", len: '30 seconds', points: ["Type a brand and pick a country","Get every ad with copy, format and unique reach","See ages, targeting and call to action","Build creative research, swipe files or launch alerts"] },
  'resume-cv-json-parser': { label: "Resume & CV Parser", len: '30 seconds', points: ["Paste links to PDF resumes","Works on digital, two-column and scanned CVs","Get clean Markdown with sections and skills","Build ATS imports, AI screening or resume search"] },
  'invoice-table-json-extractor': { label: "Invoice & PDF Tables", len: '30 seconds', points: ["Paste links to invoices or any PDF","Get every table as rows keyed by column name","Scanned pages are read with OCR when needed","Build accounts payable flows, receipt tools or RAG"] },
};
const vids = Object.keys(VIDEO_META).map(s => actors.find(a => a.slug === s && a.video)).filter(Boolean);
const vidPanel = (a, i) => `<div class="vid-pane${i ? '' : ' on'}" data-vid="${a.slug}"${i ? ' hidden' : ''}>
    <span class="eyebrow">See it in action</span><h2>${esc(a.short)}</h2>
    <p class="muted">${a.tagline ? esc(a.tagline) + '. ' : ''}${VIDEO_META[a.slug].len} from input to clean rows and what you can build with them, using real data from a real run.</p>
    <ul class="ticks">${VIDEO_META[a.slug].points.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <div class="cta cta-left"><a class="btn" href="/tools/${a.slug}.html">Open the tool</a><a class="btn btn-ghost" href="${a.url}" target="_blank" rel="noopener">Run on Apify ${ICON.ext}</a></div>
  </div>`;
const videosHtml = () => !vids.length ? '' : `<section class="sec-lg" id="videos"><div class="wrap">
  ${vids.length > 1 ? `<div class="vid-tabs" role="tablist" aria-label="Demo videos">${vids.map((a, i) => `<button class="seg-b${i ? '' : ' on'}" role="tab" aria-selected="${!i}" data-v="${a.slug}">${avatar(a, 18)}${esc(VIDEO_META[a.slug].label || tabLabel(a))}</button>`).join('')}</div>` : ''}
  <div class="split split-video">
    <div class="vid-text">${vids.map(vidPanel).join('')}</div>
    <div class="vid-stage">${vids.map((a, i) => `<div class="vid-pane${i ? '' : ' on'}" data-vid="${a.slug}"${i ? ' hidden' : ''}>${videoTag(a)}</div>`).join('')}</div>
  </div>
</div></section>`;
const counts = Object.fromEntries(CATS.map(c => [c[0], actors.filter(a => a.catKey === c[0]).length]));
// Playground: every Actor's real input -> dataset sample -> where it's used. Data from data/demos.json (scripts/make-demos.mjs).
const DEMOS = readJson(path.join(ROOT, 'data', 'demos.json')) || {};
const TAB_LABEL = { 'booking-scraper': 'Booking.com', 'invoice-table-json-extractor': 'Invoice & PDF tables', 'youtube-transcript-scraper': 'YouTube Transcript', 'google-ads-transparency-scraper': 'Google Ads', 'facebook-ads-library-scraper': 'Facebook Ads', 'linkedin-ad-library-scraper': 'LinkedIn Ads', 'video-transcript-scraper': 'Video & Podcast Transcript', 'amazon-product-scraper': 'Amazon', 'aliexpress-scraper': 'AliExpress', 'resume-cv-json-parser': 'Resume & CV Parser' };
const tabLabel = a => TAB_LABEL[a.slug] || a.short.replace(/\s*&\s*Monitor$/, '').replace(/\s+Scraper\b/, '').replace(/\s+Search$/, '');
const brandSvg = n => { const s = fs.readFileSync(path.join(ROOT, 'assets', 'brands', n + '.svg'), 'utf8'); return s.replace(/<title>.*?<\/title>/, '').replace('<svg ', '<svg aria-hidden="true" fill="currentColor" width="18" height="18" '); };
const CONNECT = [
  ['n8n', brandSvg('n8n')], ['Make', brandSvg('make')], ['Zapier', brandSvg('zapier')], ['Google Sheets', brandSvg('googlesheets')],
  ['AI agents', brandSvg('modelcontextprotocol')],
  ['REST API', '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>']
];
const PG_FIRST = ['booking-scraper', 'google-news-scraper', 'linkedin-jobs-scraper', 'amazon-product-scraper', 'facebook-ads-library-scraper', 'youtube-transcript-scraper', 'flashscore-scraper', 'espn-sports-scraper', 'tiktok-scraper', 'ats-jobs-scraper'];
const pgRank = a => { const i = PG_FIRST.indexOf(a.slug); return i < 0 ? 100 + actors.indexOf(a) : i; };
const pgItems = actors.filter(a => DEMOS[a.slug]).sort((x, y) => pgRank(x) - pgRank(y)).map(a => ({ slug: a.slug, label: tabLabel(a), name: a.short, icon: a.icon, page: `/tools/${a.slug}.html`, price: a.price.line, ...DEMOS[a.slug] }));
const jsonHtml = obj => esc(JSON.stringify(obj, null, 2)).split('\n').map(line => `<span class="ln">${line
  .replace(/^(\s*)(&quot;[^&]*?&quot;)(:)/, '$1<span class="k">$2</span>$3')
  .replace(/(:\s|^\s+)(&quot;.*?&quot;)(,?)$/, '$1<span class="s">$2</span>$3')
  .replace(/(:\s)(-?\d[\d.]*|true|false|null)(,?)$/, '$1<span class="n">$2</span>$3')}</span>`).join('');
const pg0 = pgItems[0];
const pgHtml = !pg0 ? '' : `<div class="pg" data-pg aria-label="Live examples of every tool">
  <div class="pg-tabs" role="tablist" aria-label="Tools">${pgItems.map((d, i) => `<button class="pg-tab${i ? '' : ' on'}" role="tab" aria-selected="${!i}" data-i="${i}">${d.icon ? `<img src="${d.icon}" width="20" height="20" alt="" loading="lazy">` : `<span class="pg-mono">${esc(d.label[0])}</span>`}<span>${esc(d.label)}</span><i class="pg-bar"></i></button>`).join('')}</div>
  <div class="pg-body">
    <div class="pg-col pg-in">
      <div class="pg-head"><span class="label">Input</span><span class="pg-status" data-st="done"><i></i><span>Succeeded</span></span></div>
      <pre class="pg-json"><code>${jsonHtml(pg0.input)}</code></pre>
    </div>
    <div class="pg-col pg-out">
      <div class="pg-head"><span class="label">Dataset <span class="muted">· ${pg0.sample ? 'sample' : 'from a real run'}</span></span><a class="pg-link" href="${pg0.page}">${esc(pg0.name)} ${ICON.arrow}</a></div>
      <table class="pg-table"><thead><tr>${pg0.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${pg0.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </div>
    <div class="pg-col pg-use">
      <div class="pg-head"><span class="label">Put it to work</span></div>
      <ul class="pg-uses">${pg0.use.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
      <div class="pg-tiles">${CONNECT.map(([n, svg]) => `<span class="pg-tile">${svg}<span>${n}</span></span>`).join('')}</div>
      <p class="pg-flow"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg><span>${esc(pg0.flow)}</span></p>
    </div>
  </div>
  <script type="application/json" id="pg-data">${JSON.stringify(pgItems.map(d => ({ ...d, inputHtml: jsonHtml(d.input) }))).replace(/</g, '\\u003c')}</script>
</div>`;


const faq = [
  ['How do I try a tool?', `Open the tool and press <b>Run on Apify</b>. Apify's free plan includes monthly credit, which is enough to test any of these tools on real data.`],
  ['How much does it cost?', `You pay per result, from ${fmtUsd(minPer1k)} per 1,000. Each tool page lists every price. Searches that find nothing cost nothing, and you can cap any run with a spend limit.`],
  ['Can I call these from my own code or AI agent?', `Yes. Every tool is an HTTP endpoint: send JSON input, get rows back as JSON, CSV or Excel. Each tool page has ready cURL, Python and JavaScript calls. The tools also work through Apify's MCP server for AI agents.`],
  ['Do I need a login or cookies?', `No. The tools read public pages only and never solve captchas.`],
  ['Can I get only new results every day?', `Many tools have an only-new mode. Schedule the run on Apify and you get only the items that weren't there last time, sent to Sheets, Slack, a webhook or email.`],
  ['What if a website changes?', `The tools run against their live sources on a schedule. When a site changes, the tool is fixed and the change goes into its changelog on Apify.`]
];

const home = `${head({
  title: `${BRAND}: web data tools for jobs, ads, e-commerce and video`,
  desc: `${actors.length} Apify tools that turn public pages into clean rows: jobs, ad libraries, Amazon and Walmart prices, YouTube and TikTok, transcripts and news. Pay per result.`,
  url: BASE + '/',
  jsonld: { '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: BASE, logo: `${BASE}/assets/img/logo-512.png`, sameAs: [PROFILE] }
})}
<section class="hero"><div class="wrap">
  <a class="pill" href="${PROFILE}" target="_blank" rel="noopener"><span class="dot"></span>${actors.length} tools on Apify Store ${ICON.arrow}</a>
  <h1>Public web data,<br>delivered as clean rows.</h1>
  <p class="lead">Scrapers and APIs for jobs, ad libraries, e-commerce, social video and news. Pay per result, no login, ready for your code or AI agent.</p>
  <div class="cta"><a class="btn" href="#tools">Browse tools</a><a class="btn btn-ghost" href="#api">Use the API</a></div>
  ${pgHtml}
  <dl class="stats">
    <div><dt>Tools</dt><dd>${actors.length}</dd></div>
    ${successPct ? `<div><dt>Runs succeeded, 30 days</dt><dd>${successPct}%</dd></div>` : ''}
    <div><dt>Starting price</dt><dd>${fmtUsd(minPer1k)}<small> / 1,000</small></dd></div>
    <div><dt>Login needed</dt><dd>None</dd></div>
  </dl>
</div></section>

${videosHtml()}
<section class="sec-lg" id="tools"><div class="wrap">
  <div class="sec-head"><h2>Tools</h2><p class="muted">Every tool has the same clean fields on every run, and exports to JSON, CSV or Excel.</p></div>
  <div class="filter">
    <label class="search">${ICON.search}<input id="q" type="search" placeholder="Search tools" autocomplete="off" aria-label="Search tools"><kbd>/</kbd></label>
    <div class="seg" role="tablist" aria-label="Categories">
      <button class="seg-b on" data-c="" role="tab" aria-selected="true">All <span>${actors.length}</span></button>
      ${CATS.filter(c => counts[c[0]]).map(c => `<button class="seg-b" data-c="${c[0]}" role="tab" aria-selected="false">${esc(c[1])} <span>${counts[c[0]]}</span></button>`).join('')}
    </div>
  </div>
  <div class="grid" id="grid">${actors.map(card).join('')}</div>
  <p class="empty muted" id="empty" hidden>No tools match. <a href="#custom">Ask for a custom one.</a></p>
</div></section>

<section class="sec-lg alt"><div class="wrap">
  <div class="sec-head"><h2>How it works</h2></div>
  <ol class="steps">
    <li><span class="n">1</span><h3>Pick a tool</h3><p class="muted">Enter keywords, URLs or a company name. Each field has a short explanation.</p></li>
    <li><span class="n">2</span><h3>Run it</h3><p class="muted">Run once, or schedule it daily with only-new results. Set a spend limit.</p></li>
    <li><span class="n">3</span><h3>Get rows</h3><p class="muted">Download JSON, CSV or Excel, or send rows to Sheets, Slack, a webhook or your agent.</p></li>
  </ol>
</div></section>

<section class="sec-lg" id="api"><div class="wrap split">
  <div><h2>One HTTP call per tool</h2>
    <p class="muted">Send the input, get the rows back. Works from any language, n8n, Make, Zapier, and AI agents through Apify's MCP server.</p>
    <ul class="ticks"><li>Synchronous endpoint returns rows directly</li><li>Same field names on every run</li><li>Webhooks when a scheduled run finishes</li></ul>
  </div>
  ${codeTabs(actors.find(a => a.slug === 'google-news-scraper') || actors[0])}
</div></section>

<section class="sec-lg alt" id="faq"><div class="wrap narrow">
  <div class="sec-head"><h2>Questions</h2></div>
  <div class="faq">${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
</div></section>

<section class="sec-lg" id="custom"><div class="wrap narrow center">
  <h2>Need a source that isn't here?</h2>
  <p class="muted">I build custom scrapers and daily data feeds. Send the site, a few example pages and where the data should go.</p>
  <div class="cta"><a class="btn" href="mailto:${EMAIL}?subject=Custom%20scraper">Email me</a><a class="btn btn-ghost" href="${PROFILE}" target="_blank" rel="noopener">See all tools on Apify</a></div>
</div></section>
${foot}`;
fs.writeFileSync(path.join(ROOT, 'index.html'), home);

// 404
fs.writeFileSync(path.join(ROOT, '404.html'), `${head({ title: `Page not found | ${BRAND}`, desc: 'Page not found', url: BASE + '/404.html' })}
<section class="hero"><div class="wrap center"><h1>Page not found</h1><p class="lead">That page doesn't exist.</p><div class="cta"><a class="btn" href="/">Back to all tools</a></div></div></section>${foot}`);

// sitemap + robots
const today = new Date().toISOString().slice(0, 10);
const urls = [BASE + '/', ...actors.map(a => `${BASE}/tools/${a.slug}.html`)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
console.log(`built ${actors.length} tools, ${totalRuns} runs, ${successPct}% ok, from ${fmtUsd(minPer1k)}/1k`);
