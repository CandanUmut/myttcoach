import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { content } from '../../content/load';
import type { GoalId, Level, Setup, StyleId, WorkoutType } from '../../content/types';
import type { AgeBand, Profile, SessionLength } from '../../engine/types';
import { goalMetricOptions, styleFromQuiz, suggestGoal, suggestedLevel } from '../../engine/placement';
import { addDays } from '../../engine/periodize';
import { ArcProgress, Button, Chip } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { ActionBar, Dialog, Field, NumberStepper, OptionRow, Segmented, Toggle } from '../components/Controls';
import {
  dayShort, goalNames, levelBlurbs, levelNames, ob, settingsText, voiceNames, voiceSamples, workoutNames,
} from '../../strings/en';
import { createPlan, profile as currentProfile, today, updateProfile } from '../state';
import { navigate } from '../router';

const TOTAL = 10;
const DRAFT_KEY = 'thirdball:draft';

type Draft = Omit<Profile, 'regenCount'> & { levelChecks: Record<number, boolean[]>; regenCount?: number; noGoal?: boolean };

function blankDraft(): Draft {
  return {
    name: '',
    hand: 'R',
    grip: 'shakehand',
    level: 1,
    levelChecks: {},
    style: 'balanced',
    goals: [],
    moves: [],
    workoutTypes: [],
    setups: [],
    schedule: { days: [2, 4, 6], time: 'evening', length: 60, weeks: 8, startDate: today.value },
    lowImpact: false,
    voice: 'calm',
  };
}

function loadDraft(): Draft {
  try {
    const s = sessionStorage.getItem(DRAFT_KEY);
    if (s) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  return blankDraft();
}

export const draft = signal<Draft>(loadDraft());

function setDraft(patch: Partial<Draft>) {
  draft.value = { ...draft.value, ...patch };
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft.value));
  } catch {
    /* ignore */
  }
}

/** Start editing the saved profile. */
export function startEdit() {
  const p = currentProfile.value;
  if (!p) return;
  setDraft({ ...p, levelChecks: {}, noGoal: !p.goalMetric });
  navigate('/onboarding/1?edit=1');
}

export function startNew() {
  setDraft(blankDraft());
  navigate('/onboarding/1');
}

function toProfile(d: Draft): Profile {
  const { levelChecks: _c, noGoal, ...rest } = d;
  void _c;
  const setups: Setup[] = rest.setups.length ? rest.setups : ['shadow'];
  const p: Profile = { ...rest, setups, regenCount: d.regenCount ?? 0, name: rest.name?.trim() || undefined };
  if (noGoal) delete p.goalMetric;
  return p;
}

export function Onboarding({ step, edit }: { step: number; edit: boolean }) {
  const d = draft.value;
  const [confirm, setConfirm] = useState(false);
  const go = (n: number) => navigate(`/onboarding/${n}${edit ? '?edit=1' : ''}`);
  const canNext = step !== 8 || d.schedule.days.length > 0;
  const finish = () => {
    if (edit) setConfirm(true);
    else {
      createPlan(toProfile(d));
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      navigate('/card', true);
    }
  };
  const Step = [null, About, LevelStep, StyleStep, GoalsStep, MovesStep, WorkoutsStep, SetupStep, ScheduleStep, GoalMetricStep, OptionsStep][step] ?? About;
  return (
    <div class="screen screen--bare onboarding">
      <Backdrop variant="welcome" />
      <div class="onboarding__top">
        <ArcProgress value={step} max={TOTAL} compact label={ob.stepOf(step, TOTAL)} />
      </div>
      <div class="stack stack--l onboarding__body">
        <Step />
      </div>
      <ActionBar>
        {step > 1 ? (
          <Button kind="quiet" icon="back" onClick={() => go(step - 1)}>
            {ob.back}
          </Button>
        ) : (
          <span />
        )}
        {step < TOTAL ? (
          <Button onClick={() => go(step + 1)} disabled={!canNext}>
            {ob.next}
          </Button>
        ) : (
          <Button onClick={finish}>{edit ? ob.saveChanges : ob.finish}</Button>
        )}
      </ActionBar>
      <Dialog
        open={confirm}
        title={settingsText.regenTitle}
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Button
              kind="quiet"
              onClick={() => {
                updateProfile(toProfile(draft.value), false);
                setConfirm(false);
                navigate('/settings', true);
              }}
            >
              {settingsText.regenNo}
            </Button>
            <Button
              onClick={() => {
                updateProfile(toProfile(draft.value), true);
                setConfirm(false);
                navigate('/card', true);
              }}
            >
              {settingsText.regenYes}
            </Button>
          </>
        }
      >
        <p>{settingsText.regenBody}</p>
      </Dialog>
    </div>
  );
}

