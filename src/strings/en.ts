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

/* Engine text: reasons, coach notes and targets. Rule-chosen templates. */
type VoiceSet = { calm: string; energetic: string; direct: string };
export const engineText = {
  addedPrereq: (pre: string, dep: string) => `Added ${pre} because ${dep} needs it.`,
  reasonLearn: (move: string, stageN: number, stage: string) => `${move}, stage ${stageN} of 7: ${stage}.`,
  reasonWatch: (move: string) => `First look at ${move}: watch it slowly, phase by phase.`,
  reasonNoSetup: (move: string) => `${move}: this stage needs a table and a feed, so shadow it for now.`,
  reasonFocus: (skill: string) => `Works on ${skill}, one of your focus skills.`,
  reasonGoal: (goal: string) => `Part of your goal: ${goal.toLowerCase()}.`,
  reasonMove: (move: string) => `Builds the ${move} you chose to work on.`,
  reasonKeep: (skill: string) => `Keeps your ${skill.toLowerCase()} sharp.`,
  reasonPhase: {
    physicalWarmup: 'Gets your body ready to play.',
    tableWarmup: 'Finds your timing before the main work.',
    cooldown: 'Brings your heart rate down and helps you recover.',
    physical: 'Builds the legs and core table tennis needs.',
    mental: 'Trains the calm, clear head you need in matches.',
  } as Record<string, string>,
  reasonTest: (metric: string) => `Test: ${metric}. Your result goes on your goal curve.`,
  reasonRandom: 'Random placement this week, to read and react like in a match.',
  swapProgress: (from: string, to: string, target: string) => `Swapped ${from} for ${to}: you hit the target (${target}) twice and it felt too easy.`,
  swapHard: (from: string, to: string) => `Swapped ${from} for ${to}: it felt too hard twice in a row.`,
  swapMissed: (from: string, to: string) => `Swapped ${from} for ${to}: the target was missed 3 times in a row, so we step back first.`,
  weekTheme: {
    learn: 'Learn',
    build: 'Build',
    apply: 'Apply and test',
    taper: 'Taper',
  } as Record<string, string>,
  weekThemeLong: {
    learn: 'Regular drills at a moderate pace. Shape before speed.',
    build: 'More volume and some semi-random drills.',
    apply: 'Random drills, games and a short test at the end of the week.',
    taper: 'Lighter week. Sharp serves, calm head, fresh legs.',
  } as Record<string, string>,
  notes: {
    welcome: {
      calm: 'Welcome, {name}. We start gently: shape first, then rhythm. Enjoy it.',
      energetic: "Let's go, {name}! First session. Build the base and have fun with it.",
      direct: 'First session, {name}. Focus on clean shape. Speed comes later.',
    } as VoiceSet,
    learn: {
      calm: 'This week is about learning. Slow, regular balls. Get the shape right before you add speed.',
      energetic: 'Learning week! Lots of clean reps. Nail the shape and the speed will come.',
      direct: 'Learning week. Regular drills. Shape first, speed second.',
    } as VoiceSet,
    build: {
      calm: 'Build week: a bit more volume and a few drills where the ball goes to different places. Stay relaxed.',
      energetic: 'Build week! More reps, more movement. Push the targets a little.',
      direct: 'Build week. More volume, semi-random placement. Keep the quality.',
    } as VoiceSet,
    apply: {
      calm: 'This week we use what you learned in random drills and small games. Trust your strokes.',
      energetic: 'Apply week! Random balls, games, real pressure. Show what you built.',
      direct: 'Apply week. Random drills and games. Test at the end of the week.',
    } as VoiceSet,
    taper: {
      calm: 'Lighter week before your tournament. Keep it sharp and stay fresh.',
      energetic: 'Taper time! Short, sharp, confident. Save your legs for the big day.',
      direct: 'Taper. Less volume, sharp serves and receives, rest well.',
    } as VoiceSet,
    test: {
      calm: 'Test day, {name}. Warm up well, then give each test three calm tries. It is a check, not an exam.',
      energetic: "Test day, {name}! Warm up properly, then go for your best numbers.",
      direct: 'Test day. Warm up, then three tries per test. Log your best.',
    } as VoiceSet,
    stage: {
      calm: 'New stage for {move}: {stage}. {task}',
      energetic: '{move} moves up: {stage}! {task}',
      direct: '{move}: {stage}. {task}',
    } as VoiceSet,
    focus: {
      calm: 'Main focus today: {skill}. Pick one cue and stay with it.',
      energetic: 'Today we hammer {skill}. One cue, full attention!',
      direct: 'Focus: {skill}. One cue per drill.',
    } as VoiceSet,
  },
  target: {
    inARow: (n: number) => `${n} in a row`,
    outOf: (n: number, of: number) => `${n} of ${of}`,
  },
};
