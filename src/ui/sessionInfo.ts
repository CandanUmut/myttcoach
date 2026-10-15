import { byId } from '../content/load';
import type { Session } from '../engine/types';
import { dayLong, monthLong, stageNames, todayText as T } from '../strings/en';
import { addDays, parseDate } from '../engine/periodize';

/** The order beginners learn strokes in; everything else follows by level, then name. */
const BEGINNER_ORDER = ['ready-stance', 'fh-drive', 'bh-drive', 'bh-push', 'fh-push'];
export function sortMoves<T extends { id: string; levelMin: number; name: string }>(moves: T[]): T[] {
  const rank = (m: T) => {
    const i = BEGINNER_ORDER.indexOf(m.id);
    return i >= 0 ? i : 100 + m.levelMin * 10;
  };
  return [...moves].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function sessionTitle(s: Session): string {
  if (s.kind === 'assessment') return T.assessment;
  const learn = s.blocks.flatMap((b) => b.items).find((i) => i.learn);
  if (learn?.learn) return T.sessionLearnTitle(byId.move.get(learn.learn.moveId)!.name, stageNames[learn.learn.stage]!);
  const sk = byId.skill.get(s.focusSkillIds[0] ?? '');
  return sk?.name ?? T.training;
}

/** A second focus for the session, other than the learning move. */
export function sessionAlso(s: Session): string | null {
  const learnSkill = s.blocks.flatMap((b) => b.items).find((i) => i.learn)?.learn;
  // skip the skill already named in the title (the learning move's, or else the first focus skill)
  const ls = learnSkill ? byId.move.get(learnSkill.moveId)?.skillId : s.focusSkillIds[0];
  const other = s.focusSkillIds.find((id) => id !== ls);
  return other ? byId.skill.get(other)?.name ?? null : null;
}

export function sessionSetup(s: Session): string | null {
  const counts = new Map<string, number>();
  for (const b of s.blocks) for (const i of b.items) if (i.setup !== 'shadow') counts.set(i.setup, (counts.get(i.setup) ?? 0) + i.minutes);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function flatItems(s: Session) {
  return s.blocks.flatMap((b, bi) => b.items.map((it, ii) => ({ it, bi, ii, phase: b.phase })));
}

/** "today", "tomorrow", "Thursday" (this week) or "Thursday 6 November". */
export function friendlyDate(date: string, today: string): string {
  if (date === today) return T.todayLabel;
  if (date === addDays(today, 1)) return T.tomorrowLabel;
  const d = parseDate(date);
  const diff = Math.round((d.getTime() - parseDate(today).getTime()) / 86400000);
  if (diff > 0 && diff < 7) return dayLong[d.getUTCDay()]!;
  return `${dayLong[d.getUTCDay()]} ${d.getUTCDate()} ${monthLong[d.getUTCMonth()]}`;
}

export function shortDate(date: string): string {
  const d = parseDate(date);
  return `${d.getUTCDate()} ${monthLong[d.getUTCMonth()]!.slice(0, 3)}`;
}
