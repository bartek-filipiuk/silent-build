# Uniwersalny film checklist (pre-publish)

Skopiuj do `docs/films/<slug>/checklist.md` i tickuj per film. Wypełnij wszystkie [ ] przed kliknięciem "Public" na YT.

**Projekt:** _______________
**Slug:** _______________
**Data startu produkcji:** _______________
**Cel publikacji:** _______________

---

## A. Pre-flight (raz, przed pierwszą sesją CC)

### Konfiguracja stanowiska (raz na zawsze, jednorazowo per maszyna)

- [ ] OBS scena `silent-build-cc-session` istnieje z Window Capture
- [ ] OBS hotkeys: F9 = Start, F10 = Stop
- [ ] OBS Output Path ustawiony na `~/video-projects/<slug>/raw-recordings/`
- [ ] OBS format MKV, x264 CRF 23 (lub NVENC CQ 23)
- [ ] `assets/music/` ma 4 ścieżki Suno (intro-chill, build-hustle, climax-drop, outro-celebratory)
- [ ] `assets/voices/bartek-clone-id.txt` ma voice ID (lub default Rachel)
- [ ] `ELEVENLABS_API_KEY` w env (lub gotowy do wpisania na Day 3)
- [ ] gh CLI auth: `gh auth status` zielone
- [ ] Wszystkie skille zainstalowane: `pnpm skill:install` (curate-narrative, generate-voiceover-script, start-silent-build-project)

### Konfiguracja per projekt

- [ ] `~/video-projects/<slug>/` istnieje, `git init` zrobiony
- [ ] `concept.md` finalny (7 sekcji wg `workflow/claude-playbook.md`)
- [ ] `README.md` 1-linijka exists
- [ ] `.gitignore` z `raw-recordings/` + `node_modules` + build outputs
- [ ] `raw-recordings/` folder utworzony (target dla OBS)
- [ ] (opcjonalnie) `gh repo create bartek-filipiuk/<slug>` zrobione

---

## B. Capture (DURING — sesje CC)

### Sesje CC (każda osobna z F9/F10)

- [ ] **Sesja Day 0 — Concept** nagrana → `raw-recordings/day-0-concept.mkv`
  - [ ] Pierwszy prompt: brainstorming na concept.md
  - [ ] Spec zapisany do `docs/superpowers/specs/<date>-<slug>-design.md`
- [ ] **Sesja Day 1+ — Build** nagrana → `raw-recordings/day-1-build.mkv` (+ ewentualne day-2-build, etc.)
  - [ ] writing-plans uruchomiony, plan zapisany
  - [ ] Min 2-5 commitów feat(...)
  - [ ] Aplikacja działa lokalnie (`pnpm dev` na port X)
  - [ ] Inline tagi przy pivotach (jeśli były): [REFACTOR] / [DESIGN] / [SECURITY]
- [ ] **Sesja Day N+1 — Audit (NEW session!)** nagrana → `raw-recordings/day-N-audit.mkv`
  - [ ] Pierwszy prompt: "do a security audit on this codebase"
  - [ ] superpowers:security-audit wynik w `.security-audit/`
  - [ ] Min 3-5 fix commits `fix(security): ...`
  - [ ] `git tag audit-pass-1`
- [ ] **Sesja Day N+2 — Deploy/Release (NEW session!)** nagrana → `raw-recordings/day-N-release.mkv`
  - [ ] (cloud) `wrangler deploy` lub odpowiednik + verify URL
  - [ ] (lokalnie) `pnpm build` + `pnpm preview` smoke test
  - [ ] README update z live URL / instrukcjami
  - [ ] `git tag v0.1.0` + `gh release create`

### Capture poza CC

- [ ] **Face cam** nagrane → `output/<slug>/face.mov`
  - [ ] Hook take (5 s, 14 słów wg `format/spec.md` 2.1)
  - [ ] Outro take (15 s, punchline + cliffhanger + CTA)
  - [ ] 4 cut-iny PiP (decision moment, AI-mistake reaction, design choice, audit recovery)
- [ ] **Demo screencast** nagrane → `output/<slug>/demo.mov`
  - [ ] Real interaction z core flow (3-5 kroków z concept.md)
  - [ ] 60-90 s
  - [ ] Bez voiceover overlay
- [ ] (opcjonalnie) **AI-mistake beat capture** — short clip jeśli nie złapane w sesjach CC

---

## C. Pipeline (POST — Day N+2 lub +3)

### Metadata + curate

