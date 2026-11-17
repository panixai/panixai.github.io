// Generates the static site from d:\PANIX\actors\*\.actor\actor.json
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'd:/PANIX/actors';
const OUT = path.resolve('.');
const BASE = 'https://panixai.github.io';

const CATS = {
  'Jobs & hiring': ['ats-jobs-scraper', 'linkedin-jobs-scraper', 'linkedin-company-scraper', 'resume-cv-json-parser'],
  'Ads & competitors': ['facebook-ads-library-scraper', 'google-ads-transparency-scraper', 'linkedin-ad-library-scraper', 'tiktok-ads-scraper'],
  'E-commerce & pricing': ['amazon-product-scraper', 'amazon-arbitrage-finder', 'walmart-scraper', 'aliexpress-scraper', 'ebay-scraper'],
  'Social & video': ['youtube-scraper', 'youtube-comments-scraper', 'youtube-transcript-scraper', 'video-transcript-scraper', 'instagram-reel-transcript', 'tiktok-scraper', 'pinterest-scraper', 'threads-scraper'],
  'News, travel & sports': ['google-news-scraper', 'airbnb-scraper', 'flashscore-scraper'],
  'Documents': ['invoice-table-json-extractor']
};
const catOf = n => Object.keys(CATS).find(c => CATS[c].includes(n)) || 'Other';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const actors = [];
for (const d of fs.readdirSync(SRC)) {
  const f = path.join(SRC, d, '.actor', 'actor.json');
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const [short, ...rest] = j.title.split(': ');
  actors.push({
    slug: j.name, title: j.title, short, tagline: rest.join(': '),
    desc: j.description, cat: catOf(j.name),
    url: `https://apify.com/panix/${j.name}`
  });
}
actors.sort((a, b) => a.title.localeCompare(b.title));

const css = fs.readFileSync(path.join(OUT, 'assets', 'style.css'), 'utf8');
const head = (title, desc, url) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/style.css"></head><body>
<header class="nav"><a class="brand" href="/">Panix<span>AI</span></a>
<nav><a href="/#tools">Tools</a><a href="https://apify.com/panix" target="_blank" rel="noopener">Apify profile</a></nav></header>`;
const foot = `<footer><p>Panix Actors on Apify. Pay per result. Public pages only, no login or captcha solving.</p>
<p>Need a custom scraper? <a href="https://apify.com/panix" target="_blank" rel="noopener">Message me on Apify</a>.</p></footer>`;

// Actor pages
fs.mkdirSync(path.join(OUT, 'tools'), { recursive: true });
for (const a of actors) {
  const related = actors.filter(x => x.cat === a.cat && x.slug !== a.slug).slice(0, 4);
  const demo = fs.existsSync(path.join(OUT, 'videos', `${a.slug}.mp4`))
    ? `<video class="demo" src="/videos/${a.slug}.mp4" controls muted loop playsinline preload="metadata"></video>`
    : `<div class="demo ph"><p>Demo video coming soon</p></div>`;
  const html = `${head(a.title + ' | Panix', a.desc, `${BASE}/tools/${a.slug}.html`)}
<main class="page"><p class="crumb"><a href="/">All tools</a> / ${esc(a.cat)}</p>
<h1>${esc(a.short)}</h1><p class="lead">${esc(a.tagline || a.desc)}</p>
<p>${esc(a.desc)}</p>
<p><a class="btn" href="${a.url}" target="_blank" rel="noopener">Run it on Apify</a></p>
${demo}
<h2>How it works</h2><ol class="steps"><li>Open the Actor and enter your input.</li><li>Press Run. You pay per result, and you can set a spend limit.</li><li>Download JSON, CSV or Excel, or call it from code.</li></ol>
${related.length ? `<h2>Related tools</h2><ul class="rel">${related.map(r => `<li><a href="/tools/${r.slug}.html">${esc(r.short)}</a></li>`).join('')}</ul>` : ''}
</main>${foot}</body></html>`;
  fs.writeFileSync(path.join(OUT, 'tools', `${a.slug}.html`), html);
}

// Home
const cats = Object.keys(CATS);
const cards = actors.map(a => `<a class="card" data-cat="${esc(a.cat)}" data-text="${esc((a.title + ' ' + a.desc).toLowerCase())}" href="/tools/${a.slug}.html">
<small>${esc(a.cat)}</small><h3>${esc(a.short)}</h3><p>${esc(a.tagline || a.desc)}</p></a>`).join('');
const home = `${head('Panix: Apify web data tools for jobs, ads, e-commerce and video', `${actors.length} Apify Actors that turn public pages into clean rows. Pay per result.`, BASE + '/')}
<section class="hero"><h1>Turn any public page into <em>clean rows</em></h1>
<p class="lead">${actors.length} Apify Actors for jobs, ads, prices, video and news. Pay per result. No login.</p>
<div class="stage" aria-hidden="true"><div class="input"><span class="lbl">input</span><code id="typed"></code></div>
<div class="arrow">&rarr;</div><div class="out"><span class="lbl">rows</span><div id="rows"></div></div></div>
<p><a class="btn" href="#tools">Browse ${actors.length} tools</a> <a class="btn ghost" href="https://apify.com/panix" target="_blank" rel="noopener">Apify profile</a></p></section>
<section id="tools" class="tools"><h2>Tools</h2>
<div class="filters"><input id="q" type="search" placeholder="Search tools" aria-label="Search tools">
<button class="chip on" data-c="">All</button>${cats.map(c => `<button class="chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
<div class="grid">${cards}</div></section>${foot}
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="/assets/app.js"></script></body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), home);

// sitemap, robots
const urls = [BASE + '/', ...actors.map(a => `${BASE}/tools/${a.slug}.html`)];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${u}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
console.log('built', actors.length, 'actors');
