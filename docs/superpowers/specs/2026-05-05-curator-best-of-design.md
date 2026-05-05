# Curator: Best-Of Narrative Builder for silent-build

**Status:** design (awaiting review)
**Date:** 2026-05-05
**Branch:** likely `feat/curator` (off `main` after `feat/live-stream` merge)

## Context

silent-build today renders **one VOD per Claude Code session** (`pnpm harvest --project <jsonl>` → timeline.json → `pnpm render:dashboard`). Good for short, single-purpose sessions, useless for the realistic case: a multi-month project lives across **many sessions** and the user wants a single **narrative-arc film** ("here's how `fastduels.com` was built — concept, plan, build, design, security audit, prod").

Current pipeline can't:

- read multiple jsonl files at once and merge them chronologically
- detect "interesting" fragments vs. boilerplate
- group fragments into a 6-scene narrative
- compress 200+ hours of wallclock into a 12-minute film with sane time-lapse ratios

The duels project is the first concrete user (4 jsonl, 81 MB, ~9 days of work spread across 4 separate sessions). Sessions are **already done** — we cannot rely on retroactive markers.

## Goal

Add a **curator layer** that takes one or more jsonl session files and produces a `narrative.json` describing 6 scenes (start / plan / build / design / audit / end), each containing 1–4 ranked clips with timestamps, scores, and rationales. The render pipeline consumes `narrative.json` and produces a single `.mov` of target duration (default 12 min).

Two-stage flow:

1. **Deterministic preprocessing** (TS, fast, ~30 s) → shortlist of ~50 candidate fragments
2. **LLM-driven curation** (Claude Code skill, interactive, ~5–10 min in a CC session) → final `narrative.json`

The user can edit `narrative.json` by hand at any point and re-run the render.

## Non-goals

- Real-time live streaming integration (covered by `feat/live-stream`)
- Voice-over / music / final color grade — that lives in CapCut after this pipeline
- Cross-project narrative (one project per `narrative.json`; a "best of fastduels + drupal" film is a future extension)
- LLM-driven render decisions (rendering stays deterministic)
- Auto-publishing to YouTube

## Architecture

```
silent-build/
├── packages/curator/                  ← NEW package
│   ├── src/
│   │   ├── preprocess.ts              core heuristic engine (pure fns)
│   │   ├── narrative-schema.ts        Zod schema + types
│   │   ├── jsonl-reader.ts            stream-friendly multi-file reader
│   │   ├── cli.ts                     pnpm curate:scan entrypoint
│   │   └── index.ts                   re-exports for skill helper
│   ├── tests/
│   │   ├── preprocess.test.ts         fixture jsonl → expected candidates
│   │   ├── narrative-schema.test.ts   round-trip + reject malformed
│   │   └── fixtures/
│   │       ├── tiny-session.jsonl
│   │       └── multi-session/         3 small jsonl, gaps between
│   └── package.json
└── packages/overlay/
    └── src/render-narrative.ts        ← NEW (sibling of render-cli.ts)

~/.claude/skills/curate-narrative/     ← NEW user-level skill (separate from repo)
├── SKILL.md                           top-level instructions for Claude
├── references/
│   ├── jsonl-schema.md                Claude Code event schema cheatsheet
│   ├── scoring-rubric.md              0–10 rubric, examples
│   └── scene-templates.md             6 scenes: prompts, criteria, fallbacks
└── bin/
    └── preprocess.mjs                 thin wrapper over @silent-build/curator
```

Skill lives **outside the repo** so the user can use it across multiple projects (silent-build, duels, future); it depends on `@silent-build/curator` being globally linked or vendored as a one-file bundle.

## Data flow

```
4× session.jsonl (raw Claude Code event logs)
        │
        ▼
[Stage 1 — preprocess]   pnpm curate:scan  (deterministic, ~30s, no LLM)
        │
        ▼
candidates.json
  { project, sources: [...], totalEvents, candidates: [
      { id, from, to, sourceJsonl, tag,
        metricsSummary, firstPromptText, ... } × ~50
  ]}
        │
        ▼
[Stage 2 — skill curation]  /curate-narrative  (in Claude Code, interactive)
        │
        ├── Claude reads candidates.json
        ├── for each candidate: reads precise fragment from raw jsonl (Read tool, byte/line range)
        ├── scores 0–10 per scoring-rubric.md
        ├── assigns to scene per scene-templates.md
        ├── greedy bin-packing into target duration (12 min default)
        ├── shows proposed narrative to user
        ├── iterates with user ("scene 3 too short, try X")
        ▼
narrative.json    ← human-editable artefact (Zod-validated)
        │
        ▼
[Stage 3 — render]   pnpm render:narrative --input narrative.json
        │
        ├── for each scene:
        │     pre-overlay (Intro/PhaseTransition/Outro from @silent-build/ui)
        │     dashboard for clip range from→to (compressed via frame skipping)
        │     concatenate
        ▼
output/<project>-final.mov    (single ProRes 4444, ~12 min)
```

