# Film prompt — uruchom CC żeby zacząć kolejny film

**Cel:** wklej cały blok poniżej do nowej sesji CC w katalogu `silent-build/`. CC przeprowadzi Cię przez setup nowego filmu — niezależnie od tego, czy aplikacja już istnieje, czy ją dopiero zaczynasz.

## Jak używać

1. `cd ~/video-projects/silent-build`
2. `claude`
3. Skopiuj poniższy blok (wszystko między ``` `BEGIN PROMPT` `` ` a ``` `END PROMPT` `` ` ) i wklej jako pierwszy prompt
4. CC zapyta o szczegóły, zwaliduje konfigurację, wygeneruje runbook i pokaże pierwszy konkretny krok

---

```
BEGIN PROMPT

Chcę zacząć produkcję kolejnego filmu silent-build.

Przeczytaj te dokumenty (kolejność ma znaczenie):
1. docs/films/workflow/claude-playbook.md — Twoje instrukcje meta (jak ze mną pracować nad nowym filmem)
2. docs/films/format/spec.md — uniwersalny przepis na film
3. docs/films/production/automation-checklist.md — co automat / co manual / kiedy
4. docs/films/production/film-checklist.md — pre-publish walidacja

Następnie zadaj mi te pytania w jednej turze:

**A. Status aplikacji:**
- (a1) Aplikacja jeszcze nie istnieje — będziemy ją budować razem (greenfield, jak tinypath)
- (a2) Aplikacja już istnieje, była budowana w Claude Code (jsonle dostępne) — chcę zrobić "best-of" film z istniejących sesji (jak duels)
- (a3) Aplikacja już istnieje ale BEZ jsonl-i Claude Code — trzeba zrekonstruować lub zrezygnować z niektórych elementów

**B. Podstawowe info:**
- Slug projektu (krótka nazwa, np. `tinypath`, `markdown-blog`)
- Pomysł w 1-2 zdaniach
- Stack preferowany (np. "SvelteKit + better-sqlite3 lokalnie")
- Coding style preferences (np. "no comments", "TDD", "feature flags forbidden") — opcjonalnie
- Target deploy: lokalnie / cloud-public / cloud-private
- Audit focus: które dziury bezpieczeństwa zostawić specjalnie do audit phase — opcjonalnie, możesz wziąć z typowych wzorców per stack

**C. Format filmu:**
- Długość: speed-build (≤5 min, 1 mid-roll) / standard (8:30-9:30, 2 mid-rolle) / mega (11-12 min, 2 mid-rolle, looser)
- A/B test variable (jeśli to któryś z pierwszych 3 filmów): hook style / face dosage / music density / stats cadence / length
- Język: PL primary + EN auto / EN primary / inny

Po moich odpowiedziach:

**1. Walidacja preconditions** — sprawdź czy mam wszystko co potrzebne:
- Dla a1 (greenfield): folder ~/video-projects/<slug>/ nie istnieje? OBS gotowy? skille zainstalowane? Suno tracks w assets/music/?
- Dla a2 (existing + jsonl): jsonl-dir istnieje w ~/.claude/projects/-…-<slug>/? OBS recordings w ~/video-projects/<slug>/raw-recordings/? Repo dostępne lokalnie?
- Dla a3 (existing bez jsonl): co Ty masz na temat tego projektu? Jakie elementy formatu trzeba pominąć (dashboard pewnie out, bo brak jsonl)?

**2. Concept.md walidacja** (dla a1):
Sprawdź 7 sekcji concept.md (What/Why/Core flow/Stack/Security surface/Non-goals/Stages mapping). Brakuje którejś? Zaproponuj draft i poproś o akceptację.

**3. Setup repo** (dla a1, jeśli folder nie istnieje):
- mkdir ~/video-projects/<slug>/
- git init
- README.md, .gitignore, raw-recordings/
- (opcjonalnie) gh repo create

**4. Wygeneruj runbook** dla projektu:
- Jeśli a1: skopiuj template z docs/films/projects/tinypath/runbook.md → docs/films/projects/<slug>/runbook.md, podstaw placeholdery wg sekcji 3 claude-playbook.md
- Jeśli a2: stwórz docs/films/projects/<slug>/production-plan.md (skip Days 0-2 sekcji, lecimy od razu do Day 3 pipeline)
- Jeśli a3: stwórz uproszczony plan z explicit listą gap'ów (czego nie da się zrobić bez jsonl)

**5. Stwórz checklist per film** (kopiowany z docs/films/production/film-checklist.md):
- Skopiuj do docs/films/projects/<slug>/checklist.md
- Wpisz slug, datę, cel publikacji w nagłówku
- Zaznacz które sekcje już są done (np. dla a2 — sekcje A i B mogą być częściowo zielone)

**6. Pierwszy konkretny krok:**
- Dla a1: pre-flight + F9 + drugie okno terminala + claude w katalogu projektu + "przeczytaj concept.md i zbrainstormuj design"
- Dla a2: pre-flight + cd silent-build + pnpm assets:metadata na repo + jsonl-dir
- Dla a3: zacznij od capture face cam + demo screencast (te elementy nie wymagają jsonl), reszta gap'ów

**7. Update docs/films/projects/<slug>/checklist.md** — zaznacz [x] co już zrobione w ramach setup'u (sekcja A pre-flight typowo).

Pamiętaj:
- Nie kodzisz aplikacji za mnie. Twoje role: walidacja → runbook → checkpointy → pipeline run na Day 3.
- Inline tagi: pokażesz mi pełną tabelę z docs/films/workflow/inline-tags.md jeśli zapytam o pivoty.
- Auto mode: minimalizuj pytania, ale walidacja preconditions PRZED capture jest obowiązkowa (oszczędza writeoff sesji).

Po zakończeniu setup'u napisz krótkie podsumowanie:
- Slug + folder docelowy
- Lista plików utworzonych (concept.md, runbook.md, checklist.md, etc.)
- Pierwszy konkretny krok dla mnie
- Estymowany czas do publikacji (zależy od scenariusza A/B/C)

Zaczynamy.

END PROMPT
```

