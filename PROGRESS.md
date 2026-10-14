# Progress

Live site: https://candanumut.github.io/myttcoach/

## Phase status
| Phase | Status |
|---|---|
| 0 Repo and pipeline | done |
| 1 Design system and style board | done (live look: Blade; style board at #/styleboard) |
| 2 Content model and seed content | done (seed: 14 skills, 6 moves, 32 drills, 7 metrics, 32 tips) |
| 3 Engine, adaptation, goal curve | done (33 tests; samples in docs/sample-programs.md) |
| 4 Core screens | not started |
| 5 3D player | not started |
| 6 Learning path wiring | not started |
| 7 Full content library + animations | not started |
| 8 Proposed features | not started |
| 9 PWA, accessibility, polish | not started |

## Decisions log
- 2026-10-14 — Repo already existed (`CandanUmut/myttcoach`), so no repo creation. App display name: **Third Ball** (owner: name doesn't matter).
- 2026-10-14 — Proposed features kept: match journal, serve lab, spin & angle helper, milestones, read cues aloud. Dropped: daily challenge.
- 2026-10-14 — 3D character: option A (built in code), simple, cute and fun. No Blender.
- 2026-10-14 — Animations: whatever is simplest that looks right and explains pose + movement. Don't overcomplicate.
- 2026-10-14 — Goal-curve band = ±10% of the full planned gain (target − start), min 1 unit, instead of ±10% of the plan value.
- 2026-10-14 — Placement quiz: level = last level in an unbroken run of all-"yes" levels (stop at the first level with a "no").
- 2026-10-14 — No preview deploys; build straight to the live site (`main`).
- 2026-10-14 — Owner asked for no stops between phases: at the end of each phase a critic agent reviews it against the goals, useful findings get applied, then move to the next phase. Owner played professionally and can review coaching content.
- 2026-10-14 — Pinned stable toolchain: Vite 7, Preact 10, TypeScript 5.9, Vitest 3, vite-plugin-pwa 1, Playwright 1.56.1 (matches the preinstalled Chromium).
- 2026-10-15 — Phase 1: critic picked Blade (best contrast, warmest). Applied: stronger control borders (--line-strong), focus token, warm-brown dark hero, one-shot hop, clearer icons.
- 2026-10-15 — Phase 2: coaching critic fixes applied (no closed-face drive into backspin, full legal serve rules, never touch the table with the free hand, realistic metric targets, new drills push-then-loop and fh-bh-alternate, validator checks mix-stage regularity and stage drill levels).
- 2026-10-15 — Engine: drill score is Σ(skill weight × focus weight) normalised by total skill weight (otherwise multi-skill drills always win). Regular picks never leave the player's level; if nothing fits a block, its time goes to technique. Learning stages follow a planned pace (see 1 session, other stages 2, own 1) and re-plan from real passes after each log. Max 2 moves learned at once; dependents start when prerequisites reach Groove.
- 2026-10-15 — Assessment = last session of every Apply week (end of each 4-week block); tests use the goal metric first, then focus-skill metrics (max 3).
- Known gap: with the small seed library some phases have few drills at some levels (variety is low). Phase 7 adds a coverage test (every phase × level × setup has drills).
