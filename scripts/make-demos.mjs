// Builds data/demos.json (committed) from data/demos.raw.json (git-ignored, from fetch-demos.mjs).
// Each demo = the real input of a successful run + the first rows it returned + what people use it for.
import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('data/demos.raw.json', 'utf8'));
const num = v => v == null ? '' : Number(v).toLocaleString('en-US');
const short = v => { v = Number(v); return v >= 1e9 ? (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(v); };
const money = (v, cur = 'USD') => v == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v);
const ago = iso => { const d = (Date.parse('2026-11-17T00:00:00Z') - Date.parse(iso)) / 864e5; return d < 1 ? 'today' : d < 2 ? '1 day ago' : `${Math.round(d)} days ago`; };
const cut = (s, n = 46) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const dur = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };

// pick = which run; keep = input keys shown; filter = row filter; cols = [header, fn]
const C = {
  'google-news-scraper': { pick: 0, keep: ['searchQueries', 'timeframe', 'countries'], cols: [['title', r => cut(r.title, 52)], ['source', r => r.source], ['publishedAt', r => r.publishedAt?.slice(11, 16) + ' UTC']],
    use: ['Brand and competitor alerts', 'News feeds for AI agents and RAG', 'Market and PR monitoring'], flow: 'Every hour · only new articles · Slack' },
  'linkedin-jobs-scraper': { pick: 1, keep: ['searchTerms', 'locations', 'maxJobsPerSearch'], cols: [['title', r => cut(r.title, 34)], ['company', r => r.company], ['location', r => cut(r.location, 20)]],
    use: ['Job boards and job alerts', 'Hiring signals for sales leads', 'Salary and labor market research'], flow: 'Daily · only new jobs · Google Sheets' },
  'ats-jobs-scraper': { pick: 0, keep: ['companies'], filter: r => r.rowType === 'job' && r.salaryAnnualMin, cols: [['title', r => cut(r.title, 32)], ['companyName', r => r.companyName], ['salary', r => r.salaryAnnualMin ? `${short(r.salaryAnnualMin)}–${short(r.salaryAnnualMax)}` : r.workplaceType || '']],
    use: ['Career-page job feeds', 'Track who is hiring for what', 'Recruiting and sourcing tools'], flow: 'Daily · only new jobs · webhook' },
  'linkedin-company-scraper': { pick: 0, keep: ['companies', 'includePosts'], cols: [['name', r => r.name], ['companySize', r => r.companySize?.replace(' employees', '')], ['followers', r => short(r.followers)]],
    use: ['Enrich CRM accounts', 'Lead scoring and ICP filters', 'Track company growth and posts'], flow: 'Weekly · track changes · CRM via Make' },
  'resume-cv-json-parser': { pick: 0, keep: ['documentUrls'], short: { documentUrls: ['sample-cv.pdf', 'sample-cv-two-column.pdf', 'sample-cv-scanned.pdf'] }, cols: [['file', r => r.source_url.split('/').pop()], ['candidate', r => ([...r.candidate_markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].map(m => m[1].trim()).find(h => /[a-z]/.test(h)) || (r.candidate_markdown.match(/([a-z]+)\.([a-z]+)@/) || []).slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join(' '))], ['status', r => r.status]],
    use: ['ATS imports from PDF CVs', 'AI candidate screening', 'Resume search and matching'], flow: 'New CV in Drive · parse · Airtable via n8n' },
  'facebook-ads-library-scraper': { pick: 1, keep: ['searchTerms', 'countries', 'activeStatus'], distinct: 'pageName', filter: r => !/cholesterol/i.test(r.pageName), cols: [['pageName', r => cut(r.pageName, 24)], ['mediaType', r => r.mediaType], ['daysRunning', r => `${r.daysRunning} days`]],
    use: ['Competitor ad research', 'Find long-running winning ads', 'New-ad alerts for brands'], flow: 'Daily · only new ads · Slack' },
  'google-ads-transparency-scraper': { pick: 2, keep: ['searchTerms', 'region'], cols: [['advertiserName', r => cut(r.advertiserName, 22)], ['format', r => r.format?.toLowerCase()], ['daysShown', r => `${num(r.daysShown)} days`]],
    use: ['See every Google ad a brand runs', 'Agency pitches and audits', 'Search, YouTube and Display research'], flow: 'Weekly · only new ads · Google Sheets' },
  'linkedin-ad-library-scraper': { pick: 0, keep: ['advertisers', 'dateRange'], cols: [['headline', r => cut(r.headline || r.bodyPreview, 34)], ['formatLabel', r => r.formatLabel?.replace(' Ad', '')], ['advertiserName', r => cut(r.advertiserName.split(' | ')[0], 20)]],
    use: ['B2B competitor ad research', 'Messaging and offer analysis', 'Track new campaigns'], flow: 'Weekly · only new ads · Notion via Make' },
  'tiktok-ads-scraper': { pick: 2, keep: ['searchTerms', 'mode'], cols: [['advertiserName', r => cut(r.advertiserName, 22)], ['country', r => r.countryName || r.country], ['uniqueReach', r => r.uniqueReach || '']],
    use: ['TikTok creative research', 'Find top ads by reach', 'Competitor launch tracking'], flow: 'Daily · only new ads · Slack' },
  'amazon-product-scraper': { pick: 0, keep: ['searchTerms', 'marketplace'], distinct: 'brand', cols: [['title', r => cut(r.title, 34)], ['price', r => money(r.price, r.currency)], ['rating', r => `${r.rating} · ${short(r.reviewsCount)}`]],
    use: ['Price and stock monitoring', 'Product and niche research', 'Best Sellers and BSR tracking'], flow: 'Daily · price changes · Google Sheets' },
  'amazon-arbitrage-finder': { pick: 0, keep: ['searchTerms', 'compareStores', 'fulfillment'], cols: [['title', r => cut(r.title, 28)], ['buy', r => `${money(r.bestBuyPrice)} ${r.bestBuyStore}`], ['profit', r => `${money(r.profit)} · ${r.verdict}`]],
    use: ['Online arbitrage sourcing', 'Profit, ROI and fee checks', 'Walmart and Target price gaps'], flow: 'Daily · Buy verdicts only · Telegram' },
  'walmart-scraper': { pick: 2, keep: ['searchTerms', 'maxResultsPerSearch'], cols: [['title', r => cut(r.title, 34)], ['price', r => money(r.price)], ['rating', r => `${r.rating} · ${short(r.reviewsCount)}`]],
    use: ['Price and rollback tracking', 'Seller and assortment research', 'Retail analytics dashboards'], flow: 'Daily · price changes · BigQuery' },
  'aliexpress-scraper': { pick: 2, keep: ['searchTerms', 'shipTo'], cols: [['title', r => cut(r.title, 34)], ['price', r => money(r.price)], ['soldCount', r => `${num(r.soldCount)} sold`]],
    use: ['Dropshipping product research', 'Supplier price checks', 'Trend and best-seller tracking'], flow: 'Weekly · new products · Shopify via Make' },
  'youtube-scraper': { pick: 1, keep: ['searchTerms', 'maxResults'], filter: r => r.type === 'video', cols: [['title', r => cut(r.title, 34)], ['channelName', r => r.channelName], ['views', r => short(r.viewCount)]],
    use: ['Content and topic research', 'Influencer discovery', 'Channel analytics'], flow: 'Weekly · new videos · Google Sheets' },
  'youtube-comments-scraper': { pick: 1, keep: ['startUrls', 'sortBy', 'maxComments'], filter: r => r.likeCount > 1000 && !/nudity/i.test(r.text), cols: [['text', r => cut(r.text, 44)], ['likes', r => short(r.likeCount)], ['replies', r => num(r.replyCount)]],
    use: ['Audience and sentiment analysis', 'Product feedback mining', 'AI summaries of comments'], flow: 'Daily · only new comments · OpenAI via n8n' },
  'tiktok-scraper': { pick: 1, keep: ['profiles', 'resultsPerProfile', 'includeTranscripts'], filter: r => r.type === 'video', cols: [['description', r => cut(r.description || r.text || r.caption, 34)], ['views', r => short(r.views ?? r.playCount ?? r.viewCount)], ['likes', r => short(r.likes ?? r.likeCount)]],
    use: ['Creator and trend research', 'Video transcripts for AI', 'Brand and campaign tracking'], flow: 'Daily · only new videos · Airtable' },
  'pinterest-scraper': { pick: 1, keep: ['searchQueries', 'searchType'], filter: r => r.type === 'pin' && r.title, cols: [['title', r => cut(r.title || r.description, 36)], ['domain', r => r.domain || ''], ['saves', r => num(r.saves ?? 0)]],
    use: ['Visual trend research', 'Find products and outbound links', 'Board and creator analysis'], flow: 'Weekly · new pins · Google Sheets' },
  'threads-scraper': { pick: 0, keep: ['profiles', 'searchQueries'], filter: r => r.type === 'post', cols: [['text', r => cut(r.text, 38)], ['username', r => '@' + r.username], ['likes', r => short(r.likes)]],
    use: ['Social listening', 'Creator and brand monitoring', 'Posts for AI analysis'], flow: 'Hourly · only new posts · Slack' },
  'youtube-transcript-scraper': { pick: 1, keep: ['playlistUrls', 'maxVideos'], filter: r => r.status === 'ok', cols: [['title', r => cut(r.title, 36)], ['duration', r => dur(r.durationSeconds)], ['words', r => num(r.wordCount)]],
    use: ['RAG and AI knowledge bases', 'Summaries and show notes', 'Search inside videos'], flow: 'New video · transcript · vector DB via n8n' },
  'video-transcript-scraper': { pick: 1, keep: ['urls'], filter: r => r.type === 'transcript', cols: [['title', r => cut(r.title, 32)], ['platform', r => r.platform], ['words', r => num(r.wordCount)]],
    use: ['Transcripts from any video link', 'Podcast to text and SRT', 'Content repurposing with AI'], flow: 'New episode (RSS) · transcript · Notion' },
  'instagram-reel-transcript': { pick: 1, keep: ['reels', 'language'], filter: r => r.type === 'reel', cols: [['ownerUsername', r => '@' + r.ownerUsername], ['hook', r => cut(r.hook || r.transcript, 32)], ['likes', r => short(r.likes)]],
    use: ['Reel scripts and hooks', 'Creator research', 'Captions and subtitles'], flow: 'New reels · transcript · Google Docs' },
  'airbnb-scraper': { pick: 1, keep: ['locationQueries', 'currency'], filter: r => r.type === 'listing', cols: [['name', r => cut(r.name, 32)], ['pricePerNight', r => money(r.pricePerNight)], ['rating', r => r.rating ? `${r.rating} · ${num(r.reviewsCount)}` : 'new']],
    use: ['Short-term rental pricing', 'Market and occupancy research', 'Competitor listing tracking'], flow: 'Weekly · prices · Looker Studio' },
  'booking-scraper': { pick: 0, keep: ['search', 'checkIn', 'nights', 'currency'], filter: r => r.type === 'hotel' && r.available, cols: [['name', r => cut(r.name, 30)], ['pricePerNight', r => money(r.pricePerNight, r.currency)], ['reviewScore', r => `${r.reviewScore} · ${r.stars ? r.stars + '★' : '–'}`]],
    use: ['Travel agency and trip-planner SaaS', 'Hotel rate shopping and revenue tools', 'Price-drop alerts for travellers'], flow: 'Daily · only changed prices · Google Sheets' },
  'flashscore-scraper': { pick: 0, keep: ['sports', 'days'], filter: r => r.scoreText, cols: [['match', r => `${r.homeTeam} – ${r.awayTeam}`], ['score', r => r.scoreText || '–'], ['status', r => r.statusDetail]],
    use: ['Live score apps and widgets', 'Betting and odds models', 'Fantasy and sports analytics'], flow: 'Every minute · only changed · webhook' },
};
// Actor without runs that return 3+ rows: a documented sample instead of a run
const STATIC = {
  'invoice-table-json-extractor': { sample: true, input: { documentUrls: ['invoice-2026-114.pdf'], outputFormat: 'json' }, cols: ['description', 'qty', 'amount'],
    rows: [['Website hosting, Nov', '1', '$49.00'], ['Design hours', '12', '$960.00'], ['Domain renewal', '2', '$31.98'], ['Total', '', '$1,040.98']],
    use: ['Bookkeeping and accounting imports', 'Receipts to spreadsheets', 'Tables from PDFs for AI'], flow: 'New PDF in email · extract · Xero via Make' },
};

