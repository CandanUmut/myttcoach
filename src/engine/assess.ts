import type { Content, Level } from '../content/types';
import type { MetricResult, Profile } from './types';

/**
 * Suggest a level-up when the player's latest results reach the next
 * level's targets: at least two metrics tested, all of them at or above
 * target. Metrics whose skill tops out below the next level are ignored.
 * The player always confirms.
 */
export function suggestLevelUp(profile: Profile, results: MetricResult[], content: Content): Level | null {
  if (profile.level >= 5) return null;
  const next = (profile.level + 1) as Level;
  const latest = new Map<string, MetricResult>();
  for (const r of [...results].sort((a, b) => a.date.localeCompare(b.date))) latest.set(r.metricId, r);
  let tested = 0;
  for (const [id, r] of latest) {
    const m = content.metrics.find((x) => x.id === id);
    if (!m) continue;
    const sk = content.skills.find((s) => s.id === m.skillId);
    if (sk && sk.levelMax < next) continue;
    tested++;
    const goal = m.levelTargets[next];
    const ok = m.higherIsBetter ? r.value >= goal : r.value <= goal;
    if (!ok) return null;
  }
  return tested >= 2 ? next : null;
}
