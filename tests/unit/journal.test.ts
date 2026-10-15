import { describe, it, expect } from 'vitest';
import { content } from '../../src/content/load';
import { journalBoost } from '../../src/engine/journal';
import { buildFocus } from '../../src/engine/focus';
import { generateProgram } from '../../src/engine/generate';
import { adaptProgram } from '../../src/engine/adapt';
import type { MatchNote, Profile } from '../../src/engine/types';
import { beginnerNoTable, intermediatePartner } from '../fixtures/profiles';

const note = (id: string, date: string, over: Partial<MatchNote> = {}): MatchNote => ({ id, date, opponentStyle: 'unknown', won: null, didnt: [], ...over });

// Fewer goals so the journal effect is easy to see
const p: Profile = { ...intermediatePartner, goals: ['consistency'], moves: [], goalMetric: undefined };

describe('match journal', () => {
  it('no matches, no extra focus', () => {
    expect(journalBoost([], content).weights).toEqual({});
  });

  it("what didn't work raises its skills; what worked changes nothing", () => {
    const b = journalBoost([note('a', '2026-10-10', { didnt: ['vs-backspin'] })], content);
    expect(b.weights['fh-loop-backspin']).toBeGreaterThan(0);
    expect(b.because['fh-loop-backspin']).toEqual(['Against backspin']);
  });

  it('a lost match against a style adds focus; a won one does not', () => {
    const lost = journalBoost([note('a', '2026-10-10', { opponentStyle: 'chopper', won: false })], content);
    const won = journalBoost([note('a', '2026-10-10', { opponentStyle: 'chopper', won: true })], content);
    expect(lost.weights['fh-loop-backspin']).toBeGreaterThan(0);
    expect(won.weights).toEqual({});
  });

  it('only the 5 newest matches count, newer ones count more, and input order does not matter', () => {
    const old = note('old', '2026-01-01', { didnt: ['nerves'] });
    const recent = [1, 2, 3, 4, 5].map((i) => note(`n${i}`, `2026-10-0${i}`, { didnt: ['footwork'] }));
    const b = journalBoost([old, ...recent], content);
    expect(b.weights['handling-nerves']).toBeUndefined();
    const newest = journalBoost([note('x', '2026-10-09', { didnt: ['nerves'] }), ...recent], content);
    const oldest = journalBoost([...recent, note('x', '2026-10-00', { didnt: ['nerves'] })].slice(1), content);
    expect(newest.weights['handling-nerves']!).toBeGreaterThan(oldest.weights['handling-nerves'] ?? 0);
    expect(journalBoost([...recent].reverse(), content)).toEqual(journalBoost(recent, content));
  });

  it('is capped per skill', () => {
    const many = [1, 2, 3, 4, 5].map((i) => note(`n${i}`, `2026-10-0${i}`, { didnt: ['vs-backspin', 'third-ball'], opponentStyle: 'chopper', won: false }));
    for (const v of Object.values(journalBoost(many, content).weights)) expect(v).toBeLessThanOrEqual(2.5);
  });

  it('moves the skill up the focus list and says why', () => {
    const plain = buildFocus(p, content);
    const j = buildFocus(p, content, new Set(), journalBoost([note('a', '2026-10-10', { didnt: ['receive'] })], content));
    const rank = (f: typeof plain) => f.findIndex((x) => x.skillId === 'receive-basics');
    expect(rank(j)).toBeLessThan(rank(plain));
    expect(j.find((x) => x.skillId === 'receive-basics')?.fromJournal).toEqual(['Receiving serves']);
  });

  it('never adds skills far above the player level', () => {
    const f = buildFocus(beginnerNoTable, content, new Set(), journalBoost([note('a', '2026-10-10', { didnt: ['vs-topspin'], opponentStyle: 'attacker', won: false })], content));
    expect(f.some((x) => x.skillId === 'counter-loop')).toBe(false);
  });

  it('re-plans the future: journal drills show up, past sessions stay, plan is still valid', () => {
    const prog = generateProgram(p, content);
    const notes = [note('a', '2026-10-10', { didnt: ['receive', 'my-serve'] })];
    const { program: next } = adaptProgram(prog, [], p, content, [], notes);
    expect(next.sessions.length).toBe(prog.sessions.length);
    for (const s of next.sessions) expect(s.blocks.reduce((a, b) => a + b.minutes, 0)).toBe(s.length);
    const top = next.focus.slice(0, 5).map((f) => f.skillId);
    expect(top).toContain('receive-basics');
    // deterministic
    expect(adaptProgram(prog, [], p, content, [], notes).program).toEqual(next);
  });
});
