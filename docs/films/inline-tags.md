# Inline tags — mid-session markers for the curator

When you mix multiple stages in one Claude Code session (e.g. build + audit + deploy in the same `claude` invocation), prefix specific prompts with an inline tag in `[BRACKETS]` so the curator can find them later.

## Why

The default rule of "one CC session per stage" produces clean candidate streams. But sometimes you stay in one session for an hour and pivot mid-stream — "ok now do a security audit on what we just built". Without a marker, that pivot moment gets buried in the build candidate cluster.

Inline tags solve this by making the pivot **explicit and machine-readable**. The curator's `detectInlineTags` heuristic (signal=8, stronger than keyword match=5) picks them up and assigns the right scene tag automatically.

## Syntax

`[TAG]` at the **start** of a user prompt, before any other text:

```
[SECURITY] check for open redirects on /r/<code>
```

```
[CODE_REVIEW] zerknij na auth flow w match-room.ts
```

```
[DEPLOY] wrangler deploy and verify the live URL
```

Rules:
- Tag MUST be at the very start of the prompt (whitespace-only before is OK)
- Tag is case-insensitive (`[Security]`, `[security]`, `[SECURITY]` all work)
- Letters + underscore + hyphen only — `[CODE_REVIEW]` and `[CODE-REVIEW]` both map to `audit`
- Tag NOT at the start (e.g. mid-sentence `... and then [SECURITY] check ...`) is ignored

## Recognized tags

| Tag tokens | Maps to scene |
|---|---|
| `[CONCEPT]` `[IDEA]` `[START]` | `start` |
| `[PLAN]` `[ARCHITECTURE]` `[SPEC]` `[ROADMAP]` | `plan` |
| `[BUILD]` `[CODE]` `[FEATURE]` `[IMPLEMENT]` `[REFACTOR]` | `build` |
| `[DESIGN]` `[UI]` `[UX]` `[STYLE]` `[THEME]` | `design` |
| `[REVIEW]` `[CODE_REVIEW]` `[CODE-REVIEW]` `[AUDIT]` `[SECURITY]` `[HARDEN]` | `audit` |
| `[DEPLOY]` `[SHIP]` `[RELEASE]` `[LAUNCH]` `[END]` | `end` |

Unknown tags (e.g. `[GIBBERISH]`) are ignored — fall back to keyword detection or other heuristics.

## Use cases

### A. Mid-session pivot (most common)

You're in a build session, finish a feature, decide to audit it before continuing:

```
... 30 min of build prompts ...
[SECURITY] before we ship this — check for IDOR on /api/links/:code/stats
[BUILD] add the rate limiter module too
... back to building ...
```

The curator now correctly identifies the audit moment as a separate `audit`-tagged candidate, even though it shares the jsonl with build content.

### B. Deep-dive spinoff films

Tag a fragment you want to extract into a standalone 2-3 min "deep dive" film later:

```
[CODE_REVIEW] let's audit the auth module top-to-bottom — every function
```

After the session, in the curator skill:

```
> /curate-narrative output/<slug>/candidates.json
> Build a separate narrative for the [CODE_REVIEW] tagged clips only —
> save to docs/films/<slug>/deep-dives/code-review-narrative.json
```

Then render the spinoff:

```
pnpm render:narrative \
  --input docs/films/<slug>/deep-dives/code-review-narrative.json \
  --out output/<slug>/deep-dives/code-review-segments
```

Result: a separate `silent-build deep-dive` MP4 that complements the main 7-min film.

### C. Override a misclassified moment

If the curator's keyword detection puts a prompt in the wrong scene (e.g. you said "let's design the API" and it tagged it as `design` when you meant `plan`):

```
[PLAN] design the API — request/response shapes, error model, versioning
```

Inline tag (signal=8) wins over keyword match (signal=5), so the candidate ends up in `plan` correctly.

## Render commands

Render a single scene (without changing narrative.json):

```bash
pnpm render:narrative --input <narrative.json> --scenes 5
```

`--scenes` accepts `5`, `1-3`, or `2,4,6`.

Render a separate deep-dive narrative:

```bash
pnpm render:narrative \
  --input docs/films/<slug>/deep-dives/<topic>-narrative.json \
  --out output/<slug>/deep-dives/<topic>-segments
```

## Curator detection details

In `packages/curator/src/preprocess.ts`:

- Function: `detectInlineTags(events)`
- Regex: `^\s*\[([A-Za-z][A-Za-z_-]{1,20})\]\s*`
- Mapping table: `INLINE_TAG_TO_SCENE`
- Output signal: 8 (between `firstPrompts`=9 and `editBurst`=8 — strong but not overriding the project opening)

Tagged candidates show in `candidates.json` with `reason: "inline tag [SECURITY]"` and `metricsSummary: "[SECURITY] → audit"`. Easy to find by grep.

## What NOT to do

- Don't put tags in the middle of sentences — only the start.
- Don't invent new tags expecting them to map automatically — extend `INLINE_TAG_TO_SCENE` in code first.
- Don't tag every prompt; the keyword detector handles natural-language signals fine. Use tags only when the natural signal is absent or wrong.
- Don't tag prompts that won't be visible in the film (e.g. quick clarifying questions). The tag pulls them into a scene whether they're cinematic or not.

## Future: per-tag deep-dive automation

Currently you write a separate narrative.json for deep-dives by hand (or via skill conversation). A future helper could:

```bash
pnpm curate:deep-dive --candidates output/<slug>/candidates.json --tag SECURITY \
  --out docs/films/<slug>/deep-dives/security-narrative.json
```

This would auto-build a 2-3 min narrative from all `[SECURITY]`-tagged candidates. Not implemented yet — open issue if you want it.
