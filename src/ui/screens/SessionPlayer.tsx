import { useEffect, useRef, useState } from 'preact/hooks';
import { byId } from '../../content/load';
import type { Change, Felt, ItemLog, SessionLog } from '../../engine/types';
import { ArcProgress, Button } from '../../design/components';
import { Icon } from '../../design/icons';
import { celebrate } from '../../design/motion';
import { common, learnText, phaseNames, playerText as T, stageNames } from '../../strings/en';
import { STAGES } from '../../content/types';
import { pickVariant } from '../components/DrillCard';
import { Dialog } from '../components/Controls';
import { data, logBySession, logSession, program, setSettings, today } from '../state';
import { flatItems } from '../sessionInfo';
import { navigate } from '../router';

/* ---------- small device helpers (sound, wake lock, speech) ---------- */

let audio: AudioContext | null = null;
/** Create/resume the audio context. Call inside a tap (iOS only allows sound after one). */
export function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audio.state !== 'running') void audio.resume();
  } catch {
    /* no audio */
  }
}
function beep(times = 2) {
  try {
    unlockAudio();
    const ctx = audio;
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      const t = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.22);
    }
  } catch {
    /* no audio: fine */
  }
}

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

function useWakeLock(active: boolean) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!active) return;
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (!wl) return setOk(false);
        lock = await wl.request('screen');
        setOk(true);
      } catch {
        setOk(false);
      }
    };
    void req();
    const onVis = () => {
      if (document.visibilityState === 'visible') void req();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
  return ok;
}

/* ---------- session player ---------- */

type Draft = Record<number, ItemLog & { skipped?: boolean }>;
const draftKey = (id: string) => `thirdball:play:${id}`;

function sessionStorageHas(id: string): boolean {
  try {
    return sessionStorage.getItem(draftKey(id)) !== null;
  } catch {
    return false;
  }
}

