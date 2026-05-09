# Tinypath silent-build — runbook

Otwórz ten plik w side window podczas pracy. Każdą sesję CC robisz w **drugim oknie terminala**, w katalogu `~/video-projects/test-video-project`. Po każdej sesji wracasz tu i mówisz mi "Sesja N done" — uruchomię odpowiedni checkpoint.

Konwencje:
- 🟢 = Twoja akcja w drugim oknie
- 🔵 = ja robię tutaj autonomicznie
- 🎬 = OBS hotkey (F9 start / F10 stop)

---

## Pre-flight (raz, przed pierwszym F9)

🟢 Sprawdź zanim ruszysz — żeby nic Cię nie zablokowało w trakcie nagrania:

```bash
node --version             # ≥18 dla SvelteKit
pnpm --version             # ≥8
gh auth status             # jeśli expired → gh auth login
```

ℹ️ Zero cloud loginów — projekt jest **lokalnie**. Brak `wrangler`, `vercel`, `fly`.

🟢 W OBS:
- [ ] Scena `silent-build-cc-session` istnieje, Window Capture wskazuje na terminal
- [ ] Output Path: `~/video-projects/test-video-project/raw-recordings/`
- [ ] Hotkeys: F9 = Start Recording, F10 = Stop Recording
- [ ] Format: MKV (crash-safe), x264 CRF 23 lub NVENC CQ 23

🟢 Przed Sesją 1 — `ELEVENLABS_API_KEY` nie jest jeszcze potrzebny (dopiero Day 3). Możesz odłożyć.

---

## Sesja 1 — Day 0 Concept (~30 min)

🎬 **F9** → `raw-recordings/day-0-concept.mkv`

🟢 Drugie okno:
```bash
cd ~/video-projects/test-video-project
claude
```

🟢 Pierwszy prompt w CC (jeden z dwóch):
- Naturalny: `przeczytaj concept.md i zbrainstormuj design tinypath`
- Z tagiem: `[CONCEPT] przeczytaj concept.md i zbrainstormuj design`

CC powinno odpalić skill `superpowers:brainstorming`. Jeśli nie ruszy z automatu:
```
uruchom skill superpowers:brainstorming na concept.md
```

🟢 Po dialogu — zapis specu:
```
zapisz spec do docs/superpowers/specs/2026-05-07-tinypath-design.md
```

🟢 Exit z CC. 🎬 **F10**.

🟢 Wracasz tu i piszesz: **"Sesja 1 done"**

🔵 Checkpoint 1: zweryfikuję jsonl w `~/.claude/projects/-home-bartek-video-projects-test-video-project/`, status detector, czy mkv ma sensowny rozmiar (~150-300 MB dla 30 min). Jeśli wszystko OK → zielone światło na Sesję 2.

---

## Sesja 2 — Day 1 Build (~2-3h, najdłuższa)

🔵 Najpierw zaznaczam start projektu w jsonl silent-build (jeden marker):
```bash
cd ~/video-projects/silent-build
pnpm mark project-start --name "tinypath"
```
(zrobię to za Ciebie po Sesji 1; Ty się tym nie martw)

🎬 **F9** → `raw-recordings/day-1-build.mkv`

🟢 Drugie okno:
```bash
cd ~/video-projects/test-video-project
claude
```

🟢 Pierwszy prompt — uruchom writing-plans na specu:
```
przeczytaj docs/superpowers/specs/2026-05-07-tinypath-design.md i uruchom skill superpowers:writing-plans → zapisz plan do docs/superpowers/plans/2026-05-07-mvp.md
```

🟢 Implementacja task-by-task. Po każdym tasku — commit:
```bash
git add -A && git commit -m "feat(<scope>): <what>"
```

🟢 **Inline tagi w trakcie** (jeśli zboczysz z buildu):
- `[REFACTOR] przepisz handler na nanoid 7 znaków`
- `[DESIGN] zmień layout statsa — większy click count`
- `[CODE_REVIEW] zerknij na auth flow zanim pójdę dalej`

Tag MUSI być na początku promptu. Recognized tokens: CONCEPT, IDEA, START, PLAN, ARCHITECTURE, SPEC, ROADMAP, BUILD, CODE, FEATURE, IMPLEMENT, REFACTOR, DESIGN, UI, UX, STYLE, THEME, REVIEW, CODE_REVIEW, AUDIT, SECURITY, HARDEN, DEPLOY, SHIP, RELEASE, LAUNCH, END.

🟢 Cel końca Sesji 2: aplikacja działa lokalnie (`pnpm dev` na port 5173), shorten + redirect + stats wszystko działa, 2-5 commitów feat(...). **Bez deploy** — testujesz w przeglądarce na localhost.

🟢 Exit z CC. 🎬 **F10**.

