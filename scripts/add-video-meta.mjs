// One-off helper: appends VIDEO_META entries for the Actors videos made on 2026-11-18/19 to build.mjs.
import fs from 'node:fs';
const M = {
  'linkedin-company-scraper': ['LinkedIn Company', ['Paste company names, websites or links', 'Get size, followers, industry and headquarters', 'Add recent posts, engagement and similar pages', 'Build CRM enrichment, lead scoring or market research']],
  'ats-jobs-scraper': ['ATS Jobs', ['Paste any company career page', 'Get jobs and pay ranges straight from the employer', 'Works with Greenhouse, Lever, Ashby, Workday and more', 'Build job boards, hiring alerts or salary data']],
  'walmart-scraper': ['Walmart', ['Search products or paste a deals page', 'Get price, was-price, discount, seller and stock', 'Catch clearance and rollback prices', 'Build price alerts, reseller sourcing or deal sites']],
  'aliexpress-scraper': ['AliExpress', ['Type a product and where you ship to', 'Get price, discount, rating and exact sold counts', 'Find best sellers with a wide price gap', 'Build dropshipping research or price trackers']],
  'youtube-scraper': ['YouTube', ['Search with filters for date, length and views', 'Get views, likes, comments and channel size', 'Also scrapes channels, Shorts and playlists', 'Build trend research, creator lists or video databases']],
  'youtube-comments-scraper': ['YouTube Comments', ['Paste a video, channel or playlist link', 'Get top or newest comments with likes and replies', 'See the author, pinned and creator-hearted flags', 'Build audience research, sentiment tools or brand alerts']],
  'youtube-transcript-scraper': ['YouTube Transcript', ['Paste a video, playlist or channel link', 'Get the full transcript with timestamps and chapters', 'Choose a language and get AI-ready chunks', 'Build RAG apps, summaries or content repurposing']],
  'video-transcript-scraper': ['Video & Podcast Transcript', ['Paste links from TikTok, X, Vimeo, TED and more', 'Get captions, or speech to text when there are none', 'Download SRT, VTT, Markdown and chunks', 'Build AI pipelines, subtitles or social video research']],
  'instagram-reel-transcript': ['Instagram Reel Transcript', ['Paste reel links or profile names', 'Get what the reel says plus likes and captions', 'Pay only for reels that were transcribed', 'Build content research, repurposing or brand monitoring']],
  'airbnb-scraper': ['Airbnb', ['Type a city and pick your dates', 'Get every listing with its real price and rating', 'Splits big cities into map tiles for more results', 'Build host pricing tools, ROI research or travel apps']],
  'tiktok-scraper': ['TikTok', ['Type a profile name or paste a video link', 'Get views, likes, shares, saves and engagement', 'Add the spoken transcript of every video', 'Build trend research, influencer vetting or reports']],
  'threads-scraper': ['Threads', ['Type a profile name or a search', 'Get posts with likes, replies and reposts', 'Get only new posts on a schedule', 'Build brand alerts, social listening or sentiment tools']],
  'google-ads-transparency-scraper': ['Google Ads', ['Type a brand or advertiser name', 'Get every ad with its headline, text and dates', 'See how many days each ad has been shown', 'Build competitor research, agency audits or ad alerts']],
  'linkedin-ad-library-scraper': ['LinkedIn Ads', ['Type a company name or paste its link', 'Get every ad with copy, impressions and targeting', 'See where each ad runs and for how long', 'Build B2B competitor research or new-campaign alerts']],
  'tiktok-ads-scraper': ['TikTok Ads', ['Type a brand and pick a country', 'Get every ad with copy, format and unique reach', 'See ages, targeting and call to action', 'Build creative research, swipe files or launch alerts']],
  'resume-cv-json-parser': ['Resume & CV Parser', ['Paste links to PDF resumes', 'Works on digital, two-column and scanned CVs', 'Get clean Markdown with sections and skills', 'Build ATS imports, AI screening or resume search']],
  'invoice-table-json-extractor': ['Invoice & PDF Tables', ['Paste links to invoices or any PDF', 'Get every table as rows keyed by column name', 'Scanned pages are read with OCR when needed', 'Build accounts payable flows, receipt tools or RAG']],
};
let t = fs.readFileSync('build.mjs', 'utf8');
const marker = '};\nconst vids = Object.keys(VIDEO_META)';
const crlf = t.includes('\r\n');
if (crlf) t = t.replace(/\r\n/g, '\n');
if (!t.includes(marker)) throw new Error('marker not found');
const lines = Object.entries(M).filter(([k]) => !t.includes(`'${k}': {`) || !t.slice(t.indexOf('const VIDEO_META')).includes(`'${k}': { label`)).map(([k, [label, pts]]) => `  '${k}': { label: ${JSON.stringify(label)}, len: '30 seconds', points: ${JSON.stringify(pts)} },`);
t = t.replace(marker, lines.join('\n') + '\n' + marker);
fs.writeFileSync('build.mjs', crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('added', lines.length);
