# Workflow stages

Six stages, each producing artifacts that the silent-build pipeline later harvests.

## Stage 1 — concept

**Goal:** define what you're building, why, and roughly how.

**Trigger files:** `concept.md`, `README.md`, `docs/superpowers/specs/<date>-<x>-design.md`

**Typical CC interaction:** invoke `superpowers:brainstorming` skill in a fresh session. The first prompt usually reads concept.md — this becomes the `start` clip in the eventual film.

**Done when:** `concept.md` and design spec exist; the design spec was written by brainstorming skill (so plan-phase can pick it up).

## Stage 2 — build

**Goal:** ship working features.

**Trigger files:** `docs/superpowers/plans/<date>-<feature>.md`, multiple feature commits.

**Typical CC interaction:** invoke `superpowers:writing-plans` skill from the design spec. Then use `superpowers:subagent-driven-development` or `executing-plans` to implement.

**Done when:** app runs locally; 5+ feature commits; a few decisions are recorded in `docs/decisions/`.

## Stage 3 — audit

**Goal:** find security issues before they hit prod.

**Trigger files:** `.security-audit/report.md`, `.security-audit/findings/<n>.md`

**Critical rule:** START A NEW CC SESSION for the audit. Don't mix audit prompts with build prompts. The audit session jsonl becomes a clean stream the AuditCard composition can later visualize.

**Typical CC interaction:** new session in same project repo. First prompt: "do a security audit on this codebase". If `superpowers:security-audit` skill is available, invoke it.

**Done when:** `.security-audit/report.md` exists with severity-rated findings; blockers fixed; `git tag audit-pass-1` set.

## Stage 4 — deploy

**Goal:** live URL.

**Trigger files:** updated README.md with live URL; git tag like `v0.1.0`.

**Critical rule:** also a new CC session.

**Done when:** live URL verified working; release tagged.

## Stage 5 — demo + face

**Goal:** capture material that goes alongside dashboard segments in the film.

**Trigger files:** `output/<project>-demo.mov`, `output/<project>-face.mov` (or per shot-list filenames)

**Done when:** demo screencast recorded per shot-list; face takes recorded.

## Stage 6 — pipeline

**Goal:** produce the film.

**Trigger files:** `output/<project>-narrative.json`, `output/<project>-segments/`, `output/<project>-assets/`

**Done when:** Premiere assembly complete; YT upload done; README updated.

---

The skill detects the stage by checking for the trigger files in the project repo. Stage 6 partly happens in the silent-build repo — the skill should be invoked from inside the project repo for stages 1–5, and from inside silent-build for stage 6.
