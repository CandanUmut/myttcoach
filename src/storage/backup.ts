import { migrate } from './migrations';
import type { AppData } from './schema';

export const BACKUP_APP = 'third-ball';

export function toBackup(d: AppData, now: string): string {
  return JSON.stringify({ app: BACKUP_APP, exportedAt: now, ...d }, null, 2);
}

/** Parse and check a backup file. Throws a plain-language error when it isn't ours. */
export function fromBackup(text: string): AppData {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not a backup from this app (it is not valid JSON).');
  }
  if (!raw || typeof raw !== 'object' || raw.app !== BACKUP_APP) throw new Error('That file is not a backup from this app.');
  const { app: _a, exportedAt: _e, ...rest } = raw;
  void _a;
  void _e;
  const d = migrate(rest);
  if (d.profile && (typeof d.profile.level !== 'number' || !d.profile.schedule)) throw new Error('The backup looks damaged: the profile is incomplete.');
  if (!Array.isArray(d.logs)) throw new Error('The backup looks damaged: the training log is missing.');
  return d;
}
