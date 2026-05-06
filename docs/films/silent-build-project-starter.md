# Silent-build project starter

Open this in a side window when starting any new project. Each stage takes you from "git init" to "YT publish".

---

## Day 0 — Concept (1 CC session)

- [ ] `mkdir <project> && cd <project> && git init`
- [ ] `gh repo create <user>/<project> --public --source=. --push`
- [ ] Write `concept.md` (1 page: what + why + tech stack idea)
- [ ] In a CC session: invoke `superpowers:brainstorming` skill
- [ ] Save spec to `docs/superpowers/specs/<date>-<project>-design.md`

End state: `concept.md`, `README.md`, design spec exist. Session has the prompt that reads concept.md (this becomes the `start` candidate later).

## Days 1–N — Build (1+ CC sessions)

- [ ] Mark project start: `cd <silent-build>; pnpm mark project-start --name "<X>"`
- [ ] In project repo: invoke `superpowers:writing-plans` from spec → `docs/superpowers/plans/<date>-<feature>.md`
- [ ] Implement task-by-task; commit after each task with `feat(...)`/`fix(...)`/`test(...)`
- [ ] Save decisions in `docs/decisions/<NNN>-<topic>.md` (one paragraph each)
- [ ] After a feature ships: `gh pr create` → merge → close issue

End state: 2+ feature commits, working app deployable locally, decisions documented.

## Day N+1 — Audit (NEW separate CC session)

- [ ] Open a new terminal in the project. Run `claude`.
- [ ] First prompt: "do a security audit on this codebase"
- [ ] If `superpowers:security-audit` skill available: invoke it
- [ ] Audit produces files in `.security-audit/`: `report.md`, `recon.md`, `test-quality.md`, `findings/`, `non-issues/`
- [ ] Fix blockers; commit each as `fix(security): <thing>`
- [ ] `git tag audit-pass-1`

Why a NEW session: the audit jsonl becomes a clean candidate stream for the AuditCard composition (separate spec, post-MVP). Don't mix audit prompts with build prompts.

## Day N+2 — Deploy (NEW separate CC session)

- [ ] New CC session
- [ ] Deploy commands: `wrangler deploy` / `vercel --prod` / `fly deploy`
- [ ] Verify live URL works
- [ ] Update README.md with live URL
- [ ] `gh release create v0.1.0 --title "v0.1.0" --generate-notes`

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
- [ ] Premiere assembly per `docs/films/<slug>/shot-list.md` + 7-min timeline (see `docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md` section "Updated 7-min timeline"). Final export → `output/<slug>/final/<slug>-silent-build-N.mp4`.
- [ ] Draft YT metadata in `docs/films/<slug>/publish.md` (title, description, tags, end-screen)
- [ ] YT upload using `publish.md` content
- [ ] Repo README update with YT link

End state: published video, README link added, `docs/films/<slug>/` has full record under version control.

---

## Verification

`pnpm assets:doctor` — runs all checks before pipeline. Re-run after fixing failures.

Skill `start-silent-build-project` (`/start-silent-build-project`) reads project state and tells you which stage you're at + next concrete step.