- [ ] `mkdir -p docs/films/<slug> output/<slug>` (struktura per-film)
- [ ] `pnpm assets:metadata --repo <project> --jsonl-dir <jsonl> --out docs/films/<slug>/metadata.json`
- [ ] `pnpm curate:scan --project <jsonl> --out output/<slug>/candidates.json --name <slug>`
- [ ] candidates.json review: ile scen, jakie tagi (sanity check)
- [ ] `/curate-narrative output/<slug>/candidates.json` w CC → wybór 6 scen, 12 clipów
- [ ] narrative.json zapisany do `docs/films/<slug>/narrative.json`
- [ ] narrative.json walidacja: total durationSec ≈ 7-9 min
- [ ] `pnpm assets:shotlist --metadata <metadata> --out docs/films/<slug>/shot-list.md`

### Voiceover

- [ ] `/generate-voiceover-script docs/films/<slug>/metadata.json` w CC
- [ ] voiceover-script.json zapisany do `docs/films/<slug>/voiceover-script.json`
- [ ] hook line: ≤ 14 słów, z liczbami, konkret (sekcja 2.1 spec)
- [ ] outro line: 15 s, punchline + cliffhanger + CTA (sekcja 2.9 spec)
- [ ] `ELEVENLABS_API_KEY=... pnpm assets:tts --script <script> --out output/<slug>/voiceover/`
- [ ] `output/<slug>/voiceover/hook.mp3` + `outro.mp3` istnieją

### Render

- [ ] `pnpm render:narrative --input <narrative> --out output/<slug>/segments`
- [ ] `output/<slug>/segments/` ma overlays + dashboards + manifest.json
- [ ] `pnpm render:projectintro --project output/<slug>/segments` → projectintro.mov
- [ ] `pnpm render:stats --project output/<slug>/segments` → stats.mov
- [ ] (jeśli zaimplementowane) `pnpm render:thumb` → thumbnail.png
- [ ] `pnpm assets:doctor` zielony

### Decision checklist (sekcja 6 spec'u)

