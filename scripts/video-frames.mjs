// Seeks a local video file to given seconds in a real browser and screenshots the frames. Needs puppeteer-core in %TEMP%\pgtest and the server on :8787.
// Usage: node scripts/video-frames.mjs <slug> <sec> [sec...]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.join(process.env.TEMP, 'pgtest', 'x.js'));
const puppeteer = require('puppeteer-core');
const [slug, ...secs] = process.argv.slice(2);
const exe = 'D:/PANIX/marketing/remotion/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe';
const browser = await puppeteer.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
await page.setContent(`<body style="margin:0;background:#000"><video id="v" src="http://127.0.0.1:8787/videos/${slug}.mp4" muted style="width:960px;height:540px"></video></body>`);
await page.waitForFunction(() => document.getElementById('v').readyState >= 2, { timeout: 20000 });
const dur = await page.evaluate(() => document.getElementById('v').duration);
console.log(slug, 'duration', dur.toFixed(1), 's');
for (const s of secs) {
  await page.evaluate(t => new Promise(r => { const v = document.getElementById('v'); v.onseeked = r; v.currentTime = t; }), +s);
  await new Promise(r => setTimeout(r, 900));
  const out = path.join(process.env.TEMP, 'panix-shots', `vf-${slug}-${s}.png`);
  await page.screenshot({ path: out });
  console.log(out);
}
await browser.close();
