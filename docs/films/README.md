# `docs/films/` — wszystko o produkcji filmów silent-build

Ten folder zawiera wszystkie dokumenty dotyczące tworzenia filmów (nie pipeline'u, nie projektów apek). Podzielone na 4 podfoldery + 2 pliki na poziomie root.

## Struktura

```
docs/films/
├── README.md                          ← jesteś tutaj (indeks)
├── shot-list-template.md              ← template używany przez `pnpm assets:shotlist`
├── format/                            ← jak wygląda film (kreatywny przepis)
│   └── spec.md
├── workflow/                          ← jak go tworzymy (proces, narzędzia, prompty)
│   ├── project-starter.md
│   ├── claude-playbook.md
│   ├── inline-tags.md
│   └── film-prompt.md
├── production/                        ← walidacja + automatyzacja
│   ├── film-checklist.md
│   └── automation-checklist.md
├── duels/                             ← per-film artifacts: silent build #1
└── tinypath/                          ← per-film artifacts: silent build #2
```

## Sekcje

### 🎬 [`format/`](./format/) — Jak wygląda film

Kreatywny przepis. Co MUSI być w każdym filmie, dlaczego, kiedy łamać format.

- **[`format/spec.md`](./format/spec.md)** — uniwersalna specyfikacja formatu. Hook, fazy, music palette, visual variety, tytuły, thumbnaile, A/B testy, compatibility matrix. Sekcja 6 to per-film decision checklist.

### 🛠️ [`workflow/`](./workflow/) — Jak tworzymy film (proces)

Jak ja (Bartek) i Claude pracujemy nad filmem. Krok po kroku, plus narzędzia.

- **[`workflow/project-starter.md`](./workflow/project-starter.md)** — checklista per stage (Pre-Day 0 → Day N+4). Otwierasz w side window.
- **[`workflow/claude-playbook.md`](./workflow/claude-playbook.md)** — instrukcje meta dla Claude'a (gdy przychodzę z nowym pomysłem). Walidacja concept.md, generowanie runbooka, stack adaptations.
- **[`workflow/inline-tags.md`](./workflow/inline-tags.md)** — `[TAG]` markery w promptach. Jak curator je interpretuje, kiedy używać.
- **[`workflow/film-prompt.md`](./workflow/film-prompt.md)** — gotowy prompt do CC: "zacznij produkcję kolejnego filmu". Wklej w nową sesję.

### 📋 [`production/`](./production/) — Walidacja + automatyzacja

Co da się zautomatyzować, co manual, kiedy. Plus checklisty walidacyjne.

- **[`production/automation-checklist.md`](./production/automation-checklist.md)** — pełny matrix: każdy element formatu × status (auto / semi / manual / gap) × timing (pre / during / post). Plus roadmap automatyzacji.
- **[`production/film-checklist.md`](./production/film-checklist.md)** — uniwersalny pre-publish checklist (sekcje A-F: Pre-flight → Capture → Pipeline → Premiere → Publish → Po). Skopiuj do `<slug>/checklist.md` i tickuj.
- **[`production/broll-templates.md`](./production/broll-templates.md)** — katalog 14 B-roll templates (Remotion → MP4): co już mamy (9), co warto dodać (5 priorytetowych), priorytetyzacja ROI, pipeline integration.

### 📁 [`duels/`](./duels/) i [`tinypath/`](./tinypath/) — Per-film artifacts

Każdy film ma swój folder z `narrative.json`, `metadata.json`, `voiceover-script.json`, `shot-list.md`, `production-plan.md` (lub `runbook.md`), `publish.md`, `checklist.md`.

Konwencja `output/<slug>/` (gitignored) trzyma renders, demo.mov, face.mov, segments. Zobacz `CLAUDE.md` w root projektu po szczegóły organizacji per-film.

### 📄 `shot-list-template.md` (root)

Jinja-like template używany przez `packages/film-assets/src/shot-list.ts` (CLI: `pnpm assets:shotlist`). **Nie przenoś** — ścieżka jest hardcoded w kodzie.

## Workflow per film — który dokument kiedy

```
Day -1 (raz na zawsze, jednorazowo per kanał)
├── format/spec.md                    przeczytaj cały, zrozum filozofię
├── production/automation-checklist.md zrozum co manual / co auto

Day 0 (per nowy projekt)
├── workflow/film-prompt.md           wklej do CC, zacznij setup
├── workflow/claude-playbook.md       (Claude czyta to autonomicznie)
└── workflow/project-starter.md       (Claude generuje runbook na podstawie tego)

Days 1-N (sesje CC + capture)
├── docs/films/<slug>/runbook.md      otwarte w side window, lecisz krok po kroku
├── workflow/inline-tags.md           referencja gdy potrzeba [TAG] przy pivocie

Day N+1 (face cam + demo)
├── docs/films/<slug>/shot-list.md    wygenerowany przez assets:shotlist
└── docs/films/<slug>/checklist.md    tickujesz sekcję B Capture

Day N+2 (pipeline POST)
├── docs/films/<slug>/runbook.md      (Day 3 część A-D)
└── docs/films/<slug>/checklist.md    tickujesz sekcję C Pipeline

Day N+3 (Premiere assembly + publish)
├── format/spec.md                    sekcje 1-3 + 6 (decision checklist)
├── docs/films/<slug>/checklist.md    tickujesz sekcje D, E, F
└── docs/films/<slug>/publish.md      template YT metadata
```

## Powiązane dokumenty (poza `docs/films/`)

- **`CLAUDE.md`** (root) — konwencje per-film organization (output/<slug>/ vs docs/films/<slug>/)
- **`docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md`** — spec pipeline'u (Remotion compositions, film-assets package)
- **`assets/obs/README.md`** — one-time OBS Studio setup
- **`assets/music/README.md`** — Suno tracks manifest + prompty
- **`assets/voices/`** — ElevenLabs voice ID

## Aktualizacja tych dokumentów

- `format/spec.md` — Changelog na końcu, update po publikacji każdego filmu
- `production/automation-checklist.md` — Sprint roadmap, update gdy zaimplementujesz gap
- `production/film-checklist.md` — append nowe sekcje gdy znajdziesz luki
- `workflow/*` — update gdy proces się zmienia (np. nowa skill, nowy stack)

Per-film artifacts (`<slug>/*`) — żywe per projekt, edytujesz w trakcie produkcji.
