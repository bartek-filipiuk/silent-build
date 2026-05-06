# Session naming conventions

Claude Code stores sessions per project at `~/.claude/projects/<slug>/<uuid>.jsonl` where the slug is the absolute repo path with `/` replaced by `-`. The curator picks this up automatically.

## Why naming sessions matters

When you run `pnpm curate:scan`, the curator reads ALL `*.jsonl` files in the project's CC directory. Heuristics tag candidates `start | plan | build | design | audit | end`. Without dedicated sessions:

- Audit prompts are scattered across the build session — `audit` candidates get drowned by `build` candidates
- No structural marker between phases, so the bin-packer guesses

With dedicated sessions:

- Phase 3 (audit) jsonl has only audit content → 100% clean candidates
- Phase 4 (deploy) jsonl has only deploy commands → clean `end` candidates
- Background sessions (e.g., quick fix) don't pollute the main jsonl

## Practical naming

Claude Code doesn't let you name sessions, but you control them by:

1. **Starting a fresh `claude` invocation** for each phase (concept / build / audit / deploy)
2. Using `/clear` between major topic shifts within a single phase
3. Optionally adding a marker prompt at the start of each session, e.g., `# audit session — security review`

The first user prompt of a session is what curator's `firstPrompts` heuristic catches as the candidate's `firstPromptText`. So **make your first prompt narrative-friendly**:

✅ "Now let's do the security audit on this codebase."
❌ "ok"
❌ ".gitignore"

## Resuming sessions

If you accidentally mix phases in one session, the curator can still extract candidates by tag, but the per-tag clip durations may overlap. To clean up: copy the jsonl, manually edit (split by timestamp range), and re-run `pnpm curate:scan` on the cleaned directory.
