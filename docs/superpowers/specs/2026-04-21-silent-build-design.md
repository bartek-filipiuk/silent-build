# Silent Build Pipeline — Design v0.1

**Data:** 2026-04-21
**Status:** Brainstorming zakończony, czeka na user review przed planem implementacji
**Źródło idei:** `ideas/` (3 dokumenty — architektura, plan tematyczny, cele/RPM)

---

## 1. Wizja i cel

Zbudować pipeline do produkcji wiralowych filmów typu "silent coding" — 10-12 minut, bez VO, dark mode, ASMR, z dynamicznym Dashboardem 30% szerokości ekranu pokazującym real-time stan sesji Claude Code (timer, tokeny, prompty, aktywność plików, fazy projektu, security findings).

**Kluczowa zasada:** nagrywamy prawdziwe sesje Claude Code. Pipeline jest **post-processing** (nie live) — harvester pracuje na plikach `.jsonl` po zakończonej sesji. Renderer generuje overlay MOV/PNG, który wklejamy w CapCut razem z nagraniem OBS.

**Formuła produkcji:** autentyczne źródło (real CC session) + reżyserowany montaż (cięcia, tempo, dźwięk w CapCut). Nic nie jest fake, ale nic nie jest też nieobrobione.

## 2. Zakres (MVP = film #1)

### In-scope
- TypeScript monorepo z pnpm workspaces
- Paczki: `harvester` (parser jsonl → timeline.json), `overlay` (Remotion renderer), `markers` (CLI manualnych markerów faz)
- PhaseDetector: 4 stałe fazy jako kontener, elastyczne labele per projekt (hybryda)
- Dashboard widgets Tier 1: Timer, Current Prompt, Token Counter, File Activity, Activity Log, Phase Bar (wszystko z real data `.jsonl`)
- Dashboard widgets Tier 2: Security Panel jako dummy w filmie #1 (hardkodowane findings), real od filmu #2
- Output: 1920x1080@60fps dashboard jako MOV (ProRes 4444, dla Premiere) i PNG sequence (dla CapCut)
- Mock data do testów: bieżąca sesja brainstormingu (`83e8ccb3-4290-4017-acb2-ba76dafd0fac.jsonl`) jako fixture
- Pilot project: FocusFeed (anti-doomscroll PWA z AI-generated micro-lessons)

### Out-of-scope (nie ruszamy w MVP)
- AI Thoughts widget (pominięty, ewentualnie statyczny outro-slide w CapCut)
- TTS / voice-over (czysty silent, decyzja do rewizji po pierwszym filmie jeśli retencja < 45%)
- Live streaming / live telemetria
- Automatyczny montaż / EDL generation (P2, patrz sekcja 12)
- Full composition w Remotion (cały film w jednym silniku)
- Cloud rendering (wszystko lokalnie)

### P2 (po MVP, rewizje)
- Security Skill realna integracja (plik `vulnerabilities.json` → real findings w Dashboardzie)
- Production guide prompt — "wizard" prowadzący przez kolejne kroki per film (sekcja 12.1)
- EDL / XML export do CapCut z sugestiami cięć i przyspieszeń (sekcja 12.2)
- Automatyczny ASMR (dźwięki klawiatury syntezowane z momentów wpisywania promptów)
- Screenshot capture widget dla fazy Claude Design
- Strategic TTS (ElevenLabs, 30-45s w kluczowych momentach)

## 3. Architektura (high-level)

Trzy moduły automatyczne + narzędzie manualne (markers CLI) + zewnętrzny montaż w CapCut.

```
  OBS recording           Claude Code              Manual markers CLI
  screen.mp4              session.jsonl            manual_markers.json
        |                      |                          |
        |              +-------v--------------------------v-------+
        |              |   HARVESTER (TypeScript CLI)              |
        |              |   - parses jsonl + subagent jsonls        |
        |              |   - PhaseDetector (heurystyka + markers)  |
        |              |   - extracts: timer, prompts, tokens,     |
        |              |     files, tool calls                     |
        |              |   - output: session_timeline.json         |
        |              +------------------+------------------------+
        |                                 |
        |                          +------v------------------+
        |                          |  OVERLAY (Remotion)      |
        |                          |  - reads timeline.json   |
        |                          |  - renders dashboard RHS |
        |                          |  - output: MOV + PNG seq |
        |                          +------------+-------------+
        |                                       |
        +---------------------------------------+--> CapCut (manual montaż)
```