function About() {
  const d = draft.value;
  const A = ob.about;
  return (
    <>
      <h1>{A.title}</h1>
      <Field label={A.name}>
        <input class="input" type="text" value={d.name ?? ''} placeholder={A.namePh} autoComplete="given-name" onInput={(e) => setDraft({ name: (e.target as HTMLInputElement).value })} />
      </Field>
      <Field label={A.hand}>
        <Segmented label={A.hand} value={d.hand} onChange={(hand) => setDraft({ hand })} options={[{ value: 'R', label: A.right }, { value: 'L', label: A.left }]} />
      </Field>
      <Field label={A.grip}>
        <Segmented
          label={A.grip}
          value={d.grip}
          onChange={(grip) => setDraft({ grip })}
          options={[{ value: 'shakehand', label: A.shakehand }, { value: 'penhold', label: A.penhold }, { value: 'unsure', label: A.unsure }]}
        />
      </Field>
      <Field label={A.age} hint={A.ageNote}>
        <div class="row row--wrap">
          {(Object.keys(A.ages) as AgeBand[]).map((a) => (
            <Chip selected={d.ageBand === a} onClick={() => setDraft({ ageBand: d.ageBand === a ? undefined : a })}>
              {A.ages[a]}
            </Chip>
          ))}
        </div>
      </Field>
    </>
  );
}

function LevelStep() {
  const d = draft.value;
  const L = ob.level;
  const counts = Object.fromEntries(Object.entries(L.checks).map(([k, v]) => [k, v.length]));
  const suggestion = suggestedLevel(d.levelChecks, counts);
  const toggle = (lvl: number, i: number) => {
    const arr = [...(d.levelChecks[lvl] ?? Array(L.checks[lvl]!.length).fill(false))];
    arr[i] = !arr[i];
    const checks = { ...d.levelChecks, [lvl]: arr };
    setDraft({ levelChecks: checks, level: suggestedLevel(checks, counts) });
  };
  return (
    <>
      <div class="stack stack--s">
        <h1>{L.title}</h1>
        <p class="muted">{L.intro}</p>
      </div>
      <div class="stack stack--s">
        {[2, 3, 4, 5].flatMap((lvl) =>
          L.checks[lvl]!.map((text, i) => <OptionRow multi title={text} selected={!!d.levelChecks[lvl]?.[i]} onClick={() => toggle(lvl, i)} />),
        )}
      </div>
      <p class="callout">{L.suggested(levelNames[suggestion]!)}</p>
      <Field label={L.pick}>
        <div class="stack stack--s">
          {([1, 2, 3, 4, 5] as Level[]).map((l) => (
            <OptionRow title={levelNames[l]} sub={levelBlurbs[l]} selected={d.level === l} onClick={() => setDraft({ level: l })} />
          ))}
        </div>
      </Field>
    </>
  );
}

