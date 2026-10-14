// Print a readable program table: npx vite-node scripts/print-program.ts [beginnerNoTable|intermediatePartner|advancedRobot]
import { content, byId } from '../src/content/load';
import { generateProgram } from '../src/engine/generate';
import { plannedDates } from '../src/engine/periodize';
import * as P from '../tests/fixtures/profiles';
import { phaseNames } from '../src/strings/en';

const name = (process.argv[2] ?? 'intermediatePartner') as keyof typeof P;
const profile = P[name];
const prog = generateProgram(profile, content);
const dates = plannedDates(profile, prog.sessions.length);
const maxS = Number(process.argv[3] ?? 99);
console.log(`# ${name}: level ${profile.level}, ${profile.setups.join('+')}, ${profile.schedule.length} min, ${profile.schedule.weeks} weeks`);
console.log(`Focus: ${prog.focus.slice(0, 6).map((f) => `${f.skillId} ${f.weight}`).join(', ')}`);
const added = prog.focus.filter((f) => f.addedBecause).map((f) => f.addedBecause);
if (added.length) console.log(`Added: ${added.join(' ')}`);
console.log(`Learn order: ${prog.learnOrder.join(' > ') || '(none)'}`);
for (const s of prog.sessions.slice(0, maxS)) {
  const total = s.blocks.reduce((a, b) => a + b.minutes, 0);
  console.log(`\n## ${s.id} ${dates[s.index]} week ${s.week + 1} (${s.weekTheme})${s.kind === 'assessment' ? ' TEST' : ''} total ${total} min`);
  console.log(`   Note: ${s.coachNote}`);
  for (const b of s.blocks) {
    for (const it of b.items) {
      const d = it.drillId ? byId.drill.get(it.drillId)!.name : 'Watch the move';
      const learn = it.learn ? ` [${it.learn.moveId}:${it.learn.stage}]` : '';
      console.log(`   | ${phaseNames[b.phase]!.padEnd(20)} | ${String(it.minutes).padStart(2)} | ${(d + learn).padEnd(58)} | ${it.setup.padEnd(9)} | ${it.target}`);
    }
  }
  console.log(`   Tip: ${s.tipId ? byId.tip.get(s.tipId)!.text : '-'}`);
}
