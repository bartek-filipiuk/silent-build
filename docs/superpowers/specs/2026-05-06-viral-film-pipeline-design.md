# Viral film pipeline — automation for silent-build YouTube series

**Status:** design (awaiting user review)
**Date:** 2026-05-06
**Implementation branch:** likely `feat/viral-pipeline`
**Predecessors:** `2026-05-05-curator-best-of-design.md` (curator + render-narrative — already shipped)

## Context

silent-build pipeline today produces per-segment ProRes .mov files (overlays + dashboards) from a `narrative.json`. Drop into Premiere/CapCut and you can ship — but post-production is still ~3-6 h per film: missing intro card, missing outro stats, no music, no voiceover, no demo screencast assets, no captions, manual project setup each time.

Goal: automate everything that doesn't require human creative input, so each new "silent build #N" film goes from "project finished" → "YT upload" in ~1 h of human time. Across the series, this builds brand consistency (same intro composition, same music palette, same talking-head pattern, same CTA outro).

## Goal

Add the missing assets and automation layer **on top of** the existing curator + render-narrative pipeline. Output: a per-film asset bundle that drops into Premiere with minimal manual work.

Per-film human work after this spec ships: ~30 min Premiere assembly + 10 min YT upload. Per-film automation:

- Remotion `ProjectIntro` (5–15 s, animated brand reveal)
- Remotion `StatsCard` (5 s, numbers reveal at outro)
- Remotion `CommitCard` (2 s, B-roll insert during phases)
- Remotion `CodeZoom` (3 s, B-roll insert with file path + excerpt)
- ElevenLabs TTS voiceover (3 lines × 5–10 s, EN, brand voice)
- Per-project shot-list (talking-head + OBS demo click-list)
- Per-project narrative + render (existing curator pipeline)

Plus reusable assets:

- Suno music pack (4 loops in `assets/music/`, generated once, used across all films)
- Project starter (markdown + skill) — guides Bartek through next-project setup so the silent-build pipeline can later harvest the right content

## Non-goals

