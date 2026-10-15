import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/storage/migrations';
import { fromBackup, toBackup } from '../../src/storage/backup';
import { emptyData, SCHEMA_VERSION } from '../../src/storage/schema';
import { intermediatePartner } from '../fixtures/profiles';

describe('storage', () => {
  it('migrates unversioned data and fills new collections', () => {
    const d = migrate({ profile: intermediatePartner, logs: [] });
    expect(d.schemaVersion).toBe(SCHEMA_VERSION);
    expect(d.journal).toEqual([]);
    expect(d.settings.sound).toBe(true);
  });
  it('refuses data from a newer version', () => {
    expect(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/newer version/);
  });
  it('backup round-trips', () => {
    const d = { ...emptyData(), profile: intermediatePartner };
    const back = fromBackup(toBackup(d, '2026-10-15T10:00:00Z'));
    expect(back.profile).toEqual(intermediatePartner);
  });
  it('rejects files that are not ours', () => {
    expect(() => fromBackup('{"hello":1}')).toThrow(/not a backup/);
    expect(() => fromBackup('nope')).toThrow(/not valid JSON/);
  });
});
