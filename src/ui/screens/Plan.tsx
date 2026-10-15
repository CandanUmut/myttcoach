import { useState } from 'preact/hooks';
import { byId } from '../../content/load';
import { addDays, parseDate } from '../../engine/periodize';
import type { Session } from '../../engine/types';
import { Button, PlyDivider } from '../../design/components';
import { Icon } from '../../design/icons';
import { Backdrop } from '../../design/backgrounds';
import { common, dayShort, engineText, monthLong, phaseNames, planText as T, todayText } from '../../strings/en';
import { dates, logBySession, moveSession, program, profile, today } from '../state';
import { friendlyDate, sessionAlso, sessionTitle, shortDate } from '../sessionInfo';
import { BottomNav } from '../components/BottomNav';
import { Dialog, Segmented } from '../components/Controls';
import { DrillCard } from '../components/DrillCard';
import { back, navigate } from '../router';

type View = 'list' | 'month';
let lastView: View = 'list';

export function Plan() {
  const prog = program.value!;
  const [view, setView] = useState<View>(lastView);
  return (
    <div class="screen">
      <Backdrop variant="plan" />
      <div class="stack stack--l">
        <div class="row row--between">
          <h1>{T.title}</h1>
        </div>
        <Segmented
          label={T.title}
          value={view}
          onChange={(v) => {
            lastView = v;
            setView(v);
          }}
          options={[{ value: 'list', label: T.list }, { value: 'month', label: T.month }]}
        />
        {view === 'list' ? <WeekList /> : <Month />}
        {prog.changes.length ? (
          <section class="stack">
            <h2 class="section-title">{T.changes}</h2>
            <ul class="changes">
              {[...prog.changes].reverse().slice(0, 5).map((c) => (
                <li>{c.reason}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <BottomNav active="plan" />
    </div>
  );
}

function statusOf(s: Session) {
  const l = logBySession.value.get(s.id);
  if (l?.done) return 'done';
  const d = dates.value[s.id];
  if (d === today.value) return 'today';
  return 'upcoming';
}

function WeekList() {
  const prog = program.value!;
  return (
    <div class="stack stack--l">
      {prog.weeks.map((w) => (
        <section class="week" aria-label={T.week(w.index + 1)}>
          <div class="week__head">
            <h2 class="week__title">{T.weekTheme(w.index + 1, engineText.weekTheme[w.theme]!)}</h2>
            <p class="muted week__sub">{engineText.weekThemeLong[w.theme]}</p>
          </div>
          <div class="rows">
            {w.sessionIds.map((id) => {
              const s = prog.sessions.find((x) => x.id === id)!;
              const st = statusOf(s);
              const d = dates.value[s.id]!;
              return (
                <a class={`rowlink session-row is-${st}`} href={`#/plan/${s.id}`}>
                  <span class="session-row__date">
                    <span class="session-row__dow">{dayShort[parseDate(d).getUTCDay()]}</span>
                    <span class="session-row__day">{parseDate(d).getUTCDate()}</span>
                  </span>
                  <span class="rowlink__main">
                    <span class="rowlink__title">
                      {sessionTitle(s)}
                      {s.kind === 'assessment' && sessionTitle(s) !== todayText.assessment ? <span class="tag tag--accent">{T.test}</span> : null}
                    </span>
                    <span class="rowlink__sub">{st === 'done' ? T.done : st === 'today' ? T.today : sessionAlso(s) ? todayText.also(sessionAlso(s)!) : todayText.minutes(s.length)}</span>
                  </span>
                  {st === 'done' ? <Icon name="check" size={22} class="session-row__check" /> : <Icon name="forward" size={20} />}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Month() {
  const prog = program.value!;
  const byDate = new Map<string, Session>();
  for (const s of prog.sessions) byDate.set(dates.value[s.id]!, s);
  const first = today.value.slice(0, 7);
  const [ym, setYm] = useState(first);
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const start = `${ym}-01`;
  const startDow = (parseDate(start).getUTCDay() + 6) % 7; // Monday first
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: daysIn }, (_, i) => addDays(start, i))];
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setYm(d.toISOString().slice(0, 7));
  };
  return (
    <div class="month">
      <div class="row row--between">
        <Button kind="ghost" icon="back" label={T.prevMonth} onClick={() => shift(-1)} />
        <h2 class="section-title">{`${monthLong[m - 1]} ${y}`}</h2>
        <Button kind="ghost" icon="forward" label={T.nextMonth} onClick={() => shift(1)} />
      </div>
      <div class="month__grid" role="grid">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <span class="month__dow" role="columnheader">
            {dayShort[d]!.slice(0, 2)}
          </span>
        ))}
        {cells.map((c) => {
          if (!c) return <span />;
          const s = byDate.get(c);
          const day = parseDate(c).getUTCDate();
          if (!s)
            return (
              <span class={`month__cell${c === today.value ? ' is-today' : ''}`} role="gridcell">
                {day}
              </span>
            );
          const st = statusOf(s);
          return (
            <a class={`month__cell has-session is-${st}${c === today.value ? ' is-today' : ''}`} href={`#/plan/${s.id}`} role="gridcell" aria-label={`${friendlyDate(c, today.value)}: ${sessionTitle(s)}`}>
              <span>{day}</span>
              <span class="month__ball" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const prog = program.value!;
  const p = profile.value!;
  const s = prog.sessions.find((x) => x.id === id);
  const [moving, setMoving] = useState(false);
  const [newDate, setNewDate] = useState('');
  if (!s) return <p class="screen">{common.notFound}</p>;
  const d = dates.value[s.id]!;
  const done = logBySession.value.get(s.id)?.done;
  return (
    <div class="screen">
      <Backdrop variant="plan" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/plan')} />
      </div>
      <div class="stack stack--l">
        <div class="stack stack--s">
          <p class="muted">{`${friendlyDate(d, today.value)[0]!.toUpperCase()}${friendlyDate(d, today.value).slice(1)}, ${shortDate(d)}`}</p>
          <h1>{sessionTitle(s)}</h1>
          <p class="muted">{T.weekTheme(s.week + 1, engineText.weekTheme[s.weekTheme]!)}</p>
        </div>
        <div class="note">
          <span class="note__who">{todayText.coachNote}</span>
          <p>{s.coachNote}</p>
        </div>
        {!done ? (
          <div class="stack stack--s">
            <Button icon="play" wide big href={`#/play/${s.id}`}>
              {T.start}
            </Button>
            <Button kind="quiet" icon="move" wide onClick={() => setMoving(true)}>
              {T.moveTo}
            </Button>
          </div>
        ) : null}
        {s.blocks.map((b) => (
          <section class="block">
            <div class="block__head">
              <h2 class="section-title">{phaseNames[b.phase]}</h2>
              <span class="tag">{todayText.minutes(b.minutes)}</span>
            </div>
            {b.items.map((it) => {
              const dr = it.drillId ? byId.drill.get(it.drillId) : null;
              if (!dr) {
                const mv = byId.move.get(it.learn!.moveId)!;
                return (
                  <a class="rowlink" href={`#/learn/${mv.id}`}>
                    <span class="rowlink__icon">
                      <Icon name="watch" />
                    </span>
                    <span class="rowlink__main">
                      <span class="rowlink__title">{common.watchMove(mv.name)}</span>
                      <span class="rowlink__sub">{it.reason}</span>
                    </span>
                    <span class="tag">{todayText.minutes(it.minutes)}</span>
                  </a>
                );
              }
              return <DrillCard drill={dr} setups={[it.setup]} minutes={it.minutes} target={it.target} reason={it.reason} hand={p.hand} compact />;
            })}
            <PlyDivider />
          </section>
        ))}
      </div>
      <Dialog
        open={moving}
        title={T.moveTo}
        onClose={() => setMoving(false)}
        actions={
          <>
            <Button kind="quiet" onClick={() => setMoving(false)}>
              {common.close}
            </Button>
            <Button
              disabled={!newDate}
              onClick={() => {
                moveSession(s.id, newDate);
                setMoving(false);
                navigate('/plan', true);
              }}
            >
              {T.save}
            </Button>
          </>
        }
      >
        <p class="muted">{T.moveHint}</p>
        <input class="input" type="date" min={today.value} value={newDate || d} onInput={(e) => setNewDate((e.target as HTMLInputElement).value)} />
      </Dialog>
    </div>
  );
}
