# New project playbook — instrukcje dla Claude

To jest dokument dla Claude (mnie). Bartek przychodzi z pomysłem na nowy film silent-build i daje mi inputy. Mój job: na ich podstawie spersonalizować runbook + przygotować teren, żeby Bartek mógł od razu odpalić Sesję 1.

## Inputy, które Bartek dostarcza

Minimalnie:
- **Pomysł** — 1-2 zdania, co aplikacja ma robić
- **Stack preferowany** — np. "SvelteKit + better-sqlite3 lokalnie", "Hono + Bun", "Next.js + Postgres na Vercel"

Opcjonalnie (jeśli ma — bierzesz; jeśli nie ma — pytasz albo zaproponuj draft):
- **concept.md** (1 strona)
- **Coding style** — np. "no comments", "TDD", "feature flags forbidden"
- **Target deploy** — `lokalnie` / `cloud-public` / `cloud-private`
- **Audit focus** — które dziury bezpieczeństwa zostawić specjalnie do audit phase
- **Horizon** — pojedynczy film / cykl projektów

## Decision: lokalnie vs cloud

| Czynnik | Lokalnie | Cloud |
|---|---|---|
| Cel filmu | tutorial, flow demo | viral build, real users |
| Audit phase | sensowny (input validation, in-memory rate limit, open redirect) | pełny (CSRF, CORS, secrets, infra) |
| Deploy phase | `pnpm build` + git tag + gh release | wrangler/vercel/fly deploy + verify URL |
| Demo screencast | localhost:port | live URL |
| Storage/koszt | 0 | $$ |
| Reproducibility dla viewerów | `git clone && pnpm dev` | trzeba ich własne credentials |

**Default: lokalnie** dla projektów-test-pipeline'a, cloud tylko gdy Bartek wyraźnie chce live URL.

Jeśli Bartek nie powie — pytasz: "lokalnie czy cloud?". Jedno krótkie pytanie, nie listę.

## Process — co robisz krok po kroku

### 1. Walidacja concept.md

Concept.md MUSI zawierać 7 sekcji. Jeśli któraś brakuje — proponujesz draft i prosisz o akceptację. **Bez tego film będzie miał luki w narracji.**

| Sekcja | Po co | Jeśli brak |
|---|---|---|
| **What** (1 paragraf) | curator weźmie jako start clip context | Wyciągnij z pomysłu |
| **Why** (1 paragraf) | voiceover hook line | Zaproponuj 2 opcje |
| **Core flow** (3-5 kroków) | demo screencast scenariusz + pierwszy prompt | Wyciągnij z what |
| **Tech stack** (konkretny, nie "modern web stack") | runbook personalizacja | MUSI być od usera |
| **Security surface** (3-5 dziur) ⚠️ | audit phase ma signal — bez tego scena `audit` jest pusta | **Zaproponuj draft per stack** |
| **Non-goals** (explicit) | curator nie bierze z buildu false-positive promptów typu "ale czy nie dodać X" | Wyciągnij z what |
| **Stages mapping** (Day 0-3 → output) | sanity check że projekt mieści się w 7-min film | Skopiuj z tinypath, dostosuj |

Security surface dla nowego stacka — typowe wzorce:

- **HTTP service** (Express/Hono/SvelteKit endpoints): open redirect, brak rate limit, brak CSRF, SSRF na user URLs, secrets w logach
- **CRUD app**: brak input validation, IDOR na ID, mass assignment, SQL injection (jeśli raw queries), brak PII redaction
- **Auth flow**: brak password complexity, brak rate limit na login, JWT bez expiry, session fixation
- **File upload**: brak filename sanitization, brak content-type validation, ścieżki traversal, brak size limit
- **Public API**: brak auth, brak rate limit, brak CORS allowlist, verbose error messages
- **Dla cloud:** + secrets management, + IAM scope, + outdated dependencies

### 2. Setup repo Bartka

W `~/video-projects/<slug>/`:

- [ ] `concept.md` — finalny po walidacji (jeśli edytujesz, pokaż diff Bartkowi do akceptacji)
- [ ] `README.md` — 1-2 linie, "Test project for silent-build pipeline. See concept.md."
- [ ] `.gitignore`:
  ```
  node_modules
  .env
  .env.local
  raw-recordings/
  dist
  build
  .svelte-kit
  *.db
  *.db-journal
  ```
- [ ] `git init` (jeśli nie ma `.git/`)
- [ ] `mkdir raw-recordings/` — target dla OBS
- [ ] (opcjonalnie) `gh repo create bartek-filipiuk/<slug> --public --source=. --push` — Bartek zwykle chce później, nie zaraz

