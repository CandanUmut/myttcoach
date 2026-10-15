import type { MetricResult, Profile, Program, SessionLog } from '../engine/types';

export const SCHEMA_VERSION = 1;

export interface Settings {
  theme: 'auto' | 'light' | 'dark';
  sound: boolean;
  readCues: boolean;
}

export const defaultSettings: Settings = { theme: 'auto', sound: true, readCues: false };

export interface JournalEntry {
  id: string;
  date: string;
  opponentStyle: string;
  won: boolean | null;
  score?: string;
  worked: string[];
  didnt: string[];
  note?: string;
}

export interface ServeLabEntry {
  id: string;
  date: string;
  serveId: string;
  landings: { x: number; y: number; zone: 'short' | 'half' | 'long' | 'out' }[];
  target: 'short' | 'long' | 'mixed';
}

/** Everything the app stores. Profile and settings live in localStorage; the rest in IndexedDB. */
export interface AppData {
  schemaVersion: number;
  profile: Profile | null;
  settings: Settings;
  program: Program | null;
  logs: SessionLog[];
  overrides: Record<string, string>; // sessionId -> YYYY-MM-DD (moved by hand)
  results: MetricResult[];
  journal: JournalEntry[];
  serveLab: ServeLabEntry[];
  dismissed: string[]; // ids of banners the player dismissed
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null,
    settings: { ...defaultSettings },
    program: null,
    logs: [],
    overrides: {},
    results: [],
    journal: [],
    serveLab: [],
    dismissed: [],
  };
}