---

## Wariant kompaktowy (jeśli wszystko już wiesz)

Jeśli nie chce Ci się długiego dialogu, wklej zamiast tego:

```
Zacznij produkcję filmu silent-build dla projektu <slug>.
Scenariusz: <a1 greenfield | a2 existing-with-jsonl | a3 existing-no-jsonl>.
Stack: <SvelteKit lokalnie | etc>.
Cel publikacji: <silent build #N: <slug>>.
Długość: standard 8:30-9:30.

Przeczytaj docs/films/workflow/claude-playbook.md, zwaliduj preconditions wg scenariusza, wygeneruj runbook + checklist, pokaż pierwszy konkretny krok.
```

CC powinien mieć dość kontekstu, żeby ruszyć bez pytań.

## Co po pierwszej sesji setup'u

CC stworzy:
- `docs/films/projects/<slug>/runbook.md` (lub `production-plan.md`) — Twoja mapa dnia po dniu
- `docs/films/projects/<slug>/checklist.md` — kopia uniwersalnego checklist do tickowania per film
- `docs/films/projects/<slug>/concept.md` (jeśli a1) lub link do istniejącego

Otwórz runbook w side window, lecisz po sesjach. Po każdej sesji wracasz do silent-build window i mówisz "Sesja N done" — CC odpala odpowiedni checkpoint.

## Kiedy NIE używać tego promptu

- Gdy masz już zacząty projekt i runbook istnieje → po prostu otwórz `docs/films/projects/<slug>/runbook.md` i kontynuuj
- Gdy chcesz wyłącznie odpalić pipeline POST (Day 3) na gotowym projekcie → użyj wariantu kompaktowego z scenariuszem `a2`
- Gdy chcesz tylko zaktualizować format-spec'a / playbook'a / inny meta-doc → osobna sesja, nie ten prompt

## Powiązane

- `docs/films/workflow/claude-playbook.md` — co Claude robi pod spodem (instrukcje meta)
- `docs/films/format/spec.md` — referencyjny przepis formatu
- `docs/films/production/film-checklist.md` — uniwersalny pre-publish
- `docs/films/production/automation-checklist.md` — co automat / co manual / kiedy
