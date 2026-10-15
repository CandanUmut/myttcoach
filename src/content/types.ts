/* Content model. All coaching content is JSON in /content, typed here,
   and validated in tests and in the build. */

export type Level = 1 | 2 | 3 | 4 | 5;
export type Setup = 'partner' | 'multiball' | 'robot' | 'wall' | 'shadow';
export type Wing = 'FH' | 'BH' | 'none';

export type SkillCategory = 'fundamental' | 'stroke' | 'serve' | 'receive' | 'footwork' | 'tactic' | 'physical' | 'mental';

export type Phase =
  | 'physicalWarmup' | 'tableWarmup' | 'technique' | 'footwork' | 'serve'
  | 'receive' | 'matchPlay' | 'physical' | 'mental' | 'cooldown';

export type Regularity = 'regular' | 'semiIrregular' | 'irregular' | 'game';

export type StageId = 'see' | 'shadow' | 'feel' | 'groove' | 'mix' | 'use' | 'own';
export const STAGES: StageId[] = ['see', 'shadow', 'feel', 'groove', 'mix', 'use', 'own'];

export type StyleId = 'closeAttacker' | 'allRoundAttacker' | 'midLooper' | 'penholdAttacker' | 'chopper' | 'blocker' | 'balanced';
export type GoalId =
  | 'basics' | 'consistency' | 'attack' | 'serveReceive' | 'footwork' | 'defense'
  | 'tactics' | 'fitness' | 'comeback' | 'tournament';
export type WorkoutType = 'technique' | 'footwork' | 'serveReceive' | 'matchPlay' | 'fitness' | 'mental';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  levelMin: Level;
  levelMax: Level;
  prerequisites: string[];
  styleWeights: Partial<Record<StyleId, number>>;
  summary: string;
  moveIds: string[];
}

export interface LearningStage {
  stage: StageId;
  task: string;
  passCheck: string;
  drillIds: string[];
  selfChecks?: string[];
}

export interface Move {
  id: string;
  name: string;
  skillId: string;
  wing: Wing;
  levelMin: Level;
  summary: string;
  whenToUse: string;
  keyPoints: {
    stance: string; bodyAction: string; strokeLength: string; timing: string;
    tablePosition: string; freeArm: string; batArm: string; recovery: string; anticipation: string;
  };
  cues: string[];
  learningPath: LearningStage[];
  gamePatterns: { situation: string; how: string; drillId: string }[];
  troubleshooting: { symptom: string; causes: string[]; fixes: string[]; drillId: string }[];
  penholdNotes?: string;
  animationId: string | null;
}

export interface DrillVariant {
  setup: Setup;
  instructions: string;
  feederInstructions?: string;
}

export interface Drill {
  id: string;
  name: string;
  purpose: string;
  skills: { id: string; weight: number }[];
  levelMin: Level;
  levelMax: Level;
  phase: Phase;
  regularity: Regularity;
  variants: DrillVariant[];
  duration: { min: number; default: number; max: number };
  intensity: 1 | 2 | 3 | 4 | 5;
  impact: 'low' | 'high';
  success: { type: 'consecutive' | 'outOf' | 'timed'; target: number; of?: number; description: string };
  metricId?: string;
  progressionId?: string;
  regressionId?: string;
  lowImpactId?: string;
  coachingPoints: string[];
  moveIds: string[];
  diagram?: {
    placements: { zone: string; depth: 'short' | 'half' | 'long'; order: number }[];
    arrows: { from: string; to: string }[];
  };
}

export interface Metric {
  id: string;
  name: string;
  unit: string;
  howToMeasure: string;
  testDrillId: string;
  higherIsBetter: boolean;
  skillId: string;
  levelTargets: Record<Level, number>;
}

export interface Tip {
  id: string;
  text: string;
  skills: string[];
  levelMin: Level;
  levelMax: Level;
  tags: string[];
}

export interface Style {
  id: StyleId;
  name: string;
  summary: string;
  howTheyPlay: string;
  strengths: string[];
  watchOuts: string[];
  playingAgainst: string;
  quizHint: string;
}

export interface Goal {
  id: GoalId;
  name: string;
  summary: string;
  skillWeights: Record<string, number>;
  workoutShift: Partial<Record<WorkoutType, number>>;
  suggestedMetricId?: string;
}

export interface SessionTemplate {
  length: number;
  blocks: { phase: Phase; minutes: number }[];
}

export interface Templates {
  sessions: SessionTemplate[];
  dropPriority: Phase[];
  workoutPhases: Record<WorkoutType, Phase[]>;
  noTablePhases: Phase[];
}

/** A match-journal tag or opponent style and the skills it points to. */
export interface JournalTag {
  id: string;
  name: string;
  skillWeights: Record<string, number>;
}

export interface JournalContent {
  tags: JournalTag[];
  opponents: JournalTag[];
}

/** Spin and angle helper. Angles in degrees: bat from upright (+ open, − closed); swing from forward (+ up, − down). */
export interface SpinSetting {
  angle: number;
  swing: number;
}
export interface SpinCell {
  stroke: string;
  spin: string;
  light: SpinSetting;
  heavy: SpinSetting;
  note: string;
  better?: string;
}
export interface SpinHelper {
  spins: { id: string; name: string }[];
  strokes: { id: string; name: string; moveId: string }[];
  cells: SpinCell[];
}

export interface Content {
  version: string;
  skills: Skill[];
  moves: Move[];
  drills: Drill[];
  metrics: Metric[];
  tips: Tip[];
  styles: Style[];
  goals: Goal[];
  templates: Templates;
  journal: JournalContent;
  spinHelper: SpinHelper;
}
