# silent-build skill — install

Symlink the skill into your global `~/.claude/skills/`:

```bash
cd /home/bartek/video-projects/silent-build
pnpm skill:install
```

Or one-shot:

```bash
ln -sfn $(pwd)/skills/silent-build ~/.claude/skills/silent-build
```

Verify:

```bash
ls -la ~/.claude/skills/silent-build
```

## Usage

In any Claude Code session:

```
/silent-build                       # auto-detect jsonl from CWD
/silent-build /path/to/jsonl-dir    # explicit dir
/silent-build --target 5min         # adaptive override
/silent-build --theme cobalt --fast # palette + fast mechanical clip pick
```

Or natural language:

```
zrób film z tej sesji
stwórz silent-build z outdoorthings
```

## Dependencies

- `pnpm` (workspace deps)
- `ffmpeg` (preview frame extraction)
- `xdg-open` (preview viewer; falls back to listing if missing)
- Node ≥ 18

The skill orchestrates these existing CLIs:

- `pnpm curate:scan` — candidate detection
- `pnpm assets:metadata` — repo metadata
- `pnpm render:narrative` — Remotion render (on user request only)
