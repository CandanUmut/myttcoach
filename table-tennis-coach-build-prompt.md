# Build Prompt v2: Table Tennis Coach — a personal, deterministic training app on GitHub Pages

How to use: open Claude Code in an empty folder and paste this whole file as the first message (or save it there as `BUILD_PROMPT.md` and say "Read BUILD_PROMPT.md and start Phase 0"). Phase 0 creates the GitHub repo.

---

## 0. How to work with me (read first, follow always)

- Honesty first. Tell me the truth, including bad news. Plain, simple words.
- Every message: short summary first, then details.
- Work in the phases in section 18. At the end of each phase — and at least every 30–45 minutes of work — stop and show me proof (section 17). Never work a long stretch without showing me something.
- If I send a message while you are working, stop and answer it first.
- Small fixes: just do them. Anything that changes how something works or feels, its design, or its defaults: ask me first.
- If a task turns out bigger than expected, tell me the size before starting it.
- If my request is unclear: take the smallest safe step, show me the result, ask which way to go.
- When something imitates the real world (the 3D player, ball flight, physics), ask me whether realism or ease of use should win.
- Never rewrite something that already works because of a number from a test that doesn't match my real setup. Headless browsers render WebGL with a slow software renderer: use them for screenshots and correctness only, never to judge 3D performance. Ask me to check performance on my real device.
- Touch-first: the app is used on a phone or tablet next to the table. No feature may depend on a keyboard or mouse hover.
- Mistakes: say plainly what went wrong, offer to undo it, let me decide.
- Don't invent preferences for me. Features marked "Proposed" (section 9) need my yes before you build them.

---

## 1. Vision

The best table tennis training app there is: **a personal coach in your pocket, with no AI and no server.**

The player picks their level, goals, the skills and kinds of workouts they want, their playing style, equipment and schedule. A rule-based engine builds a program that is unique to them. The app then **holds their hand**: how to learn each new move step by step, how to use it in real games, and an improvement path with a goal curve they can try to keep up with. Every move is shown by our own animated 3D player.

It must feel simple, useful, warm and beautiful — clearly made for table tennis players, and never like a generic AI-made app.

---

## 2. Hard constraints

- Static site on GitHub Pages. No backend, no accounts, no runtime API calls, no AI/LLM.
- No `Math.random()` in program logic. All variety comes from a seeded PRNG (section 12).
- No notifications of any kind. Scheduling lives inside the app only.
- All user data stays on the device (localStorage / IndexedDB). JSON backup export/import.
- Works offline after the first visit (PWA).
- English only. All UI text in one strings file (`src/strings/en.ts`).
- Mobile-first: great at 390×844, scales to tablet and desktop.
- All coaching content in our own words. Sources (section 20) may be read for facts, never copied.
- No analytics, no trackers, no runtime CDNs. Fonts and all assets are bundled in the repo.
- App license: MIT.

---

## 3. Decisions already made

- **D1 — 3D player is our own.** Our own character model and our own animation data. Style: stylized and clean, not photo-real (ease over realism was chosen; ask me again before Phase 5 per section 0).
- **D2 — No Mixamo, and nothing derived from it.** Do not download, copy, trace, retarget, convert or "reverse engineer" motion or models from Mixamo or any other source whose license doesn't allow redistribution. A copied motion is still their data, even after editing. Watching real table tennis videos as a visual reference is fine; every keyframe we ship is authored by us.
- **D3 — No GPL code** (e.g. mannequin.js), so the app can stay MIT. Using the same joint names as mannequin.js is fine (names are not code).
- **D4 — Schedule is in-app only.** Calendar and "Today" screen inside the app. No push, no local notifications, no calendar export.
- **D5 — English only.**
- **D6 — Claude Code creates the GitHub repo** in Phase 0 (section 16).

---

## 4. Design direction (as important as the features)

Goal: **sleek, simple, warm, personal, and unmistakably table tennis.** It must not look like another generic AI-made app.

