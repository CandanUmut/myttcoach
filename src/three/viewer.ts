/* The 3D move viewer. Lazy-loaded: Three.js is only fetched where 3D is shown.
   One shared renderer with an owner stack (the newest viewer draws; when it
   closes, the canvas goes back to the previous one). It renders every frame
   only while playing or while the camera is settling; otherwise on demand.
   Rendering stops when the view is off-screen or the tab is hidden. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildCharacter, type Character } from './character';
import { buildBall, buildCourt, buildFlash, buildLights, footprint, Trail, TABLE } from './scene';
import { phaseAt, resolveKeys, segmentAt, slowMoFactor, type MoveAnimation, type Pose } from './animation';
import { JOINT_NAMES } from './joints';

export type CameraPreset = 'front' | 'side' | 'top' | 'eyes';

/** Where the player stands by default: behind their end line, a little toward the backhand. */
export const BASE = { x: 0.22, z: -(TABLE.length / 2) - 0.62 };

let shared: THREE.WebGLRenderer | null = null;
const owners: MoveViewer[] = [];

function renderer(): THREE.WebGLRenderer {
  if (!shared) {
    shared = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    const mobile = window.matchMedia?.('(pointer: coarse)').matches;
    shared.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    shared.outputColorSpace = THREE.SRGBColorSpace;
    const c = shared.domElement;
    c.style.display = 'block';
    c.style.touchAction = 'pan-y';
    c.addEventListener('webglcontextlost', (e) => e.preventDefault());
    c.addEventListener('webglcontextrestored', () => owners[owners.length - 1]?.requestRender());
  }
  return shared;
}

export interface ViewerState {
  t: number;
  phase: number;
  playing: boolean;
}