🟢 Wracasz tu: **"Sesja 2 done"**

🔵 Checkpoint 2: `pnpm curate:scan` na jsonl tinypath, sprawdzę ile candidates, czy edit bursts wykryło pliki MVP, czy są wszystkie commity. Pokażę wynik + decyzja czy idziemy dalej.

---

## Sesja 3 — Day 2 Audit (NEW session, ~1h)

⚠️ **MUSI BYĆ NOWA SESJA CC** — zamknij CC z Sesji 2 i uruchom świeżo. To test czy curator odróżnia clean candidate streams.

🎬 **F9** → `raw-recordings/day-2-audit.mkv`

🟢 Drugie okno:
```bash
cd ~/video-projects/test-video-project
claude
```

🟢 Pierwszy prompt MUSI być audit-shaped (to staje się `audit` start clip):
```
do a security audit on this codebase
```

CC powinno odpalić skill `superpowers:security-audit`. Jeśli nie:
```
uruchom skill superpowers:security-audit
```

🟢 Audit produkuje pliki w `.security-audit/`: `report.md`, `recon.md`, `test-quality.md`, `findings/`, `non-issues/`.

🟢 Fix blokerów (concept.md ma 5 zaplanowanych dziur — open redirect, brak rate limit, brak bot protection, stats endpoint exposure, PII w URLs):
```bash
git add -A && git commit -m "fix(security): <thing>"
```

🟢 Po fixach:
```bash
git tag audit-pass-1
```

🟢 Exit z CC. 🎬 **F10**.

🟢 Wracasz tu: **"Sesja 3 done"**

🔵 Bez checkpointu — od razu lecimy w Sesję 4.

---

## Sesja 4 — Day 2 "Release" (NEW session, ~30 min)

⚠️ Znowu NOWA sesja CC.

ℹ️ **Brak deploy do prod** — projekt jest lokalnie. Zamiast tego: weryfikujemy build + cuttamy git tag + gh release. To daje stage `end` w narracji bez cloud setupu.

🎬 **F9** → `raw-recordings/day-2-release.mkv`

🟢 Drugie okno:
```bash
cd ~/video-projects/test-video-project
claude
```

🟢 Prompty:
```
[RELEASE] zbuduj projekt produkcyjnie i odpal preview — pnpm build, potem pnpm preview, sprawdź że na localhost:4173 działa shorten + redirect + stats
```
```
zaktualizuj README.md — dodaj sekcję "Run locally" z `pnpm install && pnpm dev`, dopisz że to test project for silent-build, link do repo silent-build
```
```
git add -A && git commit -m "docs: README run instructions"
git tag v0.1.0
gh release create v0.1.0 --title "v0.1.0 — first working version" --generate-notes
```

🟢 Exit z CC. 🎬 **F10**.

🟢 Wracasz tu: **"Sesja 4 done"**

🔵 Checkpoint 3: weryfikuję wszystkie 4 jsonle są dostępne, mkv są na dysku, `pnpm build` produkuje `.svelte-kit/output/`, `git tag v0.1.0` istnieje, gh release widoczny. Pokażę storage usage (raw-recordings powinno być ~15-25 GB sumarycznie).

---

## Day 3 — pipeline production (rozłożone)

### Część A — auto (~5 min)

🔵 Robię w silent-build:
```bash
mkdir -p docs/films/tinypath output/tinypath
pnpm assets:metadata --repo ~/video-projects/test-video-project \
  --jsonl-dir ~/.claude/projects/-home-bartek-video-projects-test-video-project \
  --out docs/films/tinypath/metadata.json
pnpm curate:scan \
  --project ~/.claude/projects/-home-bartek-video-projects-test-video-project \
  --out output/tinypath/candidates.json --name tinypath
pnpm assets:shotlist \
  --metadata docs/films/tinypath/metadata.json \
  --out docs/films/tinypath/shot-list.md
pnpm assets:doctor
```

Pokażę Ci output candidates.json (ile scen, jakie tagi). Jeśli vibes są dobre → Część B.

### Część B — narrative + voiceover (~30 min, w CC)

🟢 W silent-build window:
```bash
cd ~/video-projects/silent-build
claude
```

🟢 Prompty:
```
/curate-narrative output/tinypath/candidates.json
```
(skill prowadzi dialog — wybierasz top 6 scen, dla każdej top 2 clipy, ustalasz durationSec)
```
zapisz narrative do docs/films/tinypath/narrative.json
```

```
/generate-voiceover-script docs/films/tinypath/metadata.json
```
(skill pisze hook + outro)
```
zapisz do docs/films/tinypath/voiceover-script.json
```

🟢 Exit. Wracasz: **"Część B done"**

### Część C — render + TTS (~10-15 min, auto)

