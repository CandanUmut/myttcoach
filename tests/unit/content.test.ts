import { describe, it, expect } from 'vitest';
import { content } from '../../src/content/load';
import { validateContent } from '../../src/content/validate';
import { STAGES } from '../../src/content/types';

const animFiles = import.meta.glob('../../content/animations/*.json', { eager: true, import: 'default' }) as Record<string, { id: string }>;
const animIds = new Set(Object.values(animFiles).map((a) => a.id));

describe('content validation', () => {
  it('has no broken references or missing pieces', () => {
    const errors = validateContent(content, animIds);
    expect(errors).toEqual([]);
  });

  it('every move has all 7 stages, a game pattern and 3+ fixes', () => {
    for (const m of content.moves) {
      expect(m.learningPath.map((s) => s.stage)).toEqual(STAGES);
      expect(m.gamePatterns.length).toBeGreaterThanOrEqual(1);
      expect(m.troubleshooting.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every metric has a test drill and every drill a variant', () => {
    const drillIds = new Set(content.drills.map((d) => d.id));
    for (const m of content.metrics) expect(drillIds.has(m.testDrillId)).toBe(true);
    for (const d of content.drills) expect(d.variants.length).toBeGreaterThan(0);
  });

  it('catches a broken reference (validator self-test)', () => {
    const broken = { ...content, drills: [{ ...content.drills[0]!, metricId: 'nope' }, ...content.drills.slice(1)] };
    expect(validateContent(broken).some((e) => e.includes('"nope"'))).toBe(true);
  });

  it('every no-table phase has at least one shadow drill', () => {
    for (const p of content.templates.noTablePhases) {
      const ok = content.drills.some((d) => d.phase === p && d.variants.some((v) => v.setup === 'shadow'));
      expect(ok, `phase ${p}`).toBe(true);
    }
  });
});
