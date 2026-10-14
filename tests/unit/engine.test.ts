import { describe, it, expect } from 'vitest';
import { content } from '../../src/content/load';
import { generateProgram, playerSetups } from '../../src/engine/generate';
import { mulberry32 } from '../../src/engine/prng';
import type { Profile } from '../../src/engine/types';
import type { GoalId, Level, Setup, StyleId, WorkoutType } from '../../src/content/types';
import { STAGES } from '../../src/content/types';
import { advancedRobot, beginnerNoTable, intermediatePartner } from '../fixtures/profiles';

const drills = new Map(content.drills.map((d) => [d.id, d]));
const moves = new Map(content.moves.map((m) => [m.id, m]));
const skills = new Map(content.skills.map((s) => [s.id, s]));

function randomProfile(i: number): Profile {
  const r = mulberry32(1000 + i);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]!;
  const some = <T,>(a: readonly T[], max: number) => {
    const out: T[] = [];
    const n = Math.floor(r() * (max + 1));
    for (let k = 0; k < n; k++) {
      const x = pick(a);
      if (!out.includes(x)) out.push(x);
    }
    return out;
  };
  const level = (1 + Math.floor(r() * 5)) as Level;
  const setupsAll: Setup[] = ['partner', 'multiball', 'robot', 'wall', 'shadow'];
  let setups = some(setupsAll, 3);
  if (!setups.length) setups = ['shadow'];
  const goals = some<GoalId>(['basics', 'consistency', 'attack', 'serveReceive', 'footwork', 'defense', 'tactics', 'fitness', 'comeback', 'tournament'], 3);
  const moveIds = content.moves.filter((m) => m.levelMin <= level + 1).map((m) => m.id);
  const mv = some(moveIds, 3).map((id) => ({ id, mode: r() < 0.6 ? ('learn' as const) : ('improve' as const) }));
  const days = some([0, 1, 2, 3, 4, 5, 6], 5);
  return {
    name: `P${i}`,
    hand: r() < 0.15 ? 'L' : 'R',
    grip: pick(['shakehand', 'penhold', 'unsure'] as const),
    ageBand: pick(['u13', '13-17', '18-34', '35-49', '50-64', '65+'] as const),
    level,
    style: pick<StyleId>(['closeAttacker', 'allRoundAttacker', 'midLooper', 'penholdAttacker', 'chopper', 'blocker', 'balanced']),
    goals: goals.length ? goals : ['consistency'],
    moves: mv,
    workoutTypes: some<WorkoutType>(['technique', 'footwork', 'serveReceive', 'matchPlay', 'fitness', 'mental'], 3),
    setups,
    schedule: { days: days.length ? days : [2], time: null, length: pick([20, 30, 45, 60, 90] as const), weeks: pick([4, 6, 8, 12] as const), startDate: '2026-11-02' },
    lowImpact: r() < 0.3,
    voice: pick(['calm', 'energetic', 'direct'] as const),
    regenCount: 0,
  };
}

const profiles = Array.from({ length: 500 }, (_, i) => randomProfile(i));
const programs = profiles.map((p) => generateProgram(p, content));

describe('determinism', () => {
  it('same profile and content version give an identical program', () => {
    const a = generateProgram(intermediatePartner, content);
    const b = generateProgram(intermediatePartner, content);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a).toMatchSnapshot();
  });
  it('a different regenCount gives a different but valid program', () => {
    const a = generateProgram(advancedRobot, content);
    const b = generateProgram({ ...advancedRobot, regenCount: 1 }, content);
    expect(JSON.stringify(a.sessions)).not.toBe(JSON.stringify(b.sessions));
    for (const s of b.sessions) expect(s.blocks.reduce((x, bl) => x + bl.minutes, 0)).toBe(advancedRobot.schedule.length);
  });
});

