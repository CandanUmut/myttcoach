import { createStore, get, set, del } from 'idb-keyval';
import { migrate } from './migrations';
import { emptyData, SCHEMA_VERSION, type AppData } from './schema';

const LS_KEY = 'thirdball:v1';
const IDB_KEYS = ['program', 'logs', 'overrides', 'results', 'journal', 'serveLab', 'dismissed'] as const;
type IdbKey = (typeof IDB_KEYS)[number];

let store: ReturnType<typeof createStore> | null = null;
function idb() {
  if (!store && typeof indexedDB !== 'undefined') store = createStore('thirdball', 'data');
  return store;
}

function readLocal(): Record<string, unknown> {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export async function loadAll(): Promise<AppData> {
  const local = readLocal();
  const raw: Record<string, unknown> = { ...local };
  const st = idb();
  if (st) {
    for (const k of IDB_KEYS) {
      try {
        const v = await get(k, st);
        if (v !== undefined) raw[k] = v;
      } catch {
        /* storage blocked: fall back to empty */
      }
    }
  }
  if (!('schemaVersion' in raw)) return Object.keys(raw).length ? migrate(raw) : emptyData();
  return migrate(raw);
}

export function saveLocal(d: Pick<AppData, 'profile' | 'settings'>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, profile: d.profile, settings: d.settings }));
  } catch {
    /* private mode or full: keep going in memory */
  }
}

export async function saveIdb<K extends IdbKey>(key: K, value: AppData[K]) {
  const st = idb();
  if (!st) return;
  try {
    await set(key, value, st);
  } catch {
    /* ignore */
  }
}

export async function clearAll() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  const st = idb();
  if (st) for (const k of IDB_KEYS) await del(k, st).catch(() => undefined);
}
