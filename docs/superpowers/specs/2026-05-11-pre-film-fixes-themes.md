# Pre-film bug fixes, real-session data, multi-theme system

**Status:** draft (awaiting user review)
**Date:** 2026-05-11
**Trigger:** user feedback after watching first real-data render of `output/tinypath/segments/dashboards-all.mov`. Multiple accuracy issues + design pivot from "vintage NASA espresso" to "terminal classic hacker" palette family.

## Motivation

First end-to-end render of tinypath narrative produced visually consistent but **factually wrong** segments:

- TokenCounter shows `25.8M tokens · $80.73` for audit clip — math is wrong (output rate confused with input rate, see bug C1 below)
- OutroCard shows `Total Time: 06m 00s` — that's the render duration, not the 7h 11m real session
- StatsCard `totalDays: 9` is hardcoded from duels mock
- PhaseBar shows "PHASE 1/4 ARCHITECTURE" mid-audit clip — synthetic 4-quartile phases derived from clip duration, no relation to actual narrative scene
- IntroCard countdown 3→2→1→LAUNCH packs into 1.5 s — too rushed to read, "LAUNCH IN 3…" phrase is awkward
- 5.9 GB `dashboards-all.mov` quick-concat written even though Premiere assembly drags per-scene segments

User direction: **"lepiej nie pokazac nic niz pokazac zle"** — accuracy first, even if some widgets need to fall back to `—` or `ESTIMATED` labels. Plus a design pivot to a multi-theme palette family with **terminal classic hacker** as the new default.

Also surfaced: single-session projects (`outdoorthings` referenced as exemplar — 1195 events, 1 jsonl, no git, no OBS recordings) need a smoother story than tinypath got. Curator works (`6 candidates`, `start:1 build:2 design:2 end:1`), but downstream pipeline assumes multi-session-style data.

## Goals

1. **Tokens & cost math is correct** for every Dashboard, StatsCard, OutroCard render — to the cent for single-model sessions, ±5% for mixed-model sessions.
2. **Time-related fields reflect reality** — OutroCard `durationMs` = real wallclock, StatsCard `totalDays` derived from `endTs - startTs`, Dashboard timer references session start (not clip start).
3. **PhaseBar reflects narrative.json structure**, not made-up 4-quartile slicing. If a scene maps cleanly to one narrative phase, show that; otherwise hide.
4. **IntroCard reads at film pace** — extend duration, slow the countdown, drop the awkward "LAUNCH IN 3…" wording.
5. **Stop writing `dashboards-all.mov` / `overlays-all.mov` by default** — they cost ~6 GB and serve no Premiere assembly workflow. Make opt-in via `--with-concat` flag.
6. **Adopt multi-theme palette system** — V2 "Vintage NASA Espresso" stays as one option, V3 "Terminal Classic Hacker" becomes default. 6 themes total, selectable at render time.
7. **Single-session projects are first-class** — `outdoorthings`-style flow (no audit / no release sessions, just brainstorm → build → design) renders cleanly without forcing 6 phases that don't exist.

## Non-goals

- Audio pipeline (TTS, Suno mixing) — Bartek records voice himself, no changes here.
- Live-stream mode — none of these fixes touch live-dashboard or live-server; render-narrative path only.
- Curator detection thresholds — `edit-burst ≥ 10` etc. stay. Outdoorthings already produces 6 reasonable candidates; nothing to retune.
- New Remotion compositions — fix existing, don't add new ones.
- Premiere project template — already shipped, no changes.

## Issue inventory

### Cost / tokens

| ID | Severity | What | Where |
|---|---|---|---|
| **C1** | CRITICAL | `buildClipTimeline` lumps `input + output` into the synthetic baseline event's `data.input`, so `eventCost` charges output tokens at input rate. Opus 4.7 output rate is 5× input — pre-clip cost is **5× under-reported** for output-heavy work. | `packages/overlay/src/render-narrative.ts` ~line 95-100 |
| **C2** | HIGH | Baseline event has no `model` field — `detectFamily(undefined)` defaults to opus. Mixed-model sessions or pure Sonnet/Haiku get wrong rates. | same file |
| **C3** | LOW | Per-clip metrics already mix cache into `totalTokens` (correct), but the StatsCard / OutroCard cost figure is not computed in render-narrative — `tokensCostUsd` is `undefined`, so the Cost row in StatsCard is hidden entirely. | `packages/overlay/src/render-narrative.ts` `renderOverlayForScene` Outro branch |

