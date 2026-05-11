---
name: silent-build
description: Use when turning one or more Claude Code session jsonls into a complete silent-build film bundle (narrative.json + scenariusz.md + publish.md drafts). Triggers on `/silent-build`, "zrób film z tej sesji", "stwórz silent-build z tych sesji", "scen do filmu". Single-session or multi-session input. Default: no render until user explicitly asks. Adaptive scene durations to a target film length. Natural-language feedback editing.
---

# Silent-build skill — jsonl → film bundle

Bierze sesję(e) Claude Code (jsonl) i produkuje pełen film bundle bez renderowania wielkich plików (~30 s, ~50 KB output). Po przeglądzie user mówi "renderuj" i wtedy pipeline generuje segments (~5-15 GB ProRes 4444).

## Cel

End-to-end od jsonl do gotowych do Premiere segmentów filmu. Cztery fazy:

1. **Scan** — `pnpm curate:scan` + harvester metadata (mechaniczne, ~5 s)
2. **Draft** — Claude analizuje content + tworzy narrative.json + scenariusz.md + publish.md (LLM-driven, ~30-60 s)
3. **Review** — pokazujesz user — czeka na feedback / akceptację
4. **Render** (na request) — `pnpm render:narrative` z thematem + preview frames

## Inputs od usera

| Co | Default | Override |
|---|---|---|
| jsonl dir | auto-detect z CWD (`~/.claude/projects/-<cwd-encoded>/`) | `/silent-build <path>` |
| project slug | derived z metadata (`package.json` name lub dir name) | `--slug <name>` |
| target film time | adaptive (sum candidate ranges / 60-90 s per faza) | `--target 5min` |
| theme | `terminal` (default po V3 fix) | `--theme cobalt` |
| fast mode | off | `--fast` (mechanical clip pick zamiast LLM) |
| render on done | off | `--render-all` |

Jeśli auto-detect zawiedzie → pytasz user o jsonl-dir + slug.

## Workflow

### Krok 1 — auto-detect lub potwierdź jsonl

Sprawdź czy CWD ma odpowiednik `~/.claude/projects/-<encoded>/`:

```bash
node skills/silent-build/bin/auto-detect.mjs
```

Output JSON: `{ jsonlDir, slug, eventCount, sessionsCount, startTs, endTs }` lub `{ error }`.

Jeśli error → poproś użytkownika o explicit jsonl dir.

Pokaż użytkownikowi krótko: "Wykryto X eventów z Y sesji w `<dir>`, slug: `<slug>`, czas: `<duration>`. Idziemy z tym? (y/n/inny path)"

### Krok 2 — Scan + metadata

Stwórz output dirs:
```bash
mkdir -p docs/films/<slug> output/<slug>
```

Uruchom:
```bash
pnpm curate:scan --project <jsonl-dir> --out output/<slug>/candidates.json --name <slug>
pnpm assets:metadata --repo <auto-detect-repo> --jsonl-dir <jsonl-dir> --out docs/films/<slug>/metadata.json
```

Auto-detect repo path: szukaj `<slug>` w `~/video-projects/`, `~/projects/`, `~/experiment-projects/`. Jeśli nie znalezione, pomiń `--repo` flag (metadata zwróci tech-stack-free skeleton).

Sprawdź output `output/<slug>/candidates.json`. Jeśli `candidates < 3` — ostrzeż usera ("za mało materiału, narrative może być słabe"). Jeśli `< 1` — błąd.

### Krok 3 — Draft narrative + scenariusz + publish (Claude work)

To jest **główna LLM-driven praca**. Wczytaj:

- `output/<slug>/candidates.json` — pełna treść
- `docs/films/<slug>/metadata.json`
- Sample treści z jsonl — dla każdego candidate weź 3 pierwsze prompty + 2 ostatnie assistant_text events w tym range. Limituj do ~200 tokens per candidate, total ~10k tokens dla 50 candidates.
- `docs/films/format/spec.md` sekcje 1-3 (timeline + cadence rules)
- `docs/films/format/left-pane-storytelling.md` (storytelling beats catalog)
- **Skill / plugin / MCP usage report** — uruchom:
  ```bash
  node skills/silent-build/bin/scan-skills.mjs <jsonl-dir>
  ```
  Output JSON ma `skills` (które `Skill` tool wywołał), `pluginDirs` (wykryte przez `Base directory for this skill`), `slashCommands` (np. `/security-audit`, `/coolify-deploy`), `mcpTools` (chrome-devtools, playwright itp.) oraz **`narrationHints`** — gotowe zdania do wstawienia w scenariusz.md.

  Zobacz `references/skill-detection.md` po pełną interpretację każdej kategorii (design-thinking, planning, security, refactor, deploy, content, meta, browser-test).

Następnie sam wygeneruj:

#### A. narrative.json

Reguły:

- **Scene count**: 3-6 (adaptive). Default mapping z curator tags:
  - `start` candidates → 1 start scene
  - `plan` + `build` → 1-2 build scenes (jeśli plan candidates są distinct, robić 2 osobne; jeśli content się przenika, 1 wspólny)
  - `design` → 1 design scene (jeśli są design-tagged candidates)
  - `audit` → 1 audit scene (jeśli)
  - `end` → 1 end scene
- **Adaptive durations** (zależne od real-time content):
  - Krótka faza (< 5 min real): 30-45 s film
  - Średnia (5-30 min real): 50-70 s film
  - Długa (> 30 min real): 80-120 s film
  - Constraint: compression ratio per clip ∈ [5, 50]. Jeśli ratio > 50, zwiększ durationSec. Jeśli < 5, zmniejsz.
- **Target film length**: sum scene durations ≈ user target (default adaptive)
- **Clip selection** (LLM-driven, this is YOUR job):
  - W każdej fazie wybierz 1-2 candidates które mają **najlepszy storytelling** content (cinematic first prompt, decision moment, AI-mistake recovery)
  - NIE bierz po prostu top-signal — preferuj clipy z bogatszym content (czytaj sample prompts/assistant_text)
  - Detect AI-mistake beats z assistant_text content ("this is wrong", "let me revert", "fix this") + odpowiadające user prompts
  - Avoid overlap między clipami (różne timestamp ranges)
- **Labels** (60-120 chars): cinematic, konkretne. NIE "Build scaffolding" tylko "Routes scaffolding: /[code] redirect + /[code]/stats". NIE "Design phase" tylko "Apply Claude Design + 18-file design scaffolding".
- **Rationale** (60-280 chars): dlaczego ten clip wybrałeś. Inwariant: rationale wystarcza by user zrozumiał WHY without re-reading candidates.json.

Walidacja schema: `docs/superpowers/specs/2026-05-11-pre-film-fixes-themes.md` linkuje do `packages/curator/src/narrative-schema.ts` — scenes.min(3).max(6), clip.label max 120, clip.rationale max 280, clip.score 0-10.

Zapisz: `docs/films/<slug>/narrative.json`.

#### B. scenariusz.md

Następuj `docs/films/outdoorthings/scenariusz.md` jako template strukturalny. Per scena generuj:

- **Gadasz** — 1-2 zdania w naturalnym polskim, vulnerable + konkret + opinion. Co user może powiedzieć do face cam żeby było cinematic.
- **Storytelling beats** — 2-3 typy z `left-pane-storytelling.md` catalog (DecisionCard, QuoteCard, MilestoneBeat, etc.) + concrete props
- **Doświadczenie wstawka** (1-2 per scena) — "robię tak każdym projektem od X" / "mój ostatni projekt na Y kosztował Z" — credibility builders. Bazuj na user'a real prompts z jsonl (jeśli wspomniał o Vercel/Hetzner/Supabase/etc, wpleć).
- **Tooling beats** — z `scan-skills.mjs` output (`narrationHints`) wybierz hints które pasują do danej sceny:
  - `design-thinking` (brainstorming) → scena `start` lub `plan`
  - `planning` (writing-plans, spec) → scena `plan`
  - `security` (security-audit, /security-audit) → scena `audit`
  - `refactor` (simplify, code-review) → scena `build` (post-MVP) lub `end`
  - `deploy` (coolify-deploy, /deploy) → scena `end`
  - `quality` (TDD) → scena `build`
  - `browser-test` (playwright, chrome-devtools) → scena `design` lub `audit`
  - `content` (humanize-text, blog-by-session) → scena `end` lub mention w outro
  
  Cel: pokazać że to **nie był freestyle prompt** tylko **prowadzony workflow** ze skill-driven decisions. To jest cinematic differentiator vs "another AI coding video".
