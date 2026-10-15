import type { Content } from '../content/types';
import type { MatchNote } from './types';

/** How many recent matches count, newest first, and how much each one weighs. */
const RECENT = [1, 0.8, 0.6, 0.4, 0.2];
/** A lost match against a style adds a little less than a "didn't work" tag. */
const OPPONENT_SHARE = 0.7;
/** Matches more than this many days older than the newest one no longer count. */
const MAX_AGE_DAYS = 56;
/** How many sessions after the newest match get a journal drill. */
export const JOURNAL_SESSIONS = 6;

export interface JournalFocus {
  /** Date of the newest match: the journal drills go into the sessions after it. */
  from: string;
  /** Skills to practise, most important first, with the tag/opponent names behind each. */
  skills: { id: string; weight: number; because: string[] }[];
}

const days = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000;

/**
 * Turn the latest matches into a short practice focus. Only what didn't work (and the style
 * of an opponent the player lost to) counts; what worked changes nothing. Pure and deterministic.
 */
export function journalFocus(notes: MatchNote[], content: Content): JournalFocus | undefined {
  if (!notes.length) return undefined;
  const tags = new Map(content.journal.tags.map((t) => [t.id, t]));
  const opps = new Map(content.journal.opponents.map((t) => [t.id, t]));
  const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const newest = sorted[0]!.date;
  const recent = sorted.filter((n) => days(n.date, newest) <= MAX_AGE_DAYS).slice(0, RECENT.length);
  const weights = new Map<string, number>();
  const because = new Map<string, string[]>();
  const add = (skillWeights: Record<string, number>, scale: number, name: string) => {
    for (const [sid, v] of Object.entries(skillWeights)) {
      weights.set(sid, (weights.get(sid) ?? 0) + v * scale);
      const list = because.get(sid) ?? [];
      if (!list.includes(name)) list.push(name);
      because.set(sid, list);
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
    if (n.lefty && n.won === false) add(content.journal.lefty.skillWeights, r * OPPONENT_SHARE, content.journal.lefty.name);
  });
  const skills = [...weights.entries()]
    .map(([id, w]) => ({ id, weight: Math.round(w * 1000) / 1000, because: because.get(id)! }))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  return skills.length ? { from: newest, skills } : undefined;
}
