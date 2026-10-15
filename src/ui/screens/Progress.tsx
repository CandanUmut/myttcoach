import { useState } from 'preact/hooks';
import { byId, content } from '../../content/load';
import { STAGES, type Level } from '../../content/types';
import { curve, daysBetween, statusFor, type GoalStatus } from '../../engine/goalCurve';
import { parseDate } from '../../engine/periodize';
import { Button } from '../../design/components';
import { Icon } from '../../design/icons';
import { Backdrop } from '../../design/backgrounds';
import { learnText, levelNames, phaseNames, progressText as T, settingsText, stageNames } from '../../strings/en';
import { addResult, data, engineState, profile, program, today } from '../state';
import { BottomNav } from '../components/BottomNav';
import { Field, NumberStepper } from '../components/Controls';
import { shortDate } from '../sessionInfo';

export function Progress() {
  const d = data.value;
  const p = profile.value!;
  const prog = program.value!;
  const doneLogs = d.logs.filter((l) => l.done);
  const minutesByPhase = new Map<string, number>();
  let minutes = 0;
  for (const l of d.logs) {
    const s = prog.sessions[l.sessionIndex];
    for (const it of l.items) {
      if (!it.done) continue;
      const b = s?.blocks[it.blockIndex];
      const m = b?.items[it.itemIndex]?.minutes ?? 0;
      if (!b) continue;
      minutes += m;
      minutesByPhase.set(b.phase, (minutesByPhase.get(b.phase) ?? 0) + m);
    }
  }
  return (
    <div class="screen">
      <Backdrop variant="progress" />
      <div class="stack stack--l">
        <h1>{T.title}</h1>
        <div class="stats">
          <div class="stat">
            <span class="stat__num num">{doneLogs.length}</span>
            <span class="stat__label">{T.sessionsOf(prog.sessions.length)}</span>
          </div>
          <div class="stat">
            <span class="stat__num num">{weekStreak(doneLogs.map((l) => l.date), today.value)}</span>
            <span class="stat__label">{T.streak}</span>
          </div>
          <div class="stat">
            <span class="stat__num num">{minutes}</span>
            <span class="stat__label">{T.minutes}</span>
          </div>
        </div>

        <GoalCurve />
        <ImprovementPath />

        {minutes > 0 ? (
          <section class="stack">
            <h2 class="section-title">{T.byCategory}</h2>
            <div class="bars">
              {[...minutesByPhase.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([ph, m]) => (
                  <div class="bar">
                    <span class="bar__label">{phaseNames[ph]}</span>
                    <span class="bar__track">
                      <span class="bar__fill" style={{ width: `${(100 * m) / Math.max(...minutesByPhase.values())}%` }} />
                    </span>
                    <span class="bar__value num">{m}</span>
                  </div>
                ))}
            </div>
          </section>
        ) : null}

        <section class="stack">
          <h2 class="section-title">{T.changes}</h2>
          {prog.changes.length ? (
            <ul class="changes">
              {[...prog.changes].reverse().map((c) => (
                <li>{c.reason}</li>
              ))}
            </ul>
          ) : (
            <p class="muted">{T.noChanges}</p>
          )}
        </section>
        <span class="sr-only">{p.name}</span>
      </div>
      <BottomNav active="progress" />
    </div>
  );
}

