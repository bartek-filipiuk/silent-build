# Claude Code jsonl event schema (cheatsheet)

Every line in a session jsonl is one JSON object. Common fields you'll reference while curating:

```json
{
  "type": "user" | "assistant" | "system" | "summary",
  "uuid": "...",
  "parentUuid": "...",
  "timestamp": "ISO8601 with milliseconds, UTC",
  "message": { ... }
}
```

## type: "user"

Two flavours:

**Real human prompt** (the one you usually want):
```json
{
  "type": "user",
  "timestamp": "2026-04-26T11:37:23.634Z",
  "message": {
    "role": "user",
    "content": "zobacz Koncepcja Produktowa.md, mam tu idee dwoch gier..."
  }
}
```

`message.content` can be a plain string or an array of blocks. If it's an array, each block has `{ type: "text", text: "..." }` (or `tool_result`, see below).

**tool_result-only** (boilerplate, NOT a real prompt):
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      { "type": "tool_result", "tool_use_id": "toolu_xxx", "content": "..." }
    ]
  }
}
```

If every block is `tool_result`, treat as machine-generated, not a human turn.

**Synthetic/system content** to skip:
- `Base directory for this skill: ...` (skill activation)
- `<command-name>...</command-name>` (slash command echo)
- `<task-notification>...` (subagent task notifications)
- `<system-reminder>...` (auto-injected reminders)
- `<local-command-caveat>...` (local command headers)

## type: "assistant"

```json
{
  "type": "assistant",
  "timestamp": "2026-04-26T11:37:30.000Z",
  "message": {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "I'll start by reading the file." },
      { "type": "tool_use", "id": "toolu_xxx", "name": "Read",
        "input": { "file_path": "/path/to/file.md" } }
    ]
  }
}
```

`content` is always an array. `tool_use` blocks have `name` and `input`. Common tools:

| Name | Key inputs |
|---|---|
| Read, Edit, Write, NotebookEdit | `file_path` |
| Bash | `command` |
| Agent | `description`, `prompt` |
| Task* | `task_id`, `description` |
| mcp__... | varies |

For curation purposes:
- `Edit`/`Write`/`NotebookEdit` count toward edit-bursts and file-touched
- `Bash` with `git commit`/`git push`/`gh pr` indicates milestones
- `Agent` indicates a heavy lift

## type: "system" / "summary"

Usually skip — these are session metadata, not narrative content.

## Reading windowed fragments

When you need to verify what really happened around a candidate's `from` timestamp:

1. Open `sourceJsonl` with the Read tool
2. Use a small offset/limit (e.g., 100 lines around the candidate's likely line number)
3. Look for the user prompt nearest to the `from` timestamp — that's usually the narrative-rich content

You usually don't need the entire file. The candidate already has metrics; you're just sanity-checking.
