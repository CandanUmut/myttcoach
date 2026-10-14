/* Goal curve: a planned path from start to target, faster early, slower later.
   planned(t) = start + (target − start) × (1 − (1 − t/T)²) */

import { parseDate } from './periodize';

export type GoalStatus = 'ahead' | 'onTrack' | 'behind';

export function plannedValue(start: number, target: number, t: number, T: number): number {
  if (T <= 0) return target;
  const x = Math.max(0, Math.min(1, t / T));
  return start + (target - start) * (1 - (1 - x) * (1 - x));
}

/** The zone to stay in: ±10% of the planned gain, at least 1 unit. */
export function bandWidth(start: number, target: number): number {
  return Math.max(1, 0.1 * Math.abs(target - start));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

export function statusFor(value: number, start: number, target: number, startDate: string, targetDate: string, date: string, higherIsBetter = true): GoalStatus {
  const p = plannedValue(start, target, daysBetween(startDate, date), daysBetween(startDate, targetDate));
  const band = bandWidth(start, target);
  const diff = higherIsBetter ? value - p : p - value;
  if (diff > band) return 'ahead';
  if (diff < -band) return 'behind';
  return 'onTrack';
}

export function curve(start: number, target: number, startDate: string, targetDate: string, points = 24) {
  const T = daysBetween(startDate, targetDate);
  const band = bandWidth(start, target);
  return Array.from({ length: points + 1 }, (_, i) => {
    const t = (T * i) / points;
    const v = plannedValue(start, target, t, T);
    return { t, value: v, low: v - band, high: v + band };
  });
}

/** Behind twice in a row → offer choices (never change the goal silently). */
export function behindTwice(statuses: GoalStatus[]): boolean {
  const n = statuses.length;
  return n >= 2 && statuses[n - 1] === 'behind' && statuses[n - 2] === 'behind';
}
