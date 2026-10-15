import type { MetricResult, Profile, Program, SessionLog } from '../engine/types';
import type { StageId } from '../content/types';
import type { LandingZone, ServeTarget } from '../engine/serveLab';

export const SCHEMA_VERSION = 2;

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
  lefty?: boolean; // left-handed opponent
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
  landings: { x: number; y: number; zone: LandingZone }[];
  target: ServeTarget;
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
  stagePasses: StagePass[]; // learning stages passed outside a session (e.g. "I've watched it")
}

export interface StagePass {
  moveId: string;
  stage: StageId;
  date: string;
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
    stagePasses: [],
  };
}
