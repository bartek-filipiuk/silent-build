# Natural-language feedback grammar

After the skill shows the bundle summary, the user can request edits in free-form Polish or English. The skill recognizes these patterns and applies them deterministically without re-asking.

## Scene duration

| User says | Action |
|---|---|
| "scena 2 za krótka, daj 90s" | `scenes[1].durationSec = 90` + recompute `compressionRatio` on its clips |
| "scena 4 dłużej, np 75s" | same |
| "skrócić cały film do 4 min" | proportionally rebalance all `durationSec` so sum ≈ 240 s |
| "wydłuż build, skróć audit" | adjust selected scenes, hold others |

After change: re-validate against `compressionRatio ∈ [5, 50]`. If breaks, propose `clip.durationSec` change OR widen clip range.

## Clip swap

| User says | Action |
|---|---|
| "scena 3 chcę inny clip — weź cand-005" | replace scene's primary clip with candidate-005 timestamps + label |
| "dorzuć drugi clip do scenariusza 2" | add second clip from candidates that overlap or follow primary |
| "wywal clip-02 ze sceny 3" | remove clip, keep first |

If candidate not provided by ID, parse phrase ("ten z security audit", "ten gdzie scaffolding 29 plików") and match against candidate's `firstPromptText` + `reason` + `metricsSummary`. Show match before applying.

## Label / rationale rewrites

| User says | Action |
|---|---|
| "label scena 4: 'Hetzner deploy decision'" | direct replacement |
| "scena 2 — coś lepszego niż 'Scaffolding burst'" | rewrite to ~3-5 cinematic alternatives, ask which |
| "rationale scena 5 nudne, daj coś z storytellingu" | rewrite preserving facts, more storytelling-aware language |

## Scene structure

| User says | Action |
|---|---|
| "dorzuć scenę audit między build a design" | insert new scene, pick best audit-tagged candidate, re-balance durations |
| "wywal scenę plan, zrób z 4 scen" | remove scene, re-balance durations across remaining 3 |
| "swap kolejność scen 3 i 4" | reorder array, update phaseNumber in overlays |

After structural change: schema validation (min 3, max 6) + rebalance any `compressionRatio` issues.

## Hook / cliffhanger / publish.md

| User says | Action |
|---|---|
| "hook za nudny, daj inny" | regenerate scenariusz.md hook line preserving facts, 14-word limit, vulnerable opening |
| "cliffhanger: następny film o OCR" | update outro line in scenariusz.md + publish.md cliffhanger |
| "tytuł: 'Built outdoorthings in 24h'" | direct replacement in publish.md (move others to alt list) |
| "wybierz title pattern 'cost reveal'" | regenerate primary title using cost reveal formula from format/spec.md sekcja 4 |

## Render commands

| User says | Action |
|---|---|
| "renderuj" / "render" / "ok" / "lecimy" | full render (all scenes) |
| "renderuj scenę 3" | `--scenes 3` |
| "renderuj sceny 2-4" | `--scenes 2-4` |
| "renderuj scenę 5 z theme cobalt" | `--scenes 5 --theme cobalt` |
| "concat dashboards-all" | re-run with `--with-concat` |

## Theme

| User says | Action |
|---|---|
| "zmień theme na cobalt" | re-render with `--theme cobalt`, ask which scenes (default: all) |
| "spróbuj wszystkie palety na scenę 5" | render scene 5 separately with each of 6 themes, then user picks |

## Out of scope (escalate to user)

These require manual decisions — skill asks instead of guessing:

- "zmień scenę 2 na audit" — switching scene's tag changes overlay (PhaseTransition phaseNumber + scene.id constraint) — ask first
- "zrób cały scenariusz po angielsku" — major rewrite, ask if also `publish.md` should be EN
- "skróć cały film do 30 sekund" — under 60s breaks compression ratio invariants — ask if OK to weaken

## Ambiguity resolution

If the user instruction is ambiguous (e.g. "scena 3 nudna" without action), ask one short clarifier:

- "Co konkretnie zmienić w scenie 3 — clip / label / duration / wszystko?"

Don't loop on ambiguity — one clarifier, then apply best-guess if still vague.
