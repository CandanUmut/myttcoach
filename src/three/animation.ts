/* Animation data and a pure sampler (no Three.js here, so it is unit-tested). */

export interface RootPose {
  x: number;
  z: number;
  turn: number;
}

export interface AnimKey {
  t: number;
  root?: Partial<RootPose>;
  joints: Record<string, number>;
}

export interface MoveAnimation {
  id: string;
  duration: number; // seconds at 1×
  loop: boolean;
  phases: { name: string; t: number }[];
  keys: AnimKey[];
  ball?: { contactT: number; spin: 'topspin' | 'backspin' | 'sidespin' | 'none'; from: [number, number, number]; to: [number, number, number]; bounce?: [number, number, number] };
  cues?: { t: number; text: string }[];
  footwork?: boolean;
  /** Best default view, e.g. 'front' for backhand strokes the side view hides. */
  camera?: 'front' | 'side' | 'top' | 'eyes';
}

export interface Pose {
  root: RootPose;
  joints: Record<string, number>;
}

/** Keys with every channel filled in: a joint missing from a key keeps its last value. */
export function resolveKeys(anim: MoveAnimation, channels: string[]): Pose[] {
  const keys = [...anim.keys].sort((a, b) => a.t - b.t);
  const out: Pose[] = [];
  let cur: Pose = { root: { x: 0, z: 0, turn: 0 }, joints: Object.fromEntries(channels.map((c) => [c, 0])) };
  for (const k of keys) {
    cur = { root: { ...cur.root, ...(k.root ?? {}) }, joints: { ...cur.joints, ...k.joints } };
    out.push(cur);
  }
  return out;
}

/** Smooth ease-in-out. */
export function ease(u: number): number {
  return u * u * (3 - 2 * u);
}

/** Which two keys surround t, and the eased blend between them. */
export function segmentAt(anim: MoveAnimation, t: number): { a: number; b: number; u: number } {
  const keys = [...anim.keys].sort((x, y) => x.t - y.t);
  const n = keys.length;
  if (n === 0) return { a: 0, b: 0, u: 0 };
  if (t <= keys[0]!.t) return { a: 0, b: 0, u: 0 };
  if (t >= keys[n - 1]!.t) return { a: n - 1, b: n - 1, u: 0 };
  for (let i = 0; i < n - 1; i++) {
    const k0 = keys[i]!;
    const k1 = keys[i + 1]!;
    if (t >= k0.t && t <= k1.t) {
      const span = k1.t - k0.t;
      return { a: i, b: i + 1, u: span > 0 ? ease((t - k0.t) / span) : 0 };
    }
  }
  return { a: n - 1, b: n - 1, u: 0 };
}

/** Per-channel blend (used for single-axis joints and for tests). */
export function samplePose(anim: MoveAnimation, t: number, channels: string[]): Pose {
  const resolved = resolveKeys(anim, channels);
  const { a, b, u } = segmentAt(anim, t);
  const A = resolved[a]!;
  const B = resolved[b]!;
  const lerp = (x: number, y: number) => x + (y - x) * u;
  const joints: Record<string, number> = {};
  for (const c of channels) joints[c] = lerp(A.joints[c] ?? 0, B.joints[c] ?? 0);
  return { root: { x: lerp(A.root.x, B.root.x), z: lerp(A.root.z, B.root.z), turn: lerp(A.root.turn, B.root.turn) }, joints };
}

/** Phase index at time t. */
export function phaseAt(anim: MoveAnimation, t: number): number {
  let i = 0;
  anim.phases.forEach((p, k) => {
    if (t >= p.t - 1e-6) i = k;
  });
  return i;
}

/** Playback speed factor: automatic slow motion around contact. */
export function slowMoFactor(anim: MoveAnimation, t: number): number {
  const c = anim.ball?.contactT;
  if (c === undefined) return 1;
  const d = Math.abs(t - c);
  if (d < 0.05) return 0.35;
  if (d < 0.1) return 0.35 + ((d - 0.05) / 0.05) * 0.65;
  return 1;
}
