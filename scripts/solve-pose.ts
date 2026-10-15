// Dev tool: find right-arm angles that put the bat where you want it at one key.
// Usage: npx vite-node scripts/solve-pose.ts <anim.json> <t> '<targets json>'
// targets: {"bat":[fwd,right,up], "red":[fwd,right,up] | "black":[...], "tip":[...], "free":["r_arm.raise",...], "w":{"bat":4,"face":1,"tip":0.5}}
// Positions are metres from the player's root (up = height from the floor). Prints the solved joints as JSON.
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { buildCharacter } from '../src/three/character';
import { resolveKeys } from '../src/three/animation';
import { JOINT_NAMES, clampJoint } from '../src/three/joints';
const [file, tArg, tgArg] = process.argv.slice(2);
const anim = JSON.parse(readFileSync(file!, 'utf8'));
const tg = JSON.parse(tgArg!);
const t = Number(tArg);
const R = resolveKeys(anim, JOINT_NAMES);
const idx = anim.keys.map((k: any) => k.t).sort((a: number, b: number) => a - b).findIndex((x: number) => Math.abs(x - t) < 1e-6);
if (idx < 0) throw new Error('no key at t');
const base = R[idx]!;
const ch = buildCharacter();
new THREE.Scene().add(ch.root);
const free: string[] = tg.free ?? ['r_arm.raise', 'r_arm.straddle', 'r_arm.turn', 'r_elbow.bend', 'r_wrist.bend', 'r_wrist.turn', 'r_wrist.tilt'];
const w = { bat: 4, face: 1, tip: 0.5, ...(tg.w ?? {}) };
const toV = (a: number[]) => new THREE.Vector3(-a[1]!, a[2]!, a[0]!);
const face = tg.red ? toV(tg.red).normalize() : tg.black ? toV(tg.black).normalize().negate() : null;
const tip = tg.tip ? toV(tg.tip).normalize() : null;
const bat = tg.bat ? toV(tg.bat) : null;
const elbow = tg.elbow ? toV(tg.elbow) : null;
function measure(j: Record<string, number>) {
  const pose = { root: { x: 0, z: 0, turn: base.root.turn }, joints: { ...base.joints, ...j } };
  ch.apply(pose as any, { a: pose as any, b: pose as any, u: 0 });
  const rootP = ch.root.position.clone();
  const p = ch.batCenter.getWorldPosition(new THREE.Vector3()).sub(rootP);
  p.y += rootP.y;
  const q = ch.batCenter.getWorldQuaternion(new THREE.Quaternion());
  const e = ch.joints.get('r_elbow')!.getWorldPosition(new THREE.Vector3()).sub(rootP);
  e.y += rootP.y;
  return { p, e, n: new THREE.Vector3(1, 0, 0).applyQuaternion(q), tp: new THREE.Vector3(0, -1, 0).applyQuaternion(q) };
}
function cost(j: Record<string, number>) {
  const m = measure(j);
  let c = 0;
  if (bat) c += w.bat * m.p.distanceToSquared(bat) * 25;
  if (elbow) c += (w.elbow ?? 1) * m.e.distanceToSquared(elbow) * 25;
  if (face) c += w.face * (1 - m.n.dot(face));
  if (tip) c += w.tip * (1 - m.tp.dot(tip));
  return c;
}
// Small pull toward the starting angles so the result stays natural.
const start: Record<string, number> = Object.fromEntries(free.map((n) => [n, base.joints[n] ?? 0]));
const reg = (j: Record<string, number>) => (tg.reg ?? 0.02) * free.reduce((s, n) => s + ((j[n]! - start[n]!) / 90) ** 2, 0);
const total = (j: Record<string, number>) => cost(j) + reg(j);
function descend(j: Record<string, number>) {
  let b = total(j);
  for (const step of [20, 10, 5, 2, 1]) {
    for (let it = 0, improved = true; improved && it < 200; it++) {
      improved = false;
      for (const n of free) for (const d of [step, -step]) {
        const tryJ = { ...j, [n]: clampJoint(n, j[n]! + d) };
        const c = total(tryJ);
        if (c < b - 1e-6) { b = c; j = tryJ; improved = true; }
      }
    }
  }
  return { j, b };
}
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let { j: cur, b: best } = descend(start);
for (let r = 0; r < (tg.starts ?? 60); r++) {
  const s0 = Object.fromEntries(free.map((n) => [n, clampJoint(n, start[n]! + (rnd() - 0.5) * 160)]));
  const out = descend(s0);
  if (out.b < best) { best = out.b; cur = out.j; }
}
const m = measure(cur);
const fmt = (v: THREE.Vector3) => `fwd ${v.z.toFixed(2)} right ${(-v.x).toFixed(2)} up ${v.y.toFixed(2)}`;
console.log(`cost ${best.toFixed(4)} | bat ${fmt(m.p)} | elbow ${fmt(m.e)} | red ${fmt(m.n)} | tip ${fmt(m.tp)}`);
console.log(JSON.stringify(Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, Math.round(v)]))));
