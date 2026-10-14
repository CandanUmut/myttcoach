/* Seeded randomness. The PRNG only breaks ties and rotates equal options;
   it never makes a decision the rules make. No Math.random() anywhere. */

export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** JSON with sorted keys so the same data always gives the same string. */
export function canonicalJSON(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonicalJSON).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJSON(o[k])}`)
    .join(',')}}`;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof mulberry32>;

/** Pick the best by score; exact ties are broken by the PRNG. */
export function pickBest<T>(items: T[], score: (x: T) => number, rng: Rng): T | undefined {
  let best: T[] = [];
  let bestScore = -Infinity;
  for (const it of items) {
    const s = Math.round(score(it) * 1e6) / 1e6;
    if (s > bestScore) {
      bestScore = s;
      best = [it];
    } else if (s === bestScore) best.push(it);
  }
  if (!best.length) return undefined;
  return best[Math.floor(rng() * best.length)];
}
