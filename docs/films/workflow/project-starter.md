# Silent-build project starter

Open this in a side window when starting any new project. Each stage takes you from "git init" to "YT publish".

---

## Pre-Day 0 — One-time OBS setup (per project)

Every CC session from Day 1 onwards is **recorded with OBS** so the final film can show your real terminal/editor on the left and the silent-build dashboard render on the right (1344 + 576 = 1920 width). See `assets/obs/README.md` in silent-build for full setup; minimal:

- [ ] In OBS: New scene "silent-build-cc-session"
- [ ] Add **Window Capture** source pointing at your terminal window (or whichever app has Claude Code)
- [ ] Set Output → Recording: 1344×1080, 30 fps, MP4 / x264 CRF 23 (or NVENC AVC ~4500 kbps)
- [ ] Set hotkeys: F9 → Start Recording, F10 → Stop Recording
- [ ] Set Output → Recording Path: `~/video-projects/<slug>/raw-recordings/` (create the dir first)

Storage budget: ~5 GB/h. A typical project = 4-6 h total recordings = ~25-30 GB. Files are gitignored and deletable after YT publish.

## Day 0 — Concept (1 CC session)

- [ ] `mkdir <project> && cd <project> && git init`
- [ ] `gh repo create <user>/<project> --public --source=. --push`
- [ ] Write `concept.md` (1 page: what + why + tech stack idea)
- [ ] In a CC session: invoke `superpowers:brainstorming` skill
- [ ] Save spec to `docs/superpowers/specs/<date>-<project>-design.md`

End state: `concept.md`, `README.md`, design spec exist. Session has the prompt that reads concept.md (this becomes the `start` candidate later).

## Days 1–N — Build (1+ CC sessions)

**Before each session: F9 in OBS to start recording.** Save filename: `day-1-build.mov`, `day-2-build-fix.mov`, etc. F10 to stop when you close CC.

**Inline tags for mid-session pivots:** if you mix stages in one session (e.g. build → quick audit → back to build), prefix the pivot prompt with `[SECURITY]`, `[CODE_REVIEW]`, `[DEPLOY]`, etc. The curator picks these up as explicit scene markers (signal=8, stronger than keyword detection). Full tag list + workflow: `docs/films/workflow/inline-tags.md`.

- [ ] Mark project start: `cd <silent-build>; pnpm mark project-start --name "<X>"`
- [ ] In project repo: invoke `superpowers:writing-plans` from spec → `docs/superpowers/plans/<date>-<feature>.md`
- [ ] Implement task-by-task; commit after each task with `feat(...)`/`fix(...)`/`test(...)`
- [ ] Save decisions in `docs/decisions/<NNN>-<topic>.md` (one paragraph each)
- [ ] After a feature ships: `gh pr create` → merge → close issue
- [ ] **F10 to stop recording at end of session.**

End state: 2+ feature commits, working app deployable locally, decisions documented, raw recordings in `~/video-projects/<slug>/raw-recordings/day-*.mov`.

## Day N+1 — Audit (NEW separate CC session)

**F9 to start a new OBS recording → save as `day-N-audit.mov`.**

- [ ] Open a new terminal in the project. Run `claude`.
- [ ] First prompt: "do a security audit on this codebase"
- [ ] If `superpowers:security-audit` skill available: invoke it
- [ ] Audit produces files in `.security-audit/`: `report.md`, `recon.md`, `test-quality.md`, `findings/`, `non-issues/`
- [ ] Fix blockers; commit each as `fix(security): <thing>`
- [ ] `git tag audit-pass-1`
- [ ] **F10 to stop recording.**

Why a NEW session: the audit jsonl becomes a clean candidate stream for the AuditCard composition (separate spec, post-MVP). Don't mix audit prompts with build prompts.

## Day N+2 — Deploy (NEW separate CC session)

**F9 → `day-N-deploy.mov`.**

- [ ] New CC session
- [ ] Deploy commands: `wrangler deploy` / `vercel --prod` / `fly deploy`
- [ ] Verify live URL works
- [ ] Update README.md with live URL
- [ ] `gh release create v0.1.0 --title "v0.1.0" --generate-notes`
- [ ] **F10.**

