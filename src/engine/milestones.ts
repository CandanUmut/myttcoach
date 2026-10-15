import type { MetricResult, Profile, Program, SessionLog } from './types';

export interface MilestoneInput {
  profile: Profile | null;
  program: Program | null;
  logs: SessionLog[];
  results: MetricResult[];
  stagePasses: { moveId: string; stage: string; date: string }[];
  journal: { date: string }[];
  serveLab: { date: string; hits: number }[];
}

export interface Milestone {
  id: string;
  /** Date it was reached (YYYY-MM-DD), or null. */
  date: string | null;
  /** For count milestones: how far along the player is. */
  have?: number;
  need?: number;
}

const min = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b);

/** Monday (YYYY-MM-DD) of the week a date falls in. */
function weekOf(s: string): string {
  const d = new Date(`${s}T00:00:00Z`);
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
}

/**
 * Quiet, table-tennis themed markers, worked out from what the player logged.
 * Pure and deterministic: the same data always gives the same milestones and dates.
 */
export function milestones(x: MilestoneInput): Milestone[] {
  const logs = [...x.logs].filter((l) => l.done).sort((a, b) => a.date.localeCompare(b.date) || a.sessionIndex - b.sessionIndex);
  const out: Milestone[] = [];
  const count = (id: string, dates: string[], need: number) => {
    out.push({ id, date: dates.length >= need ? dates[need - 1]! : null, have: Math.min(dates.length, need), need });
  };

  // sessions
  const sessionDates = logs.map((l) => l.date);
  count('first-session', sessionDates, 1);
  count('sessions-10', sessionDates, 10);
  count('sessions-25', sessionDates, 25);
  count('sessions-50', sessionDates, 50);

  // minutes and drills, in date order
  let minutes = 0;
  let h5: string | null = null;
  let h20: string | null = null;
  const drillDates: string[] = [];
  let firstStage: string | null = null;
  let firstOwn: string | null = null;
  for (const l of [...x.logs].sort((a, b) => a.date.localeCompare(b.date) || a.sessionIndex - b.sessionIndex)) {
    const s = x.program?.sessions[l.sessionIndex];
    for (const it of l.items) {
      if (!it.done) continue;
      const planned = s?.blocks[it.blockIndex]?.items[it.itemIndex];
      minutes += planned?.minutes ?? 0;
      if (!h5 && minutes >= 300) h5 = l.date;
      if (!h20 && minutes >= 1200) h20 = l.date;
      if (it.drillId) drillDates.push(l.date);
      const learn = planned?.learn;
      if (learn && (learn.stage === 'see' || it.stagePassed)) firstStage = min(firstStage, l.date);
      if (learn?.stage === 'own' && it.stagePassed) firstOwn = min(firstOwn, l.date);
    }
  }
  for (const p of x.stagePasses) {
    firstStage = min(firstStage, p.date);
    if (p.stage === 'own') firstOwn = min(firstOwn, p.date);
  }
  out.push({ id: 'hours-5', date: h5, have: Math.min(Math.floor(minutes / 60), 5), need: 5 });
  out.push({ id: 'hours-20', date: h20, have: Math.min(Math.floor(minutes / 60), 20), need: 20 });
  count('drills-100', drillDates, 100);
  out.push({ id: 'first-stage', date: firstStage });
  out.push({ id: 'first-own', date: firstOwn });

  // four weeks in a row (any four consecutive weeks with a session)
  const weeks = [...new Set(sessionDates.map(weekOf))].sort();
  let run = 0;
  let streak: string | null = null;
  let best = 0;
  for (let i = 0; i < weeks.length; i++) {
    const prev = weeks[i - 1];
    const gap = prev ? (Date.parse(weeks[i]!) - Date.parse(prev)) / 86400000 : 0;
    run = prev && gap === 7 ? run + 1 : 1;
    best = Math.max(best, run);
    if (run >= 4 && !streak) {
      // reached on the first session of the fourth week
      streak = sessionDates.find((d) => weekOf(d) === weeks[i]) ?? weeks[i]!;
    }
  }
  out.push({ id: 'streak-4', date: streak, have: Math.min(best, 4), need: 4 });

  // tests and goal
  const tests = x.results.filter((r) => r.source === 'test').map((r) => r.date).sort();
  out.push({ id: 'first-test', date: tests[0] ?? null });
  const gm = x.profile?.goalMetric;
  const goalHits = gm ? x.results.filter((r) => r.metricId === gm.metricId && r.value >= gm.target).map((r) => r.date).sort() : [];
  out.push({ id: 'goal-reached', date: goalHits[0] ?? null });

  // journal and serve lab
  out.push({ id: 'first-match', date: x.journal.map((j) => j.date).sort()[0] ?? null });
  out.push({ id: 'serve-8', date: x.serveLab.filter((s) => s.hits >= 8).map((s) => s.date).sort()[0] ?? null });
  return out;
}

/** Ids reached in `after` but not in `before` (for a quiet "new milestone" line). */
export function newlyReached(before: Milestone[], after: Milestone[]): string[] {
  const had = new Set(before.filter((m) => m.date).map((m) => m.id));
  return after.filter((m) => m.date && !had.has(m.id)).map((m) => m.id);
}