🔵 Robię:
```bash
pnpm render:narrative \
  --input docs/films/tinypath/narrative.json \
  --out output/tinypath/segments
ELEVENLABS_API_KEY=<your-key> pnpm assets:tts \
  --script docs/films/tinypath/voiceover-script.json \
  --out output/tinypath/voiceover
```

🟢 Tu jednorazowo musisz wkleić `ELEVENLABS_API_KEY` (lub eksportuj `export ELEVENLABS_API_KEY=...` w shellu i powiedz mi, że gotowe).

### Część D — demo + face + Premiere + YT (~2h, Twoje)

Pełny przepis: `docs/films/workflow/project-starter.md` sekcja "Premiere assembly". W skrócie:

🟢 OBS demo screencast 60s tinypath na live URL → `output/tinypath/demo.mov`
🟢 Face record 30s (5s hook + 10s outro takes) → `output/tinypath/face.mov`
🟢 Premiere assembly:
- Lewy panel (1344×1080): raw-recordings razor-cut według narrative.json clip ranges + time-stretch do `clip.durationSec`
- Prawy panel (576×1080): `output/tinypath/segments/scene-XX-*-clip-NN.mov`
- Top track: overlays `scene-XX-*-overlay.mov` na granicach scen
- Top of timeline: face hook (5s) → ProjectIntro (10s) → demo (60s) → StatsCard (5s) → face outro (10s)
- Audio: Suno music crossfade + ElevenLabs voiceover
- Export → `output/tinypath/final/tinypath-silent-build-1.mp4`
🟢 Draft YT metadata w `docs/films/tinypath/publish.md`
🟢 YT upload
🟢 README repo update z YT linkiem
🟢 Po publish + 1 tydzień: `rm -rf ~/video-projects/test-video-project/raw-recordings/` (storage reclaim)

---

## Quick reference

### Inline tagi → scena
| Tagi | Scena |
|---|---|
| CONCEPT, IDEA, START | start |
| PLAN, ARCHITECTURE, SPEC, ROADMAP | plan |
| BUILD, CODE, FEATURE, IMPLEMENT, REFACTOR | build |
| DESIGN, UI, UX, STYLE, THEME | design |
| REVIEW, CODE_REVIEW, AUDIT, SECURITY, HARDEN | audit |
| DEPLOY, SHIP, RELEASE, LAUNCH, END | end |

### Status detector (sprawdzenie gdzie jesteś)
```bash
cd ~/video-projects/test-video-project
~/.claude/skills/start-silent-build-project/bin/status.mjs
```

### Common pitfalls
- **Zapomniany F9** → cała sesja writeoff dla left panel. Akceptujesz dashboard-only segment lub robisz reconstruction.
- **Build i Audit w jednej sesji bez tagów** → curator skleja kandydatów. Tagi `[SECURITY]` ratują, ale lepiej osobne sesje.
- **`pnpm build` failuje w Sesji 4** → SvelteKit potrzebuje adapter ustawionego (`adapter-node` dla local, nie `adapter-cloudflare`). Sprawdź `svelte.config.js` w Sesji 2 — jeśli był domyślny `adapter-auto`, pewnie zostanie node, ale potwierdź.
- **Pierwszy prompt nudny** → curator weźmie go jako start clip. Jeśli pierwszy prompt to "test", "ok lecimy" — film zacznie się nudno. Zrób pierwszy prompt mocny, opisowy.
- **Edycja concept.md w trakcie sesji** → zostaje w jsonl jako edit burst, może zostać nominowany na build clip. Concept.md powinien być finalny przed Sesją 1.
- **better-sqlite3 native module fails** → Node version mismatch. `pnpm rebuild better-sqlite3` powinno fixnąć. Jeśli nie — `pnpm i better-sqlite3 --force`.

### Estymowany budżet czasu
| Faza | Twój czas | Mój czas | Total |
|---|---|---|---|
| Pre-flight | 3 min | 0 | 3 min |
| Sesja 1 + Checkpoint | 30 min | 2 min | 32 min |
| Sesja 2 + Checkpoint | 2-3h | 2 min | ~3h |
| Sesja 3 | 1h | 0 | 1h |
| Sesja 4 + Checkpoint | 20 min | 2 min | 22 min |
| Day 3 A | 0 | 5 min | 5 min |
| Day 3 B | 30 min | 0 | 30 min |
| Day 3 C | 1 min | 15 min | 16 min |
| Day 3 D | 2h | 0 | 2h |
| **Razem** | ~6.5h Twoich | ~30 min mojego | ~7h |

Spread na 3 dni kalendarzowe to komfortowo. Można w 1 dzień, ale wtedy face record + Premiere robisz ze zmęczonym mózgiem. Local-only (bez deploy) skrócił Sesję 4 z 30 min do 20 min.
