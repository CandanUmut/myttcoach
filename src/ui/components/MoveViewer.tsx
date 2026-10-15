import { useEffect, useRef, useState } from 'preact/hooks';
import type { MoveAnimation } from '../../three/animation';
import type { CameraPreset, MoveViewer as Engine } from '../../three/viewer';
import { loadAnimation } from '../../three/library';
import { Button } from '../../design/components';
import { Icon } from '../../design/icons';
import { viewerText as T } from '../../strings/en';
import { Segmented } from './Controls';
import { data, profile } from '../state';

function isDark(): boolean {
  const t = data.value.settings.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function MoveViewer({
  animationId,
  follow = false,
  startT,
  startCam,
  paused,
  bare,
}: {
  animationId: string;
  follow?: boolean;
  startT?: number;
  startCam?: CameraPreset;
  paused?: boolean;
  bare?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null);
  const [anim, setAnim] = useState<MoveAnimation | null>(null);
  const [state, setState] = useState({ t: startT ?? 0, phase: 0, playing: !paused });
  const [speed, setSpeed] = useState(follow ? 0.5 : 1);
  const [cam, setCam] = useState<CameraPreset>(startCam ?? 'side');
  const [failed, setFailed] = useState(false);
  const [following, setFollowing] = useState(follow);
  const [reps, setReps] = useState(0);
  const [info, setInfo] = useState(false);
  const lefty = profile.value?.hand === 'L';

  useEffect(() => {
    if (!webglOk()) {
      setFailed(true);
      return;
    }
    let alive = true;
    let engine: Engine | null = null;
    (async () => {
      const [mod, a] = await Promise.all([import('../../three/viewer'), loadAnimation(animationId)]);
      if (!alive || !box.current || !a) {
        if (!a) setFailed(true);
        return;
      }
      engine = new mod.MoveViewer(box.current, isDark());
      eng.current = engine;
      engine.setCamera(cam);
      engine.setAnimation(a, lefty);
      engine.setSpeed(speed);
      if (startT !== undefined) engine.seek(startT);
      if (paused) engine.pause();
      let last = -1;
      engine.onFrame = (s) => {
        // update React state at most ~10 times a second
        const now = performance.now();
        if (now - last > 90 || !s.playing) {
          last = now;
          setState(s);
        }
      };
      setAnim(a);
    })().catch(() => setFailed(true));
    return () => {
      alive = false;
      engine?.dispose();
      eng.current = null;
    };
  }, [animationId, lefty]);

  // Follow-along: one rep per loop, a beep marks each start
  useEffect(() => {
    const e = eng.current;
    if (!e) return;
    e.onLoop = following
      ? () => {
          setReps((r) => r + 1);
          if (data.value.settings.sound) tick();
        }
      : null;
  }, [following, anim]);

  if (failed) return <div class="viewer viewer--fail">{T.noWebgl}</div>;

  const phase = anim?.phases[state.phase];
  const cue = anim?.cues?.filter((c) => c.t <= state.t + 0.02).pop() ?? anim?.cues?.[0];
  const toggle = () => {
    const e = eng.current;
    if (!e) return;
    if (state.playing) e.pause();
    else {
      if (e.time >= 1) e.seek(0);
      e.play();
    }
    setState({ ...state, playing: !state.playing });
  };
  const nextPhase = () => {
    const e = eng.current;
    if (!e || !anim) return;
    const nx = anim.phases[(state.phase + 1) % anim.phases.length]!;
    e.pause();
    e.seek(nx.t);
    setState({ t: nx.t, phase: (state.phase + 1) % anim.phases.length, playing: false });
  };

  return (
    <div class={`viewer${bare ? ' viewer--bare' : ''}`}>
      <div class="viewer__stage" ref={box} role="img" aria-label={phase ? `${phase.name}. ${cue?.text ?? ''}` : T.loading}>
        {!anim ? <div class="viewer__loading">{T.loading}</div> : null}
        {following ? <div class="viewer__reps num">{T.reps(reps)}</div> : null}
      </div>
      {anim && !bare ? (
        <div class="viewer__caption" aria-live="polite">
          <strong>{phase?.name}</strong>
          {cue ? <span>{cue.text}</span> : null}
        </div>
      ) : null}
      {anim && !bare ? (
        <div class="viewer__controls">
          <div class="viewer__scrub">
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(state.t * 1000)}
              aria-label={T.scrub}
              onInput={(e) => {
                const t = Number((e.target as HTMLInputElement).value) / 1000;
                eng.current?.pause();
                eng.current?.seek(t);
                setState({ ...state, t, playing: false });
              }}
            />
            <div class="viewer__marks" aria-hidden="true">
              {anim.phases.map((p, i) => (
                <span style={{ left: `${p.t * 100}%` }} class={i === state.phase ? 'is-on' : ''} />
              ))}
            </div>
          </div>
          <div class="viewer__row">
            <Button icon={state.playing ? 'pause' : 'play'} label={state.playing ? T.pause : T.play} onClick={toggle} />
            <Button kind="quiet" icon="next" label={T.nextPhase} onClick={nextPhase} />
            <Segmented
              label={T.speed}
              value={speed}
              onChange={(v) => {
                setSpeed(v);
                eng.current?.setSpeed(v);
              }}
              options={[{ value: 0.25, label: '¼×' }, { value: 0.5, label: '½×' }, { value: 1, label: '1×' }]}
            />
          </div>
          <Segmented
            label={T.camera}
            value={cam}
            onChange={(v) => {
              setCam(v);
              eng.current?.setCamera(v);
            }}
            options={(['front', 'side', 'top', 'eyes'] as CameraPreset[]).map((c) => ({ value: c, label: T.cameras[c] }))}
          />
          <div class="viewer__row viewer__row--small">
            {anim.ball ? (
              <span class={`spin spin--${anim.ball.spin}`}>
                <Icon name="spin" size={18} />
                {T.spinLegend[anim.ball.spin]}
              </span>
            ) : null}
            {lefty ? <span class="muted small">{T.lefty}</span> : null}
            <Button kind="ghost" icon="info" label={T.info} onClick={() => setInfo(!info)} />
          </div>
          {info ? <p class="muted small viewer__info">{T.infoBody}</p> : null}
          {following ? (
            <div class="viewer__follow">
              <p class="muted small">{T.followHint}</p>
              <Button kind="quiet" onClick={() => setFollowing(false)}>
                {T.stopFollow}
              </Button>
            </div>
          ) : (
            <Button
              kind="quiet"
              icon="repeat"
              onClick={() => {
                setFollowing(true);
                setReps(0);
                setSpeed(0.5);
                eng.current?.setSpeed(0.5);
                eng.current?.play();
              }}
            >
              {T.follow}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

let actx: AudioContext | null = null;
function tick() {
  try {
    actx ??= new AudioContext();
    if (actx.state !== 'running') void actx.resume();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.12);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + 0.14);
  } catch {
    /* ignore */
  }
}
