/* All UI text lives here. Plain, short, coach-like. Sentence case. */

export const appName = 'Third Ball';

export const nav = {
  today: 'Today',
  plan: 'Plan',
  learn: 'Learn',
  library: 'Library',
  progress: 'Progress',
};

export const styleboard = {
  title: 'Style board',
  intro: 'Three looks for the app, all built from the same table tennis materials. The first one is the live look.',
  directions: {
    blade: { name: 'Blade', note: 'Warm and light. Pale blade wood, ball orange for the one main action, black rubber for text.' },
    rubber: { name: 'Rubber', note: 'Dark first. Black rubber background, red rubber for actions, a scoreboard display font.' },
    hall: { name: 'Club hall', note: 'Cool and calm. Club-hall light, table green for actions, a soft serif for headings.' },
  },
  palette: 'Colors',
  type: 'Type',
  icons: 'Icons',
  controls: 'Buttons and bars',
  sample: 'Sample screen',
  typeSample: 'Watch the ball onto your bat. Brush up and forward.',
};

export const stageNames: Record<string, string> = {
  see: 'See it',
  shadow: 'Shadow it',
  feel: 'Feel it',
  groove: 'Groove it',
  mix: 'Mix it',
  use: 'Use it',
  own: 'Own it',
};
export const stageShort: Record<string, string> = {
  see: 'See', shadow: 'Shadow', feel: 'Feel', groove: 'Groove', mix: 'Mix', use: 'Use', own: 'Own',
};

export const phaseNames: Record<string, string> = {
  physicalWarmup: 'Warm-up',
  tableWarmup: 'Warm-up at the table',
  technique: 'Technique',
  footwork: 'Footwork',
  serve: 'Serve',
  receive: 'Receive',
  matchPlay: 'Match play',
  physical: 'Fitness',
  mental: 'Mental',
  cooldown: 'Cool-down',
};

export const setupNames: Record<string, string> = {
  partner: 'With a partner',
  multiball: 'Multiball',
  robot: 'Robot',
  wall: 'Rebound board',
  shadow: 'No table',
};

export const regularityNames: Record<string, string> = {
  regular: 'Regular',
  semiIrregular: 'Semi-random',
  irregular: 'Random',
  game: 'Game',
};

export const keyPointNames: Record<string, string> = {
  stance: 'Stance',
  bodyAction: 'Body',
  strokeLength: 'Stroke length',
  timing: 'Timing',
  tablePosition: 'Where to stand',
  freeArm: 'Free arm',
  batArm: 'Bat arm',
  recovery: 'Recovery',
  anticipation: 'Reading the ball',
};

export const moveText = {
  cues: 'The three cues',
  when: 'When to use it',
  keyPoints: 'Key points',
  inGames: 'Using it in games',
  wrong: "Something's wrong?",
  wrongSub: 'Pick what you see. We will find the likely cause and a fix.',
  causes: 'Likely causes',
  fixes: 'Try this',
  fixDrill: 'Drill to fix it',
  path: 'Your path',
  stageTask: 'Task',
  passCheck: 'Pass when',
  selfChecks: 'Check yourself',
  drillsForStage: 'Drills for this stage',
  penhold: 'Penhold players',
  watch: 'Watch the move',
  animationPending: 'The 3D demo for this move is on its way. Use the key points and cues for now.',
  levelFrom: (n: number) => `From level ${n}`,
};

export const drillText = {
  target: 'Target',
  coachingPoints: 'Coaching points',
  feeder: 'For the feeder',
  minutes: (n: number) => `${n} min`,
  why: 'Why this drill',
  noVariant: 'This drill needs a setup you have not picked.',
  intensity: 'Effort',
  lowImpact: 'Low impact',
  highImpact: 'Has jumps',
  otherSetups: 'Other setups',
};

export const common = {
  back: 'Back',
  close: 'Close',
  notFound: 'That page was not found.',
  goToday: 'Go to Today',
  showAll: (n: number) => `Show all ${n}`,
  watchMove: (name: string) => `Watch: ${name}`,
};
