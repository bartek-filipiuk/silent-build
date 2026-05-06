---
name: start-silent-build-project
description: Use when starting a new silent-build YouTube project, or when checking which workflow stage your current project is at. Triggers on `/start-silent-build-project`, "starting a new silent-build project", "what stage am I at". Reads CWD repo state, identifies current stage (Day 0 / Build / Audit / Deploy / Demo / Pipeline), prints next concrete step. Idempotent — safe to run mid-project.
---

# Start-silent-build-project skill

Guides you through the 6-stage workflow that makes a project later harvestable by `silent-build/curator` and `render-narrative`. Open this skill in a side CC window while you work.

## Workflow

### Step 1 — detect current stage

Run the helper:

```bash
node $(npm root -g)/silent-build-helper/status.mjs
```

Or, if not globally installed, from inside the silent-build repo:

```bash
node skills/start-silent-build-project/bin/status.mjs <path-to-current-project>
```

It returns JSON:

```json
{
  "stage": "build" | "audit" | "deploy" | "demo" | "pipeline" | "concept",
  "completedSteps": ["concept-doc", "first-commit", ...],
  "nextStep": {
    "label": "Run a security audit in a NEW CC session",
    "command": "cd <project>; claude; /security-audit"
  }
}
```

### Step 2 — confirm with the user

Print:

```
You're at stage: <stage>
Next: <nextStep.label>
Command: <nextStep.command>

Do you want to:
  1. Mark this stage complete and move to next
  2. Stay at this stage (run the command, come back later)
  3. Jump to a different stage manually
```

### Step 3 — act on user choice

- `1` → consult `references/phase-checkpoints.md` for what files must exist; if not, list missing items
- `2` → echo the command; remind user to come back when done
- `3` → list all 6 stages, ask which

### Step 4 — re-run on next invocation

Each time the user invokes `/start-silent-build-project` later, re-run the helper. State is detected from filesystem (no hidden state files).

## References

- `references/workflow-stages.md` — verbose description of all 6 stages
- `references/session-naming.md` — Claude Code session conventions so curator can identify them
- `references/phase-checkpoints.md` — files that must exist after each stage

## Helper

`bin/status.mjs <project-path>` — pure-node, reads filesystem, outputs JSON.

## What NOT to do

- Don't write hidden state to the project repo. State is detected fresh each run.
- Don't skip Step 2 (user confirmation) — the user may know more than the heuristic.
- Don't auto-execute commands. Print, suggest, let user run.
