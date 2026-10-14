# Claude working rules for this repo

Read `BUILD_PROMPT.md` (the full spec) and `PROGRESS.md` (phase status + decisions log) before doing anything.
Decisions in `PROGRESS.md` override `BUILD_PROMPT.md` where they differ.

## How to work with the owner
- Honesty first. Plain, simple words. Tell bad news too.
- Every message: short summary first, then details.
- Small fixes: just do them. Changes to how something works/feels, its design or defaults: ask first
  (exception: the owner approved autonomous phase-by-phase building with a critic review; see PROGRESS.md).
- Touch-first: nothing may depend on keyboard or mouse hover. Tap targets >= 48px.
- Headless browsers render WebGL in software: use them for screenshots/correctness only, never to judge 3D speed.
- Never copy coaching text from sources; write our own words. No Mixamo / GPL / unlicensed motion data.
- No `Math.random()` in program logic. No analytics, no runtime CDNs, no notifications, no AI.
- All UI text lives in `src/strings/en.ts`.

## Commands
- `npm test` — unit tests (engine, content validation, goal curve, animations)
- `npm run build` — validate content, typecheck, build to `dist/`
- `npm run e2e` — Playwright flows + screenshots (uses /opt/pw-browsers chromium)

## Layout
`content/` JSON content · `src/engine` pure program engine · `src/content` types/loaders/validation ·
`src/design` tokens/icons/backgrounds · `src/ui` screens/components · `src/three` 3D player ·
`src/storage` persistence · `src/strings/en.ts` all UI text · `tests/` unit + e2e · `docs/CONTENT_GUIDE.md`.

Update `PROGRESS.md` at the end of every phase.
