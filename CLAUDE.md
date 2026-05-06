# silent-build — project conventions for Claude Code

This file is loaded automatically into any Claude Code session opened in this repo. Keep it short, factual, and stable. Long-lived rules go here; ephemeral plans go to `docs/superpowers/plans/`.

## Per-film organization

Two layers per film, keyed by **slug** (project name, e.g. `duels`, `drupal-rebuild`):

```
output/<slug>/                       ← pipeline outputs (gitignored, ephemeral, large/binary)
├── candidates.json                  curator scan output (regenerable from jsonl)
├── voiceover/
│   ├── hook.mp3                     ElevenLabs TTS output
│   └── outro.mp3
├── segments/                        render-narrative output
│   ├── scene-01-…overlay.mov
│   ├── scene-01-…clip-NN.mov
│   └── manifest.json
├── assets/                          ProjectIntro/StatsCard/CommitCard/CodeZoom .mov
└── final/                           Premiere export — the YT upload

docs/films/<slug>/                   ← human-edited per-film docs (committed)
├── narrative.json                   curator skill output (kuratorski wybór scen)
├── metadata.json                    repo-metadata extractor output
├── voiceover-script.json            generate-voiceover-script skill output
├── shot-list.md                     assets:shotlist output, edited by user
├── production-plan.md               (optional) per-film production notes
├── decisions.md                     (optional) "wybrałem T4 title, muzyka X dla phase Y"
└── publish.md                       (optional) YT title/description/tags/end-screen draft
```

Rule of thumb:
- **Edytowalne pod kontrolą wersji** (≤kilka MB JSON/MD) → `docs/films/<slug>/`
- **Ephemeral renders** (MOV / MP3 / PNG sequences, GB-skala) → `output/<slug>/`

The whole `output/` directory is gitignored except for `output/README.md`. You can `rm -rf output/<slug>` and re-render from `docs/films/<slug>/narrative.json` + `docs/films/<slug>/voiceover-script.json`.

## CLI conventions

All `pnpm assets:*` and `pnpm render:*` commands take `--out <path>` or `--input <path>` — they don't assume slug-based layout. The conventions above are followed by **how Bartek invokes** the commands, not enforced by code.

Convention example for a new project `<slug>`:

```bash
# scans → output/<slug>/candidates.json
pnpm curate:scan \
  --project ~/.claude/projects/-home-bartek-projects-<slug> \
  --out output/<slug>/candidates.json --name <slug>

# narrative kuracja w CC → save to docs/films/<slug>/narrative.json
claude
> /curate-narrative output/<slug>/candidates.json
> save to docs/films/<slug>/narrative.json

# render → output/<slug>/segments/
pnpm render:narrative \
  --input docs/films/<slug>/narrative.json \
  --out output/<slug>/segments

# metadata → docs/films/<slug>/metadata.json
pnpm assets:metadata \
  --repo /path/to/<slug> \
  --jsonl-dir ~/.claude/projects/-…-<slug> \
  --out docs/films/<slug>/metadata.json

# voiceover script → docs/films/<slug>/voiceover-script.json
claude
> /generate-voiceover-script docs/films/<slug>/metadata.json
> save to docs/films/<slug>/voiceover-script.json

# TTS → output/<slug>/voiceover/
ELEVENLABS_API_KEY=... pnpm assets:tts \
  --script docs/films/<slug>/voiceover-script.json \
  --out output/<slug>/voiceover

# shot-list → docs/films/<slug>/shot-list.md
pnpm assets:shotlist \
  --metadata docs/films/<slug>/metadata.json \
  --out docs/films/<slug>/shot-list.md
```

## Branches and PRs

- Feature branches: `feat/<short-name>` (e.g. `feat/viral-pipeline`, `feat/curator`, `feat/live-stream`)
- All merges go through PR (`gh pr create` → merge on GitHub)
- Direct push to `main` is blocked by tooling; don't fight it — open a PR
- Plan docs in `docs/superpowers/plans/` are committed early in the branch (the implementation plan), specs in `docs/superpowers/specs/` (the design)

