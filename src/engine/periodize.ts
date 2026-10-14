import type { Regularity } from '../content/types';
import type { Profile, WeekTheme } from './types';

/** 4-week blocks: Learn, Learn, Build, Apply & test. A 2-week tail is Build, Apply. */
export function weekThemes(profile: Profile): { theme: WeekTheme; block: number }[] {
  const n = profile.schedule.weeks;
  const out: { theme: WeekTheme; block: number }[] = [];
  const full: WeekTheme[] = ['learn', 'learn', 'build', 'apply'];
  for (let i = 0; i < n; i++) {
    const block = Math.floor(i / 4);
    const remaining = n - block * 4;
    let theme: WeekTheme;
    if (remaining >= 4) theme = full[i % 4]!;
    else theme = (['build', 'apply'] as WeekTheme[])[i % 4] ?? 'apply';
    out.push({ theme, block });
  }
  if (profile.goals.includes('tournament') && n >= 4) out[n - 1] = { theme: 'taper', block: out[n - 1]!.block };
  return out;
}

export function allowedRegularity(theme: WeekTheme): Regularity[] {
  switch (theme) {
    case 'learn':
      return ['regular', 'game'];
    case 'build':
      return ['regular', 'semiIrregular', 'game'];
    case 'apply':
    case 'taper':
      return ['regular', 'semiIrregular', 'irregular', 'game'];
  }
}

/** Preference score for regularity: move from regular toward random over the block. */
export function regularityBonus(theme: WeekTheme, r: Regularity): number {
  const table: Record<WeekTheme, Record<Regularity, number>> = {
    learn: { regular: 0.6, semiIrregular: 0, irregular: 0, game: 0.2 },
    build: { regular: 0.2, semiIrregular: 0.6, irregular: 0, game: 0.2 },
    apply: { regular: 0, semiIrregular: 0.3, irregular: 0.6, game: 0.6 },
    taper: { regular: 0.2, semiIrregular: 0.3, irregular: 0.3, game: 0.6 },
  };
  return table[theme][r];
}

/** Session dates for the plan as written: training days from the start date on. */
export function plannedDates(profile: Profile, count: number): string[] {
  const days = [...new Set(profile.schedule.days)].sort();
  const out: string[] = [];
  if (!days.length) return out;
  let d = parseDate(profile.schedule.startDate);
  let guard = 0;
  while (out.length < count && guard < 4000) {
    if (days.includes(d.getUTCDay())) out.push(fmtDate(d));
    d = new Date(d.getTime() + 86400000);
    guard++;
  }
  return out;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return fmtDate(new Date(parseDate(s).getTime() + n * 86400000));
}
