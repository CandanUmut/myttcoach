/* Our own stylized player, built from rounded shapes. Cute, clean, readable.
   Hierarchy: root → hips(body) → torso → head / arms; hips → legs.
   Rest pose: standing, arms down, palms facing the body, facing +Z. */
import * as THREE from 'three';
import { THREE_AXIS, clampJoint } from './joints';
import type { Pose } from './animation';

const COLORS = {
  skin: 0xf0c4a0,
  shirt: 0x1f4f6a, // table blue
  shirtTrim: 0xf47a20,
  shorts: 0x2a2421,
  sock: 0xfbf8f3,
  shoe: 0xfbf8f3,
  shoeAccent: 0xf47a20,
  hair: 0x3a2a20,
  band: 0xf47a20,
  eye: 0x1f1b18,
  cheek: 0xf29b7e,
  red: 0xc8262c,
  black: 0x1f1b18,
  wood: 0xd9b98c,
  outline: 0x2a211c,
};

let gradient: THREE.DataTexture | null = null;
function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const matCache = new Map<number, THREE.Material>();
export function toon(color: number): THREE.Material {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
    m.userData.cached = true; // shared across viewers: never disposed per viewer
    matCache.set(color, m);
  }
  return m;
}
const outlineMat = new THREE.MeshBasicMaterial({ color: COLORS.outline, side: THREE.BackSide });
outlineMat.userData.cached = true;
const THREE_AXIS_SET = new Set(THREE_AXIS);

/** Mesh plus an inverted-hull outline for a soft cartoon edge. */
function part(geo: THREE.BufferGeometry, color: number, outline = 0.012): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, toon(color));
  g.add(m);
  if (outline > 0) {
    const o = new THREE.Mesh(geo, outlineMat);
    geo.computeBoundingSphere();
    const r = geo.boundingSphere?.radius ?? 0.1;
    const s = 1 + outline / Math.max(0.02, r);
    o.scale.setScalar(s);
    g.add(o);
  }
  return g;
}

/** A capsule hanging down from the joint (limb segment). */
function limb(radius: number, length: number, color: number, radius2 = radius): THREE.Group {
  const geo = new THREE.CapsuleGeometry((radius + radius2) / 2, Math.max(0.001, length - radius - radius2), 6, 12);
  const g = part(geo, color);
  g.position.y = -length / 2;
  // taper: scale top/bottom slightly by squashing x/z
  if (radius !== radius2) g.scale.set(1, 1, 1);
  return g;
}

export interface Character {
  root: THREE.Group;
  joints: Map<string, THREE.Group>;
  bat: THREE.Group;
  batCenter: THREE.Object3D; // blade centre, for the swing trail and contact
  soles: THREE.Object3D[]; // heel and toe points of both feet
  apply: (pose: Pose, blend?: { a: Pose; b: Pose; u: number }) => void;
}

const D = THREE.MathUtils.degToRad;

