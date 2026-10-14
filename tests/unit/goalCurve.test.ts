import { describe, it, expect } from 'vitest';
import { bandWidth, behindTwice, curve, plannedValue, statusFor } from '../../src/engine/goalCurve';

describe('goal curve', () => {
  it('planned values at known points: faster early, slower late', () => {
    expect(plannedValue(5, 25, 0, 100)).toBe(5);
    expect(plannedValue(5, 25, 50, 100)).toBe(20); // 5 + 20 × 0.75
    expect(plannedValue(5, 25, 100, 100)).toBe(25);
    expect(plannedValue(5, 25, 25, 100)).toBeCloseTo(13.75); // 5 + 20 × 0.4375
    expect(plannedValue(5, 25, 150, 100)).toBe(25); // clamps after the target date
  });
  it('band is ±10% of the planned gain, at least 1', () => {
    expect(bandWidth(5, 25)).toBe(2);
    expect(bandWidth(4, 8)).toBe(1);
  });
  it('status in plain words', () => {
    // halfway (Dec 1 of Nov 1 → Dec 31 is 30 of 60 days): planned 20, band 2
    expect(statusFor(20, 5, 25, '2026-11-01', '2026-12-31', '2026-12-01')).toBe('onTrack');
    expect(statusFor(22, 5, 25, '2026-11-01', '2026-12-31', '2026-12-01')).toBe('onTrack');
    expect(statusFor(23, 5, 25, '2026-11-01', '2026-12-31', '2026-12-01')).toBe('ahead');
    expect(statusFor(17, 5, 25, '2026-11-01', '2026-12-31', '2026-12-01')).toBe('behind');
    // lower is better (e.g. errors)
    expect(statusFor(10, 20, 5, '2026-11-01', '2026-12-31', '2026-12-01', false)).toBe('onTrack');
  });
  it('behind twice in a row triggers the choice', () => {
    expect(behindTwice(['onTrack', 'behind', 'behind'])).toBe(true);
    expect(behindTwice(['behind', 'onTrack', 'behind'])).toBe(false);
  });
  it('curve points start at start and end at target', () => {
    const c = curve(5, 25, '2026-11-01', '2026-12-31', 10);
    expect(c[0]!.value).toBe(5);
    expect(c[10]!.value).toBe(25);
    expect(c[5]!.high - c[5]!.value).toBe(2);
  });
});