- [ ] **Tytuł** (≤ 70 znaków): _______________
- [ ] **Hook line** (5 s, ≤ 14 słów): _______________
- [ ] **Promise overlay** (≤ 15 słów, 2 linie): _______________
- [ ] **AI-mistake beat moment** (Build ~3:00 lub Audit ~6:00): _______________
- [ ] **Demo target** (live URL / localhost / split): _______________
- [ ] **Cliffhanger** (silent build #N+1 zapowiedź): _______________
- [ ] **Face cut-iny** (4-6 pozycji): [hook, ___, ___, ___, ___, outro]
- [ ] **Music intensity profile**: standard / quiet / loud
- [ ] **Talking head dosage**: minimum (4) / standard (6) / maximum (PiP throughout)

---

## D. Premiere assembly

### Setup

- [ ] Premiere project: 1920×1080, 60 fps, 9 min
- [ ] 5 tracków V1-V5 (background, lewy panel, prawy panel, overlays, face PiP)
- [ ] 3 tracki audio A1-A3 (music, voiceover, sfx/silence)

### Tracks

- [ ] **V2 lewy panel:** raw-recordings razor-cut + time-stretch wg narrative.json clip ranges
  - [ ] Każdy clip: from/to → durationSec (compression 25-50×)
  - [ ] Pozycja (0, 0), 1344×1080
- [ ] **V3 prawy panel:** dashboard segments z `output/<slug>/segments/`
  - [ ] Pozycja (1344, 0), 576×1080
  - [ ] Sync timestamps z lewym panelem
- [ ] **V4 overlays:** PhaseTransition pełny ekran przy granicach scen
  - [ ] 6 overlays z `scene-XX-*-overlay.mov`
- [ ] **V5 face PiP:** 240×240 top-right na lewym panelu
  - [ ] Hook face #1 (full-screen 0:00-0:05)
  - [ ] 4 cut-iny PiP (decision / AI-mistake / design / audit) — 3-5 s każdy
  - [ ] Outro face #2 (full-screen 8:35-8:50)
- [ ] **Top of timeline:**
  - [ ] ProjectIntro composition (0:15-0:25)
  - [ ] Demo screencast (7:00-8:30)
  - [ ] StatsCard composition (8:30-8:35)
  - [ ] Subscribe overlay (8:50-9:00)

### Audio

- [ ] **A1 music:**
  - [ ] intro-chill 0:00-1:30 fade-in
  - [ ] hard cut → build-hustle 1:30-6:30
  - [ ] **MUTE 5-8 s @ AI-mistake beat**
  - [ ] climax-drop 6:30-7:00 (drop align z deploy moment)
  - [ ] outro-celebratory 7:00-9:00 fade @ 8:55
- [ ] **A2 voiceover:**
  - [ ] hook.mp3 align z face #1
  - [ ] outro.mp3 align z face #2
  - [ ] Sidechain music ducking -3 dB podczas VO
- [ ] **A3 sfx (opcjonalnie):**
  - [ ] UI dings przy PhaseTransition
  - [ ] Whoosh przy face cuts (tylko jeśli pasuje)

### Visual variety devices

- [ ] **Lower-third** "0N/06 NAZWA" w pierwszych 3 s każdej fazy → fade-out
- [ ] **CommitCard** B-roll inserts (2-3× w fazie Build) — z `output/<slug>/segments/`
- [ ] **CodeZoom** B-roll insert (1× w Plan, 1× w Build)
- [ ] **StatsCard punch-in** (1.5-2 s) na granicach faz (jeśli zaimplementowane; obecnie GAP)
- [ ] **Architecture zoom-out** (4-6 s w Plan; jeśli zaimplementowane; obecnie GAP)
- [ ] **Before/after split** w Design phase
- [ ] **Red→green security transition** w Audit phase (~3 s)

### Color & polish

- [ ] LUT (subtelny lub żaden — NASA palette już jest)
- [ ] Light bloom na overlay text (CapCut Glow)
- [ ] Audio normalize do -16 LUFS (YouTube standard)

### Captions

- [ ] Auto-captions PL → review krytycznych zdań (hook, outro, AI-mistake beat)
- [ ] EN translation → review tych samych zdań
- [ ] Eksport `.srt` PL + `.srt` EN

### Export

- [ ] Final export H.264 mp4 → `output/<slug>/final/<slug>-silent-build-N.mp4`
- [ ] Rozmiar ~1 GB dla 9 min (sanity check)
- [ ] Preview na pełnym ekranie — sanity check sync, audio, captions

---

## E. Publish

### Pre-publish review

- [ ] Pełny preview filmu na pełnym ekranie (oglądasz całość raz)
- [ ] Sprawdź AI-mistake beat — działa? Music mute czytelne?
- [ ] Sprawdź face cuts — natural? Niech timing jest na decision moments?
- [ ] Sprawdź captions — bez literówek na hook + outro?
- [ ] Sprawdź demo — działa core flow? Brak błędów na ekranie?

### YT Studio

- [ ] Upload jako **Unlisted** (preview)
- [ ] **Title** (z C decision checklist): _______________
- [ ] **Description** z `docs/films/<slug>/publish.md`:
  - [ ] Pełny opis projektu
  - [ ] Linki: repo, live URL (jeśli), silent-build, spec
  - [ ] **Chapters** (timestamps z narrative.json):
    ```
    0:00 Hook
    0:15 Intro
    0:25 Concept
    ...
    ```
  - [ ] Tech stack
  - [ ] Cliffhanger / kolejny film
- [ ] **Tags**: claude code, ai pair programming, vibecoding, silent build, [stack-specific]
- [ ] **Thumbnail** upload (z `output/<slug>/thumbnail.png` lub Figma manual)
- [ ] **End-screen** (20 s): Subscribe + Watch next placeholder
- [ ] **Cards**: link do repo @ ~1:00, link do live URL @ ~6:30 (jeśli)
- [ ] **Captions** PL + EN upload
- [ ] **Visibility**: Unlisted → wyślij link 2 osobom do review (24 h)

### Public

- [ ] Po review: Visibility = Public + Schedule (lub publish now)
- [ ] **Tweet** / X post — 1 linijka + thumbnail + link
- [ ] **LinkedIn** post — dłuższy + key takeaways
- [ ] **README repo** update z YT linkiem
- [ ] **silent-build playlist** YT — dodaj film
- [ ] (opcjonalnie) Reddit / HN cross-post jeśli pasuje niche

### First 24 h tracking

- [ ] Views @ 1 h: ___
- [ ] Views @ 24 h: ___
- [ ] CTR (impressions → clicks): ___ %
- [ ] Average view duration: ___ min ___ s
- [ ] Drop-off points (jeśli dramatyczne): ___
- [ ] Comments (jakie pytania powtarzają się): ___

---

## F. Po publikacji

- [ ] Update `format/spec.md` Changelog: data + film + retention number
- [ ] Update `format/spec.md` sekcja 8 — który A/B test wynik
- [ ] (po +1 tydzień) `rm -rf raw-recordings/` (storage reclaim)
- [ ] Lessons learned spisane (1-2 paragraf): co zadziałało, co nie

---

## Notatki dotyczące tego filmu

(Wolne miejsce na notatki specyficzne dla tego filmu — wyjątki od standardu, eksperymenty, observations)
