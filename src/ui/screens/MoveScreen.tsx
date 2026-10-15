import { useState } from 'preact/hooks';
import { byId } from '../../content/load';
import type { Move } from '../../content/types';
import { STAGES } from '../../content/types';
import { Icon } from '../../design/icons';
import { BounceStepper, Button } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { common, keyPointNames, moveText as T, stageNames, stageShort } from '../../strings/en';
import { back } from '../router';
import { MoveViewer } from '../components/MoveViewer';

export function MoveScreen({ moveId, stageIndex = 0 }: { moveId: string; stageIndex?: number }) {
  const move = byId.move.get(moveId);
  const [stage, setStage] = useState(stageIndex);
  if (!move) return <NotFound />;
  const st = move.learningPath[stage]!;
  return (
    <div class="screen">
      <Backdrop variant="learn" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/learn')} />
      </div>
      <div class="stack stack--l">
        <header class="stack stack--s">
          <h1>{move.name}</h1>
          <p class="muted">{move.summary}</p>
        </header>

        <MoveViewerSlot move={move} follow={st.stage === 'shadow' && stage === stageIndex} />

        <section class="cues" aria-label={T.cues}>
          <h2 class="section-title">{T.cues}</h2>
          <ol class="cues__list">
            {move.cues.map((c) => (
              <li>{c}</li>
            ))}
          </ol>
        </section>

        <section class="stack">
          <h2 class="section-title">{T.path}</h2>
          <BounceStepper steps={STAGES.map((s) => stageShort[s]!)} current={stage} doneCount={stageIndex} onPick={setStage} />
          <div class="panel stage">
            <h3>{stageNames[st.stage]}</h3>
            <p>{st.task}</p>
            <p class="stage__pass">
              <Icon name="check" size={20} />
              <span>
                <strong>{T.passCheck}: </strong>
                {st.passCheck}
              </span>
            </p>
            {st.selfChecks ? (
              <div class="stack stack--s">
                <span class="drill__label">{T.selfChecks}</span>
                <ul class="checks">
                  {st.selfChecks.map((c) => (
                    <li>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {st.drillIds.length ? (
              <div class="rows">
                {st.drillIds.map((id) => {
                  const d = byId.drill.get(id)!;
                  return (
                    <a class="rowlink" href={`#/library/drill/${d.id}`}>
                      <span class="rowlink__icon">
                        <Icon name="session" />
                      </span>
                      <span class="rowlink__main">
                        <span class="rowlink__title">{d.name}</span>
                        <span class="rowlink__sub">{d.success.description}</span>
                      </span>
                      <Icon name="forward" size={20} />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        <section class="stack stack--s">
          <h2 class="section-title">{T.when}</h2>
          <p>{move.whenToUse}</p>
        </section>

        <KeyPoints move={move} />

        <section class="stack">
          <h2 class="section-title">{T.inGames}</h2>
          {move.gamePatterns.map((g) => (
            <div class="pattern">
              <p class="pattern__when">{g.situation}</p>
              <p>{g.how}</p>
              <a class="pattern__drill" href={`#/library/drill/${g.drillId}`}>
                {byId.drill.get(g.drillId)?.name}
              </a>
            </div>
          ))}
        </section>

        <Troubleshoot move={move} />

        {move.penholdNotes ? (
          <div class="note">
            <span class="note__who">{T.penhold}</span>
            <p>{move.penholdNotes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MoveViewerSlot({ move, follow }: { move: Move; follow: boolean }) {
  if (move.animationId) return <MoveViewer key={`${move.animationId}-${follow}`} animationId={move.animationId} follow={follow} />;
  return (
    <div class="viewer-slot">
      <Icon name="learn" size={40} />
      <p>{T.animationPending}</p>
    </div>
  );
}

function KeyPoints({ move }: { move: Move }) {
  const [all, setAll] = useState(false);
  const entries = Object.entries(move.keyPoints) as [keyof Move['keyPoints'], string][];
  const shown = all ? entries : entries.slice(0, 4);
  return (
    <section class="stack">
      <h2 class="section-title">{T.keyPoints}</h2>
      <dl class="keypoints">
        {shown.map(([k, v]) => (
          <div>
            <dt>{keyPointNames[k]}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {!all ? (
        <Button kind="quiet" onClick={() => setAll(true)}>
          {common.showAll(entries.length)}
        </Button>
      ) : null}
    </section>
  );
}

export function Troubleshoot({ move }: { move: Move }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section class="stack" id="wrong">
      <div class="row">
        <Icon name="netball" size={30} />
        <div class="heading">
          <h2 class="section-title">{T.wrong}</h2>
          <p>{T.wrongSub}</p>
        </div>
      </div>
      <div class="row row--wrap">
        {move.troubleshooting.map((t, i) => (
          <button type="button" class={`chip${open === i ? ' is-selected' : ''}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {t.symptom}
          </button>
        ))}
      </div>
      {open !== null ? <Fix t={move.troubleshooting[open]!} /> : null}
    </section>
  );
}

function Fix({ t }: { t: Move['troubleshooting'][number] }) {
  const d = byId.drill.get(t.drillId);
  return (
    <div class="panel fix" role="region" aria-live="polite">
      <div>
        <span class="drill__label">{T.causes}</span>
        <ul class="checks checks--plain">
          {t.causes.map((c) => (
            <li>{c}</li>
          ))}
        </ul>
      </div>
      <div>
        <span class="drill__label">{T.fixes}</span>
        <ol class="balls">
          {t.fixes.map((c) => (
            <li>{c}</li>
          ))}
        </ol>
      </div>
      {d ? (
        <a class="rowlink" href={`#/library/drill/${d.id}`}>
          <span class="rowlink__icon">
            <Icon name="session" />
          </span>
          <span class="rowlink__main">
            <span class="rowlink__sub">{T.fixDrill}</span>
            <span class="rowlink__title">{d.name}</span>
          </span>
          <Icon name="forward" size={20} />
        </a>
      ) : null}
    </div>
  );
}

function NotFound() {
  return (
    <div class="screen">
      <p>{common.notFound}</p>
      <Button href="#/today">{common.goToday}</Button>
    </div>
  );
}
