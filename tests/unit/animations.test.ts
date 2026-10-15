import { describe, it, expect } from 'vitest';
import { JOINT_LIMITS, JOINT_NAMES } from '../../src/three/joints';
import { phaseAt, resolveKeys, samplePose, segmentAt, type MoveAnimation } from '../../src/three/animation';
import { content } from '../../src/content/load';

const files = import.meta.glob('../../content/animations/*.json', { eager: true, import: 'default' }) as Record<string, MoveAnimation>;
const anims = Object.entries(files).map(([path, a]) => ({ path, a }));

describe('animation files', () => {
  it('there are animation files', () => expect(anims.length).toBeGreaterThanOrEqual(4));
  for (const { path, a } of anims) {
    describe(a.id, () => {
      it('id matches the file name', () => expect(path.endsWith(`/${a.id}.json`)).toBe(true));
      it('phases and keys are in order, within 0–1, starting at 0', () => {
        const pt = a.phases.map((p) => p.t);
        expect(pt).toEqual([...pt].sort((x, y) => x - y));
        expect(pt[0]).toBe(0);
        const kt = a.keys.map((k) => k.t);
        expect(kt).toEqual([...kt].sort((x, y) => x - y));
        for (const t of [...pt, ...kt]) expect(t >= 0 && t <= 1).toBe(true);
        expect(a.duration).toBeGreaterThan(0);
      });
      it('joint names are valid and angles within limits', () => {
        for (const k of a.keys)
          for (const [n, v] of Object.entries(k.joints)) {
            expect(JOINT_NAMES, `${a.id}: ${n}`).toContain(n);
            const [lo, hi] = JOINT_LIMITS[n]!;
            expect(v >= lo && v <= hi, `${a.id} t=${k.t} ${n}=${v} outside ${lo}..${hi}`).toBe(true);
          }
      });
      it('a looping animation ends where it starts', () => {
        if (!a.loop) return;
        const r = resolveKeys(a, JOINT_NAMES);
        const first = r[0]!;
        const last = r[r.length - 1]!;
        for (const n of JOINT_NAMES) expect(Math.abs((first.joints[n] ?? 0) - (last.joints[n] ?? 0)), `${a.id} ${n}`).toBeLessThanOrEqual(2);
      });
      it('ball contact lines up with a phase', () => {
        if (!a.ball) return;
        expect(a.phases.some((p) => Math.abs(p.t - a.ball!.contactT) < 0.02 && /contact/i.test(p.name))).toBe(true);
      });
      it('is used by a move', () => expect(content.moves.some((m) => m.animationId === a.id)).toBe(true));
    });
  }
});

describe('sampler', () => {
  const a: MoveAnimation = {
    id: 'x', duration: 1, loop: false, phases: [{ name: 'A', t: 0 }, { name: 'B', t: 0.5 }],
    keys: [
      { t: 0, joints: { 'r_elbow.bend': 0, 'r_knee.bend': 10 } },
      { t: 0.5, joints: { 'r_elbow.bend': 100 } },
      { t: 1, joints: { 'r_knee.bend': 50 } },
    ],
  };
  it('a joint missing from a key keeps its last value', () => {
    const r = resolveKeys(a, JOINT_NAMES);
    expect(r[1]!.joints['r_knee.bend']).toBe(10);
    expect(r[2]!.joints['r_elbow.bend']).toBe(100);
  });
  it('eases between keys', () => {
    expect(samplePose(a, 0.25, JOINT_NAMES).joints['r_elbow.bend']).toBeCloseTo(50);
    expect(samplePose(a, 0.125, JOINT_NAMES).joints['r_elbow.bend']).toBeLessThan(25); // slow start
    expect(segmentAt(a, 0.75)).toMatchObject({ a: 1, b: 2 });
  });
  it('finds the phase', () => expect(phaseAt(a, 0.6)).toBe(1));
});
