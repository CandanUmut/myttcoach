import { byId, content } from '../../content/load';
import { STAGES } from '../../content/types';
import { suggestLevelUp } from '../../engine/assess';
import { behindTwice, statusFor } from '../../engine/goalCurve';
import { addDays } from '../../engine/periodize';
import { BounceStepper, Button } from '../../design/components';
import { Icon } from '../../design/icons';
import { Backdrop } from '../../design/backgrounds';
import { appName, controlsText, engineText, levelNames, ob, phaseNames, stageShort, todayText as T } from '../../strings/en';
import { data, dates, dismiss, engineState, logBySession, nextSession, profile, program, today, updateProfile } from '../state';
import { friendlyDate, sessionSetup, sessionTitle } from '../sessionInfo';
import { BottomNav } from '../components/BottomNav';

function greeting(name?: string) {
  const h = new Date().getHours();
  const n = name || T.hi;
  if (!name) return T.hi;
  if (h < 12) return T.morning(n);
  if (h < 18) return T.afternoon(n);
  return T.evening(n);
}

export function Today() {
  const p = profile.value!;
  const prog = program.value!;
  const s = nextSession.value;
  const date = s ? dates.value[s.id] : null;
  const isToday = date === today.value;
  const started = s ? !!logBySession.value.get(s.id) : false;
  const week = s ? s.week : prog.weeks.length - 1;
  const tip = s?.tipId ? byId.tip.get(s.tipId) : null;
  const stageOf = engineState.value.stageOf as Record<string, number>;
  const learning = prog.learnOrder.filter((m) => (stageOf[m] ?? 0) < 7).slice(0, 2);

  return (
    <div class="screen">
      <Backdrop variant="today" />
      <div class="topbar">
        <span class="topbar__title">{appName}</span>
        <Button kind="ghost" icon="settings" label={controlsText.settings} href="#/settings" />
      </div>
      <div class="stack stack--l">
        <div class="stack stack--s">
          <h1>{greeting(p.name)}</h1>
          <p class="muted">{T.weekLine(week + 1, prog.weeks.length, engineText.weekTheme[prog.weeks[week]!.theme]!)}</p>
        </div>

        <Banners />

        {!s ? (
          <div class="hero">
            <span class="hero__eyebrow">{T.done}</span>
            <h2>{T.doneBody}</h2>
            <Button wide href="#/settings">
              {T.newPlan}
            </Button>
          </div>
        ) : isToday ? (
          <div class="hero">
            <span class="hero__eyebrow">{s.kind === 'assessment' ? T.assessment : T.tonight}</span>
            <h2>{sessionTitle(s)}</h2>
            <div class="hero__meta">
              <span>
                <Icon name="timer" size={18} />
                {T.minutes(s.length)}
              </span>
              {sessionSetup(s) ? (
                <span>
                  <Icon name="library" size={18} />
                  {ob.setup.options[sessionSetup(s)!]!.name}
                </span>
              ) : null}
            </div>
            <div class="hero__blocks" aria-hidden="true">
              {s.blocks.map((b) => (
                <span style={{ flex: b.minutes }} title={phaseNames[b.phase]} class={`hero__block hero__block--${b.phase}`} />
              ))}
            </div>
            <Button icon="play" wide big href={`#/play/${s.id}`}>
              {started ? T.continue : T.start}
            </Button>
            <a class="hero__link" href={`#/plan/${s.id}`}>
              {T.view}
            </a>
          </div>
        ) : (
          <div class="rest">
            <div class="stack stack--s">
              <h2>{T.restDay}</h2>
              <p>{T.restBody(friendlyDate(date!, today.value))}</p>
            </div>
            <a class="rowlink" href={`#/plan/${s.id}`}>
              <span class="rowlink__icon">
                <Icon name="session" />
              </span>
              <span class="rowlink__main">
                <span class="rowlink__sub">{T.next}</span>
                <span class="rowlink__title">{sessionTitle(s)}</span>
              </span>
              <Icon name="forward" size={20} />
            </a>
            <Button kind="quiet" icon="play" href={`#/play/${s.id}`}>
              {T.startEarly}
            </Button>
          </div>
        )}

        {s ? (
          <div class="note">
            <span class="note__who">{T.coachNote}</span>
            <p>{s.coachNote}</p>
          </div>
        ) : null}

        {learning.length ? (
          <section class="stack">
            <h2 class="section-title">{T.learning}</h2>
            {learning.map((mid) => {
              const mv = byId.move.get(mid)!;
              const si = Math.min(6, stageOf[mid] ?? 0);
              return (
                <a class="panel learncard" href={`#/learn/${mid}`}>
                  <div class="row row--between">
                    <strong>{mv.name}</strong>
                    <Icon name="forward" size={20} />
                  </div>
                  <BounceStepper steps={STAGES.map((x) => stageShort[x]!)} current={si} />
                  <p class="muted">{mv.learningPath[si]!.task}</p>
                </a>
              );
            })}
          </section>
        ) : null}

        {tip ? (
          <section class="tipcard">
            <span class="note__who">{T.tip}</span>
            <p>{tip.text}</p>
          </section>
        ) : null}
      </div>
      <BottomNav active="today" />
    </div>
  );
}

function Banners() {
  const d = data.value;
  const p = d.profile!;
  const up = suggestLevelUp(p, d.results, content);
  const upId = `levelup-${p.level}-${d.results.length}`;
  let behind = false;
  const gm = p.goalMetric;
  if (gm) {
    const met = content.metrics.find((m) => m.id === gm.metricId);
    const rs = d.results.filter((r) => r.metricId === gm.metricId).sort((a, b) => a.date.localeCompare(b.date));
    const sts = rs.map((r) => statusFor(r.value, gm.start, gm.target, p.schedule.startDate, gm.targetDate, r.date, met?.higherIsBetter ?? true));
    behind = behindTwice(sts);
  }
  const behindId = `behind-${d.results.length}`;
  return (
    <>
      {up && !d.dismissed.includes(upId) ? (
        <div class="banner" role="status">
          <Icon name="milestone" size={26} />
          <p>{T.levelUp(levelNames[up]!)}</p>
          <div class="row row--wrap">
            <Button onClick={() => updateProfile({ ...p, level: up }, true)}>{T.levelUpYes}</Button>
            <Button kind="quiet" onClick={() => dismiss(upId)}>
              {T.levelUpNo}
            </Button>
          </div>
        </div>
      ) : null}
      {behind && gm && !d.dismissed.includes(behindId) ? (
        <div class="banner" role="status">
          <Icon name="progress" size={26} />
          <p>{T.behind}</p>
          <div class="stack stack--s">
            <Button
              kind="quiet"
              onClick={() => {
                const metric = content.metrics.find((m) => m.id === gm.metricId);
                const skill = metric?.skillId;
                const mv = content.moves.find((m) => m.skillId === skill);
                const moves = mv && !p.moves.some((m) => m.id === mv.id) ? [...p.moves, { id: mv.id, mode: 'improve' as const }] : p.moves;
                updateProfile({ ...p, moves, regenCount: p.regenCount }, true);
                dismiss(behindId);
              }}
            >
              {T.behindAdd}
            </Button>
            <Button
              kind="quiet"
              onClick={() => {
                updateProfile({ ...p, goalMetric: { ...gm, targetDate: addDays(gm.targetDate, 14) } }, false);
                dismiss(behindId);
              }}
            >
              {T.behindMove}
            </Button>
            <Button kind="ghost" onClick={() => dismiss(behindId)}>
              {T.behindKeep}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
