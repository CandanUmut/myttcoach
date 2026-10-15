import { computed, signal } from '@preact/signals';
import { content } from '../content/load';
import { generateProgram } from '../engine/generate';
import { adaptProgram, deriveState } from '../engine/adapt';
import { journalFocus } from '../engine/journal';
import { sessionDates } from '../engine/schedule';
import type { Change, MetricResult, Profile, Program, Session, SessionLog } from '../engine/types';
import type { StageId } from '../content/types';
import { clearAll, loadAll, saveIdb, saveLocal } from '../storage/persist';
import { emptyData, type AppData, type JournalEntry, type ServeLabEntry, type Settings } from '../storage/schema';

export const data = signal<AppData>(emptyData());
export const loaded = signal(false);

/** Device-local date, YYYY-MM-DD. */
export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const today = signal(todayStr());
if (typeof window !== 'undefined') {
  // keep "today" right when the app stays open past midnight
  setInterval(() => {
    const t = todayStr();
    if (t !== today.value) today.value = t;
  }, 60_000);
}

export const profile = computed(() => data.value.profile);
export const program = computed(() => data.value.program);

export const dates = computed<Record<string, string>>(() => {
  const d = data.value;
  if (!d.program || !d.profile) return {};
  return sessionDates(d.program, d.profile, d.logs, d.overrides, today.value);
});

export const logBySession = computed(() => new Map(data.value.logs.map((l) => [l.sessionId, l])));

export const engineState = computed(() => {
  const d = data.value;
  if (!d.program || !d.profile) return { stageOf: {}, changes: [], learnedSkills: [] };
  return deriveState(d.logs, d.profile, content, d.program, d.stagePasses);
});

/** Next session not done yet, in plan order. */
export const nextSession = computed<Session | null>(() => {
  const p = data.value.program;
  if (!p) return null;
  const logs = logBySession.value;
  const ds = dates.value;
  const open = p.sessions.filter((s) => !logs.get(s.id)?.done);
  // earliest date first (a session moved by hand can be later than the next one in plan order)
  return open.sort((a, b) => (ds[a.id] ?? '').localeCompare(ds[b.id] ?? '') || a.index - b.index)[0] ?? null;
});

export function applyTheme(t: Settings['theme']) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

export async function init() {
  const d = await loadAll();
  // A profile without a plan (storage partly cleared): rebuild the plan from the profile
  if (d.profile && !d.program) {
    d.program = generateProgram(d.profile, content);
    void saveIdb('program', d.program);
  }
  data.value = d;
  applyTheme(d.settings.theme);
  loaded.value = true;
}

function update(patch: Partial<AppData>) {
  const next = { ...data.value, ...patch };
  data.value = next;
  if ('profile' in patch || 'settings' in patch) saveLocal(next);
  for (const k of ['program', 'logs', 'overrides', 'results', 'journal', 'serveLab', 'dismissed', 'stagePasses'] as const) {
    if (k in patch) void saveIdb(k, next[k] as never);
  }
}

/** Session-player drafts live in sessionStorage; clear them whenever plans change. */
export function clearPlayerDrafts() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith('thirdball:play:')) sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/** First plan: new profile, fresh program. */
export function createPlan(p: Profile) {
  const notes = data.value.journal;
  const state = notes.length ? { stageOf: {}, changes: [], learnedSkills: [], journal: journalFocus(notes, content) } : undefined;
  const prog = generateProgram(p, content, { state });
  clearPlayerDrafts();
  update({ profile: p, program: prog, logs: [], overrides: {}, results: [], stagePasses: [] });
}

/** Profile edit: past sessions and logs stay; future sessions are rebuilt. */
export function updateProfile(p: Profile, regenerate: boolean) {
  const d = data.value;
  if (!regenerate || !d.program) {
    update({ profile: p });
    return;
  }
  const k = d.logs.length ? Math.max(...d.logs.map((l) => l.sessionIndex)) + 1 : 0;
  const state = d.profile ? deriveState(d.logs, p, content, d.program, d.stagePasses, d.journal) : undefined;
  const prog = generateProgram(p, content, { past: d.program.sessions.slice(0, k), state });
  clearPlayerDrafts();
  const overrides = Object.fromEntries(Object.entries(d.overrides).filter(([id]) => Number(id.slice(1)) < k));
  update({ profile: p, program: prog, overrides });
}

