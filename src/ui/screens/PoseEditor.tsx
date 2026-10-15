/* Dev only (#/dev/poses): touch-friendly pose editor to author and fix animations.
   Pick an animation, pick a key, move the sliders, play, copy the JSON. */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MoveAnimation } from '../../three/animation';
import { resolveKeys } from '../../three/animation';
import { JOINT_LIMITS, JOINT_NAMES } from '../../three/joints';
import type { CameraPreset, MoveViewer as Engine } from '../../three/viewer';
import { animationIds, loadAnimation } from '../../three/library';
import { Button } from '../../design/components';
import { Segmented } from '../components/Controls';
import { devText as T } from '../../strings/en';

const GROUPS: Record<string, string[]> = {
  Body: ['body', 'torso', 'head'],
  'Right arm': ['r_arm', 'r_elbow', 'r_wrist'],
  'Left arm': ['l_arm', 'l_elbow', 'l_wrist'],
  Legs: ['r_leg', 'r_knee', 'r_ankle', 'l_leg', 'l_knee', 'l_ankle'],
};

export function PoseEditor() {
  const box = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null);
  const [id, setId] = useState(animationIds[0] ?? '');
  const [anim, setAnim] = useState<MoveAnimation | null>(null);
  const [ki, setKi] = useState(0);
  const [group, setGroup] = useState('Right arm');
  const [cam, setCam] = useState<CameraPreset>('side');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    let e: Engine | null = null;
    (async () => {
      const [mod, a] = await Promise.all([import('../../three/viewer'), loadAnimation(id)]);
      if (!alive || !box.current || !a) return;
      e = new mod.MoveViewer(box.current);
      eng.current = e;
      const copy = JSON.parse(JSON.stringify(a)) as MoveAnimation;
      e.setAnimation(copy, false);
      e.pause();
      setAnim(copy);
      setKi(0);
    })();
    return () => {
      alive = false;
      e?.dispose();
    };
  }, [id]);

  const update = (next: MoveAnimation, seekKey = ki) => {
    setAnim(next);
    const e = eng.current;
    if (!e) return;
    e.setAnimation(next, false);
    e.pause();
    e.seek(next.keys[seekKey]?.t ?? 0);
  };

  if (!anim)
    return (
      <div class="screen screen--bare editor">
        <div class="editor__stage" ref={box} />
      </div>
    );
  const key = anim.keys[ki]!;
  const resolved = resolveKeys(anim, JOINT_NAMES)[ki]!;
  const setJoint = (n: string, v: number) => {
    const keys = anim.keys.map((k, i) => (i === ki ? { ...k, joints: { ...k.joints, [n]: v } } : k));
    update({ ...anim, keys });
  };
  const setRoot = (n: 'x' | 'z' | 'turn', v: number) => {
    const keys = anim.keys.map((k, i) => (i === ki ? { ...k, root: { ...(k.root ?? {}), [n]: v } } : k));
    update({ ...anim, keys });
  };
  const json = JSON.stringify(anim, null, 2);

  return (
    <div class="screen screen--bare editor">
      <h1 class="sr-only">{T.title}</h1>
      <div class="editor__stage" ref={box} />
      <div class="stack">
        <div class="row row--wrap">
          {animationIds.map((a) => (
            <button type="button" class={`chip${a === id ? ' is-selected' : ''}`} onClick={() => setId(a)}>
              {a}
            </button>
          ))}
        </div>
        <Segmented
          label={T.camera}
          value={cam}
          onChange={(c) => {
            setCam(c);
            eng.current?.setCamera(c);
          }}
          options={(['side', 'front', 'top', 'eyes'] as CameraPreset[]).map((c) => ({ value: c, label: c }))}
        />
        <div class="row row--wrap">
          {anim.keys.map((k, i) => (
            <button
              type="button"
              class={`chip${i === ki ? ' is-selected' : ''}`}
              onClick={() => {
                setKi(i);
                eng.current?.pause();
                eng.current?.seek(k.t);
              }}
            >
              {`t ${k.t}`}
            </button>
          ))}
        </div>
        <div class="row row--wrap">
          <Button kind="quiet" icon="play" onClick={() => eng.current?.play()}>
            {T.play}
          </Button>
          <Button kind="quiet" icon="pause" onClick={() => eng.current?.pause()}>
            {T.pause}
          </Button>
          <Button
            kind="quiet"
            icon="plus"
            onClick={() => {
              const t = Math.round((eng.current?.time ?? 0) * 100) / 100;
              if (anim.keys.some((k) => k.t === t)) return;
              const keys = [...anim.keys, { t, joints: { ...resolved.joints } }].sort((a, b) => a.t - b.t);
              update({ ...anim, keys }, keys.findIndex((k) => k.t === t));
              setKi(keys.findIndex((k) => k.t === t));
            }}
          >
            {T.addKey}
          </Button>
          <Button
            kind="danger"
            disabled={anim.keys.length < 2}
            onClick={() => {
              const keys = anim.keys.filter((_, i) => i !== ki);
              setKi(0);
              update({ ...anim, keys }, 0);
            }}
          >
            {T.removeKey}
          </Button>
        </div>
        <label class="slider">
          <span>{`${T.keyTime}: ${key.t}`}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={key.t}
            onInput={(e) => {
              const t = Number((e.target as HTMLInputElement).value);
              const keys = anim.keys.map((k, i) => (i === ki ? { ...k, t } : k));
              update({ ...anim, keys });
            }}
          />
        </label>
        <Segmented label={T.group} value={group} onChange={setGroup} options={Object.keys(GROUPS).map((g) => ({ value: g, label: g }))} />
        {group === 'Body'
          ? (['x', 'z', 'turn'] as const).map((n) => (
              <label class="slider">
                <span>{`root.${n}: ${(key.root?.[n] ?? 0).toFixed(2)}`}</span>
                <input
                  type="range"
                  min={n === 'turn' ? -90 : -1.5}
                  max={n === 'turn' ? 90 : 1.5}
                  step={n === 'turn' ? 1 : 0.01}
                  value={key.root?.[n] ?? 0}
                  onInput={(e) => setRoot(n, Number((e.target as HTMLInputElement).value))}
                />
              </label>
            ))
          : null}
        {JOINT_NAMES.filter((n) => GROUPS[group]!.includes(n.split('.')[0]!)).map((n) => {
          const [lo, hi] = JOINT_LIMITS[n]!;
          const v = key.joints[n] ?? resolved.joints[n] ?? 0;
          return (
            <label class={`slider${n in key.joints ? ' is-set' : ''}`}>
              <span>{`${n}: ${Math.round(v)}`}</span>
              <input type="range" min={lo} max={hi} step={1} value={v} onInput={(e) => setJoint(n, Number((e.target as HTMLInputElement).value))} />
            </label>
          );
        })}
        <Button
          icon="download"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(json);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? T.copied : T.copy}
        </Button>
        <textarea class="input editor__json" readOnly value={json} aria-label={T.json} />
      </div>
    </div>
  );
}
