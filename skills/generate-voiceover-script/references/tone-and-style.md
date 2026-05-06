# Tone and style — silent-build voiceover

## Voice profile

- Conversational EN, North American or neutral
- Confident, technical, but not jargon-heavy
- Short clauses; max 1 comma per sentence
- Present-tense facts, past-tense reveals

## Hook (5 s, ~12 words)

Patterns:
- "I gave Claude Code [N] days. Here's what it built."
- "Nine days. One [thing]. Built by AI."
- "[Number] prompts. [Number] tool calls. One live app."

Rules:
- Must contain a number from metadata
- Must mention the *thing* (game, app, tool) — not "project"
- No subscribe CTA. No "today we will". No greeting.

## Outro (10 s, ~28 words)

Structure (in order):
1. Status: "<URL> is live now" / "shipped today"
2. Repo: "GitHub link below"
3. Cliffhanger: "Next: silent build #N — <project>" (or generic if no nextProject)
4. CTA: "Subscribe so you don't miss it" (or "...so you catch the breakdown")

Rules:
- 25–32 words target
- Don't repeat the hook number
- Avoid "in this video" — viewer is at end of video already

## Context (optional, 5 s, ~14 words)

Use only if it adds context the dashboard doesn't already convey. E.g.:
- "I walked away for four hours. This is what was on the screen."
- "This is the moment the multiplayer code first ran without crashing."

Skip context entirely if hook already gives enough framing.

## Anti-patterns

Avoid these phrasings:
- "Today we are going to..."
- "Welcome back to my channel..."
- "If you liked this video, please..."
- "Make sure to..."
- "Don't forget to..."
- Filler: "kind of", "sort of", "really cool", "amazing"

## Examples (verified good)

```
HOOK   "Nine days. One multiplayer game. Built by AI in real time."
OUTRO  "fastduels.com is live now. GitHub link below. Next: silent build number two — drupal-rebuild. Subscribe so you don't miss it."
```

```
HOOK   "I gave Claude Code 175 prompts. It shipped a Cloudflare app."
OUTRO  "tinytrivia.app is up — link below. Next time: I let it audit its own code. Subscribe."
```