Sprawdź skille:
```bash
ls ~/.claude/skills/ | grep -E '(brainstorming|writing-plans|security-audit|curate-narrative|generate-voiceover-script|start-silent-build-project)'
```
Jeśli któregoś brakuje → `cd silent-build && pnpm skill:install`.

### 3. Generuj runbook

Lokalizacja: `silent-build/docs/films/<slug>/runbook.md`

Skopiuj template (sekcja niżej w tym dokumencie) i podstaw za placeholdery:
- `{{SLUG}}` → np. `tinypath`, `meeting-notes`, `markdown-blog`
- `{{PROJECT_DIR}}` → `~/video-projects/<slug>`
- `{{JSONL_DIR}}` → `~/.claude/projects/-home-bartek-video-projects-<slug>` (myślniki w ścieżce, sprawdź `ls ~/.claude/projects/` po Sesji 1, jak będzie wątpliwość)
- `{{STACK}}` → np. `SvelteKit + better-sqlite3 lokalnie`
- `{{DEV_CMD}}` → np. `pnpm dev` lub `bun --hot src/server.ts`
- `{{DEV_PORT}}` → np. `5173` lub `3000`
- `{{BUILD_CMD}}` → `pnpm build` / `bun build` / `next build`
- `{{DEPLOY_BLOCK}}` → patrz "Stack adaptations" poniżej
- `{{AUDIT_TARGETS}}` → lista konkretnych dziur z security surface concept.md
- `{{INLINE_TAG_EXAMPLES}}` → 2-3 przykłady `[REFACTOR]` / `[DESIGN]` dopasowane do typowych pivotów w tym projekcie

### 4. `{{RELEASE_BLOCK}}` — co Sesja 4 robi w filmie

⚠️ **Zasada:** sam deploy aplikacji (Coolify push, wrangler deploy, vercel push, fly deploy itp.) **NIE jest częścią filmu**. Faza 6 w filmie to **Release** — czyli `pnpm build` + smoke test + `git tag` + `gh release`. Sam deploy do prod robisz off-camera (między Sesją Release a Demo capture), żeby demo screencast mógł być na live URL.

Jedna ścieżka dla wszystkich projektów (lokalne i cloud):

```bash
pnpm build                                       # produkcyjny build
pnpm preview                                     # weryfikacja że produkcyjny build działa lokalnie
git tag v0.1.0
gh release create v0.1.0 --title "v0.1.0" --generate-notes --notes-file -<<EOF
First working version.
EOF
```

To jest co Sesja 4 nagrywa. Po Sesji 4 (off-camera, między F10 a face cam capture):
- Dla projektów Coolify/Hetzner: `git push` → Coolify auto-deploy z webhooka, lub manual `coolify deploy` w UI
- Dla projektów Cloudflare: `wrangler deploy` ręcznie poza nagraniem
- Dla projektów Vercel/Fly: `vercel --prod` / `fly deploy` ręcznie poza nagraniem
- Dla projektów lokalnych: nic — demo będzie na localhost

Po deployu off-camera (jeśli był), nagrywasz Demo screencast na live URL.

### 5. Pre-flight check dla danego stacka

Włóż na początek runbooka, w sekcję Pre-flight. Komendy zależą od stacka:
- Node-based: `node --version` (wymaganie minimalne projektu), `pnpm --version`
- Bun: `bun --version`
- DB: jeśli external DB → `psql -c 'SELECT 1'` lub odpowiednik
- GitHub: `gh auth status`
- ElevenLabs: `echo $ELEVENLABS_API_KEY` (na Day 3, nie wcześniej)

ℹ️ **Brak cloud login checków** w runbooku Sesji 4 — deploy jest off-camera, więc `wrangler whoami` / `coolify status` weryfikujesz **przed off-camera deployem**, nie przed Sesją 4. To zwalnia Sesję 4 z presji "co jeśli login wygasł".

### 6. Pokaż Bartkowi i czekaj na "Sesja 1 done"

Końcowy message do Bartka:
- Lokalizacja runbooka (full path)
- Co już przygotowane (raw-recordings, .gitignore, concept.md edited?, gh repo?)
- Pierwszy konkretny krok (zwykle: pre-flight check + F9 + drugie okno)
- Co Bartek ma napisać po Sesji 1 ("Sesja 1 done")

