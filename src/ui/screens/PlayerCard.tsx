import { byId, content } from '../../content/load';
import { STAGES } from '../../content/types';
import { isNoTable } from '../../engine/generate';
import { Button, PlyDivider } from '../../design/components';
import { Icon } from '../../design/icons';
import { Backdrop } from '../../design/backgrounds';
import { card as C, controlsText, goalNames, learnText, levelNames, ob, stageNames, journalText } from '../../strings/en';
import { engineState, profile, program } from '../state';
import { startEdit } from './Onboarding';

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${controlsText.and} ${items[items.length - 1]}`;
}

export function whyThisPlan(): string[] {
  const p = profile.value;
  const prog = program.value;
  if (!p || !prog) return [];
  const out: string[] = [];
  const top = prog.focus
    .filter((f) => !['physical', 'mental'].includes(byId.skill.get(f.skillId)?.category ?? ''))
    .slice(0, 3)
    .map((f) => byId.skill.get(f.skillId)!.name.toLowerCase());
  out.push(C.whyFocus(list(top)));
  for (const f of prog.focus) if (f.addedBecause) out.push(C.whyAdded(f.addedBecause));
  for (const f of prog.focus.filter((x) => x.fromJournal).slice(0, 3)) out.push(journalText.fromJournal(f.fromJournal!.join(', '), byId.skill.get(f.skillId)!.name));
  if (prog.learnOrder.length) out.push(C.whyLearn(list(prog.learnOrder.map((m) => byId.move.get(m)!.name.toLowerCase()))));
  const perWeek = prog.weeks[0]?.sessionIds.length ?? new Set(p.schedule.days).size;
  out.push(C.whyWeeks(prog.weeks.length, perWeek, prog.sessions[0]?.length ?? p.schedule.length));
  out.push(C.whyBlocks);
  if (isNoTable(p)) out.push(C.whyNoTable);
  else out.push(C.whySetup(list(p.setups.filter((s) => s !== 'shadow').map((s) => ob.setup.options[s]!.name))));
  if (p.lowImpact) out.push(C.whyLowImpact);
  return out;
}

export function PlayerCard() {
  const p = profile.value;
  if (!p) return null;
  const st = engineState.value.stageOf as Record<string, number>;
  const style = content.styles.find((s) => s.id === p.style);
  return (
    <div class="screen screen--bare">
      <Backdrop variant="welcome" />
      <div class="stack stack--l">
        <h1 class="sr-only">{C.title}</h1>
        <article class="pcard" aria-label={C.title}>
          <div class="pcard__ply" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div class="pcard__main">
            <div class="pcard__top">
              <span class="pcard__level">
                <span class="pcard__levelnum">{p.level}</span>
                {levelNames[p.level]}
              </span>
              <Button kind="ghost" icon="edit" label={C.edit} onClick={startEdit} />
            </div>
            <p class="pcard__name">{p.name || C.title}</p>
            <dl class="pcard__facts">
              <div>
                <dt>{C.style}</dt>
                <dd>{style?.name}</dd>
              </div>
              <div>
                <dt>{C.hand}</dt>
                <dd>{p.hand === 'L' ? C.handL : C.handR}</dd>
              </div>
              <div>
                <dt>{C.grip}</dt>
                <dd>{ob.about[p.grip]}</dd>
              </div>
            </dl>
            <div class="pcard__section">
              <span class="pcard__label">{C.goals}</span>
              <ol class="pcard__goals">
                {p.goals.map((g) => (
                  <li>{goalNames[g]}</li>
                ))}
              </ol>
            </div>
            <div class="pcard__section">
              <span class="pcard__label">{C.moves}</span>
              {p.moves.length ? (
                <ul class="pcard__moves">
                  {p.moves.map((m) => {
                    const mv = byId.move.get(m.id)!;
                    const s = Math.min(6, st[m.id] ?? 0);
                    return (
                      <li>
                        <Icon name={m.mode === 'learn' ? 'learn' : 'repeat'} size={20} />
                        <span>{mv.name}</span>
                        <span class="tag">{(st[m.id] ?? 0) >= 7 ? learnText.owned : m.mode === 'learn' ? stageNames[STAGES[s]!] : ob.moves.improve}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>{C.noMoves}</p>
              )}
            </div>
          </div>
        </article>

        <section class="stack">
          <h2 class="section-title">{C.why}</h2>
          <ul class="why">
            {whyThisPlan().map((w) => (
              <li>{w}</li>
            ))}
          </ul>
        </section>
        <PlyDivider />
        <Button big wide href="#/today">
          {C.go}
        </Button>
      </div>
    </div>
  );
}
