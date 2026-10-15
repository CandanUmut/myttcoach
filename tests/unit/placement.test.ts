import { describe, it, expect } from 'vitest';
import { suggestedLevel, styleFromQuiz, goalMetricOptions, suggestGoal } from '../../src/engine/placement';
import { content } from '../../src/content/load';
import { beginnerNoTable, intermediatePartner } from '../fixtures/profiles';

const counts = { 2: 3, 3: 3, 4: 3, 5: 1 };
describe('placement quiz', () => {
  it('no checks = beginner', () => expect(suggestedLevel({}, counts)).toBe(1));
  it('all level 2 and 3 checks = intermediate', () =>
    expect(suggestedLevel({ 2: [true, true, true], 3: [true, true, true], 4: [true, false, true] }, counts)).toBe(3));
  it('a gap stops the run (level 3 yes, level 2 not all yes)', () =>
    expect(suggestedLevel({ 2: [true, false, true], 3: [true, true, true] }, counts)).toBe(1));
  it('everything = competitive', () =>
    expect(suggestedLevel({ 2: [true, true, true], 3: [true, true, true], 4: [true, true, true], 5: [true] }, counts)).toBe(5));
});

describe('style quiz', () => {
  it('maps answers to styles', () => {
    expect(styleFromQuiz(0, 0, 0)).toBe('closeAttacker');
    expect(styleFromQuiz(1, 1, 0)).toBe('midLooper');
    expect(styleFromQuiz(2, 2, 0)).toBe('chopper');
    expect(styleFromQuiz(0, 1, 1)).toBe('penholdAttacker');
    expect(styleFromQuiz(0, 2, 2)).toBe('blocker');
    expect(styleFromQuiz(0, 1, 0)).toBe('allRoundAttacker');
  });
});

describe('goal metric suggestions', () => {
  it('only offers metrics the player can measure', () => {
    const opts = goalMetricOptions(beginnerNoTable, content);
    expect(opts).toContain('bounce-streak');
    expect(opts).not.toContain('fh-drive-streak');
  });
  it('suggests next-level target by the end of the program', () => {
    const g = suggestGoal(intermediatePartner, content, 'loop-backspin-10');
    expect(g).toEqual({ metricId: 'loop-backspin-10', start: 6, target: 8, targetDate: '2026-12-14' });
  });
});
