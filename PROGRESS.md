# Progress

Live site: https://candanumut.github.io/myttcoach/

## Phase status
| Phase | Status |
|---|---|
| 0 Repo and pipeline | done |
| 1 Design system and style board | not started |
| 2 Content model and seed content | not started |
| 3 Engine, adaptation, goal curve | not started |
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
