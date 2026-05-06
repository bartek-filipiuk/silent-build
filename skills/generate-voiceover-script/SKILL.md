---
name: generate-voiceover-script
description: Use when generating EN voiceover lines for a silent-build film from metadata.json. Triggers on `/generate-voiceover-script <metadata.json>` or natural language "write voiceover for this project". Reads the metadata file, calls buildVoiceoverPrompt to compose a Claude-ready prompt, generates 3 lines (hook 5s, optional context 5s, outro 10s), validates against the schema, writes voiceover-script.json next to metadata.json.
---

# Generate-voiceover-script skill

Turns `metadata.json` (output of `pnpm assets:metadata` or `assets:generate`) into a `voiceover-script.json` consumed by `pnpm assets:tts`.

## Inputs

1. `metadata.json` path (absolute or relative)
2. (optional) `--next <project>` for the cliffhanger line
3. (optional) Output path for voiceover-script.json (default: same dir as metadata.json)

## Workflow

### Step 1 — read metadata.json

Use the Read tool. Validate it has fields: `projectName`, `punchline`, `subtitle`, `techStack`, `startTs`, `endTs`. If something's missing, instruct user to run `pnpm assets:metadata` first and stop.

### Step 2 — produce voiceover lines

Apply rules in `references/tone-and-style.md`. Generate:

- **hook** (~12 words, 5 s spoken): one punchy sentence with a number from metadata
- **outro** (~28 words, 10 s spoken): live URL + cliffhanger + subscribe CTA
- **context** (~14 words, 5 s, optional): one mid-film insight, only if it adds value vs. hook

### Step 3 — show preview

Print the proposed 2–3 lines to the user with character/word counts:

```
HOOK (12 words, ~5s):
  "I gave Claude Code 9 days. Here's what it built."

OUTRO (28 words, ~10s):
  "fastduels.com is live now. GitHub link below. Next: silent build #2 — drupal-rebuild. Subscribe so you don't miss it."
```

### Step 4 — iterate

User may say:
- "make hook punchier" → rewrite, prefer concrete numbers and present tense
- "swap 'engine' for 'system'" → replace specific words
- "shorter outro" → trim CTA, keep URL + subscribe
- "OK" → save

### Step 5 — save and validate

Write to `<dir-of-metadata>/voiceover-script.json` (or path user specifies). Use Write tool.

Then run validation:

```bash
node skills/generate-voiceover-script/bin/validate.mjs <path-to-voiceover-script.json>
```

If it exits non-zero, fix the issue and re-save.

### Step 6 — tell the user what to do next

```
Voiceover script saved: <path>
Synthesize: ELEVENLABS_API_KEY=... pnpm assets:tts --script <path> --out output/<project>-assets/voiceover
```

## What NOT to do

- Don't fabricate metadata. Only use real values from metadata.json.
- Don't use German, Polish, or any non-English unless explicitly asked.
- Don't skip Step 3 (preview) — user must approve before save.
- Don't include subscribe CTAs in `hook`. Hook is teaser, not pitch.

## References

- `references/tone-and-style.md` — brand voice rules
- `bin/validate.mjs` — Zod schema check
