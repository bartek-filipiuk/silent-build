# Phase checkpoints (what `bin/status.mjs` looks for)

Each stage has trigger files. Helper detects current stage as the **highest stage with all triggers present**.

## Stage 1 (concept) — done when:

- [ ] `concept.md` exists
- [ ] `README.md` exists
- [ ] `docs/superpowers/specs/*.md` has at least one file

## Stage 2 (build) — done when:

- [ ] All Stage 1 triggers
- [ ] `docs/superpowers/plans/*.md` has at least one file
- [ ] `git log --oneline | wc -l` ≥ 5 commits
- [ ] App can be built (`package.json` has `build` script and runs)

## Stage 3 (audit) — done when:

- [ ] All Stage 2 triggers
- [ ] `.security-audit/report.md` exists
- [ ] `git tag` shows at least one `audit-pass-*` tag

## Stage 4 (deploy) — done when:

- [ ] All Stage 3 triggers
- [ ] `git tag` shows at least one `v*.*` tag
- [ ] README has a live URL (regex `https?://`)

## Stage 5 (demo+face) — done when:

- [ ] All Stage 4 triggers
- [ ] (Detected from silent-build repo, not project repo:)
  - [ ] `output/<project>-demo.*` (mov / mp4) exists
  - [ ] `output/<project>-face.*` (mov / mp4) exists

## Stage 6 (pipeline) — done when:

- [ ] All Stage 5 triggers
- [ ] `output/<project>-narrative.json` exists
- [ ] `output/<project>-segments/manifest.json` exists
- [ ] `output/<project>-assets/metadata.json` exists

## Detection algorithm (helper)

For each stage in order 1→6, check all triggers. The highest stage with **complete** triggers is `completedSteps`'s max. The next stage's first incomplete trigger is `nextStep`.

If no triggers match (empty repo), report `stage: "concept"` and `nextStep: "write concept.md"`.
