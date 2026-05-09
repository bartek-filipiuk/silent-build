# Katalog B-roll templates (Remotion → MP4 do Premiere)

**Cel:** zinwentaryzować wszystkie wstawki, które da się wygenerować z Remotion + ffmpeg jako gotowe MP4 (lub ProRes 4444 dla quality), żeby drag-and-drop'ować w Premiere bez tworzenia nowych elementów per film.

**Filozofia:** każdy element musi być **(a) repeatable** (sensowny w >50% filmów), **(b) data-driven** (props z jsonl/repo, nie manual), **(c) plug-and-play** (renderujesz `pnpm render:<element>` i dostajesz `.mov` + `.mp4`).

## Co MAMY (already shipped)

| # | Element | Czas | Plik | Data source | Per-film użycie |
|---|---|---|---|---|---|
| 1 | **Dashboard** | wariable (cała sesja) | `packages/ui/src/Dashboard.tsx` | SessionTimeline z jsonl | prawy panel filmu, ciągły |
| 2 | **ProjectIntro** | 10 s | `packages/ui/src/compositions/ProjectIntro.tsx` | `repo-metadata.ts` (package.json + jsonl) | 1× per film @ 0:15-0:25 |
| 3 | **IntroCard** | 4 s | `compositions/IntroCard.tsx` | manual props | alternatywa dla ProjectIntro lub do bumper |
| 4 | **OutroCard** | 7 s | `compositions/OutroCard.tsx` | metrics + repoUrl | alternatywa StatsCard, dłuższa |
| 5 | **StatsCard** | 5 s | `compositions/StatsCard.tsx` | metrics z timeline | 1× per film @ 8:30-8:35 (final) |
| 6 | **Thumbnail** | static (1 frame) | `compositions/Thumbnail.tsx` | title + projectName | 1× per film, render PNG |
| 7 | **PhaseTransition** | 2.5 s | `compositions/PhaseTransition.tsx` | phase object | 6× per film, jeden per faza |
| 8 | **CommitCard** | 2 s | `compositions/CommitCard.tsx` | commit object (sha, message, stats) | 2-3× per film w fazie Build |
| 9 | **CodeZoom** | 3 s | `compositions/CodeZoom.tsx` | filePath + excerpt + highlight | 1-2× per film w Plan/Build |

**Status pipeline'u:** każda composition ma render-cli command (`pnpm render:<id>`) który produkuje ProRes 4444 .mov. ffmpeg postprocess do H.264 .mp4 to dwie linijki (już w pipeline gdzie indziej).

## Co BRAKUJE i warto dodać (priorytetyzowane)

### Sprint 1 — szybki ROI (1-2 dni, najwyższy retention impact)

#### 🟢 SHORT-StatsCard (StatsCard punch-in 1.5-2 s)

**Co:** krótka wersja istniejącego StatsCard. Tylko 3-4 metryki, count-up szybszy, hard cut on/off.

**Zastosowanie:** punch-in na granicach faz w środku filmu (NIE outro). Przekłada dashboard ticker na discrete payoff momenty.

**Cadence per film:**
- Po Concept (~1:15): "12k tokens · $0.18 · 0 plików"
- Po Plan (~2:30): "+8k tokens · $0.12 · 1 plik"
- Po Build (~5:00): "+47 plików · 1234 LOC · 23 commity"
- Po Audit (~6:30): "+5 fixów · CSP added · rate limit added"

**Effort:** 0.5 dnia (refactor StatsCard z `mode: 'outro' | 'punchIn'` prop, krótszy timing animacji w 'punchIn').

**Data source:** narrative.json + metadata.json (już mamy). Punch-in props = delta metryki między fazami, zamiast cumulative.

**Render command:** `pnpm render:stats-punchin --project <slug> --phase <0-5>` → 4 MP4 per film.

**Per-film użycie:** 4× (po każdej z 4 main faz). +1 wartościowo, ale można skipnąć fazy gdzie metryka jest 0 (np. po Concept jeszcze brak edycji).