Każdy moduł odseparowany. Komunikacja tylko przez pliki JSON (kontrakt opisany w sekcji 6). Można zmienić silnik renderujący bez ruszania harvestera i vice versa.

## 4. Struktura repozytorium

```
silent-build/
  packages/
    harvester/              # TS CLI, parsuje jsonl -> timeline.json
      src/
        parser.ts           # czyta jsonl linia po linii
        phase-detector.ts   # heurystyka + manual markers
        extractor.ts        # timer/tokens/files/prompts/tools
        cli.ts              # `pnpm harvest <session-id>`
      fixtures/
        sample-session.jsonl
      package.json
    overlay/                # Remotion project
      src/
        Root.tsx            # Remotion entry
        Dashboard.tsx       # glowny komponent prawego panelu
        widgets/
          Timer.tsx
          CurrentPrompt.tsx
          TokenCounter.tsx
          FileActivity.tsx
          PhaseBar.tsx
          ActivityLog.tsx
          SecurityPanel.tsx    # dummy w #1, real od #2
        fixtures/           # mock timeline jsons do dev
      remotion.config.ts
    markers/                # CLI `pnpm mark <phase>`
      src/cli.ts
  output/
    <project-name>-<date>/
      timeline.json
      manual_markers.json
      dashboard.mov         # ProRes 4444 (Premiere-friendly)
      dashboard_frames/     # PNG seq (CapCut-friendly)
      screen.mp4            # OBS recording (kopiowany tu po sesji)
  ideas/                    # 3 istniejace dokumenty, zostaja
  docs/
    superpowers/specs/
      2026-04-21-silent-build-design.md  # ten plik
  pnpm-workspace.yaml
  package.json
  tsconfig.json
  .gitignore
```

## 5. Data flow (krok po kroku)

1. **Przed sesją:** `pnpm mark project-start --name "FocusFeed"` — tworzy `output/focusfeed-<date>/manual_markers.json` z project name i start timestamp
2. **OBS:** ręcznie startujesz nagrywanie, plik docelowo ląduje w `output/focusfeed-<date>/screen.mp4`
3. **Claude Code session:** kodujesz normalnie; Claude Code sam loguje do `~/.claude/projects/<slug>/<uuid>.jsonl` (standard, nie wymaga konfiguracji). `<slug>` to absolutna ścieżka projektu ze slashami zamienionymi na myślniki (np. projekt `/home/bartek/video-projects/silent-build` → slug `-home-bartek-video-projects-silent-build`).
4. **W trakcie sesji, na zmianach faz:** `pnpm mark backend-start` / `frontend-start` / `security-start` / `polish-start` (4 komendy przez 2-3h sesji, ~20 sek total)
5. **Po sesji:**
   - `pnpm harvest <session-uuid> --project focusfeed` — czyta jsonl + markers + subagent jsonls, pisze `timeline.json`
   - `pnpm render --project focusfeed` — Remotion generuje `dashboard.mov` i `dashboard_frames/`
6. **Montaż w CapCut:**
   - `screen.mp4` (70% lewa strona)
   - `dashboard_frames/` jako image sequence (30% prawa strona)
   - sync po klatkach, cięcia, tempo, ścieżka audio, thumbnail, tytuł

## 6. Timeline schema (kontrakt harvester <-> overlay)

TypeScript interface:

```typescript
interface SessionTimeline {
  project: {
    name: string
    startTs: number        // ms since epoch
    endTs: number
  }
  phases: Phase[]          // zawsze 4, z hybrid labels
  events: TimelineEvent[]  // posortowane po ts rosnaco
  metrics: {
    totalTokens: number
    filesTouched: number
    promptsCount: number
    toolCallsCount: number
  }
}

interface Phase {
  index: 1 | 2 | 3 | 4
  label: string            // "Architecture" / "Backend" / "Frontend (Claude Design)" / "Security"
  startTs: number
  endTs: number
  source: 'manual-marker' | 'heuristic'  // provenance
}

type TimelineEvent =
  | { ts: number; type: 'prompt'; data: { text: string; tokensIn: number } }
  | { ts: number; type: 'tool_call'; data: { name: string; args: unknown; subagentId?: string } }
  | { ts: number; type: 'file_write'; data: { path: string; linesAdded: number } }
  | { ts: number; type: 'file_edit'; data: { path: string; linesChanged: number } }
  | { ts: number; type: 'tokens_delta'; data: { input: number; output: number } }
  | { ts: number; type: 'security_finding'; data: { severity: string; title: string; fixed: boolean } }
```

To jedyny kontrakt. Harvester i overlay nie wiedzą o sobie nic ponad to schema.

## 7. Dashboard layout

Prawy panel 30% szerokości ekranu (1920x1080 → 576x1080 px). Ciemne tło (`#0a0a0a`) lub alpha channel. Typografia monospace (JetBrains Mono / Fira Code).

```
  +----------------------------------+
  |  [Project: FocusFeed]             |  <- gora, nazwa projektu (staly)
  +----------------------------------+
  |  [timer]  02:14:33                |  <- Timer (Tier 1)
  |                                   |
  |  [prompt icon] Current:           |
  |  "Add swipe feed component..."    |  <- Current Prompt (Tier 1)
  |                                   |
  |  [token icon] 127k / 200k         |
  |  [========        ]               |  <- Token Counter (Tier 1)
  |                                   |
  |  [file icon] 14 written, 8 edited |  <- File Activity (Tier 1)
  |                                   |
  |  +--- ACTIVITY LOG -------------+ |
  |  | 14:22 [write] auth.ts        | |
  |  | 14:22 [read]  db.schema      | |  <- Activity Log (Tier 1)
  |  | 14:23 [test]  running suite  | |
  |  +------------------------------+ |
  |                                   |
  |  +--- SECURITY ----------------+ |
  |  | [o]  Idle (dummy w #1)       | |  <- Security Panel (Tier 2, real od #2)
  |  +------------------------------+ |
  +----------------------------------+
  |  [#######o....] Phase 3/4:        |
  |               Frontend             |  <- PhaseBar (Tier 1, hybrid label)
  +----------------------------------+
```

**AI Thoughts widget wywalony z MVP.** Outro-slide w CapCut (statyczny): nazwa projektu, link do repo, CTA "Subscribe".

## 8. Format finalnego filmu

- **Aspect ratio:** 16:9 (1920x1080)
- **Framerate:** 60fps (smooth dla screen recording)
- **Długość target:** 10-12 min po montażu
- **Lewa strona (70% = 1344px):** OBS screen recording (terminal CC, przeglądarka CD)
- **Prawa strona (30% = 576px):** dashboard PNG sequence / MOV z alpha
- **Dashboard renderowany z alpha channel** (transparent background PNG seq / MOV ProRes 4444). Fallback: jednolite tło `#0a0a0a` jeśli CapCut nie obsłuży alpha — użycie blend mode / chroma key w montażu.
- **Przełącznik 4K** w `remotion.config.ts` (future — jak mamy mocniejszy sprzęt do renderu)

## 9. Error handling (fault tolerance)

- **Malformed jsonl line:** harvester loguje warning do stderr, pomija linię, idzie dalej. Jedna zła linia nie blokuje parsowania całej sesji.
- **Brakujące manual markers:** PhaseDetector dopełnia heurystyką. Jeśli zero markerów i zero wykrytych zmian — fallback 4 fazy w proporcji 30/30/30/10% sesji.
- **Claude Design phase bez `.jsonl`:** akceptowane. Dashboard pokazuje "Frontend — Claude Design in use" (brak eventów, ale timer leci).
- **Render errors w Remotion:** `--continue-on-error` flag. Failed frames zostają czarne/puste (lepsza dziura niż brak filmu).
- **Subagent jsonls:** łączone z głównym timeline, tool calls oznaczone `source: 'subagent'`, renderowane innym kolorem w Activity Log.
- **Brakujący projekt (output folder):** CLI tworzy folder jeśli nie istnieje.