function loadDraft(id: string): { at: number; logs: Draft } {
  try {
    const s = sessionStorage.getItem(draftKey(id));
    if (s) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  return { at: 0, logs: {} };
}

export function SessionPlayer({ id }: { id: string }) {
  const prog = program.value!;
  const session = prog.sessions.find((s) => s.id === id);
  const items = session ? flatItems(session) : [];
  const saved = loadDraft(id);
  const prevLog = logBySession.value.get(id);
  const initialLogs: Draft = { ...saved.logs };
  if (prevLog && !Object.keys(initialLogs).length) {
    prevLog.items.forEach((l) => {
      const k = items.findIndex((x) => x.bi === l.blockIndex && x.ii === l.itemIndex);
      if (k >= 0) initialLogs[k] = l;
    });
  }
  // resume where the player left off: the saved position, else the first drill without a log
  const firstOpen = items.findIndex((_, k) => !initialLogs[k]);
  const startAt = sessionStorageHas(id) ? saved.at : firstOpen >= 0 ? firstOpen : 0;
  const [at, setAt] = useState(Math.min(startAt, Math.max(0, items.length - 1)));
  const [logs, setLogs] = useState<Draft>(initialLogs);
  const [mode, setMode] = useState<'drill' | 'log' | 'summary'>('drill');
  const [changes, setChanges] = useState<Change[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [started, setStarted] = useState(false);
  const wake = useWakeLock(started);
  const settings = data.value.settings;

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey(id), JSON.stringify({ at, logs }));
    } catch {
      /* ignore */
    }
  }, [at, logs]);

  if (!session) return <p class="screen">{common.notFound}</p>;

  const cur = items[at]!;
  const buildLog = (done: boolean): SessionLog => ({
    sessionId: session.id,
    sessionIndex: session.index,
    date: prevLog?.date ?? today.value,
    done,
    items: Object.entries(logs).map(([k, l]) => {
      const x = items[Number(k)]!;
      return { ...l, blockIndex: x.bi, itemIndex: x.ii, drillId: x.it.drillId };
    }),
  });

  const finish = () => {
    const ch = logSession(buildLog(true));
    try {
      sessionStorage.removeItem(draftKey(id));
    } catch {
      /* ignore */
    }
    setChanges(ch);
    setMode('summary');
    celebrate(T.celebrate);
  };

  const saveItem = (l: Partial<ItemLog> & { skipped?: boolean }) => {
    const next = { ...logs, [at]: { blockIndex: cur.bi, itemIndex: cur.ii, drillId: cur.it.drillId, done: !l.skipped, ...l } as ItemLog };
    setLogs(next);
    if (l.stagePassed && cur.it.learn) {
      const nxt = STAGES[STAGES.indexOf(cur.it.learn.stage) + 1];
      const name = byId.move.get(cur.it.learn.moveId)!.name;
      celebrate(nxt ? T.stageUp(name, stageNames[nxt]!.toLowerCase()) : learnText.ownedToast(name));
    }
    if (at < items.length - 1) {
      setAt(at + 1);
      setMode('drill');
    } else finish();
  };

  const leave = () => {
    if (Object.keys(logs).length) logSession(buildLog(false));
    navigate('/today', true);
  };

  if (mode === 'summary') {
    const done = Object.values(logs).filter((l) => l.done);
    const mins = items.filter((_, k) => logs[k]?.done).reduce((a, x) => a + x.it.minutes, 0);
    return (
      <div class="screen screen--bare player">
        <div class="stack stack--l">
          <h1>{T.summary}</h1>
          <p class="player__big">{T.summaryBody(mins, done.length)}</p>
          <section class="stack">
            <h2 class="section-title">{T.planChanged}</h2>
            {changes.length ? (
              <ul class="changes">
                {changes.map((c) => (
                  <li>{c.reason}</li>
                ))}
              </ul>
            ) : (
              <p class="muted">{T.noChanges}</p>
            )}
          </section>
          <Button big wide onClick={() => navigate('/today', true)}>
            {T.backToday}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div class="player" data-mode={mode}>
      <div class="player__bar">
        <Button kind="ghost" icon="close" label={T.close} onClick={() => setLeaving(true)} />
        <span class="player__count">{T.of(at + 1, items.length)}</span>
        <Button
          kind="ghost"
          icon={settings.sound ? 'speaker' : 'speakerOff'}
          label={settings.sound ? T.soundOn : T.soundOff}
          onClick={() => {
            unlockAudio();
            setSettings({ sound: !settings.sound });
          }}
        />
      </div>
      <div class="player__dots" aria-hidden="true">
        {items.map((_, k) => (
          <span class={k < at ? 'is-done' : k === at ? 'is-now' : ''} />
        ))}
      </div>
      {mode === 'drill' ? (
        <DrillView
          key={at}
          item={cur}
          onStart={() => setStarted(true)}
          onDone={(count) => {
            setLogs({ ...logs, [at]: { ...(logs[at] ?? {}), count } as ItemLog });
            setMode('log');
          }}
          onPrev={at > 0 ? () => setAt(at - 1) : undefined}
          wake={wake}
        />
      ) : (
        <LogView key={`log${at}`} item={cur} count={logs[at]?.count} onSave={saveItem} onBack={() => setMode('drill')} />
      )}
      <Dialog
        open={leaving}
        title={T.close}
        onClose={() => setLeaving(false)}
        actions={
          <>
            <Button kind="quiet" onClick={() => setLeaving(false)}>
              {T.stay}
            </Button>
            <Button kind="strong" onClick={leave}>
              {T.leave}
            </Button>
          </>
        }
      >
        <p>{T.closeConfirm}</p>
      </Dialog>
    </div>
  );
}

type Flat = ReturnType<typeof flatItems>[number];

