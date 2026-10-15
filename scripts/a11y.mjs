// Accessibility audit with axe-core on the built app (run `npm run build` first).
// Usage: node scripts/a11y.mjs [light|dark]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const dark = process.argv[2] === 'dark';
const port = 4197;
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const profile = {
  name: 'Kim', hand: 'R', grip: 'shakehand', level: 3, style: 'allRoundAttacker', goals: ['attack', 'serveReceive'],
  moves: [{ id: 'fh-loop-backspin', mode: 'learn' }], workoutTypes: ['technique'], setups: ['partner', 'multiball'],
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], time: null, length: 60, weeks: 8, startDate: '2026-01-05' },
  goalMetric: { metricId: 'loop-backspin-10', start: 4, target: 8, targetDate: '2026-03-01' },
  lowImpact: false, voice: 'calm', regenCount: 0,
};
const routes = ['/today', '/card', '/plan', '/plan/s3', '/plan/s10', '/plan/s20', '/play/s3', '/learn', '/learn/fh-loop-backspin', '/library', '/library/drill/dynamic-warmup',
  '/progress', '/settings', '/journal', '/journal/new', '/serve-lab', '/spin', '/onboarding/1', '/onboarding/2', '/onboarding/8'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: dark ? 'dark' : 'light', hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto(`http://localhost:${port}/myttcoach/#/`);
await page.evaluate((p) => localStorage.setItem('thirdball:v1', JSON.stringify({ schemaVersion: 2, profile: p, settings: { theme: 'auto', sound: false, readCues: false } })), profile);
await page.reload();
await page.waitForTimeout(800);
let total = 0;
for (const r of routes) {
  await page.goto(`http://localhost:${port}/myttcoach/#${r}`);
  await page.waitForTimeout(1200);
  await page.addScriptTag({ path: axePath });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const out = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] });
    return out.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join('')) , count: v.nodes.length }));
  });
  // no page may scroll sideways on a phone
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (wide > 0) res.push({ id: 'sideways-scroll', impact: 'serious', help: `Page is ${wide}px wider than the screen`, nodes: [], count: 1 });
  total += res.length;
  console.log(`\n${r}: ${res.length ? res.length + ' issue(s)' : 'ok'}`);
  for (const v of res) console.log(`  [${v.impact}] ${v.id} (${v.count}): ${v.help}\n    ${v.nodes.join('\n    ')}`);
}
console.log(`\nTotal: ${total}`);
await b.close();
process.kill(-srv.pid);