## 10. Testing

- **Fixture:** kopia bieżącej sesji brainstormingu (`/home/bartek/.claude/projects/-home-bartek-video-projects-silent-build/83e8ccb3-4290-4017-acb2-ba76dafd0fac.jsonl`) jako `packages/harvester/fixtures/sample-session.jsonl`
- **Unit tests** (Vitest): parser, PhaseDetector, extractor
- **Snapshot tests:** harvester output `timeline.json` vs expected
- **Remotion Studio:** hot-reload wizualnego dev (`pnpm studio`) na mock timeline
- **E2E:** `pnpm harvest fixtures/sample-session.jsonl && pnpm render --headless` → sprawdzenie że output folder zawiera oczekiwane artefakty

## 11. Pilot project: FocusFeed — scope pierwszej sesji

PWA zastępująca nawyk TikToka/IG Reels 60-sekundowymi AI-generated micro-lessons. User wpisuje topic ("chcę uczyć się python"), otwiera nową kartę = dostaje swipe feed learning reels.

**Stack:** Next.js 15 (App Router), SQLite lokalnie, Anthropic API (Haiku dla lesson generation), localStorage dla history, PWA manifest.

**Podział sesji na 4 fazy (target 2-3h realnej sesji → 10-12 min wideo po montażu):**