### Time / duration

| ID | Severity | What | Where |
|---|---|---|---|
| **T1** | HIGH | OutroCard receives `durationMs = narrative.targetMinutes * 60 * 1000` (= 360 000 for 6-min film). Should be `fullTimeline.endTs - fullTimeline.startTs` (real session). Shows "06m 00s" instead of "7h 11m 04s". | `render-narrative.ts` Outro overlay branch |
| **T2** | HIGH | StatsCard is never rendered by `render-narrative` — only Outro is. But when rendered standalone (`pnpm render:stats`), `totalDays` defaults to mock `9`. Should compute from timeline. | `render-cli.ts` StatsCard branch |
| **T3** | MEDIUM | Dashboard's Timer widget renders `00:00:05` mid-clip — that's clip-relative time, not session wallclock. For an "audit at 5h in" clip the timer should read something like `T+05:42:18`. Or at minimum `5h 42m`. | `packages/ui/src/widgets/Timer.tsx` + `buildClipTimeline` startTs choice |
| **T4** | LOW | Outdoorthings has only 1 day. `Math.ceil(durationMs / 86_400_000)` for a 6h session returns 1 day correctly. But for a session that crosses midnight UTC (Bartek's case — tinypath 22:34 → 03:45) it returns 1 even though "felt like 2 sessions". Document & ignore unless user disagrees. | `StatsCard` consumer |

### Phase / faza

| ID | Severity | What | Where |
|---|---|---|---|
| **P1** | HIGH | `buildClipTimeline` fabricates 4 phases per clip (`segMs = targetMs / 4`), all labelled with `clip.label`. PhaseBar at the bottom of Dashboard then shows "PHASE 1/4 — <clip.label>" mid-clip even though `narrative.json` already specifies what scene this clip belongs to. | `render-narrative.ts` lines 113-119 |
| **P2** | MEDIUM | If a single sceneId (e.g. `build`) has 2 clips, both clips get a fresh 4-phase progression. PhaseBar resets. Visually inconsistent across the same scene's clips. | same |

**Fix:** PhaseBar should show **narrative scene index** (e.g. "3/6 BUILD"), not synthetic clip phases. Or hide the PhaseBar in narrative-render mode (live mode keeps its 4-phase semantics).

### IntroCard

| ID | Severity | What | Where |
|---|---|---|---|
| **I1** | USABILITY | Countdown 3→2→1→LAUNCH crammed into final 1.5 s of a 4 s card. Each digit visible ~0.37 s. Phrase "LAUNCH IN 3…" with the digit beside it is awkward. | `packages/ui/src/compositions/IntroCard.tsx` `Countdown` component |
| **I2** | DESIGN | 4 s total is too tight for: header, project title, objective row, start-time row, 3 status rows, countdown. Eye doesn't settle. | same file |

**Fix:** extend IntroCard to **8-10 s**, slow countdown to ~3 s with breath between digits, drop "LAUNCH IN " prefix (just "3", "2", "1", "LAUNCH"). Pause briefly on each digit before fade.

### Storage / concat

| ID | Severity | What | Where |
|---|---|---|---|
| **ST1** | LOW (USABILITY) | Pipeline always concatenates `dashboards-all.mov` + `overlays-all.mov` at the end — useful for quick preview but Premiere doesn't ingest them. ~5.9 GB cost per film. | `render-narrative.ts` end of `main` (writes `concat-*.txt`, hints at ffmpeg concat) — but inspection: the script only writes concat lists, not actual concatenated movs. The mov files in `output/tinypath/segments/` were created by user via separate ffmpeg invocation. **Re-read: the issue is not that pipeline writes them, but that they sit there once user ran ffmpeg. Solution: drop the "Quick concat" hints from output, and / or add a one-liner to clean them up.** Confirm exact ownership during plan phase. |

### Multi-theme system

| ID | Severity | What | Where |
|---|---|---|---|
| **TH1** | DESIGN | V2 "Vintage NASA Espresso" was approved + shipped (PR #4), but user reverted: "ta kawa lipna jest". New direction from Claude Design `0Leam7Sij7ffo6Tbh8X0uQ`: 6-theme system with **TERMINAL** (classic hacker phosphor green) as default, plus GRAPHITE / MIDNIGHT / OPS / COBALT / ESPRESSO as alternatives. | new — see design bundle in `/tmp/design-fetch-v2/silentbuild/project/tokens.js` |

**Critical design constraint:** `tokens.colors.amber` is a **semantic slot** (= primary brand accent), not a literal hex. Renaming the key would touch every widget. Themes must keep the same KEY names and only swap VALUES — this is exactly how the design bundle ships.

### Single-session support

| ID | Severity | What | Where |
|---|---|---|---|
| **S1** | DOCS | `narrative-schema.ts` requires exactly 6 scenes. A single-session project like `outdoorthings` (curator output: start:1 build:2 design:2 end:1, **no plan, no audit**) cannot legally produce a 6-scene narrative without padding fake scenes. | `packages/curator/src/narrative-schema.ts` `NarrativeSchema.scenes.length(6)` |
| **S2** | DESIGN | Plan/audit can be skipped for projects that didn't have those phases. Pipeline should allow 3-6 scene narratives, not enforce 6. | same file + `render-narrative.ts` loop |

**Decision needed:** relax `scenes.length(6)` to `.min(3).max(6)` AND make `format/spec.md` document the variant ("Speed-build variant" already exists in tradeoffs table — extend to "single-session 4-scene"). Per-film overlay generator (`scenes 4` → 4 PhaseTransitions) handles it.

## Design pivot: 6-theme palette system

Adopt `tokens.js` from `0Leam7Sij7ffo6Tbh8X0uQ` design bundle. Six themes, all sharing identical semantic keys:

| Theme | Bg | Primary | Alert | Vibe |
|---|---|---|---|---|
| **terminal** (new default) | `#070a09` | `#7fd187` (phosphor green) | `#d96f5e` | classic hacker |
| graphite | `#0e1217` | `#5b8def` (royal blue) | `#e0584e` | NBA muted |
| midnight | `#080d18` | `#7fc4e8` (ice cyan) | `#e07c8c` | deep navy |
| ops | `#0e1114` | `#e6a651` (industrial amber) | `#d9695e` | graphite + amber duo |
| cobalt | `#0a0e14` | `#5fa8ff` (cobalt blue) | `#e07560` | onyx + cobalt + ember |
| espresso | `#1a1410` | `#f5a635` (warm amber) | `#e07b5e` | V2 Vintage NASA — kept as option |

**Implementation strategy:**

- Keep `packages/theme/src/tokens.ts` exporting `tokens` (current default) but make it dynamic — read `SILENT_BUILD_THEME` env var at module load, fall back to `terminal`.
- Add a `themes.ts` file exporting all 6 palettes as a `Record<ThemeKey, ColorPalette>` object.
- Add CLI flags: `pnpm render:narrative --theme terminal` (or any of the 6).
- All widgets continue to import `{ tokens }` from `@silent-build/theme` — no widget code changes.

**No "live theme switcher" in Remotion** — the bundler resolves `tokens` at build time, so the env var must be set before `pnpm render:*`. Document this in CLI help + film-checklist.md.

## Implementation plan rough sequence

Three PRs, sized for ~1 hour each, mergeable independently:

1. **PR A — Cost & duration accuracy** (`fix/cost-and-duration-real-data`)
   - C1 (split input/output in baseline event)
   - C2 (carry model into baseline)
   - T1 (durationMs from full timeline)
   - T2 (totalDays from timeline)
   - T3 (Timer can show wallclock — opt-in via prop)
   - P1, P2 (PhaseBar uses scene index from narrative, or hides)
   - Drop concat reels from instructional output (ST1)
   - +tests in `packages/overlay/tests/` for `buildClipTimeline` cumulative math
   - +tests for cost calc on mixed-model jsonl fixture

2. **PR B — IntroCard redesign + single-session narrative** (`feat/introcard-redesign-and-narrative-scene-flex`)
   - I1, I2 (countdown breathes, total 8-10 s)
   - S1, S2 (`scenes: z.array(...).min(3).max(6)`)
   - render-narrative tolerates < 6 scenes
   - format/spec.md updated with single-session variant
   - +smoke render of redesigned intro

3. **PR C — Multi-theme palette system** (`feat/theme-system-6-palettes`)
   - Add `packages/theme/src/themes.ts` with 6 palettes
   - Refactor `tokens.ts` to read `SILENT_BUILD_THEME` env, default to `terminal`
   - Add `--theme` flag to all render scripts
   - Adopt animated prototype primitives (CornerBrackets / ProgressDots / Sparkline already match — confirm tokens.js doesn't add new ones I'm missing)
   - Smoke render of tinypath narrative under each of 6 themes (single frame per theme)
   - Update `docs/films/format/spec.md` palette section
   - Default theme switches from `espresso` → `terminal`

After all 3 merged: full re-render of tinypath narrative under TERMINAL theme + outdoorthings single-session render (4 scenes: start, build, design, end). Compare against current 5.9 GB output for parity.

## Open questions

1. **`PhaseBar` in narrative mode** — hide entirely, or show "3/6 BUILD" with scene context? **Recommend: show scene context, since chapters are a 2026 retention boost (per format spec).** Confirm.
2. **`Cost` row in StatsCard / OutroCard** — once cost calc is right, do we surface it? **Recommend: yes, but label it `API EST.` to avoid misleading viewers who don't pay per-token on Pro/Max subscriptions.** Confirm.
3. **`outdoorthings` narrative — generate it as part of this PR work or as separate test artifact later?** **Recommend: hand-write a 4-scene narrative.json for outdoorthings during PR B testing — serves as the regression fixture for single-session support.** Confirm.
4. **Concat reels** — pipeline writes only `concat-*.txt` (instructions, ~1KB each), not actual movs. User ran ffmpeg manually. Are we deleting the instructions too, or just documenting "skip the concat unless you want VLC preview"? **Recommend: keep `concat-*.txt` files (they're tiny), drop the `Quick concat` print in CLI output, add a one-line `--with-concat` flag that actually runs ffmpeg if the user wants the preview reel.** Confirm.
5. **Theme default** — change `tokens.ts` default from `espresso` to `terminal`? **Recommend: yes — espresso visually conflicts with the "hacker tech vlog" positioning Bartek is targeting after seeing the dashboards reel.** Confirm.

## Acceptance criteria

- [ ] PR A merged. Re-render of tinypath scene 5 audit clip shows accurate cost (~5× what it shows now for Opus 4.7) and real session duration in OutroCard.
- [ ] PR B merged. Re-render of IntroCard reads comfortably — countdown is legible. Outdoorthings 4-scene narrative.json renders 11 segments (4 overlays + 7 dashboards or similar) without schema error.
- [ ] PR C merged. `pnpm render:narrative --theme terminal` produces dashboards in phosphor-green. Default with no flag → terminal.
- [ ] format/spec.md updated to reference 6-theme system and single-session variant.
- [ ] film-checklist.md updated with theme decision row in section C.
- [ ] No test failures, typecheck clean across all 10 workspace packages.

## Out of scope (deferred)

- Additional B-roll composition templates (sprint 2 of `broll-templates.md` still on roadmap, not affected by this PR set)
- Face PiP integration (still manual in Premiere)
- AI-mistake beat composition (still scripted moment, no automation)
- Thumbnail.tsx redesign under new themes (deferred to dedicated thumbnail sprint)

## Changelog

- **2026-05-11** — initial spec drafted after first real-data render of tinypath surfaced 11 bugs across 5 categories + design pivot from espresso to terminal.
