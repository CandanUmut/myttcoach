import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Renders the PNG app icons from public/icon*.svg:  node scripts/make-icons.mjs
const root = new URL('../public/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
for (const [src, out, size] of [['icon.svg','icon-192.png',192],['icon.svg','icon-512.png',512],['icon-maskable.svg','icon-maskable-512.png',512],['icon-maskable.svg','apple-touch-icon.png',180]]) {
  const svg = readFileSync(root + src, 'utf8');
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: root + out, omitBackground: true });
}
await b.close();