- Talking-head video editor / autocut (Bartek handles in Premiere)
- AuditCard + AuditFindingsExtractor (deferred to a separate spec — audit content for film #1 lives inside the existing 6-scene narrative; dedicated audit composition starts at film #2)
- Music synthesis runtime (we use Suno offline, drop loops into repo)
- Auto-publish to YouTube
- Multilingual TTS / dubbing
- Reaction videos / clip extraction for Twitter/TikTok (post-MVP)

## Architecture

```
silent-build/
├── packages/
│   ├── ui/
│   │   └── src/compositions/
│   │       ├── ProjectIntro.tsx        ← NEW (1920×1080, 10 s)
│   │       ├── StatsCard.tsx           ← NEW (1920×1080, 5 s)
│   │       ├── CommitCard.tsx          ← NEW (1920×1080, 2 s, gh-style)
│   │       └── CodeZoom.tsx            ← NEW (1920×1080, 3 s, syntax-highlighted)
│   ├── overlay/src/
│   │   ├── Root.tsx                    ← register 4 new compositions
│   │   └── render-film-assets.ts       ← NEW (CLI: per-project film bundle)
│   └── film-assets/                    ← NEW package
│       ├── src/
│       │   ├── repo-metadata.ts        extract intro props from any repo
│       │   ├── voiceover-script.ts     Claude one-shot → 3 voice lines
│       │   ├── elevenlabs.ts           TTS API client
│       │   ├── shot-list.ts            generate per-project shot-list.md
│       │   └── cli.ts                  pnpm assets:generate
│       └── tests/
├── assets/                             ← NEW reusable, version-controlled
│   ├── music/                          Suno-generated loops (~10 MB total)
│   │   ├── intro-chill-60s.wav
│   │   ├── build-hustle-90s.wav
│   │   ├── climax-drop-30s.wav
│   │   └── outro-celebratory-45s.wav
│   └── voices/
│       └── bartek-clone-id.txt         ElevenLabs voice ID (cloned, optional)
├── docs/films/
│   ├── silent-build-project-starter.md ← NEW (Bartek's checklist)
│   └── shot-list-template.md           ← NEW (jinja-style template)
└── skills/
    └── start-silent-build-project/     ← NEW skill
        ├── SKILL.md
        ├── references/
        │   ├── workflow-stages.md
        │   ├── session-naming.md
        │   └── phase-checkpoints.md
        └── bin/
            └── status.mjs              read project state, suggest next step
```

## New Remotion compositions

### `ProjectIntro` (10 s, 1920×1080)

```ts
type ProjectIntroProps = {
  projectName: string          // "duels"
  punchline: string            // "9 days · 1 multiplayer game · 1v1"
  subtitle: string             // "fastduels.com"
  techStack: string[]          // ["SvelteKit", "Cloudflare", "PartyKit", "D1"]
  startTs: string              // ISO start of project, for "DAY 0" overlay
}
```

Animation:
- 0–1.5 s: black fade → big number reveal (extract first digit/word from punchline, monospace, glow)
- 1.5–4 s: full punchline reveals letter-by-letter, NASA palette
- 4–6 s: subtitle (URL or app name) slides up from bottom, amber underline
- 6–8.5 s: tech stack chips appear left-to-right, each with subtle pop spring
- 8.5–10 s: hold + fade to black for cut

Reuses tokens from `@silent-build/theme`. No external assets needed.

### `StatsCard` (5 s, 1920×1080)

```ts
type StatsCardProps = {
  projectName: string
  totalPrompts: number         // 175
  totalToolCalls: number       // 4588
  totalDays: number            // 9
  totalTokens: number          // 1.2M
  filesTouched: number         // 206
  liveUrl?: string             // "fastduels.com"
  tokensCostUsd?: number       // 47.20 (optional, derived)
}
```

Animation:
- 0–1.5 s: fade in "MISSION COMPLETE" header (green pulse like in OutroCard)
- 1.5–4 s: each metric counts up from 0 to final value (spring easing, monospace tabular-nums)
- 4–5 s: liveUrl pill bottom-center, big amber

Numbers come from harvested timeline (sum across all sessions for the film) — extracted by `film-assets/src/repo-metadata.ts`.

### `CommitCard` (2 s, 1920×1080)

```ts
type CommitCardProps = {
  shortSha: string             // "1647088"
  message: string              // "feat(markers): --live flag POSTs to live-server..."
  authorAvatar?: string        // optional URL or local path
  filesChanged: number         // 5
  insertions: number           // 87
  deletions: number            // 3
}
```

Animation:
- 0–0.3 s: fade in github-style commit box (dark bg, green +/red − stats)
- 0.3–1.5 s: hold
- 1.5–2 s: fade out

Used as B-roll insert during long phases (build/design especially) to break dashboard fatigue. ~1 per 30 s of dashboard.

### `CodeZoom` (3 s, 1920×1080)

```ts
type CodeZoomProps = {
  filePath: string             // "packages/partykit-server/src/match/match-room.ts"
  language: string             // "typescript"
  excerpt: string              // 5–15 lines of code
  highlightLine?: number       // 1-indexed line to glow
}
```

Animation:
- 0–0.5 s: fade in dark editor frame, file path top bar
- 0.5–1.5 s: code lines stagger-reveal (top-down)
- 1.5–2.5 s: highlight target line glows amber
- 2.5–3 s: hold

Syntax highlighting via `shiki` (already in Remotion ecosystem, ~50 KB).

## `@silent-build/film-assets` package

New package, encapsulates everything that's NOT a Remotion composition.

### `repo-metadata.ts`

Extract intro/stats props from any repo:

```ts
export interface RepoMetadata {
  projectName: string
  punchline: string
  subtitle: string
  techStack: string[]
  startTs: string
  endTs: string
}

export const extractRepoMetadata = (
  repoPath: string,
  jsonlDir: string
): Promise<RepoMetadata>
```

Logic:
- `package.json` → name (override with `--name` flag)
- `README.md` first paragraph → subtitle (or LLM extract)
- `package.json` deps + dev deps → techStack (filter to top 5–7 by recognizability)
- jsonl earliest timestamp → startTs
- jsonl latest timestamp → endTs
- Punchline: Claude one-shot prompt with all the above, asking for ≤8-word punchy summary

Exposes a CLI: `pnpm assets:metadata --repo <path> --jsonl-dir <path>` → prints JSON.

### `voiceover-script.ts`

```ts
export interface VoiceoverLines {
  hook: string                 // 5 s — face #1 line, but also fallback if no face
  context?: string             // 5 s — optional mid-film context
  outro: string                // 10 s — face #2 line, CTA + cliffhanger
}

export const generateVoiceoverScript = (
  metadata: RepoMetadata,
  audit?: AuditFindings,       // future, optional
  nextProject?: string         // for cliffhanger
): Promise<VoiceoverLines>
```

Calls Claude (via headless `claude -p`, no API key needed) with a prompt template using the metadata to produce 3 lines of EN voiceover. Output is editable JSON — Bartek can tweak before TTS.

### `elevenlabs.ts`

```ts
export interface TtsConfig {
  voiceId: string              // ElevenLabs voice ID
  modelId: string              // "eleven_multilingual_v2" or "eleven_turbo_v2_5"
  apiKey: string               // from env
}

export const renderVoiceover = (
  lines: VoiceoverLines,
  config: TtsConfig,
  outDir: string
): Promise<{ hookPath: string; contextPath?: string; outroPath: string }>
```

Uses ElevenLabs HTTP API (no SDK needed; `fetch` is enough). Saves MP3 per line. Voice resolution order:
1. `--voice <id>` flag if passed
2. `assets/voices/bartek-clone-id.txt` (cloned voice — Bartek's voice, opt-in)
3. Default preset voice ID `21m00Tcm4TlvDq8ikWAM` (ElevenLabs "Rachel", neutral US-EN, clean for tech narration)

Voice cloning is a one-time manual step (record 30 s of clean audio, upload to ElevenLabs UI, save returned voice ID). Spec assumes preset voice for first film; clone deferred unless Bartek opts in.

### `shot-list.ts`

Generates `docs/films/<project>-shot-list.md` per project from a template + repo metadata. Output is markdown with:

1. **Talking-head shot list** (2 takes, scripts pre-filled with project name)
2. **OBS demo click-list** (default flow: open URL → primary CTA → core feature → result; user customizes)
3. **Insert checklist** (which CommitCards / CodeZoom files to render — based on top-edited files in narrative.json)

### `cli.ts`

```bash
pnpm assets:generate --project <jsonl-dir> --out output/<project>-assets
```

Pipeline:
1. Read `<jsonl-dir>/<project>-narrative.json`
2. Extract repo metadata
3. Generate voiceover script (Claude)
4. Render TTS via ElevenLabs (3 MP3s)
5. Render ProjectIntro + StatsCard + CommitCards + CodeZooms via Remotion
6. Generate shot-list.md
7. Output bundle:
   ```
   output/<project>-assets/
   ├── intro.mov
   ├── stats.mov
   ├── commit-card-01.mov ... commit-card-NN.mov
   ├── code-zoom-01.mov ... code-zoom-MM.mov
   ├── voiceover/
   │   ├── hook.mp3
   │   ├── context.mp3 (optional)
   │   └── outro.mp3
   ├── voiceover-script.json
   └── shot-list.md
   ```

## Suno music pack

One-time, manual generation outside the repo. Output: 4 WAV files committed to `assets/music/` (~10 MB total).

Suno prompts (one per file):

```
1. intro-chill-60s.wav
   "Cinematic lo-fi intro, 60 seconds, atmospheric synth pads,
    soft kick drum, builds anticipation but stays restrained.
    Tempo 80 BPM. No vocals. Outro fades."

2. build-hustle-90s.wav
   "Lo-fi hip-hop with light synth lead, 90 seconds, drives forward,
    'coding session' vibe, 95 BPM, no vocals, loopable."

3. climax-drop-30s.wav
   "Cinematic drop, 30 seconds, big synth lead + breakbeat,
    triumphant feel for a product launch reveal,
    starts at 30s mark of buildup, ends on cymbal crash."

4. outro-celebratory-45s.wav
   "Lo-fi celebratory outro, 45 seconds, warm chords,
    light vocal chops (no words), ends with reverb tail.
    90 BPM, hopeful but understated."
```

Bartek generates these once via Suno UI, downloads, drops into `assets/music/`. Files are licensed via Suno subscription (or extended license) — note in repo README.

Files are checked into git as **canonical brand assets**. Same loops across all silent-build films → consistent audio identity.

## Talking-head strategy (Strategy A from prior conversation)

Two slots, 15 s total:

| Slot | Time | Content | Rendered as |
|---|---|---|---|
| Face #1 (hook) | 0:00–0:05 | "I gave Claude Code 9 days. Here's what it built." | Bartek records 4K @ 30 fps, drops into Premiere |
| Face #2 (outro) | 6:35–6:45 | "fastduels.com is live now. Link below. Next: silent build #2 — <X>. Subscribe." | Same |

Per-project shot-list (auto-generated) gives Bartek the exact lines to record for that film.

## Updated 7-min timeline (with assets)

```
0:00–0:05  Face #1 (talking head, real recording)
0:05–0:15  ProjectIntro composition (Remotion)
0:15–0:20  Cut to first dashboard (V.O. context line plays over)
0:20–1:30  Phase 1 dashboards (with 1× CommitCard insert)
1:30–3:00  Phase 2 dashboards (with 2× CommitCard, 1× CodeZoom)
3:00–4:00  Phase 3 dashboards (with 1× CommitCard, 1× CodeZoom)
4:00–4:45  Phase 4 dashboards (audit — for film #1, regular dashboards
           inside the existing 6-scene narrative; for #2+, this slot
           gets replaced by AuditCard composition — separate spec)
4:45–5:30  Phase 5 dashboards — climax (CommitCard for git push,
           music drop)
5:30–6:30  OBS demo screencast (Bartek's recording)
6:30–6:35  StatsCard composition (Remotion)
6:35–6:45  Face #2 (talking head)
6:45–7:00  Subscribe overlay + outro music tail
```

## Project starter

### Markdown checklist

`docs/films/silent-build-project-starter.md` — single-page checklist Bartek opens in a side window when starting any new project. Stages:

1. **Day 0 — Concept** (1 CC session)
2. **Days 1–N — Build** (1+ CC sessions, with markers)
3. **Day N+1 — Audit** (NEW separate CC session — this convention is what makes AuditCard possible later)
4. **Day N+2 — Deploy** (NEW separate CC session)
5. **Day N+3 — Demo + face record** (offline, OBS)
6. **Day N+4 — silent-build pipeline run**

Each stage has 3–6 concrete checkboxes (specific commands / specific files to write).

### Skill `start-silent-build-project`

Lives at `skills/start-silent-build-project/SKILL.md`. Triggers on `/start-silent-build-project` or natural language "starting a new silent-build project".

Workflow:

1. Skill reads CWD repo state (existence of concept.md, README.md, .security-audit/, etc.)
2. Determines current stage (Day 0 / 1-N / N+1 / N+2)
3. Prints next concrete step + command to run
4. If user runs the skill again later, re-detects state — idempotent

Helper: `bin/status.mjs` — pure node script (no tsx needed) that reads repo state and outputs JSON `{ stage, completedSteps[], nextStep }`. Skill uses this for state.

References:

- `references/workflow-stages.md` — verbose description of all 6 stages
- `references/session-naming.md` — convention for naming CC sessions (so curator can later identify them)
- `references/phase-checkpoints.md` — what files must exist after each stage

### CLI scaffolder (deferred to later)

`pnpm silent-build:new <name>` — creates folder structure with templates. Not required for spec, but easy add-on later.

## Tests

Unit tests in each new package:

```
packages/film-assets/tests/
├── repo-metadata.test.ts        — fixture repo → expected RepoMetadata
├── voiceover-script.test.ts     — mock Claude → script lines validation
├── elevenlabs.test.ts           — mock fetch → MP3 file written, error handling
├── shot-list.test.ts            — fixture metadata → expected markdown output
└── fixtures/
    └── tiny-repo/                — minimal repo + jsonl

packages/ui/tests/
├── project-intro.test.tsx       — renders without throwing, durationInFrames matches
├── stats-card.test.tsx          — props animation count-up logic
├── commit-card.test.tsx         — short SHA truncation, message wrap
└── code-zoom.test.tsx           — shiki integration smoke
```

Skill itself isn't auto-tested (prose); a sample shot-list.md generated against duels fixture goes in fixtures.

## CLI surface (additions)

```
# new in @silent-build/film-assets
pnpm assets:metadata --repo <path> --jsonl-dir <path>
pnpm assets:script   --metadata <json> --next <project>
pnpm assets:tts      --script <json> --voice <id> --out <dir>
pnpm assets:generate --project <jsonl-dir> --out <dir>   # all of the above

# new in @silent-build/overlay (composition renders only)
pnpm render:intro    --project <jsonl-dir>
pnpm render:stats    --project <jsonl-dir>
pnpm render:commits  --project <jsonl-dir> [--max <n>]
pnpm render:zooms    --project <jsonl-dir> [--max <n>]

# new skill (user-level via pnpm skill:install)
/start-silent-build-project
```

## Edge cases

- **No `package.json` in repo**: `extractRepoMetadata` falls back to `git remote get-url origin` for projectName, asks user for techStack
- **No live URL in README**: `subtitle` becomes `"github.com/<user>/<project>"` instead of a domain
- **More than 7 deps**: techStack limits to top 5 most recognizable (curated list of "viral-worthy" frameworks: SvelteKit, Next.js, React, Vue, Remix, Cloudflare, Vercel, Supabase, etc.); rest become "+5 more"
- **ElevenLabs API down**: `assets:tts` writes a marker JSON `tts.failed.json` and exits non-zero; `assets:generate` continues with placeholder MP3s of silence (Bartek can re-run TTS step alone)
- **No commits in narrative range**: `CommitCard` step emits zero cards (not an error)
- **Suno track unavailable in `assets/music/`**: `render-film-assets.ts` warns but continues; Premiere will get silence which is still usable
- **First project (no prior films)**: cliffhanger line falls back to "subscribe so you don't miss the next one"

## Out of scope (deferred specs)

- **AuditCard composition + AuditFindingsExtractor**: separate spec (`2026-05-XX-audit-card-design.md`), implementation starts when project #2 with dedicated audit session is ready
- **Reaction clip auto-extractor for Twitter/TikTok**: post-MVP, after first 1–2 films validate the format
- **9:16 vertical export pipeline**: post-MVP
- **CLI scaffolder `pnpm silent-build:new`**: nice-to-have, deferred until Bartek requests
- **Per-film analytics tracking**: post-publish, separate concern

## Open questions to resolve in plan phase

1. **Voice clone vs preset voice for ElevenLabs**: which voice ID to commit to first? Plan should pick one, document, allow override.
2. **Suno license**: extended commercial license vs standard subscription? Affects whether music files can be in public repo. Plan should document.
3. **`shiki` syntax highlighting in Remotion bundle**: confirm bundle size impact (~50 KB stated, verify); if too heavy, use `prism-react-renderer` (~20 KB) as fallback.
4. **CommitCard / CodeZoom selection logic**: which commits / which files become inserts? Heuristics: top 3 commits by `insertions+deletions` per phase + top 3 most-edited files. Plan should pick + test.
5. **`claude -p` headless availability check at install time**: `pnpm assets:generate` needs `claude` in PATH for voiceover script generation. Plan: add `assets:doctor` subcommand that verifies dependencies (claude, ffmpeg, remotion, ElevenLabs API key, Suno music files present).
6. **Hot-path render order for `assets:generate`**: parallelizing Remotion compositions vs sequential to share bundle (single bundle = faster cold start, parallel = better CPU usage). Plan should benchmark.
