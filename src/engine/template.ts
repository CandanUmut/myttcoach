import type { Content, Phase, WorkoutType } from '../content/types';
import type { Profile, WeekTheme } from './types';

export const PHASE_ORDER: Phase[] = [
  'physicalWarmup', 'tableWarmup', 'technique', 'footwork', 'serve', 'receive', 'matchPlay', 'physical', 'mental', 'cooldown',
];

const PROTECTED: Phase[] = ['physicalWarmup', 'tableWarmup', 'cooldown'];
const RANK = [1, 0.7, 0.5];
const MIN_BLOCK = 2;
const MIN_MAIN_BLOCK = 4; // a drill block shorter than this isn't worth setting up

/** Largest-remainder rounding: integer minutes that add up exactly to total. */
export function roundToTotal(values: number[], total: number): number[] {
  const floors = values.map((v) => Math.floor(v));
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = values
    .map((v, i) => ({ i, r: v - Math.floor(v) }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0 && order.length; k = (k + 1) % order.length) {
    floors[order[k]!.i]! += 1;
    left--;
  }
  return floors;
}

/**
 * Minutes per phase for one session.
 * Starts from the template for the chosen length, shifts minutes toward the
 * player's workout types and goals, applies the week theme, drops phases the
 * player can't train, then fixes rounding so the total is exact.
 */
export function allocate(
  profile: Profile,
  content: Content,
  available: Set<Phase>,
  theme: WeekTheme,
): { phase: Phase; minutes: number }[] {
  const length = profile.schedule.length;
  const tpl = content.templates.sessions.find((t) => t.length === length) ?? content.templates.sessions[content.templates.sessions.length - 1]!;
  const m = new Map<Phase, number>();
  for (const b of tpl.blocks) m.set(b.phase, b.minutes);

  // Age band: longer warm-up for the youngest and older players
  if (profile.ageBand === 'u13' || profile.ageBand === '50-64' || profile.ageBand === '65+') {
    const extra = length >= 45 ? 2 : 1;
    m.set('physicalWarmup', (m.get('physicalWarmup') ?? 0) + extra);
    m.set('technique', (m.get('technique') ?? 0) - extra);
  }

  // Shift toward chosen workout types and goals
  const boost = new Map<Phase, number>();
  const add = (wt: WorkoutType, w: number) => {
    const phases = content.templates.workoutPhases[wt] ?? [];
    for (const p of phases) boost.set(p, (boost.get(p) ?? 0) + w / phases.length);
  };
  for (const wt of profile.workoutTypes) add(wt, 1);
  profile.goals.slice(0, 3).forEach((gid, i) => {
    const g = content.goals.find((x) => x.id === gid);
    if (!g) return;
    for (const [wt, v] of Object.entries(g.workoutShift)) add(wt as WorkoutType, (v as number) * RANK[i]! * 0.5);
  });
  const totalBoost = [...boost.values()].reduce((a, b) => a + b, 0);
  if (totalBoost > 0) {
    const shift = length * 0.2 * Math.min(1, totalBoost / 4);
    // take from non-boosted, non-protected phases in proportion to their size
    // donors give at most 40% of their time, so no block gets squeezed to nothing
    const donors = [...m.entries()].filter(([p]) => !boost.has(p) && !PROTECTED.includes(p));
    const donorTotal = donors.reduce((a, [, v]) => a + v * 0.4, 0);
    const take = Math.min(shift, donorTotal);
    if (take > 0) {
      for (const [p, v] of donors) m.set(p, v - (take * v * 0.4) / donorTotal);
      for (const [p, w] of boost) m.set(p, (m.get(p) ?? 0) + (take * w) / totalBoost);
    }
  }

  // Week theme
  if ((theme === 'apply' || theme === 'taper') && m.has('technique')) {
    const t = m.get('technique')!;
    const move = t * 0.25;
    m.set('technique', t - move);
    m.set('matchPlay', (m.get('matchPlay') ?? 0) + move);
  }
  if (theme === 'taper' && m.has('physical')) {
    m.set('serve', (m.get('serve') ?? 0) + m.get('physical')!);
    m.delete('physical');
  }

  // Remove what the player can't train; give the time to the best fallback
  const fallback: Phase[] = ['technique', 'footwork', 'serve', 'physical', 'tableWarmup', 'physicalWarmup', 'cooldown'];
  const giveAway = (p: Phase) => {
    const v = m.get(p) ?? 0;
    m.delete(p);
    const to = fallback.find((f) => f !== p && available.has(f) && m.has(f)) ?? fallback.find((f) => f !== p && available.has(f));
    if (to) m.set(to, (m.get(to) ?? 0) + v);
  };
  for (const p of [...m.keys()]) if (!available.has(p)) giveAway(p);

  // Drop blocks that ended up too small, by the fixed priority
  for (const p of content.templates.dropPriority) {
    const v = m.get(p);
    const min = PROTECTED.includes(p) || p === 'mental' ? MIN_BLOCK : MIN_MAIN_BLOCK;
    if (v !== undefined && v < min && m.size > 1) giveAway(p);
  }

  const phases = PHASE_ORDER.filter((p) => m.has(p));
  const mins = roundToTotal(phases.map((p) => Math.max(0, m.get(p)!)), length);
  const out = phases.map((p, i) => ({ phase: p, minutes: mins[i]! })).filter((b) => b.minutes > 0);
  // Guard: exact total (rounding can't break it, but keep it explicit)
  const sum = out.reduce((a, b) => a + b.minutes, 0);
  if (sum !== length && out.length) out[out.findIndex((b) => b.phase === 'technique') >= 0 ? out.findIndex((b) => b.phase === 'technique') : 0]!.minutes += length - sum;
  return out;
}
