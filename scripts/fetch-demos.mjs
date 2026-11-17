// Pulls the input and first rows of recent successful runs of each Actor, for the hero demo.
// Output: data/demos.raw.json (review it, then curate data/demos.json). Needs APIFY_TOKEN in d:/PANIX/.env.
import fs from 'node:fs';

const env = fs.readFileSync('d:/PANIX/.env', 'utf8');
const token = (env.match(/^APIFY_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
const H = { Authorization: `Bearer ${token}` };
const api = async p => {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch('https://api.apify.com/v2' + p, { headers: H }); if (r.status === 404) return null; if (!r.ok) throw new Error(r.status + ' ' + p); return r.headers.get('content-type')?.includes('json') ? r.json() : r.text(); }
    catch (e) { if (i === 2) throw e; await new Promise(s => setTimeout(s, 1500)); }
  }
};
const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
// Optional: node scripts/fetch-demos.mjs <actor> ... refreshes only those Actors and keeps the rest.
const only = process.argv.slice(2);
const out = only.length && fs.existsSync('data/demos.raw.json') ? JSON.parse(fs.readFileSync('data/demos.raw.json', 'utf8')) : {};
for (const a of store) {
  if (only.length && !only.includes(a.name)) continue;
  const runs = (await api(`/acts/panix~${a.name}/runs?desc=1&limit=25&status=SUCCEEDED`))?.data?.items || [];
  const picks = [];
  for (const run of runs) {
    const items = await api(`/datasets/${run.defaultDatasetId}/items?clean=1&limit=8`);
    if (!Array.isArray(items) || items.length < 3) continue;
    const input = await api(`/key-value-stores/${run.defaultKeyValueStoreId}/records/INPUT`);
    picks.push({ run: run.id, startedAt: run.startedAt, input, items: items.map(i => Object.fromEntries(Object.entries(i).filter(([, v]) => v === null || typeof v !== 'object' || Array.isArray(v) && v.length < 4).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 120) : v]))) });
    if (picks.length >= 3) break;
  }
  out[a.name] = picks;
  console.log(a.name, picks.map(p => `${p.run}:${p.items.length}`).join(' '));
}
fs.writeFileSync('data/demos.raw.json', JSON.stringify(out, null, 1));
