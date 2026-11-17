// Screenshot of one element on a local page after a wait, optional click. Needs puppeteer-core in %TEMP%\pgtest.
// Usage: node scripts/page-shot.mjs <name> <path> <selector> [waitMs] [clickSelector] [theme]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.join(process.env.TEMP, 'pgtest', 'x.js'));
const puppeteer = require('puppeteer-core');
const [name, url, sel, wait = '2500', click, theme = 'light'] = process.argv.slice(2);
const exe = 'D:/PANIX/marketing/remotion/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe';
const browser = await puppeteer.launch({ executablePath: exe, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:8787' + url, { waitUntil: 'networkidle0' });
await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
if (click) { await new Promise(r => setTimeout(r, 500)); await page.click(click); }
await new Promise(r => setTimeout(r, +wait));
await (await page.$(sel)).screenshot({ path: path.join(process.env.TEMP, 'panix-shots', name + '.png') });
console.log(name, 'errors:', errors);
await browser.close();
