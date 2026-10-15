import { canonicalJSON, fnv1a } from './prng';
import type { Profile } from './types';

/** seed = fnv1a(canonicalJSON(profile) + contentVersion + regenCount) */
export function programSeed(profile: Profile, contentVersion: string): number {
  const { regenCount, ...rest } = profile;
  // order of ticking boxes must not change the plan
  const norm = {
    ...rest,
    setups: [...rest.setups].sort(),
    workoutTypes: [...rest.workoutTypes].sort(),
    schedule: { ...rest.schedule, days: [...new Set(rest.schedule.days)].sort() },
  };
  return fnv1a(canonicalJSON(norm) + contentVersion + String(regenCount));
}
