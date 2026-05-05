# OBS Studio setup for silent-build live stream

Gotowy zestaw scen i źródeł w OBS Studio, który pokazuje obok siebie kod (lewa) + live dashboard (prawa) + overlay pełnoekranowy na intro/outro/phase transitions.

## Wymagania

- OBS Studio 30+
- `silent-build` zainstalowane lokalnie; `pnpm live:build && pnpm live:server` uruchomione
- Domyślny port: `3333` (można zmienić przez `--port`)

## Krok 1. Uruchom live-server

W terminalu (w katalogu projektu):

```bash
# jednorazowa produkcyjna budowa dashboard/overlay/control
pnpm live:build

# start serwera (trzymaj terminal otwarty podczas streamu)
pnpm live:server \
  --project-root /home/bartek/ścieżka/do/projektu-w-którym-pracujesz \
  --project-name FocusFeed
```

Serwer wyświetli URL-e:
```
Dashboard: http://127.0.0.1:3333/dashboard/
Overlay:   http://127.0.0.1:3333/overlay/
Control:   http://127.0.0.1:3333/control/
SSE:       http://127.0.0.1:3333/events
```

## Krok 2. Utwórz scenę w OBS

**Settings → Video:** Base/Output resolution `1920x1080`, FPS `60` (lub `30` dla słabszego sprzętu).

**Scena "silent-stream":**

| Źródło | Typ | Pozycja | Rozmiar | Uwagi |
|---|---|---|---|---|
| `code-capture` | Display Capture / Window Capture (terminal / edytor) | (0, 0) | `1344x1080` | Lewa 70% |
| `live-dashboard` | **Browser Source** | (1344, 0) | `576x1080` | URL `http://127.0.0.1:3333/dashboard/`, Custom CSS `body{margin:0;background:transparent}`, "Shutdown source when not visible" → **odznacz** |
| `overlay` | **Browser Source** | (0, 0) | `1920x1080` | URL `http://127.0.0.1:3333/overlay/`, Custom CSS j.w., sortuj ten layer jako górny |
| `webcam` (opcjonalnie) | Video Capture Device | (0, 780) | `400x300` lub `640x480` | Corner picture-in-picture |

Uwaga: Browser Source w OBS to Chromium embed, który obsługuje Server-Sent Events natywnie (jak każdy nowoczesny browser).

## Krok 3. Rozplanuj layout (rekomendacja)

```
+----------------------------------+----------+
|                                  |          |
|                                  |          |
|    code-capture 1344x1080        |  live-   |
|    (Twój terminal / edytor)      |  dash-   |
|                                  |  board   |
|                                  |  576     |
|  [webcam P-i-P 400x300]          |  x       |
|                                  |  1080    |
|                                  |          |
|                                  |          |
+----------------------------------+----------+

Overlay (transparent, na górze) pojawia się tylko na
triggery: Intro (4s), PhaseTransition (2.5s), Outro (7s).
```

## Krok 4. Hotkeye

Dwie ścieżki triggerów — wybierz którą wolisz:

### (a) OBS global hotkeys + curl

**Settings → Hotkeys** — do każdej akcji dodaj custom `Run command`:

Linux (wymaga `curl`):

```bash
# F7 — Intro
curl -X POST http://127.0.0.1:3333/api/trigger/intro

# F8 — Phase 2 (Backend)
curl -X POST "http://127.0.0.1:3333/api/trigger/phase?n=2"

# F9 — Phase 3 (Frontend)
curl -X POST "http://127.0.0.1:3333/api/trigger/phase?n=3"

# F10 — Phase 4 (Security)
curl -X POST "http://127.0.0.1:3333/api/trigger/phase?n=4"

# F12 — Outro
curl -X POST http://127.0.0.1:3333/api/trigger/outro

# Esc — Clear
curl -X POST http://127.0.0.1:3333/api/trigger/clear
```

Windows PowerShell analogicznie: `Invoke-WebRequest -Method POST -Uri ...`.

### (b) Control panel w przeglądarce

Otwórz `http://127.0.0.1:3333/control/` w osobnym oknie (nie w OBS — w Firefoxie / Chromie na drugim monitorze).

Przyciski: Intro, Phase 1-4, Outro, Clear. Hotkeye w oknie: `I`, `1-4`, `O`, `Esc`.

Plus — markery CLI automatycznie strzelają overlay, jeśli odpalisz je z flagą `--live`:

```bash
# na początku streamu
pnpm mark project-start --name FocusFeed --live
# podczas streamu
pnpm mark backend-start --live
pnpm mark frontend-start --live
pnpm mark security-start --live
```

Każdy marker: (1) zapisuje się do `manual_markers.json` dla późniejszej VOD konwersji w silent-build pipeline, (2) POST na `/api/trigger/*` → flash odpowiedniego overlay w streamie.

## Krok 5. Smoke test przed golive

Zanim klikniesz "Start Streaming" w OBS:

1. Dashboard po prawej pokazuje `Awaiting first event…` lub dane z bieżącej sesji CC
2. Otwórz `http://127.0.0.1:3333/control/` → kliknij "Intro" → zobacz overlay 4s w preview OBS
3. Kliknij "Phase 2" → overlay "BACKEND" 2.5s
4. Kliknij "Clear" — overlay znika
5. Wszystko OK? Go live.

## Troubleshooting

- **Dashboard pokazuje `Connecting to live-server…`** — live-server nie nasłuchuje lub inny port. Sprawdź terminalu, `curl http://127.0.0.1:3333/api/health`
- **Browser Source jest czarny** — sprawdź Custom CSS `body{background:transparent}` oraz "Shutdown source when not visible" powinno być odznaczone
- **Overlay nie znika po animacji** — auto-clear po naturalnym czasie (4s/7s/2.5s); jeśli zatrzymało się, kliknij "Clear" w control panelu
- **Jsonl nie jest aktualizowany** — sprawdź jsonlPath w logu live-server; jeśli projekt to `/home/user/foo`, slug = `-home-user-foo`
- **Redactor blokuje za dużo** — zmień `silent-build.live.json` lub uruchom z flagą `--no-redactor` (UWAGA: może wyciekać API keys)

## Streamowanie na Twitch/YT

OBS sam wysyła video. Nic od strony silent-build nie jest potrzebne — my tylko dostarczamy źródła wizualne.

- **Twitch:** Settings → Stream → Service: Twitch, Stream Key z dashboard.twitch.tv
- **YouTube Live:** Settings → Stream → Service: YouTube, Stream Key z studio.youtube.com

Bitrate 4500-6000 kbps dla 1080p60, audio 160kbps. Encoder: NVENC jeśli masz NVIDIA GPU, x264 jako fallback.