## Schema: `narrative.json`

```ts
import { z } from 'zod'

export const NarrativeClip = z.object({
  from: z.string().datetime(),         // ISO8601 UTC, start ts in raw jsonl
  to: z.string().datetime(),           // end ts (inclusive)
  sourceJsonl: z.string(),             // absolute path
  label: z.string().min(1).max(120),   // human caption, e.g. "Reading concept doc"
  score: z.number().min(0).max(10),    // LLM rating
  rationale: z.string().min(1).max(280), // 1-sentence justification
  compressionRatio: z.number().min(1)  // advisory; recomputed at render time
})

export const NarrativeScene = z.object({
  id: z.enum(['start', 'plan', 'build', 'design', 'audit', 'end']),
  title: z.string().min(1).max(40),    // shown in PhaseTransition card
  durationSec: z.number().int().positive(),
  overlay: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('Intro'), props: z.record(z.unknown()).optional() }),
    z.object({ kind: z.literal('PhaseTransition'), props: z.object({ phaseNumber: z.number().int().min(1).max(6) }) }),
    z.object({ kind: z.literal('Outro'), props: z.record(z.unknown()).optional() })
  ]),
  clips: z.array(NarrativeClip).min(1).max(5)
})

export const Narrative = z.object({
  project: z.string(),
  targetMinutes: z.number().int().positive().default(12),
  generatedAt: z.string().datetime(),
  scenes: z.array(NarrativeScene).length(6)
})

export type Narrative = z.infer<typeof Narrative>
```

**Invariants** (enforced in render-narrative):

- `sum(scenes[*].durationSec)` ≈ `targetMinutes × 60` (±10%)
- `clips[*].from < clips[*].to`
- Within a scene, clips are sorted by `from` ascending
- `compressionRatio` in `narrative.json` is what the skill calculated when it proposed durations (for human review). At render time the actual ratio is recomputed as `(to_ms - from_ms) / (durationSec × 1000)` so hand-edited `durationSec` is honored.

## Heuristics (preprocess.ts)

Deterministic, pure functions over the merged event stream. Produce a list of candidate fragments tagged with one of `start | plan | build | design | audit | end | unknown`.

| Heuristic | Trigger | Resulting tag | Example |
|---|---|---|---|
| `firstPrompts(n=5)` | first n user prompts of any session | `start` | "zobacz Koncepcja Produktowa" |
| `editBurst` | ≥10 Edit/Write tool calls within 10-min window, ≥80% in one file | `build` (or `design` if file matches `*.svelte`/`*.tsx`/`messages/*.json`) | 36× edits to `play/+page.svelte` |
| `scaffolding` | ≥5 Write tool calls (new files) within 10 min | `build` | initial monorepo setup |
| `agentRun` | tool name `Agent`, computed wallclock ≥5 min | `build` | long autonomous task |
| `promptKeywordMatch` | regex match in user prompt content (case-insensitive): `audit\|security\|recon`, `deploy\|launch\|prod`, `design\|figma\|brief`, `plan\|spec\|roadmap` | `audit` / `end` / `design` / `plan` | "ok zrób security audit" |
| `commitPush` | Bash with `git commit\|push` substring | `end` | final deploy day |
| `longPause` | ≥30 min gap between consecutive events | scene-break (not a clip; informs scene boundary fitting) | overnight |
| `lastPrompts(n=3)` | last n user prompts of latest session | `end` | "release done" |

Output cap: **max 50 candidates total** (top by raw signal strength) to keep the skill's LLM context manageable.

## Skill: `curate-narrative`

`SKILL.md` contains step-by-step instructions for Claude inside a CC session. The skill assumes:

- `pnpm curate:scan --project <jsonl-dir> --out <candidates.json>` was already run (it tells the user to run it first if missing)
- Claude has Read, Bash, Write tools

Skill workflow:

1. Read `candidates.json` (~50 entries, ~30 KB)
2. For each candidate, Read the precise fragment from the raw jsonl (using `from`/`to` timestamps to bound a small range)
3. Score each candidate 0–10 using `references/scoring-rubric.md`
4. Group by scene id using `references/scene-templates.md`
5. **Bin-pack**: greedy fit into target duration. For each scene allocate `targetMinutes × 60 / 6` seconds, pick clips by descending score until full
6. Compute `compressionRatio` = `(realtime ms) / (clip durationSec × 1000)`. If ratio > 200× (i.e., scene is too short for realtime span), surface a warning to user
7. Render a markdown table to the user with proposed narrative
8. Iterate with user: "swap scene-3 clip-2 with this other candidate", "make audit scene 90s instead of 120s"
9. Save to `<output>-narrative.json`, validate via Zod schema

