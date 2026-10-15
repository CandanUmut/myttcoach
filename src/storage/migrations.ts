import { emptyData, SCHEMA_VERSION, type AppData } from './schema';

type Migration = (d: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] upgrades data from version n to n + 1. */
const migrations: Record<number, Migration> = {
  // 0 -> 1: data written before versioning; fill in the new collections
  0: (d) => ({ ...d, journal: d.journal ?? [], serveLab: d.serveLab ?? [], dismissed: d.dismissed ?? [] }),
};

export function migrate(raw: Record<string, unknown>): AppData {
  let d = { ...raw };
  let v = typeof d.schemaVersion === 'number' ? (d.schemaVersion as number) : 0;
  if (v > SCHEMA_VERSION) throw new Error(`This data is from a newer version of the app (${v}).`);
  while (v < SCHEMA_VERSION) {
    const m = migrations[v];
    if (m) d = m(d);
    v++;
    d.schemaVersion = v;
  }
  const base = emptyData();
  return { ...base, ...(d as Partial<AppData>), settings: { ...base.settings, ...((d.settings as object) ?? {}) } } as AppData;
}
