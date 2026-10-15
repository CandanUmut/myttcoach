import { describe, it, expect } from 'vitest';
import { content } from '../../src/content/load';
import type { Phase, Setup } from '../../src/content/types';

/* Every player should get a full program: for each phase, level and setup
   there must be at least one drill the engine can pick (low impact counts). */
const TABLE_SETUPS: Setup[] = ['partner', 'multiball', 'robot', 'wall'];
const PHASES: Phase[] = ['physicalWarmup', 'tableWarmup', 'technique', 'footwork', 'serve', 'receive', 'matchPlay', 'physical', 'mental', 'cooldown'];
// a wall-only player can't receive serves; everything else should be covered
const EXEMPT = new Set(['receive/wall']);

function gaps(): string[] {
  const out: string[] = [];
  for (const phase of PHASES) {
    const noTableOk = content.templates.noTablePhases.includes(phase);
    const setups: Setup[] = noTableOk ? [...TABLE_SETUPS, 'shadow'] : TABLE_SETUPS;
    for (let level = 1; level <= 5; level++)
      for (const s of setups) {
        if (EXEMPT.has(`${phase}/${s}`)) continue;
        const ok = content.drills.some(
          (d) => d.phase === phase && level >= d.levelMin && level <= d.levelMax && d.impact === 'low' && (d.variants.some((v) => v.setup === s) || (s !== 'shadow' && d.variants.some((v) => v.setup === 'shadow'))),
        );
        if (!ok) out.push(`${phase} L${level} ${s}`);
      }
  }
  return out;
}

describe('content coverage', () => {
  it('every phase × level × setup has at least one low-impact drill', () => {
    expect(gaps()).toEqual([]);
  });
  it('the library is complete enough', () => {
    expect(content.skills.length).toBeGreaterThanOrEqual(40);
    expect(content.moves.length).toBeGreaterThanOrEqual(25);
    expect(content.drills.length).toBeGreaterThanOrEqual(80);
    expect(content.metrics.length).toBeGreaterThanOrEqual(10);
    expect(content.tips.length).toBeGreaterThanOrEqual(150);
  });
});
