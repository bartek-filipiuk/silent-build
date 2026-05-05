---
name: curate-narrative
description: Use when assembling a "best-of" narrative.json from one or more Claude Code session jsonl files (silent-build VOD pipeline). Triggers when user says "curate narrative", "build narrative.json", or runs `/curate-narrative`. Reads candidates.json (output of `pnpm curate:scan`), scores each candidate, assigns clips to 6 scenes (start, plan, build, design, audit, end), bin-packs to target duration, and writes narrative.json that `pnpm render:narrative` consumes.
---

# Curate-narrative skill

Turns `candidates.json` (output of `pnpm curate:scan`) into a `narrative.json` consumed by `pnpm render:narrative`. The schema is enforced — exactly 6 scenes (start, plan, build, design, audit, end), each with 1–5 clips. Default target duration: 12 minutes.

## Inputs you need from the user

1. `candidates.json` path (absolute or relative)
2. Target film duration in minutes (default: 12)
3. Output path for `narrative.json` (default: same dir as candidates.json)

If anything is missing, ask before starting.

## Workflow

### Step 1 — read candidates.json

Use the Read tool on the path provided. The schema (defined in `@silent-build/curator/narrative-schema`) has fields you'll need:

- `project` — film project label
- `sources[]` — list of jsonl files used
- `candidates[]` — each has `id`, `from`, `to`, `sourceJsonl`, `tag`, `reason`, `metricsSummary`, `firstPromptText`

If candidates.json is missing or unreadable, instruct the user to run:
```
pnpm curate:scan --project <jsonl-dir> --out <path>
```
and stop.

### Step 2 — read clip context where needed

For each candidate, you may want richer context than `firstPromptText` alone. Use the Read tool on `sourceJsonl` to peek at lines around the `from` timestamp. Read selectively (don't load 39 MB jsonl files into context — use offset/limit).

A useful trick: get a feel for the total event count, then read the first ~100 lines of any candidate's surrounding window to verify the heuristic guess matched the real content.

### Step 3 — score each candidate (0–10)

Apply the rubric in `references/scoring-rubric.md`. Score is gut-check based on prompt strength, narrative weight, file content density, recognizable milestones.

### Step 4 — assign each candidate to a scene

Use `references/scene-templates.md` for what belongs in each of the 6 scenes:

- **start** — concept, ideation, opening prompts, first reading of brief
- **plan** — roadmap, spec, architecture, phase planning
- **build** — implementation work, edits, scaffolding, agent runs
- **design** — UI work (Svelte/React/CSS files), i18n, branding
- **audit** — security, performance review, bug-hunt sessions
- **end** — deploy, push, rebrand, "we shipped"

Heuristic `tag` is a starting point; you may override after reading the actual content.

### Step 5 — bin-pack into target duration

Default 12 min ÷ 6 scenes = ~120 s per scene budget.

Per-scene budget is split between:
- overlay (Intro: 4 s, PhaseTransition: 2.5 s, Outro: 7 s)
- 1–5 clips totalling the rest

Greedy fit:
1. For each scene, sort its assigned candidates by score (desc).
2. Take top candidates until clips would exceed scene budget minus overlay.
3. Aim for 1–3 clips per scene; 5 is the schema cap.
4. Per clip duration: `roundedSec` between 15 and 60 s. Compute `compressionRatio = realtimeMs / (clip.durationSec * 1000)`. Warn if > 200.

Hand-picked durations are fine — schema only requires `durationSec ≥ 1`.

### Step 6 — assemble narrative

Build the JSON object matching the schema:

```ts
{
  project: <from candidates.json>,
  targetMinutes: <user choice>,
  generatedAt: <now ISO>,
  scenes: [
    { id: "start", title: "...", durationSec: ..., overlay: { kind: "Intro" }, clips: [...] },
    { id: "plan",  title: "...", durationSec: ..., overlay: { kind: "PhaseTransition", props: { phaseNumber: 2 } }, clips: [...] },
    { id: "build", title: "...", durationSec: ..., overlay: { kind: "PhaseTransition", props: { phaseNumber: 3 } }, clips: [...] },
    { id: "design",title: "...", durationSec: ..., overlay: { kind: "PhaseTransition", props: { phaseNumber: 4 } }, clips: [...] },
    { id: "audit", title: "...", durationSec: ..., overlay: { kind: "PhaseTransition", props: { phaseNumber: 5 } }, clips: [...] },
    { id: "end",   title: "...", durationSec: ..., overlay: { kind: "Outro" }, clips: [...] }
  ]
}
```

Each clip:
```ts
{
  from: candidate.from,
  to: candidate.to,
  sourceJsonl: candidate.sourceJsonl,
  label: <human caption you wrote, ≤120 chars>,
  score: <0-10 you assigned>,
  rationale: <one sentence why this clip earned the spot>,
  durationSec: <chosen film duration>,
  compressionRatio: <realtime / film, computed>
}
```

### Step 7 — present to the user before saving

Show a markdown table summarising the narrative:

```
| # | Scene  | Title                | Clips | Total |
|---|--------|----------------------|-------|-------|
| 1 | start  | Concept              | 1     | 60s   |
| 2 | plan   | Architecture         | 2     | 120s  |
| 3 | build  | Building the engine  | 3     | 180s  |
| 4 | design | Frontend & i18n      | 2     | 130s  |
| 5 | audit  | Security review      | 2     | 90s   |
| 6 | end    | Ship to production   | 2     | 100s  |
```

Plus a per-scene clip rundown with labels, rationales, scores.

### Step 8 — iterate

The user may say:
- "scene 3 is too long, drop one clip" → update durationSec, remove lowest-score clip
- "swap audit clip-2 with cand-039" → look up cand-039, replace
- "rename build to 'Building the multiplayer engine'" → update title

Iterate freely until the user says OK. Each iteration: revalidate against the schema mentally; the file save (Step 9) does the strict check.

### Step 9 — save and validate

Use the Write tool to save `narrative.json`. After saving, run:

```bash
node skills/curate-narrative/bin/preprocess.mjs validate <path>
```

If validation fails, fix the issue based on the error message and re-save. Common issues:
- `clips: []` (must have ≥1)
- Wrong scene count (must be exactly 6)
- `clip.durationSec < 1`
- Bad ISO timestamp on `generatedAt`

### Step 10 — tell the user what to do next

After successful save, output:

```
Narrative saved: <path>
Render: pnpm render:narrative --input <path>
Preview a single scene: pnpm render:narrative --input <path> --scenes 3
Skip overlays:           pnpm render:narrative --input <path> --skip-overlays
```

## What NOT to do

- Don't fabricate timestamps. Always use real `from`/`to` from candidates.json.
- Don't include scene-activation messages or system reminders as `firstPromptText`. Use only real human prompts.
- Don't skip the preview table in Step 7 — the user should always see and approve before render.
- Don't write narrative.json without validating it (Step 9). The schema is strict.

## References

- `references/jsonl-schema.md` — Claude Code event format cheatsheet
- `references/scoring-rubric.md` — 0–10 rubric with examples
- `references/scene-templates.md` — what makes a strong scene per id

## Helper

`bin/preprocess.mjs validate <narrative.json>` — schema check only. Exits non-zero on failure.
