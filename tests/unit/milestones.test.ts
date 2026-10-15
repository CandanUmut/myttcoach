import { describe, it, expect } from 'vitest';
import { content } from '../../src/content/load';
import { generateProgram } from '../../src/engine/generate';
import { milestones, newlyReached } from '../../src/engine/milestones';
import { hitsOf, targetFor, zoneOf } from '../../src/engine/serveLab';
import type { SessionLog } from '../../src/engine/types';
import { intermediatePartner } from '../fixtures/profiles';

const prog = generateProgram(intermediatePartner, content);
const logOf = (i: number, date: string): SessionLog => ({
  sessionId: prog.sessions[i]!.id,
  sessionIndex: i,
  date,
  done: true,
  items: prog.sessions[i]!.blocks.flatMap((b, bi) => b.items.map((it, ii) => ({ blockIndex: bi, itemIndex: ii, drillId: it.drillId, done: true }))),
});
const base = { profile: intermediatePartner, program: prog, results: [], stagePasses: [], journal: [], serveLab: [] };
const get = (ms: ReturnType<typeof milestones>, id: string) => ms.find((m) => m.id === id)!;

describe('milestones', () => {
  it('nothing reached on day one', () => {
    expect(milestones({ ...base, logs: [] }).filter((m) => m.date)).toEqual([]);
  });

  it('counts sessions and dates them by the session that reached it', () => {
    const logs = Array.from({ length: 10 }, (_, i) => logOf(i, `2026-10-${String(10 + i).padStart(2, '0')}`));
    const ms = milestones({ ...base, logs });
    expect(get(ms, 'first-session').date).toBe('2026-10-10');
    expect(get(ms, 'sessions-10').date).toBe('2026-10-19');
    expect(get(ms, 'sessions-25')).toMatchObject({ date: null, have: 10, need: 25 });
    expect(get(ms, 'hours-5').date).not.toBeNull(); // 10 × 60 min
  });

  it('four weeks in a row needs four consecutive weeks', () => {
    const gap = milestones({ ...base, logs: ['2026-10-05', '2026-10-12', '2026-10-26', '2026-11-02'].map((d, i) => logOf(i, d)) });
    expect(get(gap, 'streak-4').date).toBeNull();
    const run = milestones({ ...base, logs: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-28'].map((d, i) => logOf(i, d)) });
    expect(get(run, 'streak-4').date).toBe('2026-10-28');
  });

  it('journal, serve lab, goal and stage milestones', () => {
    const gm = intermediatePartner.goalMetric!;
    const ms = milestones({
      ...base,
      logs: [],
      journal: [{ date: '2026-10-11' }],
      serveLab: [{ date: '2026-10-12', hits: 7 }, { date: '2026-10-13', hits: 8 }],
      results: [{ metricId: gm.metricId, date: '2026-10-14', value: gm.target, source: 'test' }],
      stagePasses: [{ moveId: 'fh-loop-backspin', stage: 'see', date: '2026-10-09' }],
    });
    expect(get(ms, 'first-match').date).toBe('2026-10-11');
    expect(get(ms, 'serve-8').date).toBe('2026-10-13');
    expect(get(ms, 'goal-reached').date).toBe('2026-10-14');
    expect(get(ms, 'first-test').date).toBe('2026-10-14');
    expect(get(ms, 'first-stage').date).toBe('2026-10-09');
    expect(get(ms, 'first-own').date).toBeNull();
  });

  it('every milestone has a name', async () => {
    const { milestoneText } = await import('../../src/strings/en');
    for (const m of milestones({ ...base, logs: [] })) expect(milestoneText.names[m.id]).toBeTruthy();
  });

  it('reports only newly reached ones', () => {
    const a = milestones({ ...base, logs: [logOf(0, '2026-10-10')] });
    const b = milestones({ ...base, logs: [logOf(0, '2026-10-10')], journal: [{ date: '2026-10-11' }] });
    expect(newlyReached(a, b)).toEqual(['first-match']);
  });
});

describe('serve lab scoring', () => {
  it('zones by thirds from the net; outside the table is out', () => {
    expect(zoneOf(0.5, 0.1)).toBe('short');
    expect(zoneOf(0.5, 0.5)).toBe('half');
    expect(zoneOf(0.5, 0.9)).toBe('long');
    expect(zoneOf(1.1, 0.5)).toBe('out');
    expect(zoneOf(0.5, -0.1)).toBe('out');
  });
  it('mixed alternates short and long', () => {
    expect([0, 1, 2, 3].map((i) => targetFor('mixed', i))).toEqual(['short', 'long', 'short', 'long']);
  });
  it('counts hits against the target of each serve', () => {
    const l = (zone: 'short' | 'half' | 'long' | 'out') => ({ x: 0, y: 0, zone });
    expect(hitsOf({ target: 'short', landings: [l('short'), l('half'), l('short'), l('out')] })).toBe(2);
    expect(hitsOf({ target: 'mixed', landings: [l('short'), l('long'), l('long'), l('short')] })).toBe(2);
  });
});
