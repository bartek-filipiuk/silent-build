# Scoring rubric (0–10)

Score each candidate based on its narrative weight in a "silent build" film. Higher = more cinematic, recognisable, story-advancing.

## Anchors

| Score | Meaning |
|---|---|
| 9–10 | Iconic moment. Clear opening prompt, dramatic phase transition, unmistakable shipping moment, audit revelation. Would be in the film trailer. |
| 7–8  | Strong content. Clear intent, dense work, recognizable milestone. Default target for top clips. |
| 5–6  | Useful but not standout. Filler that maintains rhythm. Use when scene budget allows. |
| 3–4  | Weak signal. Skill activation echo, generic prompt, repetitive small edits. Skip unless nothing better. |
| 0–2  | Don't include. Tool noise, error retries, scrolling activity. |

## Adjusters

Add 1–2 points if:
- The user prompt is a natural-language sentence in the user's primary language (Polish/English) — feels human
- The clip contains a recognizable file (`spec.md`, `README.md`, `package.json`, `Dockerfile`)
- The clip contains a milestone tool call (`git commit`, `gh pr create`, `git push`)
- The clip is an `Agent` run that produced ≥10 file edits — heavy lift visible

Subtract 1–2 points if:
- The first user prompt is a synthetic/system message (skill activation, task notification)
- The clip is mid-window of a long activity (start matters more than middle)
- The clip's tag was assigned by `keyword-match` only with no real signal in surrounding events

## Examples

```
cand-001 firstPromptText: "zobacz @Koncepcja Produktowa.md - mam tu idee dwoch gier..."
→ score 10. Real human, opening of project, references concept doc.

cand-005 firstPromptText: "" (empty, scaffolding-detected)
metricsSummary: "20 writes, 20 files"
→ score 8. Heavy creation moment (20 new files), even without prompt context.

cand-014 firstPromptText: "Base directory for this skill: ..."
tag: design (from keyword)
→ score 3. Synthetic prompt; weak signal. Skip.

cand-032 firstPromptText: "merguj do main wszystko, następnie /security-audit trzeba by zrobić..."
tag: audit
→ score 10 (audit scene). Real intent, clear milestone, naming the audit step.

cand-044 firstPromptText: "mamy bug, jak robie quick match..."
tag: audit (from keyword)
→ score 5. Real bug-hunt but not a defining moment; use as filler if needed.
```

## Per-scene calibration

Different scenes care about different signals:

- **start** — favour the very first prompts (cand-001 type), highest scores there
- **plan** — favour prompts mentioning spec/roadmap/architecture, plus first commit of `spec.md` or `roadmap.md`
- **build** — favour `editBurst` / `scaffolding` / `agentRun` candidates with ≥10 edits or ≥5 new files
- **design** — favour edits to `*.svelte`, `*.tsx`, `messages/*.json`, `*.css`
- **audit** — favour candidates with `audit`/`security` keywords in real human prompts; second tier: bug-fix prompts post-audit
- **end** — favour `git push origin main`, `gh pr merge`, rebrand commits, last 1–2 user prompts

When in doubt, pick the prompt that would make the best 5-second on-screen subtitle.