Skill is conversational, not batch — user iterates until happy.

## Render extension: `render-narrative.ts`

Sibling of existing `render-cli.ts`. Reuses dashboard/overlay compositions and `harvester` per-clip.

```
pnpm render:narrative --input output/duels-narrative.json [--out output/duels-final.mov]
```

For each scene in narrative:

1. Render the scene's `overlay` (Intro/PhaseTransition/Outro) for `2.5–7s` depending on kind, fade in/out
2. For each clip:
   - Run `harvester` with `--from <ts>` and `--to <ts>` flags (NEW flags) to produce a `timeline.json` slice
   - Render dashboard for that slice; frame count = `clip.durationSec × fps`
   - Frame skip ratio = `realtimeFrames / outputFrames` so dashboard "fast-forwards" through realtime
3. Concatenate scene = `overlay → clip1 → clip2 → …`
4. Concatenate full film = `scene1 → scene2 → … → scene6`
5. ffmpeg output: ProRes 4444 .mov

Existing `pnpm render:dashboard` etc. stay untouched — narrative render is additive.

## Tests

```
packages/curator/tests/
├── preprocess.test.ts        — given fixtures/multi-session/*.jsonl, expect:
│                                ≥1 candidate per heuristic that should fire,
│                                deterministic ordering across runs,
│                                at least one candidate tagged `start`, `build`, `end` (others optional)
├── narrative-schema.test.ts  — round-trip a sample narrative.json,
│                                reject 5 malformed variants (bad enum,
│                                missing field, score>10, empty clips,
│                                wrong scene count)
├── jsonl-reader.test.ts      — multi-file merge sorts cross-file by ts,
│                                handles malformed lines (skip + warn)
└── fixtures/
    ├── tiny-session.jsonl                       (50 lines, hand-crafted)
    └── multi-session/                           (3 files, 200 lines total,
        ├── session-a.jsonl                       gaps + overlapping ranges)
        ├── session-b.jsonl
        └── session-c.jsonl

packages/overlay/tests/
└── render-narrative.test.ts  — fixture narrative.json with 1 scene, 1 clip,
                                10-frame render, assert PNG count + dimensions
```

Skill itself is not auto-tested (it's prose); a sample `narrative.json` produced by running the skill against the duels fixture is committed as a golden file.

## CLI surface (additions)

```
# new in @silent-build/curator
pnpm curate:scan --project <jsonl-dir> [--out <path>]
   reads all *.jsonl in dir, runs heuristics, writes candidates.json

# new in @silent-build/overlay
pnpm render:narrative --input <narrative.json> [--out <mov-path>]

# new flags in @silent-build/harvester
pnpm harvest --project <jsonl-dir> [--from <iso>] [--to <iso>]
   restrict harvest to a time window (used by render-narrative internally)

# new skill (user-level, not in repo)
/curate-narrative <candidates.json> [--target-minutes 12]
```

## Edge cases

- **Single-jsonl project** (no cross-session merge): preprocess works the same, skill still produces 6 scenes (some scenes may have weaker score; warn the user)
- **All sessions on same day** (no `longPause` markers): preprocess falls back to splitting by tag clusters
- **No `audit` tag detected**: skill always emits 6 scenes (schema requires it). If no candidate naturally fits `audit`, skill warns the user and offers two paths: (a) Bash-check the project tree for `.security-audit/` or similar folders and reference their file timestamps as a synthetic clip; (b) downgrade scene to a static "no audit recorded" overlay panel. Either path keeps `clips.min(1)` satisfied.
- **Clip span < target duration** (e.g., scene wants 120s but only 30s of realtime exists): no compression, render at 1×, scene becomes shorter than target
- **Clip span >> target duration** (compressionRatio > 200×): warn user; skill suggests splitting into multiple clips

## Out of scope (deferred)

- Live `/mark highlight` flag in `markers` package (would let future projects pre-tag during work) — separate spec, not blocking
- LLM-driven scene title rewriting (skill currently uses tag → fixed title from scene-templates.md)
- Music/audio — the `.mov` is silent on purpose
- Multi-project narrative (combining 2+ project jsonl trees into one film)

## Open questions to resolve in plan phase

- Where exactly does `~/.claude/skills/curate-narrative/` get installed from? Options: (a) committed to silent-build under `skills/curate-narrative/` and user symlinks; (b) separate repo; (c) install script `pnpm skill:install`. Plan picks one.
- `harvester --from / --to` flags: clarify whether they slice raw events before timeline build, or filter the built timeline. Former is faster for short clips, latter is simpler. Plan picks one.
- Render-narrative concat strategy: ffmpeg `concat demuxer` (single pass, requires identical codec/resolution) vs `concat protocol` (re-encode). Plan picks based on quality/speed needs.
