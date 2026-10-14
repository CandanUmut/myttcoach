import { canonicalJSON, fnv1a } from './prng';
import type { Profile } from './types';

/** seed = fnv1a(canonicalJSON(profile) + contentVersion + regenCount) */
export function programSeed(profile: Profile, contentVersion: string): number {
  const { regenCount, ...rest } = profile;
  return fnv1a(canonicalJSON(rest) + contentVersion + String(regenCount));
}
