import { describe, it, expect } from 'vitest';
import { content } from '../../src/content/load';
import { generateProgram } from '../../src/engine/generate';
import { adaptProgram, deriveState } from '../../src/engine/adapt';
import { sessionDates } from '../../src/engine/schedule';
import { suggestLevelUp } from '../../src/engine/assess';
import type { Profile, SessionLog } from '../../src/engine/types';
import { intermediatePartner } from '../fixtures/profiles';

// A level-2 player with a partner who works on forehand consistency
const p: Profile = {
  ...intermediatePartner,
  level: 2,
  goals: ['consistency'],
  moves: [{ id: 'fh-drive', mode: 'improve' }],
  workoutTypes: ['technique'],
  setups: ['partner'],
  goalMetric: undefined,
};

function findItem(prog: ReturnType<typeof generateProgram>, drillId: string, from = 0) {
  for (const s of prog.sessions.slice(from))
    for (let b = 0; b < s.blocks.length; b++)
      for (let i = 0; i < s.blocks[b]!.items.length; i++) if (s.blocks[b]!.items[i]!.drillId === drillId) return { s, b, i };
  return null;
}

function logFor(prog: ReturnType<typeof generateProgram>, drillId: string, from: number, felt: 'easy' | 'right' | 'hard', hit: boolean): SessionLog {
  const f = findItem(prog, drillId, from)!;
  return {
    sessionId: f.s.id, sessionIndex: f.s.index, date: `2026-11-${String(10 + f.s.index).padStart(2, '0')}`, done: true,
    items: [{ blockIndex: f.b, itemIndex: f.i, drillId, done: true, felt, targetHit: hit }],
  };
}

describe('adaptation', () => {
  const prog = generateProgram(p, content);
  const drillId = 'fh-drive-crosscourt';
  const first = findItem(prog, drillId)!;

  it('target hit and too easy twice in a row swaps in the progression drill', () => {
    const l1 = logFor(prog, drillId, 0, 'easy', true);
    const l2 = logFor(prog, drillId, first.s.index + 1, 'easy', true);
    const { program, newChanges } = adaptProgram(prog, [l1, l2], p, content);
    expect(newChanges).toHaveLength(1);
    expect(newChanges[0]!.toDrillId).toBe('fh-drive-targets');
    expect(newChanges[0]!.reason).toMatch(/^Swapped Forehand drive, cross-court for Forehand drive to targets: you hit the target \(.+\) twice and it felt too easy\.$/);
    // past sessions never change
    for (let k = 0; k <= l2.sessionIndex; k++) expect(program.sessions[k]).toEqual(prog.sessions[k]);
    // future sessions no longer use the old drill (learning slots and fixed test drills aside)
    for (const s of program.sessions.slice(l2.sessionIndex + 1))
      for (const b of s.blocks) for (const it of b.items) if (!it.learn && !it.metricId) expect(it.drillId).not.toBe(drillId);
  });

  it('too hard twice in a row swaps in the regression drill', () => {
    const l1 = logFor(prog, drillId, 0, 'hard', false);
    const l2 = logFor(prog, drillId, first.s.index + 1, 'hard', true);
    const st = deriveState([l1, l2], p, content, prog);
    expect(st.changes[0]).toMatchObject({ fromDrillId: drillId, toDrillId: 'easy-feed-contact' });
    expect(st.changes[0]!.reason).toBe('Swapped Forehand drive, cross-court for Easy feed, first contact: it felt too hard twice in a row.');
  });

  it('missing the target 3 times in a row also steps back', () => {
    const a = logFor(prog, drillId, 0, 'right', false);
    const b = logFor(prog, drillId, a.sessionIndex + 1, 'right', false);
    const c = logFor(prog, drillId, b.sessionIndex + 1, 'right', false);
    const st = deriveState([a, b, c], p, content, prog);
    expect(st.changes).toHaveLength(1);
    expect(st.changes[0]!.reason).toBe('Swapped Forehand drive, cross-court for Easy feed, first contact: the target was missed 3 times in a row, so we step back first.');
  });

  it('progression, then regression, then progression again resolves to the latest swap', () => {
    const A = 'fh-drive-crosscourt';
    const B = 'fh-drive-targets';
    const changes = [
      { atSession: 2, fromDrillId: A, toDrillId: B, reason: 'up' },
      { atSession: 4, fromDrillId: B, toDrillId: A, reason: 'down' },
      { atSession: 6, fromDrillId: A, toDrillId: B, reason: 'up again' },
    ];
    const pr = generateProgram(p, content, { state: { stageOf: {}, changes, learnedSkills: [] } });
    const uses = (k: number, id: string) => pr.sessions[k]!.blocks.some((b) => b.items.some((it) => it.drillId === id && !it.learn && !it.metricId));
    for (let k = 2; k < 4; k++) expect(uses(k, A), `s${k}`).toBe(false);
    for (let k = 4; k < 6; k++) expect(uses(k, B), `s${k}`).toBe(false);
    for (let k = 6; k < pr.sessions.length; k++) expect(uses(k, A), `s${k}`).toBe(false);
  });

  it('one easy session is not enough to change anything', () => {
    const st = deriveState([logFor(prog, drillId, 0, 'easy', true)], p, content, prog);
    expect(st.changes).toHaveLength(0);
  });

  it('a passed learning stage moves the plan to the next stage', () => {
    const learner: Profile = { ...p, moves: [{ id: 'bh-push', mode: 'learn' }] };
    const pr = generateProgram(learner, content);
    const s0 = pr.sessions[0]!;
    const items = s0.blocks.flatMap((b, bi) => b.items.map((it, ii) => ({ it, bi, ii }))).filter((x) => x.it.learn);
    const log: SessionLog = {
      sessionId: s0.id, sessionIndex: 0, date: '2026-10-20', done: true,
      items: items.map((x) => ({ blockIndex: x.bi, itemIndex: x.ii, drillId: x.it.drillId, done: true, stagePassed: true })),
    };
    const st = deriveState([log], learner, content, pr);
    expect(st.stageOf['bh-push']).toBe(2); // see (auto) and shadow passed
    const next = adaptProgram(pr, [log], learner, content).program;
    const firstLearn = next.sessions[1]!.blocks.flatMap((b) => b.items).find((it) => it.learn);
    expect(firstLearn?.learn?.stage).toBe('feel');
  });
});