---

#### 🟢 ChapterLowerThird (lower-third rozdziałów, 3 s)

**Co:** mały overlay w prawym dolnym rogu — chip "0N/06 NAZWA" + amber underline. Fade-in 0.3 s → hold 2 s → fade-out 0.7 s.

**Zastosowanie:** ZAWSZE w pierwszych 3 s każdej fazy, tuż po PhaseTransition takeover. Surface'uje chapter structure dla widzów którzy szybko skanują.

**Effort:** 0.5 dnia (osobna composition + integracja z PhaseTransition lub jako track 5 w Premiere).

**Data source:** narrative.json scene id + index.

**Render command:** `pnpm render:chapter-lower-third --project <slug>` → 6 MP4 per film (jeden per faza).

**Per-film użycie:** 6× (jedna na fazę).

**Ważne:** może być **łączone** z PhaseTransition w jeden render output (composition wewnętrznie zawiera oba), ale wtedy mniej elastyczne dla Premiere. Polecam osobny output żeby był na osobnym tracku.

---

#### 🟢 PremiereTemplate (Premiere project template, 5 tracków)

**Co:** `assets/premiere/silent-build-template.prproj` z pre-set 5 trackami video (V1-V5: bg, lewy panel, prawy panel, overlays, face PiP) + 3 audio (music, voiceover, sfx) + bin folder hierarchy ("01_RawRecordings", "02_Dashboards", "03_Compositions", "04_Face", "05_Audio").

**Effort:** 0.5 dnia (manual jednorazowe stworzenie + commit do repo).

**Per-film użycie:** 1× (otwierasz template, save-as nowy projekt, drag pliki).

**Oszczędność:** ~30 min compositingu per film (setup tracks + bin organizacja).

---

### Sprint 2 — visual variety devices (2-3 dni)

#### 🟡 ArchitectureZoomOut (file-tree fly-through, 4-6 s)

**Co:** animowany render struktury repo w 3 fazach:
- 0-1.5 s: top-level `package.json` + folder tree highlight
- 1.5-3.5 s: zoom in do kluczowego folderu (np. `src/lib/`)
- 3.5-5 s: zoom out + commit graph w tle (mini sparkline)

**Zastosowanie:** raz w fazie Plan (~1:45), żeby pokazać kompletną architekturę po brainstormie/specu. Najczęściej cytowany retention device w 2025-2026 tutorial editing guides.

**Effort:** 1 dzień. Wymaga:
- file-tree extractor (Node fs walk z respektem .gitignore)
- React component renderujący tree z animowanymi spring'ami
- mini commit graph (git log → SVG)

**Data source:** repo path + git log.

**Render command:** `pnpm render:arch-zoom --repo <path> --highlight-folder src/lib/` → 1 MP4 per film.

**Per-film użycie:** 1× per film (możesz dodać 2× dla mega-projektów).

---

#### 🟡 BeforeAfterSplit (Design phase, 5 s)

**Co:** split-screen kompozycja: lewa = mockup/screenshot przed, prawa = po implementacji. Wipe transition w środku 0.5 s.

**Zastosowanie:** 1× w fazie Design, żeby pokazać claude-design output → applied result.

**Effort:** 0.5 dnia (composition + props {beforePath, afterPath, transitionMs}).

**Data source:** manual props (Bartek dostarcza 2 PNG/screenshot files).

**Render command:** `pnpm render:before-after --before <png> --after <png>` → 1 MP4 per film.

**Per-film użycie:** 1× per film z fazą Design (~70% filmów).

---

#### 🟡 GitGraph (animated commit history, 5-8 s)

**Co:** animowana wizualizacja commit graph — kropki ułożone w czasie po lewej (ascending), branche jako linie. Każdy commit "puls" gdy jest reveal'owany. Top 5-10 commitów z konkretnymi message + amber dla audit-related, green dla feat, red dla fix.