function DrillView({
  item,
  onStart,
  onDone,
  onPrev,
  wake,
}: {
  item: Flat;
  onStart: () => void;
  onDone: (count: number | undefined) => void;
  onPrev?: () => void;
  wake: boolean | null;
}) {
  const { it, phase } = item;
  const total = it.minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [showText, setShowText] = useState(true);
  const endAt = useRef(0);
  const settings = data.value.settings;
  const drill = it.drillId ? byId.drill.get(it.drillId) : null;
  const move = it.learn ? byId.move.get(it.learn.moveId) : drill?.moveIds.map((m) => byId.move.get(m)).find((m) => m?.animationId);
  const variant = drill ? drill.variants.find((v) => v.setup === it.setup) ?? pickVariant(drill, [it.setup]) : null;
  const title = drill ? drill.name : common.watchMove(move?.name ?? '');
  const counted = !!it.metricId || drill?.success.type === 'consecutive' || drill?.success.type === 'outOf';

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) {
        setRunning(false);
        if (settings.sound) beep(3);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([120, 80, 120]);
      }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (settings.readCues) speak(`${title}. ${it.cue}`);
  }, []);

  const toggle = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (left <= 0) setLeft(total);
    endAt.current = Date.now() + (left <= 0 ? total : left) * 1000;
    unlockAudio();
    setRunning(true);
    setShowText(false);
    onStart();
    if (settings.sound) beep(1);
  };

  const mm = String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div class="player__body">
      <div class="stack stack--s">
        <span class="player__phase">{phaseNames[phase]}</span>
        <h1 class="player__title">{title}</h1>
        {it.learn ? <span class="tag tag--accent">{T.learnStage(byId.move.get(it.learn.moveId)!.name, stageNames[it.learn.stage]!)}</span> : null}
      </div>

      <div class="player__timer" aria-live="off">
        <div aria-hidden="true">
          <ArcProgress value={total - left} max={total} label={undefined} />
        </div>
        <span class="player__time num" role="timer" aria-label={T.timerLabel(mm, ss)}>
          {mm}:{ss}
        </span>
        {left === 0 ? <span class="player__timeup">{T.timeUp}</span> : null}
      </div>

      <dl class="player__facts">
        <div>
          <dt>{T.target}</dt>
          <dd>{it.target}</dd>
        </div>
        <div>
          <dt>{T.cue}</dt>
          <dd class="player__cue">{it.cue}</dd>
        </div>
      </dl>
      {it.metricId ? <p class="callout">{T.testNote}</p> : null}

      {variant ? (
        <details class="player__how" open={showText} onToggle={(e) => setShowText((e.target as HTMLDetailsElement).open)}>
          <summary>{drill?.purpose}</summary>
          <p>{variant.instructions}</p>
          {variant.feederInstructions ? (
            <p class="muted">
              <strong>{T.feeder}: </strong>
              {variant.feederInstructions}
            </p>
          ) : null}
        </details>
      ) : null}
      {move?.animationId || it.kind === 'watch' ? (
        <a class="btn btn--quiet" href={`#/learn/${move!.id}`}>
          <Icon name="watch" size={22} />
          <span>{T.watch}</span>
        </a>
      ) : null}

      {counted ? (
      <div class="counter" role="group" aria-label={T.reps}>
        <Button kind="quiet" icon="minus" label={T.minus} onClick={() => setCount(Math.max(0, count - 1))} />
        <button type="button" class="counter__plus" onClick={() => setCount(count + 1)} aria-label={`${T.plus}. ${count}`}>
          <span class="num">{count}</span>
          <small>{T.reps}</small>
        </button>
        <Button kind="ghost" icon="repeat" label={T.resetCount} onClick={() => setCount(0)} />
      </div>
      ) : null}

      <div class="player__controls">
        <Button kind="quiet" icon="prev" label={T.prev} onClick={onPrev} disabled={!onPrev} big />
        {left === 0 ? (
          <Button icon="check" big onClick={() => onDone(count || undefined)}>
            {T.logThis}
          </Button>
        ) : (
          <Button icon={running ? 'pause' : 'play'} big onClick={toggle}>
            {running ? T.pause : left < total ? T.resume : T.start}
          </Button>
        )}
        <Button kind="quiet" big onClick={() => onDone(count || undefined)}>
          {T.done}
        </Button>
      </div>
      {wake === false ? <p class="muted center small">{T.wakeLockOff}</p> : null}
    </div>
  );
}