describe('schedule', () => {
  const prog = generateProgram(intermediatePartner, content); // Tue, Thu, Sat from 2026-10-20
  it('follows the training days when nothing is missed', () => {
    const d = sessionDates(prog, intermediatePartner, [], {}, '2026-10-20');
    expect([d.s0, d.s1, d.s2, d.s3]).toEqual(['2026-10-20', '2026-10-22', '2026-10-24', '2026-10-27']);
  });
  it('missed sessions move forward instead of piling up', () => {
    const d = sessionDates(prog, intermediatePartner, [], {}, '2026-10-23'); // missed Tue and Thu
    expect([d.s0, d.s1, d.s2]).toEqual(['2026-10-24', '2026-10-27', '2026-10-29']);
  });
  it('done sessions keep their date and a moved session keeps its new date', () => {
    const logs: SessionLog[] = [{ sessionId: 's0', sessionIndex: 0, date: '2026-10-20', done: true, items: [] }];
    const d = sessionDates(prog, intermediatePartner, logs, { s1: '2026-10-23' }, '2026-10-21');
    expect(d.s0).toBe('2026-10-20');
    expect(d.s1).toBe('2026-10-23');
    expect(d.s2).toBe('2026-10-22');
  });
});

describe('level-up suggestion', () => {
  it('suggests the next level when two tested metrics reach its targets', () => {
    const lvl2: Profile = { ...intermediatePartner, level: 2 };
    expect(
      suggestLevelUp(lvl2, [
        { metricId: 'fh-drive-streak', date: '2026-11-01', value: 52, source: 'test' },
        { metricId: 'loop-backspin-10', date: '2026-11-01', value: 6, source: 'test' },
      ], content),
    ).toBe(3);
  });
  it('does not suggest it when one metric falls short or only one was tested', () => {
    const lvl2: Profile = { ...intermediatePartner, level: 2 };
    expect(suggestLevelUp(lvl2, [
      { metricId: 'fh-drive-streak', date: '2026-11-01', value: 52, source: 'test' },
      { metricId: 'loop-backspin-10', date: '2026-11-01', value: 5, source: 'test' },
    ], content)).toBeNull();
    expect(suggestLevelUp(lvl2, [{ metricId: 'fh-drive-streak', date: '2026-11-01', value: 99, source: 'test' }], content)).toBeNull();
  });
  it('ignores metrics whose skill tops out below the next level', () => {
    const lvl2: Profile = { ...intermediatePartner, level: 2 };
    expect(suggestLevelUp(lvl2, [
      { metricId: 'bounce-streak', date: '2026-11-01', value: 5, source: 'test' },
      { metricId: 'fh-drive-streak', date: '2026-11-01', value: 60, source: 'test' },
      { metricId: 'push-streak', date: '2026-11-01', value: 30, source: 'test' },
    ], content)).toBe(3);
  });
});
