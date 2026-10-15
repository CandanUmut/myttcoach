import type { Content } from '../content/types';
import type { MatchNote } from './types';

/** How many recent matches count, newest first, and how much each one weighs. */
const RECENT = [1, 0.8, 0.6, 0.4, 0.2];
/** A lost match against a style adds a little less than a "didn't work" tag. */
const OPPONENT_SHARE = 0.7;
/** No skill gets more than this from the journal, however many matches point at it. */
const CAP = 2.5;

export interface JournalBoost {
  /** Extra focus weight per skill. */
  weights: Record<string, number>;
  /** Names of the tags/opponents behind each skill, for plain reasons. */
  because: Record<string, string[]>;
}

/**
 * Turn the latest matches into extra focus. Only what didn't work (and the style of an
 * opponent the player lost to) adds focus; what worked changes nothing. Pure and deterministic.
 */
export function journalBoost(notes: MatchNote[], content: Content): JournalBoost {
  const tags = new Map(content.journal.tags.map((t) => [t.id, t]));
  const opps = new Map(content.journal.opponents.map((t) => [t.id, t]));
  const recent = [...notes].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, RECENT.length);
  const weights: Record<string, number> = {};
  const because: Record<string, string[]> = {};
  const add = (skillWeights: Record<string, number>, scale: number, name: string) => {
    for (const [sid, v] of Object.entries(skillWeights)) {
      weights[sid] = Math.min(CAP, (weights[sid] ?? 0) + v * scale);
      const list = (because[sid] ??= []);
      if (!list.includes(name)) list.push(name);
    }
  };
  recent.forEach((n, i) => {
    const r = RECENT[i]!;
    for (const id of n.didnt) {
      const t = tags.get(id);
      if (t) add(t.skillWeights, r, t.name);
    }
    const o = opps.get(n.opponentStyle);
    if (o && n.won === false) add(o.skillWeights, r * OPPONENT_SHARE, o.name);
  });
  for (const k of Object.keys(weights)) weights[k] = Math.round(weights[k]! * 1000) / 1000;
  return { weights, because };
}
