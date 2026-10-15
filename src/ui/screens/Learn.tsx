import { byId, content } from '../../content/load';
import { STAGES } from '../../content/types';
import { BounceStepper } from '../../design/components';
import { Icon } from '../../design/icons';
import { Backdrop } from '../../design/backgrounds';
import { learnText as T, ob, stageNames, stageShort } from '../../strings/en';
import { engineState, profile, program } from '../state';
import { BottomNav } from '../components/BottomNav';

export function Learn() {
  const p = profile.value!;
  const prog = program.value!;
  const stageOf = engineState.value.stageOf as Record<string, number>;
  const mine = [...new Set([...prog.learnOrder, ...p.moves.map((m) => m.id)])];
  const others = content.moves.filter((m) => !mine.includes(m.id) && m.levelMin <= p.level + 1);
  return (
    <div class="screen">
      <Backdrop variant="learn" />
      <div class="stack stack--l">
        <h1>{T.title}</h1>
        <section class="stack">
          <h2 class="section-title">{T.yours}</h2>
          {mine.length ? (
            mine.map((id) => {
              const mv = byId.move.get(id)!;
              const mode = p.moves.find((m) => m.id === id)?.mode ?? 'learn';
              const st = stageOf[id] ?? 0;
              const owned = st >= 7;
              return (
                <a class="panel learncard" href={`#/learn/${id}`}>
                  <div class="row row--between">
                    <strong>{mv.name}</strong>
                    <span class={`tag${owned ? ' tag--good' : ' tag--accent'}`}>
                      {owned ? T.owned : mode === 'improve' && !prog.learnOrder.includes(id) ? ob.moves.improve : stageNames[STAGES[Math.min(6, st)]!]}
                    </span>
                  </div>
                  {mode === 'learn' || prog.learnOrder.includes(id) ? (
                    <>
                      <BounceStepper steps={STAGES.map((s) => stageShort[s]!)} current={Math.min(6, st)} doneCount={Math.min(7, st)} />
                      {!owned ? (
                        <p class="muted">
                          <strong>{T.nextStep}: </strong>
                          {mv.learningPath[Math.min(6, st)]!.task}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p class="muted">{mv.summary}</p>
                  )}
                </a>
              );
            })
          ) : (
            <p class="muted">{T.none}</p>
          )}
        </section>
        <section class="stack">
          <h2 class="section-title">{T.more}</h2>
          <div class="rows">
            {others.map((m) => (
              <a class="rowlink" href={`#/learn/${m.id}`}>
                <span class="rowlink__icon">
                  <Icon name={m.wing === 'none' ? 'footwork' : 'learn'} />
                </span>
                <span class="rowlink__main">
                  <span class="rowlink__title">{m.name}</span>
                  <span class="rowlink__sub">{m.summary}</span>
                </span>
                <Icon name="forward" size={20} />
              </a>
            ))}
          </div>
        </section>
      </div>
      <BottomNav active="learn" />
    </div>
  );
}