export class MoveViewer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
  private controls: OrbitControls;
  private mirror = new THREE.Group();
  private char: Character;
  private anim: MoveAnimation | null = null;
  private resolved: Pose[] = [];
  private pose: Pose = { root: { x: 0, z: 0, turn: 0 }, joints: Object.fromEntries(JOINT_NAMES.map((n) => [n, 0])) };
  private ball = buildBall();
  private trail = new Trail(36);
  private flash = buildFlash();
  private prints = new THREE.Group();
  private contact = new THREE.Vector3();
  private bounce = new THREE.Vector3();
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private zAxis = new THREE.Vector3(0, 0, 1);
  private inv = new THREE.Matrix4();
  private t = 0;
  private playing = true;
  private speed = 1;
  private raf = 0;
  private pending = 0;
  private last = 0;
  private settling = false;
  private visible = true;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private onVis = () => this.loop();
  private lefty = false;
  private preset: CameraPreset = 'side';
  private disposed = false;
  onFrame: ((s: ViewerState) => void) | null = null;
  onLoop: (() => void) | null = null;

  constructor(private container: HTMLElement, dark = false) {
    this.scene.background = new THREE.Color(dark ? 0x1f1a16 : 0xf6efe4);
    buildLights(this.scene);
    this.scene.add(buildCourt(dark));
    this.char = buildCharacter();
    this.mirror.add(this.char.root);
    this.mirror.add(this.ball.group, this.trail.line, this.flash, this.prints);
    this.scene.add(this.mirror);
    // Controls listen on the container, so they survive the shared canvas moving between viewers
    container.style.touchAction = 'pan-y';
    this.controls = new OrbitControls(this.camera, container);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.addEventListener('change', () => this.requestRender());
    this.controls.addEventListener('start', () => {
      this.settling = true;
      this.loop();
    });
    this.controls.addEventListener('end', () => {
      // keep going briefly while damping settles
      setTimeout(() => (this.settling = false), 600);
    });
    this.acquire();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver((e) => {
      this.visible = e.some((x) => x.isIntersecting);
      this.loop();
    });
    this.io.observe(container);
    document.addEventListener('visibilitychange', this.onVis);
    this.resize();
  }

  private acquire() {
    const r = renderer();
    const i = owners.indexOf(this);
    if (i >= 0) owners.splice(i, 1);
    owners.push(this);
    this.container.appendChild(r.domElement);
  }

  private get owns() {
    return owners[owners.length - 1] === this && renderer().domElement.parentElement === this.container;
  }

  setAnimation(anim: MoveAnimation, lefty: boolean) {
    this.anim = anim;
    this.lefty = lefty;
    this.mirror.scale.x = lefty ? -1 : 1;
    this.t = 0;
    this.updateKeys(anim);
    // Footprints of the starting stance
    for (const c of [...this.prints.children]) {
      const m = c as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      this.prints.remove(c);
    }
    this.poseAt(0);
    const soles = this.char.soles.map((s) => this.mirror.worldToLocal(s.getWorldPosition(new THREE.Vector3())));
    for (let i = 0; i < 2; i++) {
      const heel = soles[i * 2]!;
      const toe = soles[i * 2 + 1]!;
      const mid = heel.clone().add(toe).multiplyScalar(0.5);
      const rot = Math.atan2(toe.x - heel.x, toe.z - heel.z);
      this.prints.add(footprint(mid.x, mid.z, -rot, i === 0));
    }
    this.setCamera(this.preset);
    this.loop();
  }

  /** Re-read keyframes without resetting camera, time or footprints (used by the pose editor). */
  updateKeys(anim: MoveAnimation) {
    this.anim = anim;
    this.resolved = resolveKeys(anim, JOINT_NAMES);
    this.trail.clear();
    if (anim.ball) {
      this.poseAt(anim.ball.contactT);
      this.contact.copy(this.mirror.worldToLocal(this.char.batCenter.getWorldPosition(this.v1)));
      const b = anim.ball.bounce;
      this.bounce.set(b ? b[0] : (anim.ball.from[0] + this.contact.x) / 2, TABLE.height + 0.026, b ? b[2] : -0.75);
      this.from.set(...anim.ball.from);
      this.to.set(...anim.ball.to);
      this.ball.setSpin(anim.ball.spin);
    }
    this.ball.group.visible = !!anim.ball;
    this.requestRender();
  }

  private poseAt(t: number) {
    if (!this.anim) return;
    const { a, b, u } = segmentAt(this.anim, t);
    const A = this.resolved[a]!;
    const B = this.resolved[b]!;
    const p = this.pose;
    p.root.x = BASE.x + A.root.x + (B.root.x - A.root.x) * u;
    p.root.z = BASE.z + A.root.z + (B.root.z - A.root.z) * u;
    p.root.turn = A.root.turn + (B.root.turn - A.root.turn) * u;
    for (const n of JOINT_NAMES) {
      const x = A.joints[n] ?? 0;
      p.joints[n] = x + ((B.joints[n] ?? 0) - x) * u;
    }
    this.char.apply(p, { a: A, b: B, u });
  }

  play() {
    this.playing = true;
    this.loop();
  }
  pause() {
    this.playing = false;
    this.requestRender();
  }
  setSpeed(s: number) {
    this.speed = s;
  }
  seek(t: number) {
    this.t = Math.max(0, Math.min(1, t));
    this.trail.clear();
    this.requestRender();
  }
  get time() {
    return this.t;
  }

  setCamera(p: CameraPreset) {
    this.preset = p;
    const side = this.lefty ? -1 : 1;
    const target = new THREE.Vector3(BASE.x * side, 0.95, BASE.z + 0.15);
    let pos: THREE.Vector3;
    switch (p) {
      case 'front':
        // three-quarter front, from beside the table, so the whole body shows
        pos = new THREE.Vector3((BASE.x + 1.7) * side, 1.55, BASE.z + 2.6);
        target.y = 0.85;
        break;
      case 'top':
        pos = new THREE.Vector3(BASE.x * side, 3.6, BASE.z + 0.6);
        target.y = 0.4;
        break;
      case 'eyes':
        pos = new THREE.Vector3(BASE.x * side, 1.62, BASE.z - 0.55);
        target.set(0, 0.8, 0.6);
        break;
      default:
        pos = new THREE.Vector3(-2.35 * side, 1.3, BASE.z + 0.5);
    }
    this.camera.position.copy(pos);
    this.controls.target.copy(target);
    this.controls.update();
    this.requestRender();
  }

  resize() {
    const w = this.container.clientWidth || 300;
    const h = this.container.clientHeight || 225;
    if (this.owns) {
      const r = renderer();
      r.setSize(w, h, false);
      r.domElement.style.width = '100%';
      r.domElement.style.height = '100%';
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  /** Draw one frame soon (when not already animating). */
  requestRender() {
    if (this.raf || this.pending || this.disposed) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      this.controls.update();
      this.render();
    });
  }

  private loop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.disposed || !this.visible || document.visibilityState === 'hidden') return;
    if (!this.playing && !this.settling) {
      this.requestRender();
      return;
    }
    this.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.anim && this.playing) {
        const f = this.speed >= 1 ? slowMoFactor(this.anim, this.t) : 1;
        this.t += (dt * this.speed * f) / this.anim.duration;
        if (this.t >= 1) {
          if (this.anim.loop) {
            this.t -= 1;
            this.trail.clear();
            this.onLoop?.();
          } else {
            this.t = 1;
            this.playing = false;
          }
        }
      }
      this.controls.update();
      this.render();
      if (this.playing || this.settling) this.raf = requestAnimationFrame(step);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(step);
  }

  private render() {
    if (!this.owns) return;
    if (this.anim) {
      this.poseAt(this.t);
      const bc = this.mirror.worldToLocal(this.char.batCenter.getWorldPosition(this.v1));
      if (this.playing) this.trail.push(bc);
      this.updateBall();
      this.onFrame?.({ t: this.t, phase: phaseAt(this.anim, this.t), playing: this.playing });
    }
    renderer().render(this.scene, this.camera);
  }

  private arc(p: THREE.Vector3, q: THREE.Vector3, s: number, lift: number, out: THREE.Vector3) {
    out.copy(p).lerp(q, s);
    out.y += Math.sin(Math.PI * s) * lift;
    return out;
  }

  private updateBall() {
    const b = this.anim?.ball;
    if (!b) return;
    const c = b.contactT;
    const tIn = Math.max(0, c - 0.32);
    const tOut = Math.min(1, c + 0.3);
    const t = this.t;
    const g = this.ball.group;
    if (t < tIn || t > tOut) {
      g.visible = false;
    } else if (t <= c) {
      g.visible = true;
      const s = (t - tIn) / Math.max(1e-3, c - tIn);
      // incoming: over the net, bounce on the player's half, up to the bat
      if (s < 0.55) this.arc(this.from, this.bounce, s / 0.55, 0.12, g.position);
      else this.arc(this.bounce, this.contact, (s - 0.55) / 0.45, 0.16, g.position);
      this.ball.arrows.visible = false;
    } else {
      g.visible = true;
      const s = (t - c) / Math.max(1e-3, tOut - c);
      this.arc(this.contact, this.to, s, b.spin === 'backspin' ? 0.12 : 0.22, g.position);
      this.ball.arrows.visible = b.spin !== 'none';
      if (this.playing) this.ball.arrows.rotateOnAxis(this.zAxis, 0.25);
    }
    // contact flash
    const d = Math.abs(t - c);
    const m = this.flash.material as THREE.MeshBasicMaterial;
    m.opacity = d < 0.04 ? 1 - d / 0.04 : 0;
    this.flash.position.copy(this.contact);
    this.inv.copy(this.mirror.matrixWorld).invert();
    this.flash.lookAt(this.v2.copy(this.camera.position).applyMatrix4(this.inv));
    this.flash.scale.setScalar(1 + (0.04 - Math.min(0.04, d)) * 30);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.pending);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.controls.dispose();
    const r = renderer();
    const wasTop = owners[owners.length - 1] === this;
    const i = owners.indexOf(this);
    if (i >= 0) owners.splice(i, 1);
    if (r.domElement.parentElement === this.container) this.container.removeChild(r.domElement);
    // hand the canvas back to the viewer underneath (e.g. a page under a closed dialog)
    if (wasTop) {
      const prev = owners[owners.length - 1];
      if (prev) {
        prev.container.appendChild(r.domElement);
        prev.resize();
      }
    }
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      for (const mat of mats) if (!mat.userData.cached) mat.dispose();
    });
  }
}
