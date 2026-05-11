# Adaptive scene duration logic

The skill picks `scene.durationSec` based on real-time content per phase, not fixed defaults. Goal: each clip lands in a comfortable `compressionRatio` band (5× to 50×) — short enough to keep momentum, long enough to read.

## Banding

Per candidate range = `to - from` in real seconds:

| Real time | Recommended scene duration | Typical compression |
|---|---|---|
| < 5 min | 30-45 s | 7-10× |
| 5-30 min | 50-70 s | 10-25× |
| 30 min - 2 h | 80-100 s | 20-50× |
| > 2 h | 100-120 s, OR split into 2 clips | 40-50× max |

Hard rule: `compressionRatio = (toMs - fromMs) / (durationSec * 1000)`. Constrain to `[5, 50]`. If ratio > 50, increase `durationSec` OR narrow the clip range (move `from` later, `to` earlier).

## Target film length

When user provides `--target 5min` (= 300 s total):

1. Sum recommended durations from banding above.
2. If sum < target by > 20%: scale up proportionally, capping at 120 s per scene.
3. If sum > target by > 20%: scale down proportionally, floor at 30 s per scene.
4. If still off: cut weakest scene (lowest `score`) entirely.

When no `--target`: just sum the banding outputs. Typical: 3-min single-session, 5-7 min flagship.

## Multi-clip per scene

Build phase often warrants 2 clips (different sub-arcs: scaffolding + functional impl). Plan phase rarely needs 2 unless spec-then-mvp dialogue split.

Rule: 2 clips iff:
- Range gap between them ≥ 10 min (distinct moments, not adjacent)
- Both have distinct `firstPromptText` or different file targets
- Combined `durationSec` ≤ 120 s (don't bloat the scene)

Otherwise: pick the higher-`score` candidate.

## AI-mistake beat detection

When `assistant_text` content matches recovery patterns ("this is wrong", "let me revert", "fix this", "nie tak", "popraw to") AND there's a corresponding user prompt within 60 s, mark that timestamp in `scenariusz.md` for a face-cam talking-head insert during Premiere assembly.

Rule of thumb: 1 AI-mistake beat per film maximizes 2026 retention. If zero detected, suggest one synthetic recovery moment (e.g. "tu zatrzymałem się — sprawdź dlaczego" before a refactor commit).

## Pitfalls

- **Compressed too hard (ratio > 50):** dashboard ticks faster than eye can follow. Widen `durationSec` or split clip.
- **Compressed too lightly (ratio < 5):** dashboard feels static. Narrow range or shorten `durationSec`.
- **Scene with no `firstPromptText`** (curator emitted candidate from edit burst): clip is OK, but `scenariusz.md` needs a synthetic line for face cam since there's no user-prompt to quote.

## Validation

Before finalizing narrative.json:

1. Each clip: `5 ≤ compressionRatio ≤ 50`
2. Each scene: `1 ≤ clips.length ≤ 5`
3. Narrative: `3 ≤ scenes.length ≤ 6`
4. Each scene title ≤ 40 chars
5. Each clip label ≤ 120 chars
6. Each clip rationale ≤ 280 chars

If any breaks: auto-fix (truncate strings, adjust durationSec) and surface "auto-fixed N issues" in the output summary.
