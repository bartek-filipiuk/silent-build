# Silent-build — plan testów manualnych

Zielone wszystkie scenariusze → mergujemy `feat/live-stream` → `main`.
Każdy scenariusz ma expected result. Jeśli coś nie zgadza się — STOP, zgłoś co.

## 0. Pre-flight (1 min)

Z poziomu `/home/bartek/video-projects/silent-build`:

- [ ] `pnpm install` — zainstaluje nowe paczki (live-dashboard, live-server, theme, ui)
- [ ] `pnpm test` — **expected:** `Tests 94 passed (94)`
- [ ] `pnpm typecheck` — **expected:** brak output (clean)
- [ ] `pnpm build` — **expected:** zielono, każda paczka `build` OK

Jeśli to padnie — nie idziemy dalej.

---

## Scenariusz A — VOD flow (non-live, regresja)

Sprawdza, czy refactor theme/ui + live-stream nie popsuł istniejącego pipeline’u renderowania z jsonl.

- [ ] `pnpm --filter @silent-build/harvester run harvest -- --project output/drupal-test`
      **expected:** `output/drupal-test/timeline.json` aktualizuje `mtime`, sensowne liczby (promptsCount, toolCallsCount)
- [ ] `pnpm render:dashboard -- --project output/drupal-test --start-frame 480 --max-frames 60`
      **expected:** `output/drupal-test/dashboard_frames/element-*.png` ~60 plików, nowe
- [ ] Otwórz w image viewerze np. `element-510.png`
      **expected:** dashboard NASA theme, amber akcenty, brak regresji vs to co było w main

Jeśli wygląda jak wcześniej — **zielone**. Jeśli coś zniknęło / kolor inny / crash — zgłoś.

---

## Scenariusz B — Live smoke (bez OBS, tylko curl)

Sprawdza, że live-server poprawnie streamuje snapshot / delta / trigger przez SSE. Nic wizualnego — czysto stos danych.

- [ ] `bash scripts/smoke-live.sh`
      **expected:** na końcu `[smoke] OK — snapshot + delta + trigger arrived`, exit code 0

Jeśli padnie — problem w `live-server` (watcher / SSE / trigger endpoint). Nie idziemy do C.

---

## Scenariusz C — Live visual bez OBS (browser only, 3 zakładki)

Szybki wizualny sanity-check: dashboard + overlay + control panel w samym przeglądarce.

Terminal 1 (trzymaj otwarty):
```bash
pnpm live:build
pnpm live:server --project-root /tmp/fake-live --project-name DemoStream --port 3343
```
**expected output:**
```
Dashboard: http://127.0.0.1:3343/dashboard/
Overlay:   http://127.0.0.1:3343/overlay/
Control:   http://127.0.0.1:3343/control/
```

Otwórz w browserze 3 zakładki:

- [ ] `http://127.0.0.1:3343/dashboard/`
      **expected:** dashboard widoczny, `SESSION TIME 00:00:00`, `— awaiting first prompt —`, wszystko zero
- [ ] `http://127.0.0.1:3343/overlay/`
      **expected:** pełny ekran **zielony** (`#00ff00`) — to jest OK, to jest greenscreen do chromakey
- [ ] `http://127.0.0.1:3343/control/`
      **expected:** panel z przyciskami: `Intro`, `Phase 2/3/4`, `Outro`

Test interakcji (na zakładce /overlay/):

- [ ] Klik `Intro` w control → w /overlay/ pojawia się `MISSION: DemoStream` z listą status + countdown, po ~4s wraca zielony
- [ ] Klik `Phase 2` → `PHASE 2 / 4 · BACKEND`, ~2.5s, wraca zielony
- [ ] Klik `Outro` → `MISSION COMPLETE DemoStream`, metryki zerowe (bo brak realnej sesji), ~7s, wraca zielony

Jeśli overlay jest czarny zamiast zielonego = commit greenscreen fix brakuje.

---

## Scenariusz D — Live w OBS (pełny widok live)

Po przejściu C, podłączenie do OBS. Cel: widzisz to co widzowie zobaczą.

Terminal 1: (zostaje jak w C)

OBS Studio:

- [ ] **Settings → Video**: Base/Output `1920x1080`, FPS `60`
- [ ] Nowa scena `silent-stream`

Dodaj 3 sources (top → bottom w liście = z tyłu → przód na ekranie):

