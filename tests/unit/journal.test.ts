import { describe, it, expect } from 'vitest';
import { content } from '../../src/content/load';
import { journalFocus, JOURNAL_SESSIONS } from '../../src/engine/journal';
import { generateProgram } from '../../src/engine/generate';
import { adaptProgram } from '../../src/engine/adapt';
import { plannedDates } from '../../src/engine/periodize';
import type { MatchNote, Profile, Program, SessionLog } from '../../src/engine/types';
import { beginnerNoTable, intermediatePartner } from '../fixtures/profiles';

const note = (id: string, date: string, over: Partial<MatchNote> = {}): MatchNote => ({ id, date, opponentStyle: 'unknown', won: null, didnt: [], ...over });
const p: Profile = { ...intermediatePartner, goals: ['consistency'], moves: [], goalMetric: undefined };
const drills = new Map(content.drills.map((d) => [d.id, d]));
const journalItems = (prog: Program) => prog.sessions.map((s) => s.blocks.flatMap((b) => b.items).filter((i) => i.fromJournal));

describe('match journal focus', () => {
  it('no matches, no focus', () => {
    expect(journalFocus([], content)).toBeUndefined();
  });

  it("what didn't work counts; what worked changes nothing", () => {
    const f = journalFocus([note('a', '2026-10-10', { didnt: ['vs-backspin'] })], content)!;
    expect(f.from).toBe('2026-10-10');
    expect(f.skills[0]).toMatchObject({ id: 'fh-loop-backspin', because: ['Against backspin'] });
    expect(journalFocus([note('a', '2026-10-10', { opponentStyle: 'chopper', won: true })], content)).toBeUndefined();
  });

  it('a lost match against a style counts', () => {
    const f = journalFocus([note('a', '2026-10-10', { opponentStyle: 'chopper', won: false })], content)!;
    expect(f.skills[0]!.id).toBe('fh-loop-backspin');
  });

  it('a lost match against a left-hander adds the left-hander focus, whatever the style', () => {
    const f = journalFocus([note('a', '2026-10-10', { opponentStyle: 'chopper', lefty: true, won: false })], content)!;
    expect(f.skills.find((s) => s.id === 'placement')?.because).toContain('Left-handed opponent');
  });

  it('newer matches count more, old ones drop out, input order does not matter', () => {
    const a = note('a', '2026-10-01', { didnt: ['nerves'] });
    const b = note('b', '2026-10-08', { didnt: ['footwork'] });
    const f = journalFocus([a, b], content)!;
    expect(f.skills[0]!.id).toBe('basic-footwork');
    expect(journalFocus([b, a], content)).toEqual(f);
    const old = journalFocus([note('o', '2026-06-01', { didnt: ['nerves'] }), b], content)!;
    expect(old.skills.some((s) => s.id === 'handling-nerves')).toBe(false);
  });
});

describe('journal drills in the plan', () => {
  const prog = generateProgram(p, content);
  const dates = plannedDates(p, prog.sessions.length);

  it('the next sessions after the match each get one drill for what didn\'t work, later ones none', () => {
    const matchDate = dates[3]!; // a match on the day of session 3
    const { program: next } = adaptProgram(prog, [], p, content, [], [note('a', matchDate, { didnt: ['receive'] })]);
    const items = journalItems(next);
    const withDrill = items.map((x, i) => (x.length ? i : -1)).filter((i) => i >= 0);
    expect(withDrill.length).toBeGreaterThanOrEqual(JOURNAL_SESSIONS - 1); // a test session may skip one
    expect(withDrill.length).toBeLessThanOrEqual(JOURNAL_SESSIONS);
    for (const i of withDrill) {
      expect(i).toBeGreaterThanOrEqual(3);
      expect(i).toBeLessThan(3 + JOURNAL_SESSIONS);
      expect(items[i]!.length).toBe(1);
      const d = drills.get(items[i]![0]!.drillId!)!;
      expect(d.skills.some((s) => ['receive-basics', 'spin-reading', 'receive-long'].includes(s.id) && s.weight >= 0.6)).toBe(true);
      expect(items[i]![0]!.reason).toMatch(/match journal/);
    }
    for (const s of next.sessions) expect(s.blocks.reduce((a, b) => a + b.minutes, 0)).toBe(s.length);
    expect(adaptProgram(prog, [], p, content, [], [note('a', matchDate, { didnt: ['receive'] })]).program).toEqual(next);
  });

  it('logged sessions stay as they were', () => {
    const logs: SessionLog[] = [0, 1].map((i) => ({ sessionId: `s${i}`, sessionIndex: i, date: dates[i]!, done: true, items: [] }));
    const { program: next } = adaptProgram(prog, logs, p, content, [], [note('a', dates[0]!, { didnt: ['my-serve'] })]);
    expect(next.sessions.slice(0, 2)).toEqual(prog.sessions.slice(0, 2));
    expect(journalItems(next).slice(2).some((x) => x.length)).toBe(true);
  });

  it('never picks drills the player cannot do, and never claims what it cannot give', () => {
    // no table: receiving drills need a table, so the journal falls back to what can be trained, or nothing
    const prog0 = generateProgram(beginnerNoTable, content);
    const { program: next } = adaptProgram(prog0, [], beginnerNoTable, content, [], [note('a', beginnerNoTable.schedule.startDate, { didnt: ['receive', 'vs-topspin'], opponentStyle: 'attacker', won: false })]);
    for (const it of journalItems(next).flat()) {
      const d = drills.get(it.drillId!)!;
      expect(d.variants.some((v) => v.setup === 'shadow')).toBe(true);
      expect(d.levelMin).toBeLessThanOrEqual(beginnerNoTable.level);
      expect(d.skills.some((s) => s.id === 'counter-loop')).toBe(false);
    }
  });

  it('a match long before the plan started changes nothing', () => {
    const { program: next } = adaptProgram(prog, [], p, content, [], [note('a', '2025-01-01', { didnt: ['receive'] })]);
    expect(journalItems(next).flat()).toEqual([]);
  });
});