/** Weeks in a row (ending this week or last) with at least one session. */
export function weekStreak(dates: string[], today: string): number {
  const weekOf = (s: string) => {
    const d = parseDate(s);
    const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
    return monday.toISOString().slice(0, 10);
  };
  const weeks = new Set(dates.map(weekOf));
  let w = weekOf(today);
  if (!weeks.has(w)) w = new Date(parseDate(w).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  let n = 0;
  while (weeks.has(w)) {
    n++;
    w = new Date(parseDate(w).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  }
  return n;
}

function GoalCurve() {
  const p = profile.value!;
  const gm = p.goalMetric;
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState(gm?.start ?? 0);
  const [sel, setSel] = useState<number | null>(null);
  if (!gm) {
    return (
      <section class="stack">
        <h2 class="section-title">{T.goalCurve}</h2>
        <p class="muted">{T.noGoal}</p>
      </section>
    );
  }
  const met = content.metrics.find((m) => m.id === gm.metricId)!;
  const start = p.schedule.startDate;
  const results = data.value.results.filter((r) => r.metricId === gm.metricId).sort((a, b) => a.date.localeCompare(b.date));
  const pts = curve(gm.start, gm.target, start, gm.targetDate, 40);
  const T0 = daysBetween(start, gm.targetDate);
  const lastStatus: GoalStatus | null = results.length
    ? statusFor(results[results.length - 1]!.value, gm.start, gm.target, start, gm.targetDate, results[results.length - 1]!.date, met.higherIsBetter)
    : null;

  // geometry
  const W = 340;
  const H = 200;
  const pad = { l: 34, r: 12, t: 14, b: 26 };
  const vals = [...pts.flatMap((x) => [x.low, x.high]), ...results.map((r) => r.value)];
  const ymin = Math.max(0, Math.floor(Math.min(...vals)));
  const ymax = Math.ceil(Math.max(...vals) * 1.05);
  const x = (t: number) => pad.l + ((W - pad.l - pad.r) * Math.max(0, Math.min(T0, t))) / Math.max(1, T0);
  const y = (v: number) => pad.t + ((H - pad.t - pad.b) * (ymax - v)) / Math.max(1, ymax - ymin);
  const plan = pts.map((q, i) => `${i ? 'L' : 'M'}${x(q.t).toFixed(1)} ${y(q.value).toFixed(1)}`).join(' ');
  const band = `${pts.map((q, i) => `${i ? 'L' : 'M'}${x(q.t).toFixed(1)} ${y(q.high).toFixed(1)}`).join(' ')} ${[...pts].reverse().map((q) => `L${x(q.t).toFixed(1)} ${y(q.low).toFixed(1)}`).join(' ')} Z`;
  const tToday = daysBetween(start, today.value);
  const ticks = [ymin, Math.round((ymin + ymax) / 2), ymax];
  const statusText = lastStatus === 'ahead' ? T.ahead : lastStatus === 'behind' ? T.behind : lastStatus === 'onTrack' ? T.onTrack : null;

  return (
    <section class="stack">
      <div class="row row--between">
        <h2 class="section-title">{T.goalCurve}</h2>
        {statusText ? <span class={`status status--${lastStatus}`}>{statusText}</span> : null}
      </div>
      <p>
        <strong>{met.name}</strong>
        <span class="muted">{T.goalLine(gm.start, gm.target, met.unit, shortDate(gm.targetDate))}</span>
      </p>
      <figure class="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.chartLabel(met.name, gm.start, gm.target, results.length)}>
          {ticks.map((v) => (
            <g>
              <path d={`M${pad.l} ${y(v)} H${W - pad.r}`} class="chart__grid" />
              <text x={pad.l - 6} y={y(v) + 4} class="chart__tick" text-anchor="end">
                {v}
              </text>
            </g>
          ))}
          <path d={band} class="chart__band" />
          <path d={plan} class="chart__plan" />
          {tToday >= 0 && tToday <= T0 ? <path d={`M${x(tToday)} ${pad.t} V${H - pad.b}`} class="chart__today" /> : null}
          <text x={pad.l} y={H - 6} class="chart__tick">
            {shortDate(start)}
          </text>
          <text x={W - pad.r} y={H - 6} class="chart__tick" text-anchor="end">
            {shortDate(gm.targetDate)}
          </text>
          <text x={x(T0) - 4} y={y(gm.target) - 8} class="chart__label" text-anchor="end">
            {T.planned}
          </text>
          {results.map((r, i) => {
            const cx = x(daysBetween(start, r.date));
            const cy = y(r.value);
            return (
              <g class="chart__pt" onClick={() => setSel(sel === i ? null : i)}>
                <circle cx={cx} cy={cy} r="24" class="chart__hit" />
                <circle cx={cx} cy={cy} r="6" class="chart__dot" />
                {sel === i ? (
                  <text x={cx} y={cy - 12} class="chart__label" text-anchor="middle">
                    {`${r.value} ${met.unit}, ${shortDate(r.date)}`}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <figcaption class="muted small">{T.curveNote}</figcaption>
      </figure>
      {!results.length ? <p class="muted">{T.noResults}</p> : null}
      <table class="sr-only">
        <caption>{met.name}</caption>
        <tbody>
          {results.map((r) => (
            <tr>
              <td>{r.date}</td>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding ? (
        <div class="panel stack">
          <Field label={T.value} hint={met.howToMeasure}>
            <NumberStepper label={T.value} value={val} unit={met.unit} onChange={setVal} />
          </Field>
          <div class="row">
            <Button kind="quiet" onClick={() => setAdding(false)}>
              {settingsText.cancel}
            </Button>
            <Button
              onClick={() => {
                addResult({ metricId: met.id, date: today.value, value: val, source: 'log' });
                setAdding(false);
              }}
            >
              {T.save}
            </Button>
          </div>
        </div>
      ) : (
        <Button kind="quiet" icon="plus" onClick={() => setAdding(true)}>
          {T.addResult}
        </Button>
      )}
    </section>
  );
}

function ImprovementPath() {
  const p = profile.value!;
  const prog = program.value!;
  const stageOf = engineState.value.stageOf as Record<string, number>;
  const next = Math.min(5, p.level + 1) as Level;
  const latest = new Map<string, number>();
  for (const r of [...data.value.results].sort((a, b) => a.date.localeCompare(b.date))) latest.set(r.metricId, r.value);
  type Step = { label: string; sub: string; state: 'done' | 'now' | 'next' };
  const steps: Step[] = [];
  for (const mid of prog.learnOrder) {
    const st = stageOf[mid] ?? 0;
    const mv = byId.move.get(mid)!;
    steps.push({
      label: mv.name,
      sub: st >= 7 ? learnText.owned : stageNames[STAGES[Math.min(6, st)]!]!,
      state: st >= 7 ? 'done' : 'now',
    });
  }
  const testMetrics = content.metrics.filter((m) => {
    const sk = byId.skill.get(m.skillId);
    return sk && sk.levelMax >= next && (latest.has(m.id) || prog.focus.slice(0, 6).some((f) => f.skillId === m.skillId));
  });
  for (const m of testMetrics.slice(0, 4)) {
    const v = latest.get(m.id);
    const target = m.levelTargets[next];
    steps.push({ label: m.name, sub: v !== undefined ? T.bestAim(v, target, m.unit) : T.notTested(target, m.unit), state: v !== undefined && v >= target ? 'done' : 'next' });
  }
  const firstOpen = steps.findIndex((s) => s.state !== 'done');
  if (firstOpen >= 0) steps[firstOpen]!.state = 'now';
  return (
    <section class="stack">
      <div class="heading">
        <h2 class="section-title">{T.path}</h2>
        <p>{learnText.pathSub(levelNames[p.level]!, levelNames[next]!)}</p>
      </div>
      <ol class="path">
        <li class="path__step is-done">
          <span class="path__ball" aria-hidden="true" />
          <span>
            <strong>{levelNames[p.level]}</strong>
          </span>
        </li>
        {steps.map((s) => (
          <li class={`path__step is-${s.state}`}>
            <span class="path__ball" aria-hidden="true">
              {s.state === 'done' ? <Icon name="check" size={14} /> : null}
            </span>
            <span>
              <strong>{s.label}</strong>
              <span class="muted">{s.sub}</span>
            </span>
          </li>
        ))}
        <li class="path__step is-goal">
          <span class="path__ball" aria-hidden="true">
            <Icon name="goal" size={16} />
          </span>
          <span>
            <strong>{levelNames[next]}</strong>
          </span>
        </li>
      </ol>
    </section>
  );
}
