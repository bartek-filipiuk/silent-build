# Installing the curate-narrative skill

The skill lives in this repo at `skills/curate-narrative/`. To make it discoverable by Claude Code, it needs to be linked into `~/.claude/skills/`.

## Quick install (symlink)

From the silent-build repo root:

```bash
mkdir -p ~/.claude/skills
ln -sfn "$PWD/skills/curate-narrative" ~/.claude/skills/curate-narrative
```

Verify:

```bash
ls -la ~/.claude/skills/curate-narrative
```

The symlink keeps the skill in sync with whatever branch you have checked out — handy while iterating.

## Or use the pnpm script

```bash
pnpm skill:install
```

Same effect; idempotent (re-run safely).

## Uninstall

```bash
rm ~/.claude/skills/curate-narrative
```

## Verify it works

In any Claude Code session:

```
/help
```

`curate-narrative` should appear in the available skills list. To use it:

```
/curate-narrative <path-to-candidates.json>
```

Or just describe what you want, the skill description matches conversational triggers like "build narrative.json from candidates".
