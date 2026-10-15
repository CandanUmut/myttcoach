import { computed, signal } from '@preact/signals';
import { content } from '../content/load';
import { generateProgram } from '../engine/generate';
import { adaptProgram, deriveState } from '../engine/adapt';
import { sessionDates } from '../engine/schedule';
import type { Change, MetricResult, Profile, Session, SessionLog } from '../engine/types';
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
  return deriveState(d.logs, d.profile, content, d.program);
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
  for (const k of ['program', 'logs', 'overrides', 'results', 'journal', 'serveLab', 'dismissed'] as const) {
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
  const prog = generateProgram(p, content);
  clearPlayerDrafts();
  update({ profile: p, program: prog, logs: [], overrides: {}, results: [] });
}

/** Profile edit: past sessions and logs stay; future sessions are rebuilt. */
export function updateProfile(p: Profile, regenerate: boolean) {
  const d = data.value;
  if (!regenerate || !d.program) {
    update({ profile: p });
    return;
  }
  const k = d.logs.length ? Math.max(...d.logs.map((l) => l.sessionIndex)) + 1 : 0;
  const state = d.profile ? deriveState(d.logs, p, content, d.program) : undefined;
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
  const { program: prog, newChanges } = adaptProgram(d.program, logs, d.profile, content);
  update({ logs, results, program: prog });
  return newChanges;
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

export function saveJournal(j: JournalEntry) {
  update({ journal: [...data.value.journal.filter((x) => x.id !== j.id), j] });
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