/** Save a session log, record metric results, and re-plan the future. Returns new changes. */
export function logSession(log: SessionLog): Change[] {
  const d = data.value;
  if (!d.program || !d.profile) return [];
  const logs = [...d.logs.filter((l) => l.sessionId !== log.sessionId), log];
  // results from this session replace any saved earlier for it (leave, then finish, then reopen)
  const results: MetricResult[] = d.results.filter((r) => r.sessionId !== log.sessionId);
  const session = d.program.sessions[log.sessionIndex];
  for (const it of log.items) {
    if (!it.done || typeof it.count !== 'number') continue;
    const planned = session?.blocks[it.blockIndex]?.items[it.itemIndex];
    if (planned?.metricId) {
      results.push({ metricId: planned.metricId, date: log.date, value: it.count, source: 'test', sessionId: log.sessionId });
    } else if (planned?.drillId) {
      const metric = content.metrics.find((m) => m.testDrillId === planned.drillId);
      if (metric) results.push({ metricId: metric.id, date: log.date, value: it.count, source: 'log', sessionId: log.sessionId });
    }
  }
  const { program: prog, newChanges } = adaptProgram(d.program, logs, d.profile, content, d.stagePasses, d.journal);
  update({ logs, results, program: prog });
  return newChanges;
}

/** Mark a learning stage as passed outside a session; future sessions move to the next stage. */
export function passStage(moveId: string, stage: StageId) {
  const d = data.value;
  if (!d.program || !d.profile) return;
  const stagePasses = [...d.stagePasses, { moveId, stage, date: today.value }];
  const { program: prog } = adaptProgram(d.program, d.logs, d.profile, content, stagePasses, d.journal);
  update({ stagePasses, program: prog });
}

export function moveSession(id: string, date: string) {
  update({ overrides: { ...data.value.overrides, [id]: date } });
}

export function addResult(r: MetricResult) {
  update({ results: [...data.value.results, r] });
}

export function setSettings(s: Partial<Settings>) {
  const settings = { ...data.value.settings, ...s };
  update({ settings });
  applyTheme(settings.theme);
}

export function dismiss(id: string) {
  if (!data.value.dismissed.includes(id)) update({ dismissed: [...data.value.dismissed, id] });
}

/**
 * Save (or edit) a match and re-plan future sessions with the journal.
 * Returns what the journal now puts into the upcoming sessions.
 */
export function saveJournal(j: JournalEntry): JournalPlan {
  return replanJournal([...data.value.journal.filter((x) => x.id !== j.id), j]);
}

export function deleteJournal(id: string) {
  replanJournal(data.value.journal.filter((x) => x.id !== id));
}

function replanJournal(journal: JournalEntry[]): JournalPlan {
  const d = data.value;
  if (!d.program || !d.profile) {
    update({ journal });
    return { sessions: 0, drills: [] };
  }
  // past (logged) sessions stay; the future is rebuilt with the new journal
  const k = d.logs.length ? Math.max(...d.logs.map((l) => l.sessionIndex)) + 1 : 0;
  const state = deriveState(d.logs, d.profile, content, d.program, d.stagePasses, journal);
  const program = generateProgram(d.profile, content, { past: d.program.sessions.slice(0, k), state });
  clearPlayerDrafts();
  update({ journal, program });
  return journalPlan(program, k);
}

export interface JournalPlan {
  /** Upcoming sessions with a journal drill. */
  sessions: number;
  /** Names of those drills, without repeats. */
  drills: string[];
}

/** What the match journal actually put into the sessions from index `from` on. */
export function journalPlan(prog: Program, from: number): JournalPlan {
  let sessions = 0;
  const drills: string[] = [];
  for (const s of prog.sessions.slice(from)) {
    const items = s.blocks.flatMap((b) => b.items).filter((i) => i.fromJournal && i.drillId);
    if (items.length) sessions++;
    for (const i of items) {
      const name = content.drills.find((x) => x.id === i.drillId)?.name;
      if (name && !drills.includes(name)) drills.push(name);
    }
  }
  return { sessions, drills };
}

export function saveServeLab(e: ServeLabEntry) {
  update({ serveLab: [...data.value.serveLab, e] });
}

export function replaceAll(d: AppData) {
  clearPlayerDrafts();
  update({ ...d });
  saveLocal(d);
  applyTheme(d.settings.theme);
}

export async function resetAll() {
  await clearAll();
  clearPlayerDrafts();
  data.value = emptyData();
  applyTheme('auto');
}
