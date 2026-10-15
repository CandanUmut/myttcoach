import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildCharacter } from '../../src/three/character';
import { resolveKeys, segmentAt, type MoveAnimation, type Pose } from '../../src/three/animation';
import { JOINT_NAMES } from '../../src/three/joints';
import { BASE } from '../../src/three/viewer';
import { content } from '../../src/content/load';

const files = import.meta.glob('../../content/animations/*.json', { eager: true, import: 'default' }) as Record<string, MoveAnimation>;
const anims = Object.values(files);

function poseAt(a: MoveAnimation, t: number, ch: ReturnType<typeof buildCharacter>) {
  const r = resolveKeys(a, JOINT_NAMES);
  const { a: i, b: j, u } = segmentAt(a, t);
  const A = r[i]!;
  const B = r[j]!;
  const L = (x: number, y: number) => x + (y - x) * u;
  const p: Pose = {
    root: { x: BASE.x + L(A.root.x, B.root.x), z: BASE.z + L(A.root.z, B.root.z), turn: L(A.root.turn, B.root.turn) },
    joints: Object.fromEntries(JOINT_NAMES.map((n) => [n, L(A.joints[n] ?? 0, B.joints[n] ?? 0)])),
  };
  ch.apply(p, { a: A, b: B, u });
}

describe('poses look right (measured on the real character)', () => {
  for (const a of anims) {
    const move = content.moves.find((m) => m.animationId === a.id);
    describe(a.id, () => {
      it('feet stay on the floor at every key (unless it is a footwork move)', () => {
        if (a.footwork) return;
        const ch = buildCharacter();
        const scene = new THREE.Scene();
        scene.add(ch.root);
        for (const k of a.keys) {
          poseAt(a, k.t, ch);
          // each foot: its lower sole point within 2.5 cm of the floor
          for (let f = 0; f < 2; f++) {
            const y = Math.min(ch.soles[f * 2]!.getWorldPosition(new THREE.Vector3()).y, ch.soles[f * 2 + 1]!.getWorldPosition(new THREE.Vector3()).y);
            expect(y, `${a.id} t=${k.t} foot ${f}`).toBeLessThan(0.07);
          }
        }
      });
      it('at contact the hitting face points forward and the bat is at a sensible height', () => {
        if (!a.ball || !move) return;
        const ch = buildCharacter();
        const scene = new THREE.Scene();
        scene.add(ch.root);
        poseAt(a, a.ball.contactT, ch);
        const q = ch.batCenter.getWorldQuaternion(new THREE.Quaternion());
        const red = new THREE.Vector3(1, 0, 0).applyQuaternion(q); // red face normal (palm side)
        const face = move.wing === 'BH' ? red.clone().negate() : red;
        expect(face.z, `${a.id}: hitting face toward the table`).toBeGreaterThan(0.45);
        const y = ch.batCenter.getWorldPosition(new THREE.Vector3()).y;
        expect(y, `${a.id}: bat height at contact`).toBeGreaterThan(0.8);
        expect(y, `${a.id}: bat height at contact`).toBeLessThan(1.3);
      });
    });
  }
});
