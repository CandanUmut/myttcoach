// Usage: node scripts/shot.mjs <outDir> <width>x<height> <route>[=name] ...
// Serves dist/ with vite preview (must be built) and takes full-page screenshots.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const [outDir, size, ...routes] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
mkdirSync(outDir, { recursive: true });
const port = 4199;
// DEV=1 uses the dev server (no build needed; slower first load)
const srv = spawn('npx', process.env.DEV === '1' ? ['vite', '--port', String(port), '--strictPort'] : ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, process.env.DEV === '1' ? 4000 : 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const dark = process.env.DARK === '1';
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', hasTouch: true, isMobile: w < 700 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
if (process.env.SETUP) {
  await page.goto(`http://localhost:${port}/myttcoach/#/`);
  await page.evaluate(process.env.SETUP);
  await page.reload();
  await page.waitForTimeout(800);
}
for (const r of routes) {
  const [route, name] = r.split('=');
  await page.goto(`http://localhost:${port}/myttcoach/#${route}`);
  await page.waitForTimeout(Number(process.env.WAIT || 900));
  const file = `${outDir}/${name || route.replace(/\W+/g, '_')}.png`;
  await page.screenshot({ path: file, fullPage: process.env.FULL !== '0' });
  console.log(file);
}
await browser.close();
process.kill(-srv.pid); // the whole group: npx and vite
