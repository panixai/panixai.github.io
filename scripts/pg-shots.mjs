// Real-time screenshots of the hero playground animation (needs puppeteer-core in %TEMP%\pgtest and the local server on :8787).
// Usage: node scripts/pg-shots.mjs [light|dark] [width]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.join(process.env.TEMP, 'pgtest', 'x.js'));
const puppeteer = require('puppeteer-core');
const theme = process.argv[2] || 'light', width = +(process.argv[3] || 1440);
const exe = 'D:/PANIX/marketing/remotion/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe';
const browser = await puppeteer.launch({ executablePath: exe, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width, height: width < 600 ? 1400 : 1000, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle0' });
const el = await page.$('[data-pg]');
await page.evaluate(() => document.querySelector('[data-pg]').scrollIntoView({ block: 'center' }));
const out = path.join(process.env.TEMP, 'panix-shots');
const t0 = Date.now();
for (const t of [600, 1500, 3200, 8300, 10500]) {
  await new Promise(r => setTimeout(r, Math.max(0, t - (Date.now() - t0))));
  await el.screenshot({ path: path.join(out, `pg-${theme}-${width}-${t}.png`) });
}
// click test: pick the 5th tab
await page.click('.pg-tab:nth-child(5)');
await new Promise(r => setTimeout(r, 3500));
await el.screenshot({ path: path.join(out, `pg-${theme}-${width}-click.png`) });
console.log('active:', await page.$eval('.pg-tab.on', e => e.textContent.trim()), 'errors:', errors);
await browser.close();
