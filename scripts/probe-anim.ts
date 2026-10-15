// Dev tool: measure an animation's poses (bat height, face direction, feet).
// Usage: npx vite-node scripts/probe-anim.ts content/animations/<id>.json [t ...]
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { buildCharacter } from '../src/three/character';
import { resolveKeys, segmentAt, type Pose } from '../src/three/animation';
import { JOINT_NAMES } from '../src/three/joints';
const file = process.argv[2]!;
const ts = process.argv.slice(3).map(Number);
const anim = JSON.parse(readFileSync(file, 'utf8'));
const BASE = { x: 0.22, z: -(2.74 / 2) - 0.62 };
const scene = new THREE.Scene();
const ch = buildCharacter();
scene.add(ch.root);
const R = resolveKeys(anim, JOINT_NAMES);
const f = (v: THREE.Vector3) => `fwd ${(v.z).toFixed(2)} right ${(-v.x).toFixed(2)} up ${v.y.toFixed(2)}`;
for (const t of ts.length ? ts : anim.keys.map((k: any) => k.t)) {
  const { a, b, u } = segmentAt(anim, t);
  const A = R[a]!, B = R[b]!;
  const lerp = (x: number, y: number) => x + (y - x) * u;
  const pose: Pose = { root: { x: BASE.x + lerp(A.root.x, B.root.x), z: BASE.z + lerp(A.root.z, B.root.z), turn: lerp(A.root.turn, B.root.turn) }, joints: Object.fromEntries(JOINT_NAMES.map((n) => [n, lerp(A.joints[n] ?? 0, B.joints[n] ?? 0)])) };
  ch.apply(pose, { a: A, b: B, u });
  const rootP = ch.root.position.clone();
  const rel = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3()).sub(rootP);
  const bc = rel(ch.batCenter);
  const q = ch.batCenter.getWorldQuaternion(new THREE.Quaternion());
  const n = new THREE.Vector3(1, 0, 0).applyQuaternion(q); // red face normal
  const tip = new THREE.Vector3(0, -1, 0).applyQuaternion(q); // handle->tip
  const hips = rel(ch.joints.get('body')!);
  const sh = rel(ch.joints.get('r_arm')!);
  const el = rel(ch.joints.get('r_elbow')!);
  const wr = rel(ch.joints.get('r_wrist')!);
  const head = rel(ch.joints.get('head')!);
  console.log(`t=${t}  hipsY ${hips.y.toFixed(2)} headY ${(head.y+0.15).toFixed(2)}`);
  console.log(`  shoulder ${f(sh)} | elbow ${f(el)} | wrist ${f(wr)}`);
  console.log(`  bat ${f(bc)} worldY ${bc.y.toFixed(2)}  (table 0.76; ball top ~1.0)`);
  console.log(`  RED normal ${f(n)} | tip dir ${f(tip)}`);
  const ls = ch.soles.map((s) => rel(s));
  console.log(`  soles: R heel ${f(ls[0]!)} R toe ${f(ls[1]!)} | L heel ${f(ls[2]!)} L toe ${f(ls[3]!)}`);
}