## Day N+3 — Demo + face record (offline)

In `silent-build` (replace `<slug>` with project name, e.g. `duels`):

- [ ] `mkdir -p docs/films/<slug> output/<slug>`
- [ ] `pnpm assets:metadata --repo <project> --jsonl-dir ~/.claude/projects/-…-<slug> --out docs/films/<slug>/metadata.json`
- [ ] `claude` then `/generate-voiceover-script docs/films/<slug>/metadata.json` → save to `docs/films/<slug>/voiceover-script.json`
- [ ] `pnpm assets:shotlist --metadata docs/films/<slug>/metadata.json --out docs/films/<slug>/shot-list.md`
- [ ] Read shot-list.md
- [ ] OBS demo screencast 60s per shot-list → record to `output/<slug>/demo.mov`
- [ ] Face record 30s of takes (hook + outro) per shot-list → `output/<slug>/face.mov`

## Day N+4 — silent-build pipeline run

- [ ] `cd <silent-build>`
- [ ] `pnpm curate:scan --project ~/.claude/projects/-…-<slug> --out output/<slug>/candidates.json --name <slug>`
- [ ] `claude` → `/curate-narrative output/<slug>/candidates.json` → save to `docs/films/<slug>/narrative.json`
- [ ] `pnpm render:narrative --input docs/films/<slug>/narrative.json --out output/<slug>/segments`
- [ ] `pnpm render:projectintro --project output/<slug>/segments` → also produces frames in segments dir
- [ ] `pnpm render:stats --project output/<slug>/segments`
- [ ] (B-roll inserts: render CommitCard / CodeZoom for top items)
- [ ] `ELEVENLABS_API_KEY=... pnpm assets:tts --script docs/films/<slug>/voiceover-script.json --out output/<slug>/voiceover`

### Premiere assembly (1920×1080, 7-min target)

Per clip in narrative.json:

1. Razor-cut the matching `~/video-projects/<slug>/raw-recordings/day-*.mov` from `clip.from` to `clip.to`
2. Time-stretch the cut to `clip.durationSec` (compression ratio is in narrative.json — typically 25-50× speed-up)
3. Position at (0, 0), 1344×1080, on track V2
4. Place dashboard `output/<slug>/segments/scene-XX-<id>-clip-NN.mov` at (1344, 0), 576×1080, on track V3
5. Same start/end timestamps for the clip pair — they sync naturally

Per scene boundary:

- Place overlay `output/<slug>/segments/scene-XX-<id>-overlay.mov` (1920×1080) on track V4 (top), full-screen takeover for 2.5-7 s

Top of timeline:

- Face #1 hook (5 s, from `output/<slug>/face.mov`) at 0:00
- ProjectIntro (10 s, from `output/<slug>/segments/projectintro.mov`) at 0:05
- Live OBS demo (60 s, from `output/<slug>/demo.mov`) at 5:30
- StatsCard (5 s) at 6:30
- Face #2 outro (10 s) at 6:35

Audio:
- Suno music tracks crossfaded between scene boundaries
- ElevenLabs voiceover MP3s aligned to face takes (for lip sync the recorded audio takes priority; v.o. is fallback)

Final export → `output/<slug>/final/<slug>-silent-build-N.mp4` (H.264, ~1 GB).

- [ ] Draft YT metadata in `docs/films/<slug>/publish.md` (title, description, tags, end-screen)
- [ ] YT upload using `publish.md` content
- [ ] Repo README update with YT link
- [ ] **Delete raw recordings** `~/video-projects/<slug>/raw-recordings/` after publish + 1 week (storage reclaim)

End state: published video, README link added, `docs/films/<slug>/` has full record under version control.

---

## Verification

`pnpm assets:doctor` — runs all checks before pipeline. Re-run after fixing failures.

Skill `start-silent-build-project` (`/start-silent-build-project`) reads project state and tells you which stage you're at + next concrete step.