## Tests + typecheck

Before any commit: `pnpm test && pnpm typecheck`. Both must be green. The full suite is fast (~2 s) and types are strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).

## Skills installation

`pnpm skill:install` symlinks all 3 in-repo skills to `~/.claude/skills/`:
- `curate-narrative` (build narrative.json from candidates)
- `generate-voiceover-script` (write hook + outro lines)
- `start-silent-build-project` (per-stage workflow guide)

Idempotent — safe to re-run after pulling new commits.

## Music + voice assets

- `assets/music/` — Suno-generated lo-fi loops (gitignored, manifest in `assets/music/README.md`). Standard subscription license — copy from external storage before each pipeline run.
- `assets/voices/bartek-clone-id.txt` — ElevenLabs voice ID. Default is preset Rachel (`21m00Tcm4TlvDq8ikWAM`); replace with your cloned voice ID after running ElevenLabs voice cloning UI.

## Inline tags in prompts

When you mix stages in a single CC session (build + quick audit + deploy in one `claude` run), prefix pivot prompts with `[TAG]` so the curator catches them as explicit scene markers:

```
[SECURITY] check for open redirects on /r/<code>
[CODE_REVIEW] zerknij na auth flow
[DEPLOY] wrangler deploy and verify URL
```

Recognized tag tokens (case-insensitive): `CONCEPT|IDEA|START → start`, `PLAN|ARCHITECTURE|SPEC|ROADMAP → plan`, `BUILD|CODE|FEATURE|IMPLEMENT|REFACTOR → build`, `DESIGN|UI|UX|STYLE|THEME → design`, `REVIEW|CODE_REVIEW|CODE-REVIEW|AUDIT|SECURITY|HARDEN → audit`, `DEPLOY|SHIP|RELEASE|LAUNCH|END → end`. Tag must be at the start of the prompt; mid-sentence brackets are ignored. Signal=8 (overrides keyword detection signal=5).

Full reference: `docs/films/inline-tags.md`. To render a specific scene only: `pnpm render:narrative --input <path> --scenes 5`. For separate deep-dive films, build a second narrative.json from tagged clips and render with `--out output/<slug>/deep-dives/...`.

## OBS recording layer (per project)

Each Claude Code session from Day 1 onwards is recorded with OBS Studio so the final film shows the real terminal/editor on the left (1344×1080) and the silent-build dashboard render on the right (576×1080) — total 1920×1080.

- Setup cookbook: `assets/obs/README.md` (one-time per machine, ~10 min)
- OBS canvas resolution: 1344×1080 @ 30 fps, x264 CRF 23 (or NVENC CQ 23)
- Recordings live in `~/video-projects/<slug>/raw-recordings/day-N-<stage>.mkv` — kept on the project repo side, NOT in silent-build, NOT in git
- Hotkey convention: F9 = start, F10 = stop. Convention is per-CC-session: one recording covers one `claude` invocation top-to-bottom.
- Storage: ~5 GB/h, ~25-30 GB per project total. Delete after YT publish + 1 week.

In Premiere assembly, the raw recording per CC session is razor-cut by `narrative.json` clip ranges and time-stretched to match each clip's `durationSec` (compression ratios 25-50× typical). Dashboard segments from `output/<slug>/segments/` go on the right track at the same timeline positions.

If you forget to start OBS at the beginning of a session: that session is a writeoff for the left-panel layer (you still have dashboard data from the jsonl). The film loses authenticity for that span — you can either stitch a short reconstruction, or accept a dashboard-only segment with a "session: rebuilding multiplayer" lower-third caption.

## Auto/manual handoff for film production

The pipeline is ~30% automation, ~70% Premiere assembly + face/demo recording. The 7-min target timeline + Strategy A talking-head positioning is documented in `docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md`. Per-project execution checklist: `docs/films/silent-build-project-starter.md`.