**Root every visual choice in the world of table tennis:** blade wood and its ply layers, the orange and white ball, red and black rubber, the table surface with its white lines, the net, ball flight arcs, spin.

- **Colors — warm and simple.** Build the palette from those materials: blade-wood tones, ball orange, rubber red, deep charcoal from black rubber, and at most one calm table color used sparingly. Define 4–6 named colors as tokens, plus a warm dark mode. Avoid the overused looks: cream background with a terracotta accent (e.g. #F4F1EA + #D97757), purple/blue gradients, neon on black.
- **Fonts.** 1–2 distinctive open-license (SIL OFL) fonts, self-hosted. Not Inter, Roboto, Arial, Space Grotesk or the system default. Body text must be easy to read at arm's length from a phone lying on the table edge. Show me 2–3 pairings; I pick.
- **Icons.** Our own SVG icon set, drawn for this app, all table-tennis themed, one consistent style (same grid, stroke width, corners). No emoji, no stock icon packs (Material, Lucide, Font Awesome). Starting set: Today = table seen from above · Plan = ball on a calendar grid · Learn = paddle · Session = bouncing ball · Library = multiball basket · Progress = rising ball arc over a net · Settings = blade cross-section with ply layers · Footwork = footprints · Serve = ball toss from an open palm · Spin = ball with spin arrows · Match = scoreboard · Goal = target zone on the table.
- **Backgrounds.** Drawn in SVG/CSS, light and subtle: table surface with its white edge line, the net's shadow, faint ball trajectories, blade ply stripes. Each main screen can have its own variation of the same motif. No stock photos, no random blobs, no gradient washes.
- **Buttons, bars and controls.** Custom, not a default component kit. Ideas to explore (keep them usable): progress bars as a ball arc over a net; stage steppers as ball bounces; dividers from blade ply layers; a press effect that feels like a ball hitting rubber. Clear hierarchy — not every element gets the same rounded card, radius and grey shadow.
- **Motion.** One signature motion (the ball arc / bounce), used for moments that matter: finishing a drill, passing a learning stage, hitting a goal. Motion answers the user's actions; no fade-in on every section. Respect "reduce motion".
- **Words.** Plain, short, coach-like, specific. Sentence case. No hype ("Unlock your potential!"), no ALL-CAPS labels, no "A · B · C" meta strings, no arrow glyphs on every button. Empty screens say what to do next.
- **Simplicity.** One main action per screen. Tap targets at least 48 px. Thumb-friendly bottom navigation.
- **Personal.** The app uses the player's name, level, style, hand and goals in what it shows (player card, coach notes, "why this drill"). Personal means useful, not decoration.
- **Restraint.** Spend boldness in one place — the ball-arc motif and the 3D player. Keep everything else quiet and clean.

**Process:** Phase 1 builds a style board page (`#/styleboard`) with 2–3 directions, each showing palette, fonts, icon samples, background, buttons, a progress bar, and one sample screen. Send me phone-size screenshots. I pick. After that, don't change the design system without my yes. If a frontend-design skill is available to you, use it.

---

## 5. Players and levels

Five levels, shown everywhere with plain names:

| Level | Name | Typically can... |
|---|---|---|
| 1 | Beginner | New or casual. Learning grip, ready stance, keeping the ball on the table. |
| 2 | Improver | Rally forehand and backhand counter-hits (20+ in a row, slow), push backspin, serve legally. |
| 3 | Intermediate | Loop against backspin, block topspin, serve with spin, do regular footwork drills. |
| 4 | Advanced | Topspin from both wings, varied serves, third-ball attack, random drills, plays league or rated matches. |
| 5 | Competitive | Tournament player. Fine-tuning technique, tactics against styles, physical planning. |

**Placement quiz (deterministic):** suggested level = the highest level whose checks are all "yes" (level 1 has none). User can override.
- L2: I can keep a forehand rally going 20+ times · same on backhand · I can push a backspin ball back low most of the time.
- L3: I can serve with clear backspin or sidespin · I can loop a backspin ball onto the table most of the time · I can block a topspin ball.
- L4: I can do footwork drills (e.g. Falkenberg) without breaking down · I attack the third ball after my serve on purpose · I play league or rated matches.
- L5: I play tournaments regularly.

**Level-up:** suggested by the engine when assessment results pass the next level's targets; the player confirms.

---

## 6. Onboarding (short steps, all editable later)

1. Name (optional), dominant hand, grip (shakehand / penhold / not sure), optional age band (used only for warm-up length and intensity).
2. Level (quiz above).
3. Playing style — pick one or "Help me choose" (short quiz): close-to-table attacker · all-round attacker · mid-distance looper · penhold attacker · attacking chopper (defender) · close-to-table blocker / pips player · not sure (balanced).
4. Goals — up to 3, ranked: learn the basics · consistency · attack / topspin · serve and receive · footwork · defense / blocking · match tactics · table-tennis fitness · coming back after a break · preparing for a tournament.
5. Moves to learn or improve — from the move catalog, filtered to level ±1, marked "learn" or "improve".
6. Workout types I want more of — technique · footwork · serve and receive · match play · fitness · mental. Shifts session minutes toward these.
7. Practice setup — table + partner · partner who can feed multiball · ball robot · wall / rebound board · no table (shadow and fitness only).
8. Schedule — training days, preferred time, session length (20 / 30 / 45 / 60 / 90 min), program length (4 / 6 / 8 / 12 weeks), start date.
9. A measurable goal for the goal curve (section 8), with a suggested target the player can change.
10. Options — low-impact mode (no jumps or bounds), coach voice (calm / energetic / straight-to-the-point; changes wording only).

Finish with a **player card** (level, style, hand, goals, focus moves) and a plain "Why this plan" summary.

---

## 7. Learning a new move — the hand-holding path

Every move has the same 7 stages. Each stage has one clear task, a pass check, and a big "What's next" button. The order is recommended, not forced; the app always shows honestly where the player is.

1. **See it** — watch the 3D player at slow speed, phase by phase (ready → backswing → contact → follow-through → recover). Read the 3 cues.
2. **Shadow it** — follow-along mode: the 3D player loops slowly with a steady beat; the player copies it without a ball for a set number of reps, then answers 3 yes/no self-checks.
3. **Feel it** — first contact with an easy, regular feed (variant picked for their setup: multiball, robot, partner, or wall). Small target.
4. **Groove it** — consistency target (e.g. 20 in a row), then placement targets.
5. **Mix it** — combine it with another stroke (e.g. push → loop), semi-irregular placement.
6. **Use it** — game situations: when this move is the right choice, the patterns to use it in (e.g. "short backspin serve → long push comes back → forehand loop to the elbow"), and a practice-game challenge ("win 3 points with it").
7. **Own it** — pass a test drill. The move is marked learned on the path and the player card.

Each move also has a **"Something's wrong?" helper**: the player picks what they see (ball goes into the net, ball goes long, no spin, late contact, off balance…) → likely causes → simple fixes → a drill to fix it. Pure lookup tables.

The engine puts the current stage of each "learn" move into upcoming sessions automatically.

---

## 8. Improvement path and goal curve

- **Improvement path:** a visual path from the player's current level to their goal level, with milestones (moves to own, tests to pass). Done, current and next steps are clear at a glance.
- **Goal curve:** for each measurable goal (e.g. "FH loops against backspin in a row: 5 → 25 by Dec 31"), draw a planned curve from start to target:
  `planned(t) = start + (target − start) × (1 − (1 − t/T)²)` — faster gains early, slower later.
  Plot the player's real results (from test drills and logged success counts) on the same chart. A band of ±10% around the plan shows the zone to stay in.
- **Status in plain words:** "On track", "Ahead", or "Behind". When behind twice in a row, offer choices — add a short extra block for this skill, or move the goal date — and let the player decide. Never change the goal silently.
- **Honesty:** a short note says the curve is a target to chase, not a prediction.
- Metrics come from the content (section 10): each has a name, unit, how to measure it, and a test drill.

---

## 9. Features

**Core (asked for — build these):** levels; in-app schedule; choosing goals, moves and workout types; a unique program per player; tips, tricks, moves, styles and exercises; a 3D animation for each move; the learning path (section 7); how to use moves in games; improvement path and goal curve (section 8); the unique design (section 4).

**Proposed (ask me in Phase 0 which to keep — don't build without my yes):**
- **Spin and angle helper:** pick the incoming spin and your stroke → see the blade angle and swing direction on the 3D ball and paddle. Lookup table.
- **Serve lab:** serve library with toss and contact visuals, plus a target game: the player taps where each serve landed on a table diagram; score and trend.
- **Match journal:** log a match (opponent style, result, what worked, what didn't, as quick tags). Rules turn the tags into extra focus in the next sessions (e.g. "lost to a chopper" → anti-chop drills).
- **Daily challenge:** one small challenge per day, chosen by rules from the player's focus (seeded by date + profile).
- **Milestones:** quiet, table-tennis themed markers (first 100 loops logged, first move owned). No confetti spam.
- **Read cues aloud:** optional, using the browser's built-in speech for cues during the session player.

---

## 10. Content model

All content is JSON in `/content/`, typed in TypeScript, and validated in tests and in the build (fail on any broken reference).

```ts
type Level = 1 | 2 | 3 | 4 | 5;
type Setup = 'partner' | 'multiball' | 'robot' | 'wall' | 'shadow';

interface Skill {
  id: string; name: string;
  category: 'fundamental' | 'stroke' | 'serve' | 'receive' | 'footwork' | 'tactic' | 'physical' | 'mental';
  levelMin: Level; levelMax: Level;
  prerequisites: string[];
  styleWeights: Record<string, number>;
  summary: string;
  moveIds: string[];
}

interface Move {
  id: string; name: string; skillId: string; wing: 'FH' | 'BH' | 'none';
  summary: string;
  whenToUse: string;
  keyPoints: {
    stance: string; bodyAction: string; strokeLength: string; timing: string;
    tablePosition: string; freeArm: string; batArm: string; recovery: string; anticipation: string;
  };
  cues: string[];                       // max 3
  learningPath: {                       // the 7 stages of section 7
    stage: 'see' | 'shadow' | 'feel' | 'groove' | 'mix' | 'use' | 'own';
    task: string; passCheck: string; drillIds: string[]; selfChecks?: string[];
  }[];
  gamePatterns: { situation: string; how: string; drillId: string }[];
  troubleshooting: { symptom: string; causes: string[]; fixes: string[]; drillId: string }[];
  penholdNotes?: string;
  animationId: string | null;           // null = animation pending
}

interface Drill {
  id: string; name: string; purpose: string;
  skills: { id: string; weight: number }[];
  levelMin: Level; levelMax: Level;
  phase: 'physicalWarmup' | 'tableWarmup' | 'technique' | 'footwork' | 'serve' | 'receive' | 'matchPlay' | 'physical' | 'mental' | 'cooldown';
  regularity: 'regular' | 'semiIrregular' | 'irregular' | 'game';
  variants: { setup: Setup; instructions: string; feederInstructions?: string }[];
  duration: { min: number; default: number; max: number };
  intensity: 1 | 2 | 3 | 4 | 5;
  impact: 'low' | 'high';
  success: { type: 'consecutive' | 'outOf' | 'timed'; target: number; description: string };
  metricId?: string;                    // feeds the goal curve
  progressionId?: string; regressionId?: string;
  coachingPoints: string[];
  moveIds: string[];
  diagram?: { placements: { zone: string; depth: 'short' | 'half' | 'long'; order: number }[]; arrows: { from: string; to: string }[] };
}

interface Metric { id: string; name: string; unit: string; howToMeasure: string; testDrillId: string; higherIsBetter: boolean }
interface Tip { id: string; text: string; skills: string[]; levelMin: Level; levelMax: Level; tags: string[] }
```

Also: `styles.json`, `goals.json`, `templates.json`, `animations/<id>.json` (section 15).

**Content to author** (small seed in Phase 2, full library in Phase 7):
- **Fundamentals:** grips, ready position, ball-feel exercises, basic movement (side shuffle, cross-over step, pivot).
- **Strokes:** FH drive, BH drive, BH push, FH push, FH block, BH block, FH loop vs backspin, FH loop vs topspin, BH topspin, FH flick, BH flick (banana flick at level 4+), short touch, smash, FH chop, BH chop, lob, counter-loop.
- **Serves:** FH pendulum (backspin, sidespin, no-spin, topspin), reverse pendulum, tomahawk, BH serve, short vs long placement, legal service basics (ball on open palm, tossed near-vertically at least 16 cm, stays visible).
- **Receive:** short push, long push, flick, attacking a long serve, reading spin.
- **Footwork:** 2-point side-to-side, Falkenberg, 2-1 drill, in-and-out, random middle/elbow, pivot, shadow patterns.
- **Tactics:** serve + third-ball patterns, placement (wide FH, wide BH, elbow), changing pace and spin, playing each style.
- **Physical:** dynamic warm-up, agility, core, shoulder/wrist care, cool-down. A low-impact option for every high-impact drill.
- **Mental:** pre-point routine, breathing reset, focus cues, handling nerves.

Targets: ~40 skills, ~25 animated moves, ~80 drills, ~150 tips, ~10 metrics. Solo variants (wall, shadow, robot) wherever possible so players without a partner still get a full program.

---

## 11. Coaching principles the engine and content follow

- Beginner stroke order: **FH drive → BH drive → BH push → FH push** (start with an attacking stroke; it's what players fall back on under pressure).
- Per-stroke progression: long diagonal → short line → consistency → length variation → accuracy / targets → small competitions.
- Control before speed and spin.
- Regularity ladder: regular → semi-irregular → irregular / random → match-like. Within a session, move from regular toward random.
- Session order: physical warm-up → on-table warm-up → technique → footwork → random drills → serve and receive → match drills or games → cool-down.
- Teach at most 3 points at a time.
- Multiball is the main repetition tool when a feeder is available.
- Recover after every shot; most drills also train footwork.
- Keep it fun: targets, small games, challenges.

---

## 12. Program engine (pure TypeScript, no DOM, fully unit-tested)

**Input:** profile + content + content version + logs. **Output:** Program = weeks → sessions → blocks → drill instances (variant, minutes, target, cue, tip, reason).

1. **Seed:** `seed = fnv1a(canonicalJSON(profile) + contentVersion + regenCount)`; PRNG = mulberry32 or sfc32. The PRNG only breaks ties and rotates equal options — it never makes a decision the rules make.
2. **Focus set:** chosen moves + goals + style + workout types → weighted skill list. Missing prerequisites are added and shown ("Added BH push because BH flick needs it").
3. **Periodization (4-week blocks):** weeks 1–2 Learn (regular, moderate) · week 3 Build (semi-irregular, more volume) · week 4 Apply & test (random + match drills + assessment, a bit less volume). Longer programs repeat blocks with higher targets. Tournament goal: last week tapers.
4. **Session template:** minutes per phase by length, shifted by goals and workout types. Example 60 min: physical warm-up 8 · table warm-up 7 · technique / learning-path stage 15 · footwork 10 · serve and receive 8 · match drills 9 · cool-down 3. Short sessions merge or drop blocks by a fixed priority. "No table" → shadow technique, footwork, physical and mental only.
5. **Drill selection per block:** filter (level, available variant for the setup, phase, impact, regularity allowed this week) → score = Σ(skill weight × focus weight) + novelty bonus − recent-use penalty → top pick; ties by PRNG. Focus drills repeat every 2–3 sessions; others never repeat back-to-back.
6. **Time fit:** whole minutes; session total equals the chosen length exactly.
7. **Tip and coach note:** one tip per session matching its focus (not shown in the last 10 sessions); coach notes are rule-chosen sentence templates in the chosen coach voice.

**Adaptation (rules, after logging):**
- Per drill: done / skipped, felt (too easy / right / too hard), target hit (count or yes/no).
- Target hit + "too easy" twice in a row → progression drill. "Too hard" twice, or target missed 3 times → regression drill.
- Missed sessions don't pile up; the plan shifts forward and keeps its weekly shape.
- Every change shows a plain reason ("Swapped 2-point footwork for Falkenberg: you hit 30/30 twice").
- Only future sessions change. Past sessions and logs never change.

**Assessments:** end of each block, a short test session on the player's metrics. Results feed the goal curve, the improvement path, and level-up suggestions.

---

## 13. Schedule (in-app only)

- Week and month views inside the app, plus a "Today" screen that opens first on training days.
- Move a session: tap it → "Move to" date picker (no drag-and-drop needed).
- Missed sessions shift the plan forward (section 12).
- Device time zone.

---

## 14. Screens (mobile-first, big tap targets, bottom navigation)

- **Welcome → Onboarding** (section 6) → **Player card** + "Why this plan".
- **Today:** next session, Start button, coach note, tip, current learning stage.
- **Plan:** weeks and block themes; calendar view; session detail (blocks, minutes, drill cards with purpose, setup variant, instructions, target, coaching points, table diagram, "Watch the move").
- **Session player (at the table):** full-screen block timer, large text, next/previous, rep counter, beep at block changes (Web Audio, started from a user tap), screen kept awake (Screen Wake Lock API with fallback), quick log after each drill (three big buttons: too easy / right / too hard, plus "target hit?").
- **Learn:** the player's moves with their stage on the 7-stage path; each move page shows the 3D player, key points, cues, game patterns and "Something's wrong?".
- **Library:** all moves, drills, styles and tips; filter by level, category, setup; search.
- **Progress:** improvement path, goal curves, sessions done, streak, minutes per category, simple SVG charts (no heavy chart library).
- **Settings:** edit profile (confirm before regenerating future sessions), hand, backup export/import, reset.

---

## 15. Our own 3D player and animations

**Scene:** table at real size (2.74 m × 1.525 m, 76 cm high, net 15.25 cm), floor in the app's style, warm soft lighting, our player, a paddle with red and black faces (so open/closed blade angle is visible), a ball.

**Character (our own model):** a stylized, friendly athlete designed for this app — not a wooden art mannequin, not a stock character. Two ways to build it; ask me before Phase 5 which one (realism vs ease):
- **A — Built in code (easier):** rounded segmented body (capsules/spheres) with soft, warm shading, styled to match the design system.
- **B — Modeled and rigged by script (more realistic):** a smooth skinned character created with a Blender Python script run headless, exported to glTF with our own rig. Needs Blender installed; more work.

Both use the **same joint names and the same animation files**, so animation work is never wasted if we switch.

**Joint names (same names as mannequin.js; our own code):** `body.{bend,turn,tilt}`, `torso.{bend,turn,tilt}`, `head.{nod,turn,tilt}`, `r_arm.{raise,straddle,turn}`, `r_elbow.bend`, `r_wrist.{bend,turn,tilt}`, `r_leg.{raise,straddle,turn}`, `r_knee.bend`, `r_ankle.{bend,turn,tilt}` and the `l_` versions. Each joint has min/max limits.

**Animation file** (`content/animations/<id>.json`):

```json
{
  "id": "fh-drive",
  "duration": 1.4,
  "loop": true,
  "phases": [
    { "name": "Ready", "t": 0.0 },
    { "name": "Backswing", "t": 0.35 },
    { "name": "Contact", "t": 0.6 },
    { "name": "Follow-through", "t": 0.8 },
    { "name": "Recover", "t": 1.0 }
  ],
  "keys": [
    { "t": 0.0,
      "root": { "x": 0, "z": 0, "turn": 0 },
      "joints": { "torso.turn": 0, "r_arm.raise": 20, "r_elbow.bend": 90, "r_wrist.bend": 0, "r_knee.bend": 25, "l_knee.bend": 25 } }
  ],
  "ball": { "contactT": 0.6, "spin": "topspin", "from": [0.5, 1.0, -1.2], "to": [0.4, 0.95, 1.3] },
  "cues": [ { "t": 0.6, "text": "Contact at the top of the bounce" } ]
}
```

- `t` is normalized 0–1; angles in degrees; a joint missing from a key keeps its last value. Smooth ease-in-out per channel; quaternions for 3-axis joints.
- Phase names line up with the move's key points.
- **What makes our animations unique and useful:** swing-path trail of the paddle; contact-point flash; ball with color-coded spin arrows; floor footprints for footwork; automatic slow-motion around contact; caption with the current phase and cue.
- **Touch controls:** play/pause, speed 0.25× / 0.5× / 1×, scrub bar with phase markers, "next phase" button, camera presets (front, side, top, player's eyes), one-finger orbit, pinch zoom.
- **Follow-along mode** (learning stage 2): slow loop with a steady beat and a rep counter.
- **Left-handed players:** mirror at runtime (swap l/r, negate turn/tilt).
- **Ball:** simple arc synced to `contactT`. No physics.
- **Pose editor** (dev only, `#/dev/poses`): touch-friendly sliders per joint, add/remove keys, play, copy JSON. Used to author and fix animations, using real-play videos only as visual reference (D2).
- **Performance:** lazy-load Three.js only where 3D is shown; one shared renderer; stop rendering when off-screen or hidden.
- **Honesty:** a short note in the viewer's info sheet says the demo shows shape, timing and body use, not every fine wrist detail. Penhold: text notes only (animations are shakehand).

**Review gate:** for each new animation, send me screenshots of every phase from side and front. Start with 4: ready stance, FH drive, BH drive, BH push. Wait for my OK before the rest.

---

## 16. Tech stack and repo

- Vite + TypeScript (strict) + Preact + Three.js. Hash routing (GitHub Pages has no fallback for client-side routes).
- `vite-plugin-pwa` for offline cache and manifest.
- Storage: localStorage for profile/settings; IndexedDB (`idb-keyval`) for program and logs; `schemaVersion` + migrations from day one.
- Tests: Vitest (engine, content validation, goal curve), Playwright (flows + screenshots at 390×844 and 820×1180).
- Deploy: GitHub Actions → GitHub Pages (official `actions/deploy-pages`), from `main` only. Vite `base` = `/<repo-name>/`.

**Creating the repo (Phase 0):**
1. Check that `git` and the GitHub CLI (`gh`) are installed and `gh auth status` shows I'm logged in. If not, stop and tell me exactly what to run.
2. Propose 3 short, distinctive, table-tennis themed app names (not generic like "TT Trainer"). Check none already exists as a repo in my account. I pick.
3. Create the public repo with `gh repo create`, MIT license, `.gitignore`, short README.
4. Add: this file as `BUILD_PROMPT.md`; `CLAUDE.md` with the section 0 rules and pointers to `BUILD_PROMPT.md` and `PROGRESS.md`; `PROGRESS.md` with phase status and a decisions log (update it at the end of every phase so any new session can continue).
5. Scaffold the app and the Pages workflow; enable Pages with the GitHub Actions source (`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`); push; confirm the live URL works.
6. Each phase is built on a `phase-N` branch and merged into `main` only after my OK, so the live site changes only when I approve. Small, clear commits. Ask before any force-push, history rewrite, or deletion.

```
/content          skills, moves, drills, metrics, tips, styles, goals, templates, animations/
/src/engine       seed, prng, focus, periodize, select, adapt, assess, goalCurve
/src/content      types, loaders, validation
/src/design       tokens, fonts, icons (SVG), backgrounds, motion
/src/ui           screens, components
/src/three        scene, character, animator, controls, pose editor
/src/storage      persistence, migrations, backup
/src/strings      en.ts
/tests            unit + e2e
/docs             CONTENT_GUIDE.md (how to add a move, drill, metric, animation)
```

---

## 17. Proof I want at each checkpoint

- Screenshots of what I would actually see (phone size; tablet when relevant).
- Test results: pass/fail counts and what they cover.
- Numbers explained plainly (bundle size, content counts, plan stats).
- A plain verdict: what works, what doesn't, what's risky.

**Required tests:**
- **Determinism:** same profile + content version → identical program (snapshot). Different `regenCount` → different but valid program.
- **Constraints over 500 seeded profiles:** session total = chosen length; no drill needs a setup the player lacks; level ranges respected; prerequisites before dependents; no high-impact drills in low-impact mode; no back-to-back repeats except focus drills.
- **Content validation:** unique ids; all references resolve; every move has all 7 learning stages, at least 1 game pattern and 3 troubleshooting entries; every drill has ≥1 variant; every metric has a test drill.
- **Adaptation:** scripted logs → expected swaps with the expected reason text.
- **Goal curve:** planned values at known points; correct On track / Ahead / Behind status for scripted results.
- **Animations:** every file loads; phases in order; joint names valid; angles within limits.

---

## 18. Build phases (stop and show me at the end of each)

- **Phase 0 — Repo and pipeline (small).** Read this file. Ask questions only if they change the build. Give a size estimate per phase. Ask me which Proposed features (section 9) to keep. Create the repo (section 16), deploy a "hello" page, show me the live URL at phone size.
- **Phase 1 — Design system and style board.** 2–3 directions on `#/styleboard` (section 4). I pick. Then finalize tokens, fonts, icon set, backgrounds, buttons, bars, motion.
- **Phase 2 — Content model and seed content** (~10 skills, 6 moves with full learning paths, 20 drills, 5 metrics, 30 tips) + validation. Show one rendered move page and drill card.
- **Phase 3 — Engine, adaptation and goal curve + tests.** Show generated programs for 3 profiles as readable tables: (a) beginner, no table; (b) intermediate with a partner; (c) advanced with a robot. Plus a sample goal curve and test results.
- **Phase 4 — Core screens:** onboarding, player card, Today, Plan and calendar, session player, Learn, Library, Progress, Settings. Screenshots of every screen.
- **Phase 5 — 3D player:** ask me A or B (section 15); character, animator, controls, follow-along mode, pose editor, first 4 animations. Review gate.
- **Phase 6 — Learning path and "Something's wrong?" fully wired** into sessions and screens.
- **Phase 7 — Full content library and remaining animations,** in batches. Show each batch.
- **Phase 8 — Approved Proposed features.**
- **Phase 9 — Offline PWA, accessibility (contrast, font size, screen-reader labels), polish.** Ask me to test performance on my real device. Final report.

---

## 19. Out of scope for now

Accounts or cloud sync, notifications, camera or video analysis, AI of any kind, social features, other languages.

---

## 20. Reference sources (read for facts; write everything in our own words)

- Rowden Fullen, *Coaching Development Course 1* — basic stroke order, per-stroke progression, coaching reference points, basic strokes chart: https://protabletennis.net/content/coaching-development-course-1
- PingSkills — *Build Your Own Training Plan* and the 52-week plan: https://pingskills.com/tutorials/build-your-own-training-plan
- Larry Hodges — a typical coaching session (warm-up, footwork drills such as the 2-1 drill, multiball): https://www.tabletenniscoaching.com/node/2718
- Expert Table Tennis — planning a session, regular → random drills: https://www.experttabletennis.com/plan-an-effective-training-session/
- Newgy — *Modern Table Tennis Styles* series: https://www.newgy.com/?p=791
- ITTF Statutes / Handbook — service rules and equipment dimensions (check the current edition).
- three.js documentation.