function StyleStep() {
  const d = draft.value;
  const S = ob.style;
  const [quiz, setQuiz] = useState<number[] | null>(null);
  const result = quiz && quiz.length === 3 ? styleFromQuiz(quiz[0]!, quiz[1]!, quiz[2]!) : null;
  return (
    <>
      <div class="stack stack--s">
        <h1>{S.title}</h1>
        <p class="muted">{S.intro}</p>
      </div>
      <div class="stack stack--s">
        {content.styles.map((s) => (
          <OptionRow title={s.name} sub={s.summary} selected={d.style === s.id} onClick={() => setDraft({ style: s.id as StyleId })} />
        ))}
      </div>
      {quiz === null ? (
        <Button kind="quiet" icon="info" onClick={() => setQuiz([])}>
          {S.help}
        </Button>
      ) : (
        <div class="panel stack">
          <h2 class="section-title">{S.quizTitle}</h2>
          {S.q.map((q, qi) => (
            <Field label={q.q}>
              <div class="stack stack--s">
                {q.a.map((a, ai) => (
                  <OptionRow
                    title={a}
                    selected={quiz[qi] === ai}
                    onClick={() => {
                      const n = [...quiz];
                      n[qi] = ai;
                      setQuiz(n);
                    }}
                  />
                ))}
              </div>
            </Field>
          ))}
          {result ? (
            <div class="stack stack--s">
              <p class="callout">{S.result(content.styles.find((s) => s.id === result)!.name)}</p>
              <Button
                onClick={() => {
                  setDraft({ style: result });
                  setQuiz(null);
                }}
              >
                {S.use}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

function GoalsStep() {
  const d = draft.value;
  const G = ob.goals;
  const toggle = (g: GoalId) => {
    if (d.goals.includes(g)) setDraft({ goals: d.goals.filter((x) => x !== g) });
    else if (d.goals.length < 3) setDraft({ goals: [...d.goals, g] });
  };
  return (
    <>
      <div class="stack stack--s">
        <h1>{G.title}</h1>
        <p class="muted">{G.intro}</p>
      </div>
      <div class="stack stack--s">
        {content.goals.map((g) => {
          const rank = d.goals.indexOf(g.id);
          return (
            <OptionRow
              multi
              title={goalNames[g.id]}
              sub={g.summary}
              selected={rank >= 0}
              badge={rank >= 0 ? <span class="rank">{rank + 1}</span> : undefined}
              onClick={() => toggle(g.id)}
            />
          );
        })}
      </div>
      {d.goals.length >= 3 ? <p class="muted">{G.max}</p> : null}
    </>
  );
}

function MovesStep() {
  const d = draft.value;
  const M = ob.moves;
  const list = content.moves.filter((m) => m.levelMin <= d.level + 1);
  const modeOf = (id: string) => d.moves.find((m) => m.id === id)?.mode ?? 'none';
  const set = (id: string, mode: 'learn' | 'improve' | 'none') => {
    const rest = d.moves.filter((m) => m.id !== id);
    setDraft({ moves: mode === 'none' ? rest : [...rest, { id, mode }] });
  };
  return (
    <>
      <div class="stack stack--s">
        <h1>{M.title}</h1>
        <p class="muted">{M.intro}</p>
      </div>
      <div class="stack">
        {list.map((m) => (
          <div class="move-pick">
            <div>
              <p class="option__title">{m.name}</p>
              <p class="option__sub">{m.summary}</p>
            </div>
            <Segmented
              label={m.name}
              value={modeOf(m.id)}
              onChange={(v) => set(m.id, v)}
              options={[{ value: 'none', label: M.none }, { value: 'learn', label: M.learn }, { value: 'improve', label: M.improve }]}
            />
          </div>
        ))}
      </div>
      {!d.moves.length ? <p class="muted">{M.empty}</p> : null}
    </>
  );
}

function WorkoutsStep() {
  const d = draft.value;
  const W = ob.workouts;
  const all: WorkoutType[] = ['technique', 'footwork', 'serveReceive', 'matchPlay', 'fitness', 'mental'];
  const icons = { technique: 'learn', footwork: 'footwork', serveReceive: 'serve', matchPlay: 'match', fitness: 'flame', mental: 'goal' } as const;
  return (
    <>
      <div class="stack stack--s">
        <h1>{W.title}</h1>
        <p class="muted">{W.intro}</p>
      </div>
      <div class="stack stack--s">
        {all.map((w) => (
          <OptionRow
            multi
            icon={icons[w]}
            title={workoutNames[w]}
            selected={d.workoutTypes.includes(w)}
            onClick={() => setDraft({ workoutTypes: d.workoutTypes.includes(w) ? d.workoutTypes.filter((x) => x !== w) : [...d.workoutTypes, w] })}
          />
        ))}
      </div>
    </>
  );
}

function SetupStep() {
  const d = draft.value;
  const S = ob.setup;
  const all: Setup[] = ['partner', 'multiball', 'robot', 'wall', 'shadow'];
  const toggle = (s: Setup) => {
    if (s === 'shadow') return setDraft({ setups: d.setups.includes('shadow') && d.setups.length === 1 ? [] : ['shadow'] });
    const rest = d.setups.filter((x) => x !== 'shadow' && x !== s);
    setDraft({ setups: d.setups.includes(s) ? rest : [...rest, s] });
  };
  return (
    <>
      <div class="stack stack--s">
        <h1>{S.title}</h1>
        <p class="muted">{S.intro}</p>
      </div>
      <div class="stack stack--s">
        {all.map((s) => (
          <OptionRow multi title={S.options[s]!.name} sub={S.options[s]!.sub} selected={d.setups.includes(s)} onClick={() => toggle(s)} />
        ))}
      </div>
    </>
  );
}

function ScheduleStep() {
  const d = draft.value;
  const S = ob.schedule;
  const sch = d.schedule;
  const setS = (patch: Partial<Draft['schedule']>) => setDraft({ schedule: { ...sch, ...patch } });
  return (
    <>
      <h1>{S.title}</h1>
      <Field label={S.days} hint={sch.days.length ? undefined : S.pickDay}>
        <div class="days">
          {dayShort.map((name, i) => (
            <button
              type="button"
              aria-pressed={sch.days.includes(i)}
              class={`day${sch.days.includes(i) ? ' is-on' : ''}`}
              onClick={() => setS({ days: sch.days.includes(i) ? sch.days.filter((x) => x !== i) : [...sch.days, i].sort() })}
            >
              {name}
            </button>
          ))}
        </div>
      </Field>
      <Field label={S.time}>
        <Segmented label={S.time} value={sch.time} onChange={(time) => setS({ time })} options={(['morning', 'afternoon', 'evening'] as const).map((t) => ({ value: t, label: S.times[t] }))} />
      </Field>
      <Field label={S.length}>
        <Segmented label={S.length} value={sch.length} onChange={(length) => setS({ length: length as SessionLength })} options={[20, 30, 45, 60, 90].map((n) => ({ value: n, label: String(n) }))} />
      </Field>
      <Field label={S.weeks}>
        <Segmented label={S.weeks} value={sch.weeks} onChange={(weeks) => setS({ weeks: weeks as 4 | 6 | 8 | 12 })} options={[4, 6, 8, 12].map((n) => ({ value: n, label: String(n) }))} />
      </Field>
      <Field label={S.start}>
        <input class="input" type="date" value={sch.startDate} min={addDays(today.value, -30)} onInput={(e) => setS({ startDate: (e.target as HTMLInputElement).value || today.value })} />
      </Field>
    </>
  );
}

function GoalMetricStep() {
  const d = draft.value;
  const G = ob.goal;
  const p = toProfile(d);
  const options = goalMetricOptions(p, content);
  const current = d.goalMetric && options.includes(d.goalMetric.metricId) ? d.goalMetric : null;
  const choose = (id: string) => setDraft({ goalMetric: suggestGoal(p, content, id), noGoal: false });
  if (!current && !d.noGoal && options[0]) queueMicrotask(() => choose(options[0]!));
  const met = current ? content.metrics.find((m) => m.id === current.metricId) : null;
  return (
    <>
      <div class="stack stack--s">
        <h1>{G.title}</h1>
        <p class="muted">{G.intro}</p>
      </div>
      <div class="stack stack--s">
        {options.slice(0, 5).map((id) => {
          const m = content.metrics.find((x) => x.id === id)!;
          return <OptionRow title={m.name} sub={m.howToMeasure} selected={!d.noGoal && current?.metricId === id} onClick={() => choose(id)} />;
        })}
        <OptionRow title={G.none} selected={!!d.noGoal} onClick={() => setDraft({ noGoal: true })} />
      </div>
      {current && met && !d.noGoal ? (
        <div class="panel stack">
          <Field label={G.start} hint={G.estimate}>
            <NumberStepper label={G.start} value={current.start} unit={met.unit} onChange={(v) => setDraft({ goalMetric: { ...current, start: v } })} />
          </Field>
          <Field label={G.target} hint={G.suggested}>
            <NumberStepper label={G.target} value={current.target} unit={met.unit} onChange={(v) => setDraft({ goalMetric: { ...current, target: v } })} />
          </Field>
          <Field label={G.by}>
            <input class="input" type="date" value={current.targetDate} min={d.schedule.startDate} onInput={(e) => setDraft({ goalMetric: { ...current, targetDate: (e.target as HTMLInputElement).value } })} />
          </Field>
        </div>
      ) : null}
    </>
  );
}

function OptionsStep() {
  const d = draft.value;
  const O = ob.options;
  return (
    <>
      <h1>{O.title}</h1>
      <Toggle label={O.lowImpact} sub={O.lowImpactSub} checked={d.lowImpact} onChange={(lowImpact) => setDraft({ lowImpact })} />
      <Field label={O.voice} hint={O.voiceSub}>
        <div class="stack stack--s">
          {(['calm', 'energetic', 'direct'] as const).map((v) => (
            <OptionRow title={voiceNames[v]} sub={`“${voiceSamples[v]}”`} selected={d.voice === v} onClick={() => setDraft({ voice: v })} />
          ))}
        </div>
      </Field>
    </>
  );
}