export function buildCharacter(): Character {
  const joints = new Map<string, THREE.Group>();
  const j = (name: string) => {
    const g = new THREE.Group();
    g.name = name;
    joints.set(name, g);
    return g;
  };

  const root = new THREE.Group();
  root.name = 'player';
  const hips = j('body');
  hips.position.y = 0.92;
  root.add(hips);

  // Pelvis / shorts
  const pelvis = part(new THREE.CapsuleGeometry(0.13, 0.08, 6, 14), COLORS.shorts);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(1, 1, 0.75);
  hips.add(pelvis);

  // Torso
  const torso = j('torso');
  torso.position.y = 0.06;
  hips.add(torso);
  const chest = part(new THREE.CapsuleGeometry(0.15, 0.22, 6, 16), COLORS.shirt);
  chest.position.y = 0.22;
  chest.scale.set(1.05, 1, 0.72);
  torso.add(chest);
  const collar = part(new THREE.TorusGeometry(0.06, 0.014, 6, 16), COLORS.shirtTrim, 0);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.44;
  torso.add(collar);

  // Head
  const head = j('head');
  head.position.y = 0.47;
  torso.add(head);
  const neck = part(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), COLORS.skin, 0);
  neck.position.y = 0.02;
  head.add(neck);
  const skull = part(new THREE.SphereGeometry(0.13, 20, 16), COLORS.skin);
  skull.position.y = 0.15;
  head.add(skull);
  const hair = part(new THREE.SphereGeometry(0.135, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), COLORS.hair, 0.006);
  hair.position.y = 0.16;
  hair.rotation.x = -0.25;
  head.add(hair);
  const band = part(new THREE.TorusGeometry(0.128, 0.018, 8, 24), COLORS.band, 0);
  band.position.y = 0.19;
  band.rotation.x = Math.PI / 2 + 0.15;
  head.add(band);
  for (const sx of [-1, 1]) {
    const eye = part(new THREE.SphereGeometry(0.016, 10, 8), COLORS.eye, 0);
    eye.position.set(sx * 0.045, 0.15, 0.118);
    eye.scale.set(1, 1.35, 0.6);
    head.add(eye);
    const cheek = part(new THREE.SphereGeometry(0.02, 10, 8), COLORS.cheek, 0);
    cheek.position.set(sx * 0.075, 0.115, 0.105);
    cheek.scale.set(1, 0.6, 0.4);
    head.add(cheek);
  }
  const smile = part(new THREE.TorusGeometry(0.025, 0.005, 6, 12, Math.PI), COLORS.eye, 0);
  smile.position.set(0, 0.105, 0.125);
  smile.rotation.z = Math.PI;
  head.add(smile);

  // Arms: right = -X when facing +Z
  const arms: Record<'r' | 'l', { wrist: THREE.Group }> = {} as never;
  for (const side of ['r', 'l'] as const) {
    const sx = side === 'r' ? -1 : 1;
    const shoulder = j(`${side}_arm`);
    shoulder.position.set(sx * 0.2, 0.38, 0);
    torso.add(shoulder);
    const sleeve = part(new THREE.SphereGeometry(0.065, 14, 10), COLORS.shirt);
    sleeve.scale.set(1, 1.1, 1);
    shoulder.add(sleeve);
    shoulder.add(limb(0.048, 0.27, COLORS.skin));
    const elbow = j(`${side}_elbow`);
    elbow.position.y = -0.27;
    shoulder.add(elbow);
    elbow.add(limb(0.042, 0.24, COLORS.skin));
    const wrist = j(`${side}_wrist`);
    wrist.position.y = -0.24;
    elbow.add(wrist);
    const hand = part(new THREE.SphereGeometry(0.048, 12, 10), COLORS.skin);
    hand.position.y = -0.04;
    hand.scale.set(0.75, 1.1, 1);
    wrist.add(hand);
    arms[side] = { wrist };
  }

  // Bat in the right hand: blade plane facing ±X (red on the palm side)
  const bat = new THREE.Group();
  bat.name = 'bat';
  bat.position.set(0, -0.06, 0.01);
  arms.r.wrist.add(bat);
  const handle = part(new THREE.BoxGeometry(0.026, 0.1, 0.032), COLORS.wood, 0.006);
  handle.position.y = -0.03;
  bat.add(handle);
  const bladeCenter = new THREE.Object3D();
  bladeCenter.position.y = -0.155;
  bat.add(bladeCenter);
  const blade = new THREE.CylinderGeometry(0.078, 0.078, 0.008, 28);
  const wood = part(blade, COLORS.wood, 0.005);
  wood.rotation.z = Math.PI / 2;
  wood.scale.set(1, 1, 1.06);
  bladeCenter.add(wood);
  const face = new THREE.CylinderGeometry(0.076, 0.076, 0.003, 28);
  const red = new THREE.Mesh(face, toon(COLORS.red));
  red.rotation.z = Math.PI / 2;
  red.position.x = 0.0055;
  red.scale.set(1, 1, 1.06);
  bladeCenter.add(red);
  const black = new THREE.Mesh(face, toon(COLORS.black));
  black.rotation.z = Math.PI / 2;
  black.position.x = -0.0055;
  black.scale.set(1, 1, 1.06);
  bladeCenter.add(black);

  // Legs
  const soles: THREE.Object3D[] = [];
  for (const side of ['r', 'l'] as const) {
    const sx = side === 'r' ? -1 : 1;
    const hip = j(`${side}_leg`);
    hip.position.set(sx * 0.09, -0.04, 0);
    hips.add(hip);
    const shorts = part(new THREE.CapsuleGeometry(0.075, 0.12, 6, 12), COLORS.shorts);
    shorts.position.y = -0.1;
    hip.add(shorts);
    hip.add(limb(0.064, 0.42, COLORS.skin));
    const knee = j(`${side}_knee`);
    knee.position.y = -0.42;
    hip.add(knee);
    knee.add(limb(0.055, 0.41, COLORS.skin));
    const sock = part(new THREE.CylinderGeometry(0.05, 0.048, 0.1, 12), COLORS.sock, 0.006);
    sock.position.y = -0.36;
    knee.add(sock);
    const ankle = j(`${side}_ankle`);
    ankle.position.y = -0.41;
    knee.add(ankle);
    const shoe = part(new THREE.CapsuleGeometry(0.052, 0.13, 6, 12), COLORS.shoe);
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -0.045, 0.05);
    shoe.scale.set(1, 1, 0.8);
    ankle.add(shoe);
    const stripe = part(new THREE.BoxGeometry(0.106, 0.02, 0.07), COLORS.shoeAccent, 0);
    stripe.position.set(0, -0.04, 0.05);
    ankle.add(stripe);
    for (const z of [-0.06, 0.16]) {
      const p = new THREE.Object3D();
      p.position.set(0, -0.09, z);
      ankle.add(p);
      soles.push(p);
    }
  }

  const tmpQ = new THREE.Quaternion();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();

  /** Euler for a joint from its named angles (degrees). */
  function eulerFor(name: string, a: Record<string, number>, out: THREE.Euler) {
    const g = (k: string) => clampJoint(`${name}.${k}`, a[`${name}.${k}`] ?? 0);
    const left = name.startsWith('l_');
    const s = left ? -1 : 1; // mirror sign for the left side
    switch (name) {
      case 'body':
      case 'torso':
        return out.set(D(g('bend')), D(-g('turn')), D(g('tilt')), 'YXZ');
      case 'head':
        return out.set(D(g('nod')), D(-g('turn')), D(g('tilt')), 'YXZ');
      case 'r_arm':
      case 'l_arm':
        return out.set(D(-g('raise')), D(-s * g('turn')), D(-s * g('straddle')), 'ZXY');
      case 'r_elbow':
      case 'l_elbow':
        return out.set(D(-g('bend')), 0, 0, 'XYZ');
      case 'r_wrist':
      case 'l_wrist':
        return out.set(D(-g('tilt')), D(-s * g('turn')), D(s * g('bend')), 'YZX');
      case 'r_leg':
      case 'l_leg':
        return out.set(D(-g('raise')), D(-s * g('turn')), D(-s * g('straddle')), 'ZXY');
      case 'r_knee':
      case 'l_knee':
        return out.set(D(g('bend')), 0, 0, 'XYZ');
      case 'r_ankle':
      case 'l_ankle':
        return out.set(D(-g('bend')), D(-s * g('turn')), D(s * g('tilt')), 'YXZ');
    }
    return out.set(0, 0, 0);
  }

  function apply(pose: Pose, blend?: { a: Pose; b: Pose; u: number }) {
    for (const [name, grp] of joints) {
      if (blend && THREE_AXIS_SET.has(name)) {
        qa.setFromEuler(eulerFor(name, blend.a.joints, e));
        qb.setFromEuler(eulerFor(name, blend.b.joints, e));
        grp.quaternion.copy(tmpQ.copy(qa).slerp(qb, blend.u));
      } else {
        grp.quaternion.setFromEuler(eulerFor(name, pose.joints, e));
      }
    }
    root.position.set(pose.root.x, 0, pose.root.z);
    root.rotation.set(0, D(-pose.root.turn), 0);
    // Ground lock: lowest sole point touches the floor
    hips.position.y = 0.92;
    root.updateMatrixWorld(true);
    let minY = Infinity;
    for (const p of soles) minY = Math.min(minY, p.getWorldPosition(v).y);
    hips.position.y -= minY - (root.parent ? root.parent.getWorldPosition(v).y : 0);
    root.updateMatrixWorld(true);
  }

  return { root, joints, bat, batCenter: bladeCenter, soles, apply };
}