function LogView({
  item,
  count,
  onSave,
  onBack,
}: {
  item: Flat;
  count?: number;
  onSave: (l: Partial<ItemLog> & { skipped?: boolean }) => void;
  onBack: () => void;
}) {
  const { it } = item;
  const [felt, setFelt] = useState<Felt | undefined>();
  const [hit, setHit] = useState<boolean | undefined>();
  const [best, setBest] = useState<number | undefined>(count);
  const [passed, setPassed] = useState<boolean | undefined>(it.learn?.stage === 'see' ? true : undefined);
  const drill = it.drillId ? byId.drill.get(it.drillId) : null;
  const wantsCount = !!it.metricId || drill?.success.type === 'consecutive' || drill?.success.type === 'outOf';
  return (
    <div class="player__body">
      <div class="stack stack--s">
        <span class="player__phase">{drill?.name ?? common.watchMove(byId.move.get(it.learn?.moveId ?? '')?.name ?? '')}</span>
        <h1 class="player__title">{T.howFelt}</h1>
      </div>
      <div class="feel-row feel-row--big" role="radiogroup" aria-label={T.howFelt}>
        {(['easy', 'right', 'hard'] as Felt[]).map((f) => (
          <button type="button" role="radio" aria-checked={felt === f} class={`btn btn--quiet btn--big${felt === f ? ' is-picked' : ''}`} onClick={() => setFelt(f)}>
            {f === 'easy' ? T.easy : f === 'right' ? T.right : T.hard}
          </button>
        ))}
      </div>
      {it.kind !== 'watch' ? (
        <div class="stack stack--s">
          <p class="field__label">
            {T.hit} <span class="muted">{it.target}</span>
          </p>
          <div class="feel-row" role="radiogroup" aria-label={T.hit}>
            <button type="button" role="radio" aria-checked={hit === true} class={`btn btn--quiet btn--big${hit === true ? ' is-picked' : ''}`} onClick={() => setHit(true)}>
              {T.yes}
            </button>
            <button type="button" role="radio" aria-checked={hit === false} class={`btn btn--quiet btn--big${hit === false ? ' is-picked' : ''}`} onClick={() => setHit(false)}>
              {T.no}
            </button>
          </div>
        </div>
      ) : null}
      {wantsCount ? (
        <div class="stack stack--s">
          <p class="field__label">{T.best}</p>
          <div class="counter">
            <Button kind="quiet" icon="minus" label={T.minus} onClick={() => setBest(Math.max(0, (best ?? 0) - 1))} />
            <button type="button" class="counter__plus" onClick={() => setBest((best ?? 0) + 1)} aria-label={`${T.plus}. ${best ?? 0}`}>
              <span class="num">{best ?? 0}</span>
            </button>
            <span />
          </div>
        </div>
      ) : null}
      {it.learn && it.learn.stage !== 'see' ? (
        <div class="stack stack--s">
          <p class="field__label">
            {T.stagePassed} <span class="muted">{byId.move.get(it.learn.moveId)!.learningPath.find((l) => l.stage === it.learn!.stage)?.passCheck}</span>
          </p>
          <div class="feel-row">
            <button type="button" aria-pressed={passed === true} class={`btn btn--quiet btn--big${passed === true ? ' is-picked' : ''}`} onClick={() => setPassed(true)}>
              {T.yes}
            </button>
            <button type="button" aria-pressed={passed === false} class={`btn btn--quiet btn--big${passed === false ? ' is-picked' : ''}`} onClick={() => setPassed(false)}>
              {T.notYet}
            </button>
          </div>
        </div>
      ) : null}
      <div class="player__controls player__controls--log">
        <Button kind="ghost" icon="back" label={common.back} onClick={onBack} />
        <Button kind="quiet" onClick={() => onSave({ done: false, skipped: true })}>
          {T.skip}
        </Button>
        <Button big onClick={() => onSave({ done: true, felt, targetHit: hit, count: best, stagePassed: passed })}>
          {T.logAndNext}
        </Button>
      </div>
    </div>
  );
}
