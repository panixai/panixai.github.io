// Prepends the logo price-check run to data/demos.raw.json for fiverr-scraper.
import fs from 'node:fs';
const env = fs.readFileSync('d:/PANIX/.env', 'utf8');
const token = env.match(/^APIFY_TOKEN=(.*)$/m)[1].trim().replace(/^"|"$/g, '');
const H = { Authorization: `Bearer ${token}` };
const run = 'pYjuQnUU7goSxe3uZ';
const r = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run}`, { headers: H })).json()).data;
const items = await (await fetch(`https://api.apify.com/v2/datasets/${r.defaultDatasetId}/items?clean=1&limit=8`, { headers: H })).json();
const input = await (await fetch(`https://api.apify.com/v2/key-value-stores/${r.defaultKeyValueStoreId}/records/INPUT`, { headers: H })).json();
const raw = JSON.parse(fs.readFileSync('data/demos.raw.json', 'utf8'));
raw['fiverr-scraper'] = [{ run, startedAt: r.startedAt, input, items }, ...(raw['fiverr-scraper'] || []).filter(x => x.run !== run)];
fs.writeFileSync('data/demos.raw.json', JSON.stringify(raw, null, 1));
console.log('ok', items.length, JSON.stringify(input));
