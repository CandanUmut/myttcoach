/* The court: a real-size table (2.74 × 1.525 m, 76 cm high, net 15.25 cm),
   a warm floor, soft light, the ball with spin arrows, the swing trail and
   the contact flash. The table runs along Z; the player stands at −Z. */
import * as THREE from 'three';
import { toon } from './character';

export const TABLE = { length: 2.74, width: 1.525, height: 0.76, net: 0.1525, top: 0.03 };

export function buildCourt(dark: boolean): THREE.Group {
  const g = new THREE.Group();

  // Floor: a soft disc with a blob shadow under the table
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshBasicMaterial({ color: dark ? 0x2a231e : 0xefe4d2 }));
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  g.add(blob(1.9, 1.3, 0, 0, 0.18));

  // Table top
  const topMat = toon(0x1f4f6a);
  const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE.width, TABLE.top, TABLE.length), topMat);
  top.position.y = TABLE.height - TABLE.top / 2;
  g.add(top);
  // White lines: 2 cm edges, 3 mm centre line
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const y = TABLE.height + 0.0015;
  const line = (w: number, l: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), white);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
  };
  line(0.02, TABLE.length, TABLE.width / 2 - 0.01, 0);
  line(0.02, TABLE.length, -TABLE.width / 2 + 0.01, 0);
  line(TABLE.width, 0.02, 0, TABLE.length / 2 - 0.01);
  line(TABLE.width, 0.02, 0, -TABLE.length / 2 + 0.01);
  line(0.003 * 2, TABLE.length, 0, 0);

  // Legs and frame
  const legMat = toon(0x2a2421);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, TABLE.height - TABLE.top, 0.05), legMat);
      leg.position.set(sx * (TABLE.width / 2 - 0.15), (TABLE.height - TABLE.top) / 2, sz * (TABLE.length / 2 - 0.25));
      g.add(leg);
    }

  // Net: posts stick out 15.25 cm each side
  const netW = TABLE.width + 2 * 0.1525;
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(netW, TABLE.net),
    new THREE.MeshBasicMaterial({ color: 0x1f1b18, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  net.position.set(0, TABLE.height + TABLE.net / 2, 0);
  g.add(net);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(netW, 0.012, 0.006), white);
  tape.position.set(0, TABLE.height + TABLE.net, 0);
  g.add(tape);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, TABLE.net + 0.03, 8), legMat);
    post.position.set(sx * netW / 2, TABLE.height + (TABLE.net - 0.03) / 2 + 0.015, 0);
    g.add(post);
  }
  return g;
}

let blobTex: THREE.Texture | null = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(40,30,20,0.55)');
  gr.addColorStop(1, 'rgba(40,30,20,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}

/** A soft contact shadow on the floor. */
export function blob(w: number, l: number, x: number, z: number, opacity = 0.35): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.002, z);
  return m;
}

export function buildLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a6f58, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-2, 4, -1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe2c4, 0.5);
  fill.position.set(3, 2, 3);
  scene.add(fill);
}

/* ---------- Ball, spin arrows, trail, flash ---------- */

export const SPIN_COLOR: Record<string, number> = { topspin: 0xf47a20, backspin: 0x2d6a8a, sidespin: 0x7a5aa6, none: 0x9a8f86 };

export function buildBall(): { group: THREE.Group; ball: THREE.Mesh; arrows: THREE.Group; setSpin: (s: string) => void } {
  const group = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
  group.add(ball);
  const arrows = new THREE.Group();
  const arcMat = new THREE.MeshBasicMaterial({ color: SPIN_COLOR.topspin });
  for (let i = 0; i < 2; i++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.006, 6, 20, Math.PI * 0.7), arcMat);
    arc.rotation.z = i * Math.PI;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.03, 8), arcMat);
    const ang = Math.PI * 0.7 + i * Math.PI;
    tip.position.set(Math.cos(ang) * 0.055, Math.sin(ang) * 0.055, 0);
    tip.rotation.z = ang;
    arrows.add(arc, tip);
  }
  // Arrows sit in the YZ plane (rotation about X = topspin/backspin)
  arrows.rotation.y = Math.PI / 2;
  group.add(arrows);
  const setSpin = (s: string) => {
    arcMat.color.setHex(SPIN_COLOR[s] ?? SPIN_COLOR.none!);
    arrows.visible = s !== 'none';
    if (s === 'sidespin') arrows.rotation.set(Math.PI / 2, 0, 0);
    else arrows.rotation.set(0, Math.PI / 2, s === 'backspin' ? Math.PI : 0);
  };
  return { group, ball, arrows, setSpin };
}

export class Trail {
  readonly line: THREE.Line;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private n = 0;
  private base: THREE.Color;
  private bg = new THREE.Color(0xfbf8f3);
  private c = new THREE.Color();
  constructor(private max = 40, color = 0xf47a20) {
    this.pos = new Float32Array(max * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    this.line = new THREE.Line(this.geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }));
    this.line.frustumCulled = false;
    this.base = new THREE.Color(color);
  }
  clear() {
    this.n = 0;
    this.geo.setDrawRange(0, 0);
  }
  /** Append a point; the oldest drops off. No allocations per frame. */
  push(p: THREE.Vector3) {
    if (this.n < this.max) this.n++;
    else this.pos.copyWithin(0, 3);
    const i = (this.n - 1) * 3;
    this.pos[i] = p.x;
    this.pos[i + 1] = p.y;
    this.pos[i + 2] = p.z;
    const col = this.geo.getAttribute('color') as THREE.BufferAttribute;
    for (let k = 0; k < this.n; k++) {
      this.c.copy(this.bg).lerp(this.base, (k + 1) / this.n);
      col.setXYZ(k, this.c.r, this.c.g, this.c.b);
    }
    (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    col.needsUpdate = true;
    this.geo.setDrawRange(0, this.n);
  }
}

export function buildFlash(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.06, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff1c2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  return m;
}

/** A footprint decal (for footwork moves). */
export function footprint(x: number, z: number, rot: number, right: boolean): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.045, 0.11, 0, Math.PI * 2, false, 0);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: right ? 0xc8262c : 0x1f1b18, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rot;
  m.position.set(x, 0.003, z);
  return m;
}
