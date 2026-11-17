// Downloads Actor icons, the Panix logo and Store data (prices, stats) from the public Apify Store API.
// Run: node scripts/fetch-assets.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const ICONS = path.join(root, 'assets', 'icons');
fs.mkdirSync(ICONS, { recursive: true });
fs.mkdirSync(path.join(root, 'data'), { recursive: true });

// images.apifyusercontent.com/<sig>/<opts>/<base64url(original)>[.ext]  ->  original URL (may be nested)
function original(u) {
  while (u && u.startsWith('https://images.apifyusercontent.com/')) {
    const last = u.split('/').pop().replace(/\.(webp|png|jpe?g)$/i, '');
    u = Buffer.from(last, 'base64url').toString('utf8');
  }
  return u;
}

async function save(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

const res = await fetch('https://api.apify.com/v2/store?username=panix&limit=100');
const items = (await res.json()).data.items;
fs.writeFileSync(path.join(root, 'data', 'store.json'), JSON.stringify(items, null, 2));

const logo = original(items[0].userPictureUrl);
console.log('logo', logo);
await save(logo, path.join(root, 'assets', 'logo' + path.extname(new URL(logo).pathname)));

for (const a of items) {
  if (!a.pictureUrl) { console.log('no icon:', a.name); continue; }
  const o = original(a.pictureUrl);
  await save(o, path.join(ICONS, a.name + path.extname(new URL(o).pathname).toLowerCase()));
}
console.log('icons', fs.readdirSync(ICONS).length, 'actors', items.length);