**Zastosowanie:** alternatywa lub uzupełnienie ArchitectureZoomOut. Dobry też w fazie Audit żeby pokazać "X commitów + 5 audit fixów". Lub w outro przed StatsCard.

**Effort:** 1 dzień. `git log --pretty=format:'%h %s' --max-count 20` → SVG visualization.

**Data source:** git log z repo.

**Render command:** `pnpm render:git-graph --repo <path>` → 1 MP4 per film.

**Per-film użycie:** 1× per film.

---

### Sprint 3 — niche but high-value (2-3 dni)

#### 🟠 TerminalReplay (typing animation z Edit events, 5-15 s)

**Co:** animowane "typing" konkretnej sekwencji z jsonl Edit/Write events. Np. "scaffolding 20 plików w 30 sekund" — pokazujesz fast-forward typing wszystkich create events. Albo "test-driven flow" — typing testu, fail, typing kodu, pass.

**Zastosowanie:** alternatywa dla raw OBS recording w lewym panelu, **gdy nie masz OBS recordingu** (np. tinypath który nie był nagrywany OBSem). Albo jako B-roll insert nad dashboardem dla 5-10 s w środku Build phase.

**Effort:** 1.5 dnia. Już istnieje prototype `/tmp/fake-code-panel.html` z PR'a live-stream — można port'ować do Remotion.

**Data source:** narrative.json clip range → Edit/Write events z jsonl w tym range → typing sequence.

**Render command:** `pnpm render:terminal-replay --jsonl <path> --range <from>:<to> --speed 8x` → MP4.

**Per-film użycie:** 0-3× per film (zależy od tego ile lewego panelu trzeba wyrendować). Krytyczne dla projektów BEZ OBS recording.

**ROI uwagi:** jeśli zawsze nagrywasz OBSem — niski priorytet. Jeśli czasami zapominasz / projekt już istnieje (best-of) — wysoki.

---

#### 🟠 PromptScroll (lista promptów z sesji, 6-10 s)

**Co:** scroll przez listę 5-10 user promptów z sesji, każdy z timestampem. Highlight najciekawszych. Można z mini-thumbnail pliku który był edytowany jako odpowiedź.

**Zastosowanie:** w fazie Plan lub na początku Build, żeby pokazać "175 promptów to było" w skróconej formie. Daje liczbowy proof.

**Effort:** 1 dzień.

**Data source:** jsonl → user message events → top N po length lub zaznaczone tagami.

**Render command:** `pnpm render:prompt-scroll --jsonl <path> --max 10`.

**Per-film użycie:** 1× per film (alternative dla CommitCard).

---

#### 🟠 SecurityRedGreen (Audit transition, 3 s)

**Co:** dedicated 3 s composition — security panel widget przeskakuje z czerwonego stanu (5 issues) do zielonego (0 issues) z animacją "x" → "✓" + count-down liczników.

**Zastosowanie:** jedno użycie w fazie Audit, jako climax recovery beat.

**Effort:** 0.5 dnia (extract z Dashboard SecurityPanel widget, dodać ConfetiBurst pomiędzy).

**Data source:** auditFindings z `.security-audit/report.md` parsed (lub manual props).

**Render command:** `pnpm render:audit-flip --before-issues 5 --after-issues 0`.

**Per-film użycie:** 1× per film (jeśli faza Audit istnieje).

---

#### 🟠 TestRunner (red-green pulses, 4-6 s)

**Co:** animowany output `vitest`/`pytest`/`jest` — terminal style, najpierw czerwone "FAIL" pulse, potem cut do green "PASS" pulse. Liczbowy "0 passing" → "47 passing" count-up.

**Zastosowanie:** B-roll w fazie Build podczas TDD cycle. Albo w fazie Audit po fixach.

**Effort:** 1 dzień. Statyczne template, props {failingCount, passingCount, framework}.

**Data source:** manual props (po prostu numbers — lub parse z `pnpm test` output dump).