| # | Source | Typ | URL / cel | Pozycja | Rozmiar |
|---|---|---|---|---|---|
| 1 | `code` | Window Capture | Twój terminal (np. `claude`) lub VS Code | (0, 0) | 1344×1080 |
| 2 | `dashboard` | Browser Source | `http://127.0.0.1:3343/dashboard/` | (1344, 0) | 576×1080 |
| 3 | `overlay` | Browser Source | `http://127.0.0.1:3343/overlay/` | (0, 0) | 1920×1080 |

Na `overlay` dodaj filter:

- [ ] Right-click na `overlay` source → Filters → Effect Filters → + **Chroma Key**
      Key Color Type: **Green**
      **expected:** zielone tło znika, overlay jest przezroczysty kiedy brak triggera

- [ ] W panelu OBS uruchom **Preview** (nie musi być nagrywanie)
      **expected:** widać terminal/edytor po lewej 70%, dashboard z prawej 30%, overlay niewidoczny

Test interakcji (z zakładki `/control/`):

- [ ] Klik `Intro` → na preview pokazuje się overlay z mission briefingiem over twojego terminala
- [ ] Klik `Phase 2` → takeover "BACKEND"
- [ ] Klik `Outro` → mission complete

Jeśli overlay pokazuje się z zielonym tłem — Chroma Key filter nie jest na `overlay` source.

---

## Scenariusz E — Live z realną sesją Claude Code (end-to-end)

Pełny flow: Claude Code pracuje w projekcie, markery automatycznie wystrzeliwują overlay, dashboard pokazuje real-time metryki.

Terminal 1: live-server wskazujący na realny projekt:
```bash
pnpm live:server \
  --project-root /home/bartek/video-projects/silent-build \
  --project-name LiveSilentBuild \
  --port 3343
```

- [ ] Dashboard/overlay/control jak w D + OBS preview włączone

Terminal 2:
```bash
cd /home/bartek/video-projects/silent-build
claude
```

W czacie Claude:
- [ ] `/mark intro --live`
      **expected:** w OBS pojawia się intro, w dashboard `SESSION TIME` zaczyna lecieć
- [ ] Poproś Claude o coś prostego: *"zobacz plik package.json i powiedz mi jakie są skrypty"*
      **expected w dashboard:** `CURRENT PROMPT` zaktualizowany, `TOKENS` rośnie, w `ACTIVITY LOG` dopływa `Read`
- [ ] Kolejna prosta prośba: *"edytuj README.md i dodaj komentarz w linii 1"*
      **expected:** `FILES · 0 written → 1 written`, activity log dodaje `Edit`
- [ ] `/mark phase BACKEND --live`
      **expected w OBS:** `PHASE 2 / 4 · BACKEND` takeover
- [ ] Poczekaj aż zakończysz serię tool callów, potem `/mark outro --live`
      **expected:** `MISSION COMPLETE`, realne metryki (total time, tokens, files, prompts, tool calls)

Jeśli to zielone — live działa end-to-end.

---

## Po wszystkim

Jeśli A–E zielone:
- [ ] `git add packages/live-dashboard/overlay.html`
- [ ] `git commit -m "fix(live): use green chromakey bg for OBS Color Key filter"`
- [ ] `git push origin feat/live-stream`
- [ ] Merge: `gh pr create` (preferowany, review friendly) albo `git checkout main && git merge --no-ff feat/live-stream && git push`

Przed merge podpowiem którą wybrać.

---

## Troubleshooting

| Symptom | Prawdopodobna przyczyna | Fix |
|---|---|---|
| `pnpm live:server` — port in use | poprzednia instancja trzyma port | `lsof -i :3343` → `kill <pid>` |
| Dashboard pusty, zero eventów | live-server nie znalazł jsonl | sprawdź `--project-root` — musi być katalogiem w którym Claude Code trzyma sesje |
| Overlay w OBS biały zamiast przezroczysty | overlay.html nie ma greenscreen bg | zacommituj `packages/live-dashboard/overlay.html` (tło `#00ff00`) i rebuild: `pnpm live:build` |
| Overlay zielony w OBS (nie znika) | Chroma Key filter nie jest dodany | Filters na `overlay` source → Chroma Key → Green |
| `/mark … --live` nic nie robi | markers → live-server POST nie trafia | sprawdź że live-server słucha na tym samym porcie co markers domyślnie `3343` |
| SSE rozłącza się po ~30s | brak keepalive ping albo proxy | dashboard autoreconnectuje (exponential backoff) — zignoruj, jeśli odłącza na dłużej to bug |
