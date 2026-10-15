import type { Content, Level, StyleId } from '../content/types';
import { addDays } from './periodize';
import type { Profile } from './types';
import { drillFits } from './generate';

/**
 * Suggested level = the last level in an unbroken run of levels whose checks
 * are all "yes" (level 1 has no checks). A gap stops the run.
 */
export function suggestedLevel(checks: Record<number, boolean[]>, counts: Record<number, number>): Level {
  let level = 1;
  for (let l = 2; l <= 5; l++) {
    const c = checks[l] ?? [];
    const n = counts[l] ?? 0;
    if (n > 0 && c.length >= n && c.slice(0, n).every(Boolean)) level = l;
    else break;
  }
  return level as Level;
}

/** "Help me choose": three answers → a style. */
export function styleFromQuiz(stand: number, win: number, equipment: number): StyleId {
  if (equipment === 1) return 'penholdAttacker';
  if (equipment === 2) return 'blocker';
  if (stand === 2 && win === 2) return 'chopper';
  if (stand === 0 && win === 0) return 'closeAttacker';
  if (stand === 1 && win === 1) return 'midLooper';
  if (stand === 2) return 'chopper';
  return 'allRoundAttacker';
}

/** Metrics that make sense for this player, best first. */
export function goalMetricOptions(p: Profile, content: Content): string[] {
  const out: string[] = [];
  const push = (id?: string) => {
    if (id && !out.includes(id)) out.push(id);
  };
  for (const g of p.goals) push(content.goals.find((x) => x.id === g)?.suggestedMetricId);
  for (const m of p.moves) for (const met of content.metrics) if (content.moves.find((x) => x.id === m.id)?.skillId === met.skillId) push(met.id);
  for (const met of content.metrics) push(met.id);
  return out.filter((id) => {
    const met = content.metrics.find((x) => x.id === id)!;
    const d = content.drills.find((x) => x.id === met.testDrillId);
    if (!d || !drillFits(d, p, 1)) return false;
    const onlyShadow = p.setups.every((s) => s === 'shadow');
    if (onlyShadow && !met.worksWithoutTable) return false;
    return true;
  });
}

export function suggestGoal(p: Profile, content: Content, metricId: string) {
  const met = content.metrics.find((x) => x.id === metricId)!;
  const start = met.levelTargets[p.level];
  let target = met.levelTargets[Math.min(5, p.level + 1) as Level];
  if (target <= start) target = Math.round(start * 1.3) + 1;
  const targetDate = addDays(p.schedule.startDate, p.schedule.weeks * 7 - 1);
  return { metricId, start, target, targetDate };
}