**Render command:** `pnpm render:test-runner --fail 5 --pass 47 --framework vitest`.

**Per-film użycie:** 1-2× per film w Build/Audit.

---

### Sprint 4 — backburner (nice to have)

#### ⚪ DependencyGraph (package.json animated)

**Co:** node graph zależności z package.json — top-level deps jako bigger nodes, dev-deps mniejsze, każda faza fade-in. Łączenia animowane.

**Effort:** 1 dzień.

**Per-film użycie:** 0-1× — fajny w Plan phase, ale ArchitectureZoomOut zwykle wystarczy.

---

#### ⚪ MetricBar (single-metric horizontal bar, 2 s)

**Co:** pojedyncza metryka jako pełnoekranowy horizontal bar count-up. Np. "TOKENS: 0 → 47k" z amber fill.

**Effort:** 0.5 dnia.

**Per-film użycie:** 1-2× — jeśli StatsCard punch-in nie wystarczy, można użyć tego jako akcent na pojedyncze metryki.

---

#### ⚪ FaceInsetFrame (face PiP placeholder)

**Co:** transparent rounded-rectangle frame 240×240 z amber border + corner brackets, gdzie Premiere wstawi face cam. Sam template nie zawiera face — to "okno" do umieszczenia w Premiere.

**Effort:** 0.5 dnia.

**Per-film użycie:** 4-6× per film (Premiere kopiuje frame i podstawia różne face takes).

**ROI uwagi:** może być prostsze zrobić w Premiere ręcznie — Bartek może zrobić preset "Face Inset Frame" w Premiere effect controls i zapisać do template'u. Wtedy zero kodowania.

---

#### ⚪ ThumbnailVariants (5 wariantów thumbnaila do A/B test)

**Co:** rozszerzenie istniejącego Thumbnail composition — 5 layout templates (face-dominant / artifact-dominant / split / numbers-big / no-face) renderowanych jednocześnie na podstawie tych samych props.

**Effort:** 1 dzień (manual layout warianty).

**Per-film użycie:** 5 plików per film, do A/B testu w YT Studio (testuje się 3 thumbnaile naraz).

---

## Priorytetyzacja: co implementować w jakiej kolejności

Sortowane po (impact / effort) ROI:

| # | Element | Sprint | Effort | Impact | ROI |
|---|---|---|---|---|---|
| 1 | SHORT-StatsCard (punch-in) ✅ DONE | 1 | 0.5 d | wysoki (+numeric proof) | ⭐⭐⭐⭐⭐ |
| 2 | ChapterLowerThird ✅ DONE | 1 | 0.5 d | wysoki (+40% watch-time) | ⭐⭐⭐⭐⭐ |
| 3 | PremiereTemplate (.prproj README) ✅ DONE | 1 | 0.5 d | wysoki (-30 min/film) | ⭐⭐⭐⭐⭐ |
| 4 | ArchitectureZoomOut | 2 | 1 d | wysoki (visual variety #1) | ⭐⭐⭐⭐ |
| 5 | BeforeAfterSplit | 2 | 0.5 d | średni (Design phase only) | ⭐⭐⭐ |
| 6 | GitGraph | 2 | 1 d | średni (alternatywa #4) | ⭐⭐⭐ |
| 7 | SecurityRedGreen | 3 | 0.5 d | średni (Audit phase) | ⭐⭐⭐ |
| 8 | TestRunner | 3 | 1 d | średni (TDD content) | ⭐⭐⭐ |
| 9 | TerminalReplay | 3 | 1.5 d | wysoki ALE conditional | ⭐⭐⭐ (jeśli brak OBS) / ⭐ (jeśli zawsze masz OBS) |
| 10 | PromptScroll | 3 | 1 d | niski-średni | ⭐⭐ |
| 11 | DependencyGraph | 4 | 1 d | niski | ⭐⭐ |
| 12 | MetricBar | 4 | 0.5 d | niski | ⭐⭐ |
| 13 | FaceInsetFrame | 4 | 0.5 d | niski (Premiere preset OK) | ⭐ |
| 14 | ThumbnailVariants | 4 | 1 d | wysoki dla data-driven, ale ROI niski PRZED 5 filmami | ⭐⭐ (po 5 filmach: ⭐⭐⭐⭐) |

**Top 3 do zrobienia ASAP** (1.5 dnia łącznie, bardzo wysokie ROI):
1. SHORT-StatsCard
2. ChapterLowerThird
3. PremiereTemplate

To Sprint 1 z `production/automation-checklist.md`. Zrobić **PRZED** drugim filmem — pierwsze efekty od razu widoczne.

## Pipeline integration — render workflow

Po implementacji wszystkich Sprint 1+2 elementów, render pipeline dla nowego filmu:

```bash
# 1. Pre-pipeline (auto, 5 min)
pnpm assets:metadata --repo <project> --jsonl-dir <jsonl> --out docs/films/<slug>/metadata.json
pnpm curate:scan --project <jsonl> --out output/<slug>/candidates.json --name <slug>
# (interaktywnie w CC):  /curate-narrative + /generate-voiceover-script

# 2. Render compositions (auto, ~15-20 min)
pnpm render:narrative      --input docs/films/<slug>/narrative.json --out output/<slug>/segments
pnpm render:projectintro   --project output/<slug>/segments
pnpm render:stats          --project output/<slug>/segments        # outro 5 s
pnpm render:stats-punchin  --project output/<slug>/segments        # NEW Sprint 1 — 4 mini-stats
pnpm render:chapter-lt     --project output/<slug>/segments        # NEW Sprint 1 — 6 lower-thirds
pnpm render:arch-zoom      --repo <project> --highlight-folder src/  # NEW Sprint 2
pnpm render:git-graph      --repo <project>                         # NEW Sprint 2
pnpm render:thumb          --project output/<slug>/segments

# 3. Voiceover (auto, ~5 min)
ELEVENLABS_API_KEY=... pnpm assets:tts --script docs/films/<slug>/voiceover-script.json --out output/<slug>/voiceover

# 4. Post-process do Premiere-friendly H.264 (auto, ~3 min)
# (skrypt: ffmpeg każdy .mov → .mp4 H.264 yuv420p faststart, dla szybszego scrubbing w Premiere)
pnpm assets:flatten --in output/<slug>/segments --format mp4

# 5. Outputs ready w output/<slug>/segments/ + output/<slug>/voiceover/ — drag do Premiere
```

Po tym wszystkim Premiere assembly = drag pliki do trackow, sync timestamps, dodaj face cam + demo manual. ~1.5 h zamiast 3-4 h.

## Limity i co MUSI zostać manualne

Te elementy NIE mają sensu jako Remotion templates:

- **Face cam** — Twoja twarz, manual capture
- **Demo screencast** — real interaction z aplikacją
- **AI-mistake beat composition** — wymaga real face reaction + scripted moment
- **Music mixing + sidechain** — zostaje w Premiere (proper audio engineering)
- **Captions** — auto-generated CapCut + manual review

Wszystko inne — automatyzowalne.

## Co nie pasuje do tego dokumentu

Ten katalog skupia się na **B-roll'ach do Premiere assembly**. Nie obejmuje:
- Pipeline'u dashboard'u (cały Dashboard composition + widgets) — to jest "główny content" prawego panelu, nie B-roll
- Voiceover generation (`generate-voiceover-script` skill) — to jest content track, nie wizualny B-roll
- YT publish meta — to publishing, nie compositing

## Changelog

- **2026-05-09** — initial katalog, 14 elementów, 9 already shipped + 5 priority gap'y
- **2026-05-09** — Sprint 1 done: StatsPunchIn + ChapterLowerThird (Remotion compositions + render-cli + tests) + Premiere template README. Pipeline `pnpm render:stats-punchin` i `pnpm render:chapter-lt` aktywne. 222 testów passed, typecheck clean.
