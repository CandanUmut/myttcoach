import type { Content } from '../content/types';
import { STAGES } from '../content/types';
import { engineText as T } from '../strings/en';
import { drillFits, generateProgram, type EngineState } from './generate';
import type { Change, Felt, MatchNote, Profile, Program, SessionLog } from './types';
import { journalFocus } from './journal';

/**
 * Turn logs into engine state: drill swaps (with plain reasons) and
 * the real learning stage of each move. Pure and deterministic.
 */
export function deriveState(
  logs: SessionLog[],
  profile: Profile,
  content: Content,
  program: Program,
  passes: { moveId: string; stage: string }[] = [],
  notes: MatchNote[] = [],
): EngineState {
  const drills = new Map(content.drills.map((d) => [d.id, d]));
  const hist = new Map<string, { felt?: Felt; hit?: boolean }[]>();
  const changes: Change[] = [];
  const stageOf: Record<string, number> = {};
  const sorted = [...logs].sort((a, b) => a.sessionIndex - b.sessionIndex || a.date.localeCompare(b.date));

  for (const log of sorted) {
    const session = program.sessions[log.sessionIndex];
    for (const it of log.items) {
      if (!it.done) continue;
      const planned = session?.blocks[it.blockIndex]?.items[it.itemIndex];
      // Learning stage progress
      const learn = planned?.learn;
      if (learn) {
        const si = STAGES.indexOf(learn.stage);
        const passed = learn.stage === 'see' ? true : !!it.stagePassed;
        if (passed) stageOf[learn.moveId] = Math.max(stageOf[learn.moveId] ?? 0, si + 1);
      }
      if (!it.drillId) continue;
      const h = hist.get(it.drillId) ?? [];
      h.push({ felt: it.felt, hit: it.targetHit });
      hist.set(it.drillId, h);
      const d = drills.get(it.drillId);
      if (!d) continue;
      const last2 = h.slice(-2);
      const last3 = h.slice(-3);
      let to: string | undefined;
      let reason = '';
      if (last2.length === 2 && last2.every((x) => x.hit === true && x.felt === 'easy') && d.progressionId) {
        to = d.progressionId;
        reason = T.swapProgress(d.name, drills.get(to)?.name ?? to, planned?.target ?? d.success.description.replace(/\.$/, ''));
      } else if (last2.length === 2 && last2.every((x) => x.felt === 'hard') && d.regressionId) {
        to = d.regressionId;
        reason = T.swapHard(d.name, drills.get(to)?.name ?? to);
      } else if (last3.length === 3 && last3.every((x) => x.hit === false) && d.regressionId) {
        to = d.regressionId;
        reason = T.swapMissed(d.name, drills.get(to)?.name ?? to);
      }
      if (to) {
        const toDrill = drills.get(to);
        if (toDrill && drillFits(toDrill, profile, 1)) {
          changes.push({ atSession: log.sessionIndex + 1, fromDrillId: d.id, toDrillId: to, reason });
          hist.set(d.id, []);
          hist.set(to, []);
        }
      }
    }
  }
  // stages passed outside a session (the move page's "What's next" button)
  for (const p of passes) {
    const si = STAGES.indexOf(p.stage as never);
    if (si >= 0) stageOf[p.moveId] = Math.max(stageOf[p.moveId] ?? 0, si + 1);
  }
  const learnedSkills = Object.entries(stageOf)
    .filter(([, s]) => s >= 7)
    .map(([m]) => content.moves.find((x) => x.id === m)?.skillId)
    .filter((x): x is string => !!x);
  const state: EngineState = { stageOf, changes, learnedSkills };
  const jf = journalFocus(notes, content);
  if (jf) state.journal = jf;
  return state;
}

/**
 * Re-plan future sessions after logging. Sessions up to the last logged one
 * never change; only later sessions do. Returns the new program and the
 * changes that are new since the old program.
 */
export function adaptProgram(
  program: Program,
  logs: SessionLog[],
  profile: Profile,
  content: Content,
  passes: { moveId: string; stage: string }[] = [],
  notes: MatchNote[] = [],
): { program: Program; newChanges: Change[] } {
  if (!logs.length && !passes.length && !notes.length) return { program, newChanges: [] };
  const k = logs.length ? Math.max(...logs.map((l) => l.sessionIndex)) + 1 : 0;
  const state = deriveState(logs, profile, content, program, passes, notes);
  const next = generateProgram(profile, content, { past: program.sessions.slice(0, k), state });
  const key = (c: Change) => `${c.atSession}:${c.fromDrillId}>${c.toDrillId}`;
  const old = new Set(program.changes.map(key));
  return { program: next, newChanges: state.changes.filter((c) => !old.has(key(c))) };
}
