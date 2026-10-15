# Progress

Live site: https://candanumut.github.io/myttcoach/

## Phase status
| Phase | Status |
|---|---|
| 0 Repo and pipeline | done |
| 1 Design system and style board | done (live look: Blade; style board at #/styleboard) |
| 2 Content model and seed content | done (seed: 14 skills, 6 moves, 32 drills, 7 metrics, 32 tips) |
| 3 Engine, adaptation, goal curve | done (33 tests; samples in docs/sample-programs.md) |
| 4 Core screens | done (critic fixes applied) |
| 5 3D player | done: cute code-built character, viewer, follow-along, pose editor (#/dev/poses), 4 animations |
| 6 Learning path wiring | done (stage passes, What's next with self-checks, skip ahead, add move to plan, troubleshooting in the session player) |
| 7 Full content library + animations | done: 42 skills, 25 moves (all animated), 95 drills, 11 metrics, 155 tips; coverage test; content critic fixes applied |
| 8 Proposed features | done: match journal, serve lab, spin and angle helper, milestones (read cues aloud was already in the session player); critic fixes applied |
| 9 PWA, accessibility, polish | done: offline PWA + icons, axe audit clean (light/dark, 20 screens, no sideways scroll), content guide, final critic fixes |

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
- 2026-10-15 — Phase 4 UX critic fixes applied (results de-duplicated per session, resume at first open drill, drafts cleared on plan change, iOS audio unlock, sticky player controls, edit-mode cancel/save without auto-lowering level, collapsed done weeks).
- 2026-10-15 — 3D: one shared WebGL renderer, Three.js lazy-loaded (separate ~150 KB gzip chunk). Toon shading + inverted-hull outline. Left-handers: the player group is mirrored (scale.x = −1), same effect as swapping l/r and negating turn/tilt. Feet are ground-locked each frame. Joint conventions are documented in src/three/joints.ts. Review shots: `scripts/anim-shots.sh <id> <dir> <t...>` (route #/dev/shot/:id/:t/:cam).
- 2026-10-15 — Owner asked for no stops between phases, so the animation review gate is done by screenshots + critic; the owner can give feedback any time and the pose editor makes fixes quick.
- 2026-10-15 — Phase 7 content critic fixes applied: crossover footwork (the left foot crosses for a right-hander moving right), chop bat angle (more upright against heavy topspin), left-hander diagonals, Falkenberg feed, two drills fed the wrong metric (removed), mix-stage drills that didn't match their task, clearer serve descriptions, workable game-drill rules, left-hander notes.
- 2026-10-15 — 21 more animations are generated from shared base poses (stance, step-in, deep) by a small script; serve arm poses come from `scripts/solve-pose.ts` (finds arm angles for a target bat position and face direction). Every animation passes the pose tests (feet on the floor, face toward the table, sensible contact height) and was checked in side and front renders. The viewer camera now frames where the move is played (chops and lobs stand far back).
- Honest note: the new animations are clear but simpler than the four hand-tuned ones (one key per phase). The owner's eye on the serves and chops would be the most useful review.
- 2026-10-15 — Match journal: the critic measured that adding small focus weights over the whole plan barely changed anything (and reshuffled unrelated drills), while the screen claimed it did. Changed to what the spec describes: the 6 sessions after the newest match each get one dedicated drill for the top 1–2 skills behind what didn't work (or the style of an opponent the player lost to). Matches more than 8 weeks older than the newest one don't count. The save screen and player card only report journal drills that are really in the plan. Left-handed opponent is a separate switch (it's not a style).
- 2026-10-15 — Spin and angle helper is a 2D side view (bat angle, swing arrow, spin arrow), not 3D: clearer and lighter. Sidespin is treated as one spin, with a note that it nearly always comes with top- or backspin.
- 2026-10-15 — Serve lab scores depth only (short / half-long / long / mixed). Width targets (backhand, elbow, forehand) would be a good next step; tap positions are already stored.
- 2026-10-15 — PWA: Workbox precaches the app, 3D chunk, all animations and the two Latin fonts (39 files, ~1.26 MB); other font files are cached when first used. Updates install silently (no prompts, no notifications). Offline is covered by an e2e test.
- Known: milestones come from logs, so starting a brand-new plan from onboarding (which clears logs) resets them.
- 2026-10-15 — Final critic fixes: every logged drill is saved to the device immediately (not only at the end of a session) and the app asks the browser for persistent storage; "Your best" is a number field with −/+; "Save" button fits; Watch buttons wrap (no sideways scroll); the Watch move for multi-move drills follows the player's moves and the drill's skills (not always the ready stance); no-table players only get goals/tests that work without a table (`worksWithoutTable` on metrics); clearing the goal date can't break the curve; beginner move order with "Start here"; honest "Why this plan" when no goals or moves were picked; no duplicate session subtitle; dialog actions stay on screen; "Partly done" sessions; journal link on Today; "what worked" doesn't offer problem-only tags.
- Not verified (needs a real phone): 3D speed, backup download from an installed iPhone home-screen app, speech voices.
