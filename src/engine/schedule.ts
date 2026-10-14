import { addDays, parseDate } from './periodize';
import type { Profile, Program, SessionLog } from './types';

/**
 * Dates for every session. Done sessions keep the date they were logged.
 * Missed sessions don't pile up: everything not done moves forward onto the
 * next training days from today, keeping the weekly shape. A session the
 * player moved by hand keeps that date.
 */
export function sessionDates(
  program: Program,
  profile: Profile,
  logs: SessionLog[],
  overrides: Record<string, string>,
  today: string,
): Record<string, string> {
  const days = new Set(profile.schedule.days);
  const out: Record<string, string> = {};
  const done = new Map(logs.filter((l) => l.done).map((l) => [l.sessionId, l.date]));
  const isDay = (d: string) => days.has(parseDate(d).getUTCDay());
  const nextDay = (from: string) => {
    let d = from;
    for (let i = 0; i < 400 && !isDay(d); i++) d = addDays(d, 1);
    return d;
  };
  let cursor = profile.schedule.startDate > today ? profile.schedule.startDate : today;
  // the first open slot must also be after the last done session
  const lastDone = [...done.values()].sort().pop();
  if (lastDone && lastDone >= cursor) cursor = addDays(lastDone, 1);
  for (const s of program.sessions) {
    const d = done.get(s.id);
    if (d) {
      out[s.id] = d;
      continue;
    }
    const o = overrides[s.id];
    if (o && o >= today) {
      out[s.id] = o;
      continue;
    }
    const date = nextDay(cursor);
    out[s.id] = date;
    cursor = addDays(date, 1);
  }
  return out;
}
