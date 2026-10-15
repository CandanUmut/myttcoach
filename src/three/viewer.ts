/* The 3D move viewer. Lazy-loaded: Three.js is only fetched where 3D is shown.
   One shared renderer; rendering stops when off-screen or the tab is hidden. */
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
function renderer(): THREE.WebGLRenderer {
  if (!shared) {
    shared = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    shared.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    shared.outputColorSpace = THREE.SRGBColorSpace;
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
  private ball = buildBall();
  private trail = new Trail(36);
  private flash = buildFlash();
  private prints = new THREE.Group();
  private contact = new THREE.Vector3();
  private bounce = new THREE.Vector3();
  private t = 0;
  private playing = true;
  private speed = 1;
  private raf = 0;
  private last = 0;
  private visible = true;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private onVis = () => this.loop();
  private lefty = false;
  private preset: CameraPreset = 'side';
  private tmp = new THREE.Vector3();
  onFrame: ((s: ViewerState) => void) | null = null;
  onLoop: (() => void) | null = null;

  constructor(private container: HTMLElement, dark = false) {
    const r = renderer();
    container.appendChild(r.domElement);
    r.domElement.style.touchAction = 'none';
    this.scene.background = new THREE.Color(dark ? 0x1f1a16 : 0xf6efe4);
    buildLights(this.scene);
    this.scene.add(buildCourt(dark));
    this.char = buildCharacter();
    this.mirror.add(this.char.root);
    this.mirror.add(this.ball.group, this.trail.line, this.flash, this.prints);
    this.scene.add(this.mirror);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
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

  setAnimation(anim: MoveAnimation, lefty: boolean) {
    this.anim = anim;
    this.lefty = lefty;
    this.mirror.scale.x = lefty ? -1 : 1;
    this.resolved = resolveKeys(anim, JOINT_NAMES);
    this.trail.clear();
    this.t = 0;
    // Where the bat meets the ball, from the pose at contact
    if (anim.ball) {
      this.poseAt(anim.ball.contactT);
      this.contact.copy(this.mirror.worldToLocal(this.char.batCenter.getWorldPosition(this.tmp)));
      const b = anim.ball.bounce;
      this.bounce.set(b ? b[0] : (anim.ball.from[0] + this.contact.x) / 2, TABLE.height + 0.026, b ? b[2] : -0.75);
      this.ball.setSpin(anim.ball.spin);
    }
    this.ball.group.visible = !!anim.ball;
    // Footprints of the starting stance
    this.prints.clear();
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
    this.render();
    this.loop();
  }

  private poseAt(t: number) {
    if (!this.anim) return;
    const { a, b, u } = segmentAt(this.anim, t);
    const A = this.resolved[a]!;
    const B = this.resolved[b]!;
    const lerp = (x: number, y: number) => x + (y - x) * u;
    const pose: Pose = {
      root: { x: BASE.x + lerp(A.root.x, B.root.x), z: BASE.z + lerp(A.root.z, B.root.z), turn: lerp(A.root.turn, B.root.turn) },
      joints: Object.fromEntries(JOINT_NAMES.map((n) => [n, lerp(A.joints[n] ?? 0, B.joints[n] ?? 0)])),
    };
    this.char.apply(pose, { a: A, b: B, u });
  }

  play() {
    this.playing = true;
    this.loop();
  }
  pause() {
    this.playing = false;
  }
  setSpeed(s: number) {
    this.speed = s;
  }
  seek(t: number) {
    this.t = Math.max(0, Math.min(1, t));
    this.trail.clear();
    this.render();
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
    this.render();
  }

  private resize() {
    const w = this.container.clientWidth || 300;
    const h = this.container.clientHeight || 225;
    const r = renderer();
    if (r.domElement.parentElement === this.container) r.setSize(w, h, false);
    r.domElement.style.width = '100%';
    r.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private loop() {
    cancelAnimationFrame(this.raf);
    if (!this.visible || document.visibilityState === 'hidden') return;
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
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private render() {
    const r = renderer();
    if (r.domElement.parentElement !== this.container) return;
    if (this.anim) {
      this.poseAt(this.t);
      const bc = this.mirror.worldToLocal(this.char.batCenter.getWorldPosition(this.tmp));
      if (this.playing) this.trail.push(bc);
      this.updateBall();
      this.onFrame?.({ t: this.t, phase: phaseAt(this.anim, this.t), playing: this.playing });
    }
    r.render(this.scene, this.camera);
  }

  private updateBall() {
    const b = this.anim?.ball;
    if (!b) return;
    const c = b.contactT;
    const tIn = Math.max(0, c - 0.32);
    const tOut = Math.min(1, c + 0.3);
    const t = this.t;
    const g = this.ball.group;
    const from = new THREE.Vector3(...b.from);
    const to = new THREE.Vector3(...b.to);
    const arc = (p: THREE.Vector3, q: THREE.Vector3, s: number, lift: number) => {
      const v = p.clone().lerp(q, s);
      v.y += Math.sin(Math.PI * s) * lift;
      return v;
    };
    if (t < tIn || t > tOut) {
      g.visible = false;
    } else if (t <= c) {
      g.visible = true;
      const s = (t - tIn) / Math.max(1e-3, c - tIn);
      // incoming: over the net, bounce on the player's half, up to the bat
      g.position.copy(s < 0.55 ? arc(from, this.bounce, s / 0.55, 0.12) : arc(this.bounce, this.contact, (s - 0.55) / 0.45, 0.16));
      this.ball.arrows.visible = false;
    } else {
      g.visible = true;
      const s = (t - c) / Math.max(1e-3, tOut - c);
      const lift = b.spin === 'backspin' ? 0.12 : 0.22;
      g.position.copy(arc(this.contact, to, s, lift));
      this.ball.arrows.visible = b.spin !== 'none';
      this.ball.arrows.rotateOnAxis(new THREE.Vector3(0, 0, 1), 0.25);
    }
    // contact flash
    const d = Math.abs(t - c);
    const m = this.flash.material as THREE.MeshBasicMaterial;
    m.opacity = d < 0.04 ? 1 - d / 0.04 : 0;
    this.flash.position.copy(this.contact);
    this.flash.lookAt(this.camera.position.clone().applyMatrix4(this.mirror.matrixWorld.clone().invert()));
    this.flash.scale.setScalar(1 + (0.04 - Math.min(0.04, d)) * 30);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.controls.dispose();
    const r = renderer();
    if (r.domElement.parentElement === this.container) this.container.removeChild(r.domElement);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