- **Cutaway** — który dashboard segment z narrative.json pasuje pod tę sekcję

Plus na końcu: pełny **hook 5s** (`format/spec.md` sekcja 2.1) i **outro CTA** + cliffhanger.

Zapisz: `docs/films/<slug>/scenariusz.md`.

#### C. publish.md

Następuj `docs/films/duels/publish.md` jako template. Generuj:

- **Title shortlist** — 3-5 propozycji wg `format/spec.md` sekcji 4 (Czas+outcome / Versus / Mistake hook / Cost reveal / Authority test / Contrarian / Transformation / Result hook). KAŻDY z liczbami konkretnymi (czas, koszt, file count).
- **Description draft** — opening hook 2-3 zdania + tech stack + chapters (timestamps z narrative.json) + repo + cliffhanger
- **Tags** — claude code, vibecoding, silent build + stack-specific (np. Next.js, SvelteKit, Hetzner, Vercel)
- **Thumbnail title** — 3-5 słów z `format/spec.md` sekcji 5

Zapisz: `docs/films/<slug>/publish.md`.

### Krok 4 — Pokaż user wyniki + czekaj na feedback

Skrót dla user:

```
✅ Bundle gotowy w docs/films/<slug>/ (~50 KB lekkich plików):

📋 narrative.json   — N scen, ~M sekund film time, compression Y× avg
📝 scenariusz.md    — hook + 4 sceny z kwestiami + storytelling beats
📰 publish.md       — 3 title proposals + description draft + tags

Kluczowe wybory:
- Hook: "<first 14 słów hook line>"
- Scena 1 (start): <label>, <durationSec>s
- Scena 2 (build): <label>, <durationSec>s
- ...
- Cost EST.: $<X> (Opus rates)

Co teraz:
- "OK, renderuj" → pełny render wszystkich scen (~5-10 min, ~6 GB)
- "Renderuj scenę N" → tylko pojedyncza scena (~2-3 min, ~1 GB)
- "<natural language edit>" → zmienię narrative.json i pokażę nowy draft
   Przykłady: "scena 2 za krótka, daj 90s" / "swap label scena 3 i 4" /
              "scena 5 chcę inny clip z audit candidates"
```

Czekaj na user input.

### Krok 5 — Feedback loop (natural language)

Gdy user mówi:

- **"renderuj" / "render"** / "ok" / "lecimy" → Krok 6
- **"renderuj scenę N"** → Krok 6 z `--scenes N`
- **edit instructions** → modyfikuj narrative.json + scenariusz.md + publish.md jeśli zmienia się dramatic. Re-show summary (Krok 4) z highlights co się zmieniło. Loop.

**Examples edit patterns:**

- "scena 2 za krótka, daj 90s" → znajdź scene index 2, ustaw `durationSec: 90`, przelicz `compressionRatio`
- "scena 3 chcę inny clip — weź cand-005 zamiast cand-003" → zamień clip source ID
- "label scena 4: 'Hetzner deploy decision'" → update label, regenerate rationale jeśli istotnie się zmienił sens
- "dorzuć scenę audit między build a design" → recheck candidates dla audit-tagged, dodaj scenę, re-balance durations
- "hook za nudny, daj inny" → rewrite hook w scenariusz.md (zachowaj fact base z jsonl)

Po każdej edycji walidate narrative.json przeciw schema. Jeśli zwalisz, fixuj automatycznie + zaznaczasz "Pominąłem X bo schema validation: <error>".

### Krok 6 — Render (na request)

Domyślnie pełny render:

```bash
pnpm render:narrative --input docs/films/<slug>/narrative.json --out output/<slug>/segments --theme <theme>
```

Single scene:

```bash
pnpm render:narrative --input docs/films/<slug>/narrative.json --out output/<slug>/segments --scenes <N> --theme <theme>
```

Output: 2N .mov files (overlay + dashboard per scena).

### Krok 7 — Preview (auto po renderze)

Wyciągnij 1 PNG per scenę żeby user mógł szybko sprawdzić:

```bash
for f in output/<slug>/segments/scene-*-clip-01.mov; do
  scene=$(basename "$f" .mov)
  ffmpeg -ss 00:00:05 -i "$f" -vframes 1 "/tmp/<slug>-${scene}.png" -y 2>/dev/null
done
```

Plus open dashboard folder w viewerze:

```bash
xdg-open /home/bartek/video-projects/silent-build/output/<slug>/segments &
```

Listing files + open. **NIE concat'uj `dashboards-all.mov`** by default (5+ GB). Jeśli user prosi explicit "concat" → odpal z `--with-concat` flag.

### Krok 8 — Iteration

Pokaż preview frames + zapytaj o feedback. Jeśli user mówi "scena 3 za zielona" (palette issue) — re-render z `--theme <other>`. Jeśli "scena 4 prompt nie ten" — sprawdź narrative.json clip range, propose alternatives.

## Outputs lokalizacja

| Plik | Path | Rozmiar | Kiedy |
|---|---|---|---|
| `metadata.json` | `docs/films/<slug>/` | ~280 B | Krok 2 |
| `candidates.json` | `output/<slug>/` | ~10-20 KB | Krok 2 |
| `narrative.json` | `docs/films/<slug>/` | ~3-5 KB | Krok 3 |
| `scenariusz.md` | `docs/films/<slug>/` | ~6-8 KB | Krok 3 |
| `publish.md` | `docs/films/<slug>/` | ~2-3 KB | Krok 3 |
| `*.mov` segments | `output/<slug>/segments/` | ~5-15 GB | Krok 6 (on demand) |
| Preview PNGs | `/tmp/<slug>-*.png` | ~10-50 MB | Krok 7 (auto post-render) |

## Edge cases

- **Multi-session** — auto-detect merges wszystkie .jsonl w jsonl-dir. Curator i tak je merge'uje.
- **Brak audit/plan candidates** — narrative może mieć 3 sceny (start, build, end). Schema tolerates min 3.
- **Bardzo duża sesja (>500 candidates)** — curator caps to 50. To wystarczy.
- **Bardzo mała sesja (<5 candidates)** — pokaż warning, propose 3-scene narrative z fallback labels.
- **Mix sesji z różnych projektów** — auto-detect bierze wszystko z `<jsonl-dir>`. Jeśli user ma mix, niech użyje `--slug` żeby zaznaczyć target name.
- **Brak repo path** (np. project bez git) — `metadata.json` techStack pusty, ale narrative + scenariusz nadal działa.
- **AI-mistake beats** — gdy detect z assistant_text content + nast prompty, mark w `scenariusz.md` jako "scena X ma natural AI-mistake recovery point — tutaj dorzuć talking head". To **dramatically retention-boosting** wg 2026 research.

## Fast mode (opt-in)

`--fast` flag pomija LLM clip selection — używa mechanical (top-signal candidate per tag) + LLM tylko dla labels. ~5x szybsze, ~$0 cost (no big LLM call), ale storytelling weaker.

Default: bez `--fast` (LLM-driven, ~30-60 s, ~$0.30-0.50 koszt per call dla Opus).

## Powiązane

- `docs/films/format/spec.md` — universal film format spec
- `docs/films/format/left-pane-storytelling.md` — storytelling beats catalog
- `docs/films/production/film-checklist.md` — pre-publish walidacja
- `docs/films/outdoorthings/` — exemplar single-session 4-scene project
- `docs/films/duels/` — exemplar multi-session 6-scene project
- `packages/curator/src/narrative-schema.ts` — Zod schema dla narrative.json
- `packages/overlay/src/render-narrative.ts` — actual render runtime

## Changelog

- **2026-05-11** — initial skill design, LLM-driven clip selection + storytelling beats + adaptive duration + natural-language feedback loop
