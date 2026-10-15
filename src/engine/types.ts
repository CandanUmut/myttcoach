import type { GoalId, Level, Phase, Setup, StageId, StyleId, WorkoutType } from '../content/types';

export type Hand = 'R' | 'L';
export type Voice = 'calm' | 'energetic' | 'direct';
export type AgeBand = 'u13' | '13-17' | '18-34' | '35-49' | '50-64' | '65+';
export type SessionLength = 20 | 30 | 45 | 60 | 90;

export interface Profile {
  name?: string;
  hand: Hand;
  grip: 'shakehand' | 'penhold' | 'unsure';
  ageBand?: AgeBand;
  level: Level;
  style: StyleId;
  goals: GoalId[]; // ranked, max 3
  moves: { id: string; mode: 'learn' | 'improve' }[];
  workoutTypes: WorkoutType[];
  setups: Setup[]; // what the player has; 'shadow' is always available
  schedule: {
    days: number[]; // 0 = Sunday … 6 = Saturday
    time: 'morning' | 'afternoon' | 'evening' | null;
    length: SessionLength;
    weeks: 4 | 6 | 8 | 12;
    startDate: string; // YYYY-MM-DD
  };
  goalMetric?: { metricId: string; start: number; target: number; targetDate: string };
  lowImpact: boolean;
  voice: Voice;
  regenCount: number;
}

export type WeekTheme = 'learn' | 'build' | 'apply' | 'taper';

export interface DrillItem {
  kind: 'drill' | 'watch';
  drillId: string | null; // null for 'watch'
  setup: Setup;
  minutes: number;
  target: string;
  targetValue?: number;
  cue: string;
  reason: string;
  focus: boolean;
  learn?: { moveId: string; stage: StageId };
  fromJournal?: string[]; // match-journal tags/opponents this drill answers
  metricId?: string;
}

export interface Block {
  phase: Phase;
  minutes: number;
  items: DrillItem[];
}

export interface Session {
  id: string; // stable: "s<index>"
  index: number; // 0-based order in the program
  week: number; // 0-based
  weekTheme: WeekTheme;
  kind: 'training' | 'assessment';
  length: number;
  blocks: Block[];
  tipId: string | null;
  coachNote: string;
  focusSkillIds: string[];
}

export interface Week {
  index: number;
  block: number; // 0-based 4-week block
  theme: WeekTheme;
  sessionIds: string[];
}

export interface FocusEntry {
  skillId: string;
  weight: number;
  addedBecause?: string; // prerequisite note
}

export interface Program {
  seed: number;
  contentVersion: string;
  regenCount: number;
  focus: FocusEntry[];
  learnOrder: string[]; // move ids in learning order
  weeks: Week[];
  sessions: Session[];
  changes: Change[];
}

export interface Change {
  atSession: number; // first session index the change applies to
  fromDrillId: string;
  toDrillId: string;
  reason: string;
}

/* Logs */
export type Felt = 'easy' | 'right' | 'hard';

export interface ItemLog {
  blockIndex: number;
  itemIndex: number;
  drillId: string | null;
  done: boolean;
  felt?: Felt;
  targetHit?: boolean;
  count?: number; // measured value (for metrics)
  stagePassed?: boolean;
}

export interface SessionLog {
  sessionId: string;
  sessionIndex: number;
  date: string; // YYYY-MM-DD
  done: boolean;
  items: ItemLog[];
}

export interface MetricResult {
  metricId: string;
  date: string;
  value: number;
  source: 'test' | 'log';
  sessionId?: string;
}

/** What the engine reads from a match-journal entry. */
export interface MatchNote {
  id: string;
  date: string; // YYYY-MM-DD
  opponentStyle: string;
  lefty?: boolean;
  won: boolean | null;
  didnt: string[];
}