| Faza | Label | Czas sesji | Co się dzieje |
|---|---|---|---|
| 1 | Architecture | 15-20 min | Next.js init, SQLite schema (user_prefs, lesson_history), struktura API routes, ENV setup |
| 2 | Backend | 40-60 min | `/api/lessons/next` (Claude Haiku → JSON lesson), `/api/prefs` (save topic), rate limiting, caching |
| 3 | Frontend (Claude Design) | 50-70 min | Claude Design generuje swipe feed UI (TikTok clone, dark mode), podpięcie do API, localStorage history, PWA manifest |
| 4 | Security | 20-30 min | Security Skill scan (dummy w #1), typowe findings: missing rate limit, CORS misconfig, env leak. Fix, final test, outro |

**Tytuł roboczy filmu:** *"I built an AI that replaced my TikTok in 3 hours (silent)"*

**Hook thumbnail:** split screen — po lewej chaos TikTok feed, po prawej czysty Dashboard z timerem `02:47:13` + napis "SILENT".

## 12. Manual vs auto (MVP)

| Krok | Kto | Szacowany czas |
|---|---|---|
| Setup OBS, start recording | Ręcznie | 1 min |
| `pnpm mark project-start` | Ręcznie | 5 sek |
| Sesja Claude Code | Ty + CC | 2-3h |
| `pnpm mark <phase>` x 4 | Ręcznie | 20 sek total |
| Stop OBS | Ręcznie | 5 sek |
| `pnpm harvest` | Automat | < 10 sek |
| `pnpm render` | Automat | 5-15 min (Remotion batch) |
| Import do CapCut, sync, cięcia, tempo, muzyka | Ręcznie | 2-4h |
| Thumbnail, tytuł, upload | Ręcznie | 30 min |

Narzut manualny poza sesją kodowania: ~3-5h (głównie CapCut). Automat po sesji: 5-15 min. 

## 13. Future / P2 — rewizje po MVP

### 13.1 Production guide prompt ("wizard")

Po pierwszym filmie zauważymy które kroki są łatwe do zapomnienia (np. zapomnienie `pnpm mark frontend-start`, zapomnienie przełączenia OBS scene, etc.). Rozwiązanie:

- **CLI typu `pnpm film start`** który prowadzi interaktywnie przez kolejne kroki: "(1/12) Confirm OBS is recording? [y/n]. (2/12) Name the project. (3/12) Start CC session. ..."
- Integracja z markerami — wizard sam woła `pnpm mark <phase>` w odpowiednich momentach
- Per-film checklista zapisywana jako markdown (do description filmu na YT: co zrobione, jakie narzędzia, linki)
- Opcjonalnie: integracja z OBS WebSocket API dla sterowania scenami/źródłami

### 13.2 Auto-cut suggestions (EDL export)

Harvester już ma timeline eventów — łatwo dodać **heurystyki tempa**:
- **Boring range** = długie okresy bez file_write/tool_call → tag `speed: 8x`
- **Interesting range** = gęste tool calls, prompt writing, security finding → tag `speed: 1x`
- **Key moment** = security_finding z `severity: critical` → tag `hold + zoom`

Output: plik `cuts.edl` lub `cuts.xml` (FCP7 XML — CapCut i DaVinci obsługują), importowalny do CapCut jako bazowa rough cut. User dopieszcza ręcznie. Cel: skrócić manualny montaż z 2-4h do 30-60 min.

### 13.3 Security Skill realna integracja

MVP ma dummy. Od filmu #2 harvester łapie `vulnerabilities.json` z security skilla i generuje real `security_finding` events. Dashboard animuje real findings (czerwony → zielony po fix).

### 13.4 ASMR audio generation

Harvester zna timestampy prompt inputów — generator audio syntezuje dźwięki klawiatury (biblioteka sample'i) zsynchronizowane z tymi timestampami. Output: osobny `asmr.wav` do ścieżki audio w CapCut. Redukuje czas szukania ASMR stock music.

### 13.5 Strategic TTS

Rewizja jeśli retencja < 45% po 3-5 filmach. ElevenLabs, 30-45s VO w kluczowych momentach (hook 8s, phase transitions 3x3s, security moment 8s, outro 12s). Osobna paczka `packages/vo` — non-blocking dla pipeline.

## 14. Decyzje odrzucone (i dlaczego)

Dla kontekstu — co było rozważane i czemu nie w MVP:

- **Live pipeline** (harvester słuchający jsonl na żywo): zbyt kruche, OBS + CC + harvester + render = race conditions, ryzyko straty 3h nagrania. Post-processing daje spokój i pełną kontrolę.
- **Full composition w Remotion** (cały film w jednym silniku): 3 miesiące pracy upfront zanim zrobimy pierwszy film. Zła kolejność. Ewentualnie P2 po ustabilizowaniu pipeline'u.
- **Python + Pillow** dla overlayu: gorszy DX, mniej ładne animacje, mniejsza społeczność niż Remotion. Wybór w Remotion = zero learning curve (user ma skill).
- **Elastyczny, tagowany timeline** (fazy wykrywane tylko z treści sesji): mniej powtarzalne, widzowie nie uczą się rytmu. Hybryda (sztywny kontener, elastyczne labele) daje brand + flexibility.
- **AI Thoughts widget** (z thinking blocks albo LLM parafrazą): user decyzja — outro slide w CapCut wystarcza, lessons learned pokazujemy statycznie.
- **TTS w MVP**: zrywa "silent" USP. Rewizja po danych.
- **Live streaming**: inna bajka, inna widownia, poza scope.

## 15. Otwarte pytania / ryzyka

- **Kształt `.jsonl` Claude Code** — potwierdziliśmy że pliki istnieją (`~/.claude/projects/<slug>/<uuid>.jsonl`) ale dokładna struktura eventów musi być zweryfikowana przed implementacją harvestera. Plan: w pierwszym kroku implementacji zrobić explorację fixture file i opisać shape w `packages/harvester/docs/jsonl-format.md`.
- **Claude Design output** — czy narzędzie ma jakikolwiek eksport danych (screenshots, kod) czy tylko web UI? Fallback: manualny screenshot hotkey (P2).
- **CapCut na Windowsie i ProRes 4444** — nie testowane. PNG sequence jako fallback, jeśli MOV nie łyka.
- **Claude Code rate limits / costs** dla 8 sesji/miesiąc po 2-3h każda — realistycznie wycenić miesięczny koszt tokenów (nie blocker, ale do kalkulacji biznesowej).

---

## Changelog

- **2026-04-21:** wersja 0.1, brainstorming zakończony, czeka na user review przed planem implementacji.