const out = {};
for (const [name, cfg] of Object.entries(C)) {
  const p = raw[name]?.[cfg.pick];
  if (!p) { console.warn('missing run', name); continue; }
  const input = {};
  for (const k of cfg.keep) if (p.input?.[k] !== undefined) input[k] = cfg.short?.[k] ?? p.input[k];
  for (const [k, v] of Object.entries(input)) if (Array.isArray(v) && v.length > 3) input[k] = v.slice(0, 3);
  let items = p.items.filter(cfg.filter || (() => true));
  if (cfg.distinct) { const seen = new Set(); items = items.filter(r => !seen.has(r[cfg.distinct]) && seen.add(r[cfg.distinct])); }
  const rows = items.slice(0, 4).map(r => cfg.cols.map(([, f]) => { try { return String(f(r) ?? ''); } catch { return ''; } }));
  if (rows.length < 3) console.warn('few rows', name, rows.length);
  out[name] = { run: p.run, input, cols: cfg.cols.map(c => c[0]), rows, use: cfg.use, flow: cfg.flow };
}
for (const [name, s] of Object.entries(STATIC)) out[name] = s;
fs.writeFileSync('data/demos.json', JSON.stringify(out, null, 1));
for (const [n, d] of Object.entries(out)) console.log(n.padEnd(32), JSON.stringify(d.input).slice(0, 70), '\n   ', d.rows.map(r => r.join(' | ')).join('\n    '));