describe('constraints over 500 seeded profiles', () => {
  it('every session adds up exactly to the chosen length', () => {
    profiles.forEach((p, i) => {
      for (const s of programs[i]!.sessions) {
        const total = s.blocks.reduce((a, b) => a + b.minutes, 0);
        const items = s.blocks.flatMap((b) => b.items).reduce((a, it) => a + it.minutes, 0);
        expect(total, `profile ${i} ${s.id}`).toBe(p.schedule.length);
        expect(items, `profile ${i} ${s.id} items`).toBe(p.schedule.length);
        for (const b of s.blocks) for (const it of b.items) expect(it.minutes).toBeGreaterThanOrEqual(1);
      }
    });
  });
  it('the session count matches weeks × training days', () => {
    profiles.forEach((p, i) => expect(programs[i]!.sessions.length).toBe(p.schedule.weeks * new Set(p.schedule.days).size));
  });
  it('no drill needs a setup the player lacks', () => {
    profiles.forEach((p, i) => {
      const have = playerSetups(p);
      for (const s of programs[i]!.sessions)
        for (const b of s.blocks)
          for (const it of b.items) {
            expect(have, `profile ${i}`).toContain(it.setup);
            if (it.drillId) expect(drills.get(it.drillId)!.variants.some((v) => v.setup === it.setup)).toBe(true);
          }
    });
  });
  it('level ranges are respected', () => {
    let fallbacks = 0;
    let total = 0;
    profiles.forEach((p, i) => {
      const have = playerSetups(p);
      for (const s of programs[i]!.sessions)
        for (const b of s.blocks)
          for (const it of b.items) {
            if (!it.drillId) continue;
            const d = drills.get(it.drillId)!;
            total++;
            // never more than one level away
            expect(p.level, `profile ${i} ${d.id}`).toBeGreaterThanOrEqual(d.levelMin - 1);
            expect(p.level, `profile ${i} ${d.id}`).toBeLessThanOrEqual(d.levelMax + 1);
            if (it.learn || it.metricId || (p.level >= d.levelMin && p.level <= d.levelMax)) continue;
            // a regular pick may leave the level only when no drill at the level exists for this block
            fallbacks++;
            const atLevel = content.drills.some(
              (x) => x.phase === d.phase && p.level >= x.levelMin && p.level <= x.levelMax && (!p.lowImpact || x.impact === 'low') &&
                x.variants.some((v) => have.includes(v.setup) && (have.some((h) => h !== 'shadow') || v.setup === 'shadow')),
            );
            expect(atLevel, `profile ${i} ${s.id} ${d.id} (level ${p.level}) left the level although a level-${p.level} drill exists`).toBe(false);
          }
    });
    expect(fallbacks).toBe(0);
  });
  it('no high-impact drills in low-impact mode', () => {
    profiles.forEach((p, i) => {
      if (!p.lowImpact) return;
      for (const s of programs[i]!.sessions) for (const b of s.blocks) for (const it of b.items) if (it.drillId) expect(drills.get(it.drillId)!.impact).toBe('low');
    });
  });
  it('prerequisites are learned before the moves that need them', () => {
    profiles.forEach((_p, i) => {
      const prog = programs[i]!;
      const first = new Map<string, number>();
      for (const s of prog.sessions) for (const b of s.blocks) for (const it of b.items) if (it.learn && !first.has(it.learn.moveId)) first.set(it.learn.moveId, s.index);
      for (const [mid, at] of first) {
        for (const pre of skills.get(moves.get(mid)!.skillId)!.prerequisites) {
          const pm = content.moves.find((m) => m.skillId === pre);
          if (pm && first.has(pm.id)) expect(first.get(pm.id)!, `profile ${i}: ${pm.id} before ${mid}`).toBeLessThanOrEqual(at);
        }
      }
    });
  });
  it('no back-to-back repeats except focus drills', () => {
    profiles.forEach((p, i) => {
      const ss = programs[i]!.sessions;
      for (let k = 1; k < ss.length; k++) {
        const prev = new Set(ss[k - 1]!.blocks.flatMap((b) => b.items.map((it) => it.drillId)));
        for (const b of ss[k]!.blocks)
          for (const it of b.items) {
            if (!it.drillId || !prev.has(it.drillId) || it.focus) continue;
            // allowed only when no other drill could fill this block
            const alternatives = content.drills.filter(
              (d) => d.phase === b.phase && d.id !== it.drillId && p.level >= d.levelMin && p.level <= d.levelMax &&
                d.variants.some((v) => playerSetups(p).includes(v.setup)) && (!p.lowImpact || d.impact === 'low') &&
                !ss[k - 1]!.blocks.some((bb) => bb.items.some((x) => x.drillId === d.id)) &&
                !ss[k]!.blocks.some((bb) => bb.items.some((x) => x.drillId === d.id)),
            );
            expect(alternatives.map((d) => d.id), `profile ${i} ${ss[k]!.id} repeats ${it.drillId}`).toEqual([]);
          }
      }
    });
  });
  it('learning stages appear in order for each move', () => {
    programs.forEach((prog) => {
      const last = new Map<string, number>();
      for (const s of prog.sessions)
        for (const b of s.blocks)
          for (const it of b.items) {
            if (!it.learn) continue;
            const si = STAGES.indexOf(it.learn.stage);
            expect(si).toBeGreaterThanOrEqual((last.get(it.learn.moveId) ?? 0) - 1);
            last.set(it.learn.moveId, Math.max(si, last.get(it.learn.moveId) ?? 0));
          }
    });
  });
});

describe('sample profiles', () => {
  it('beginner without a table gets only shadow work and no table phases', () => {
    const p = generateProgram(beginnerNoTable, content);
    for (const s of p.sessions)
      for (const b of s.blocks) {
        expect(['receive', 'matchPlay']).not.toContain(b.phase);
        for (const it of b.items) expect(it.setup).toBe('shadow');
      }
    expect(p.focus.some((f) => f.addedBecause)).toBe(true);
  });
  it('each block ends in an assessment session', () => {
    const p = generateProgram(intermediatePartner, content);
    const tests = p.sessions.filter((s) => s.kind === 'assessment');
    expect(tests.length).toBe(2);
    expect(tests[0]!.week).toBe(3);
    expect(tests[0]!.blocks.flatMap((b) => b.items).some((it) => it.metricId === 'loop-backspin-10')).toBe(true);
  });
});