Nie kodzisz aplikacji za Bartka. Twoje role w trakcie projektu:
- Walidacja concept.md przed startem
- Checkpointy między sesjami (status detector, jsonl size, mkv size)
- Pipeline run na Day 3 (curate:scan, render:narrative, TTS) — tutaj jesteś główny aktor
- Pomoc gdy Bartek się zatnie (debug brainstorming skill, rebuild candidates, fix metadata)

## Template runbook (do kopiowania)

Aktualny gold standard: `docs/films/tinypath/runbook.md`. Skopiuj go w całości i podstaw placeholdery wg sekcji 3.

Pełna nawigacja po dokumentach filmów: `docs/films/README.md`.

Kluczowe sekcje:
1. **Pre-flight** — stack-specific checki
2. **Sesja 1 — Concept** (~30 min) — brainstorming skill
3. **Checkpoint 1** (auto) — verify jsonl + status
4. **Sesja 2 — Build** (~2-3h) — writing-plans + implementacja, inline tagi
5. **Checkpoint 2** (auto) — `pnpm curate:scan` preview
6. **Sesja 3 — Audit** (NEW session, ~1h) — security-audit skill
7. **Sesja 4 — Deploy** (NEW session, ~30 min) — wg stacka
8. **Checkpoint 3** (auto) — wszystkie 4 jsonle + final verification
9. **Day 3 A** (auto) — metadata + scan + shotlist + doctor
10. **Day 3 B** (Bartek w CC, ~30 min) — `/curate-narrative` + `/generate-voiceover-script`
11. **Day 3 C** (auto, ~15 min) — render + TTS
12. **Day 3 D** (Bartek, ~2h) — demo + face + Premiere + YT
13. **Quick reference** — tagi, status detector, common pitfalls, budget

## Co NIE robisz w runbooku

- **Nie hardcoduj nazw plików aplikacji** ("`src/lib/server/db.ts`") — Bartek decyduje strukturę w Sesji 2. Mów o "DB module", "API endpoint", nie konkretnej ścieżce.
- **Nie pisz scenariusza co Bartek ma promptować** poza pierwszymi promptami sesji. Zostaw mu autorstwo. Twoje prompty to triggery skilli (`superpowers:brainstorming`, `superpowers:security-audit`), nie cała sesja.
- **Nie obiecuj timing'u** który zależy od Bartka ("Sesja 2 zajmie 2.5h"). Daj zakres ("2-3h") i zaznacz że Twoje 30 min to pewne, jego godziny to estymata.
- **Nie kopiuj security surface 1:1** z poprzedniego projektu. Każdy projekt ma swoją powierzchnię. Wyciągaj z concept.md tego konkretnego projektu.

## Common patterns przy generowaniu runbooka

### Bartek przyszedł z gotowym concept.md, kompletnym
→ Walidacja sekcji 1, generowanie runbooka. ~5 min Twojej pracy.

### Bartek przyszedł z 2 zdaniami pomysłu
→ Pomóż napisać concept.md (zaproponuj draft, on akceptuje/edytuje). To może być sama Sesja 0 w CC z `superpowers:brainstorming` — zaproponuj wariant: "albo ja teraz spiszę draft concept.md, albo zrobimy to jako Sesję 0 w CC z OBSem". Druga opcja jest filmowa.

### Bartek nie podał stacka
→ Zaproponuj 2-3 opcje per typ aplikacji ("dla URL shortenera lokalnie: SvelteKit+SQLite albo Hono+Bun+SQLite albo Express+lowdb"). Wybierz default na podstawie podobieństwa do duels (jeśli celujesz w spójność cyklu).

### Bartek chce cykl filmów (5+ projektów)
→ Po pierwszym projekcie ekstraktuj wzorce do tego playbooka (sekcja Stack adaptations rośnie). Każdy kolejny runbook powinien być szybszy w generacji.

### Audit phase concept.md jest pusta / nieinteresująca
→ Niedopuszczalne. Audit to 1-2 sceny w 7-min filmie. Zaproponuj 3-5 dziur typowych dla stacka (sekcja "Security surface dla nowego stacka — typowe wzorce" wyżej). Bartek akceptuje lub modyfikuje.

### Stack ma cloud deploy ale Bartek chce tylko lokalny demo
→ OK, ustaw `{{DEPLOY_BLOCK}}` na lokalny i zaznacz w runbooku w sekcji Sesji 4: "deploy do prod skipped — local build + tag jako "release"". Audit phase nadal sensowny (input validation, in-memory rate limit).

## Update tego playbooka

Gdy nauczysz się czegoś nowego po projekcie X (jakiś stack adaptation, common pitfall, lepszy template) — wracaj tutaj i edytuj. To dokument żywy, nie statyczny.
