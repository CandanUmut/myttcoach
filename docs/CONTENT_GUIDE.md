# Content guide

All coaching content is JSON in `content/`. The app reads it at build time, the tests validate it,
and `npm run build` refuses to build if anything is broken. You never need to touch code to add a
drill, a tip or a move.

## Ground rules

- **Our own words.** Never copy coaching text from books, videos or websites. Describe it the way
  you would explain it to a player at the table.
- **Plain English.** Short sentences. Say what to do, not what not to do, where you can.
- **Left-handers.** When text says left or right, add the mirror in brackets:
  "step with the right foot (left foot if left-handed)". The 3D player mirrors itself.
- **Ids** are lowercase with dashes (`fh-loop-backspin`) and never change once published —
  saved plans and logs refer to them.
- After any change: `npm run validate` (fast) or `npm test` (everything).
- When content changes enough that existing plans should be rebuilt, bump `version` in
  `content/meta.json`.

## Where things live

| What | File(s) | Notes |
|---|---|---|
| Skills | `skills.json`, `skills/*.json` | The engine's building blocks. Moves, drills, tips and metrics point at skills. |
| Moves | `moves/<id>.json` | One file per move: key points, cues, the 7-stage learning path, game patterns, troubleshooting. |
| Drills | `drills.json`, `drills/*.json` | Batch files are merged; split them by topic. |
| Metrics | `metrics.json`, `metrics/*.json` | Measurable tests with a target per level. |
| Tips | `tips.json`, `tips/*.json` | One short tip per session. |
| Styles, goals | `styles.json`, `goals.json` | Change with care: the onboarding and engine depend on the ids. |
| Session templates | `templates.json` | Minutes per phase for each session length. Each template must add up. |
| Match journal | `journal.json` | Tags and opponent styles, each with skill weights (0–1). |
| Spin helper | `spin-helper.json` | One cell for every stroke × spin. |
| Animations | `animations/<id>.json` | 21 are generated: edit `scripts/anim-gen/gen_anims.py`, not the JSON. |

## Adding a drill

```json
{
  "id": "fh-loop-two-points",
  "name": "Forehand loop from two points",
  "purpose": "Move and loop: one ball to the middle, one to the wide forehand.",
  "skills": [{ "id": "fh-loop-topspin", "weight": 1 }, { "id": "basic-footwork", "weight": 0.5 }],
  "levelMin": 3, "levelMax": 5,
  "phase": "footwork",
  "regularity": "regular",
  "variants": [
    { "setup": "multiball", "instructions": "…", "feederInstructions": "…" },
    { "setup": "robot", "instructions": "…" }
  ],
  "duration": { "min": 5, "default": 8, "max": 12 },
  "intensity": 4,
  "impact": "high",
  "lowImpactId": "fh-loop-shadow-two-points",
  "success": { "type": "outOf", "target": 7, "of": 10, "description": "7 of 10 loops land on the table." },
  "coachingPoints": ["…", "…"],
  "moveIds": ["fh-loop-topspin"]
}
```

Things the validator checks for drills:

- every skill, move, progression/regression/low-impact id exists;
- `levelMin ≤ levelMax`, `duration.min ≤ default ≤ max`;
- a high-impact drill has a `lowImpactId` (players 65+ or with "low impact" on get that one);
- every variant's `setup` is one of `partner`, `multiball`, `robot`, `wall`, `shadow`.

`regularity` matters for learning: the *mix* stage of a move needs at least one `semiIrregular`
drill. Use `regular` for fixed patterns, `semiIrregular` when the player knows the choices but
not the order, `irregular` for free play, `game` for scored games.

The coverage test also checks that every phase × level × setup has at least one low-impact drill,
so a player is never left with an empty block. If it fails after you remove a drill, add another
drill for that gap.

## Adding a move

Copy an existing file in `content/moves/` and change it. A move has:

- **keyPoints**: stance, body action, stroke length, timing, table position, free arm, bat arm,
  recovery, anticipation — one or two sentences each;
- **cues**: 3–5 short words the player can say in their head (shown and read aloud in sessions);
- **learningPath**: exactly the 7 stages `see, shadow, feel, groove, mix, use, own`, each with a
  task, a pass check and drill ids. The *shadow* stage needs exactly 3 `selfChecks` (yes/no
  questions). A stage drill must not be more than one level above the move's level;
- **gamePatterns** and **troubleshooting** (symptom → causes → fixes → a drill that fixes it);
- **animationId**: the animation file id, or `null` if there is no animation yet.

Then add the move id to its skill's `moveIds`.

## Tips, metrics, journal, spin helper

- **Tip**: `{ "id", "text", "skills": [...], "levelMin", "levelMax", "tags": [...] }`. One idea, one
  or two sentences.
- **Metric**: needs a `testDrillId` (the drill used to measure it) and a target for every level
  1–5. Keep targets realistic — the goal curve uses them.
- **Journal tag / opponent**: `{ "id", "name", "skillWeights": { "<skill-id>": 0.1–1 } }`. Only
  "didn't work" tags and the styles of lost matches add focus, from the 5 newest matches.
- **Spin helper cell**: `angle` is the bat from upright (+ open, − closed), `swing` is the swing
  direction from straight forward (+ up, − down), both in degrees, for `light` and `heavy` spin.
  Add `better` (a stroke id) when the stroke is a poor choice against that spin.

## Animations

Animations are keyframes of joint angles (see `src/three/joints.ts` for the joint names, limits
and sign conventions). Easiest ways to change one:

1. `#/dev/poses` in the app: the pose editor, with live preview.
2. For the 21 generated ones, change the numbers in `scripts/anim-gen/gen_anims.py` and run it.
   To place the bat exactly, add a target to `scripts/anim-gen/targets.json` and run
   `python3 scripts/anim-gen/solve.py <id>`.
3. Check: `npx vitest run tests/unit/poses.test.ts tests/unit/animations.test.ts`, and look at
   renders with `scripts/anim-shots.sh <id> <dir> <t...>`.

No motion data from Mixamo, GPL sources or anything unlicensed.
