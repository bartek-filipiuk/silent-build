# Live Coding Stream — wykorzystanie silent-build do formatu live z gadaniem

**Data notatki:** 2026-04-23
**Status:** Idea na przyszłość, poza aktualnym scope MVP silent-build
**Kontekst:** Podczas pracy nad visual redesignem (Phase 2.x) pojawiło się pytanie czy można recyklingować stack silent-build do kompletnie innego formatu — live streaming coding z komentarzem (Twitch / YouTube Live), gdzie autor mówi, czat zadaje pytania, Claude Code pracuje w tle.

## TL;DR

**Tak, ~80% stacku przenosi się bez zmian.** Silent-build zbudowany jest na czystych React components + Remotion composition layer. Komponenty widgetów są agnostyczne — równie dobrze renderują się w Remotion bundlerze (do PNG seq dla VOD) jak i w przeglądarce (jako live overlay w OBS Browser Source).

Żeby obsłużyć live, dorabiamy **cienką warstwę real-time** (server + WebSocket + browser app) na górze. Koszt ~1-2 dni pracy developerskiej, zakładając że silent-build MVP już istnieje.

## Co się przenosi 1:1

| Element | Jak użyć w live mode |
|---|---|
| `packages/shared/src/types.ts` | `SessionTimeline` schema identyczna; live server publikuje rosnący timeline zamiast zamkniętego JSON |
| Dashboard widgety (7 sztuk) | Pure React components — po prostu import i render w Next.js/Vite |
| `tokens.ts`, `fonts.ts` | Bez zmian |
| `Logo.tsx`, `Wordmark.tsx` | Bez zmian (już są presentational, nie używają Remotion hooks) |
| `IntroCard`, `OutroCard`, `PhaseTransition` | Jako **triggerable overlays** — pokazywane hotkeyem nad głównym layoutem (np. "PHASE 2 BACKEND" flashuje 2.5s kiedy naciskasz F7) |
| `Thumbnail.tsx` | Generator okładek VOD na YT po zakończonym streamie |
| `@silent-build/markers` CLI | **Bardziej użyteczne niż w silent-build** — każdy `pnpm mark <phase>` staje się trigger event dla overlay: marker → flash PhaseTransition, natychmiast |
| `@silent-build/harvester` | Zamiast jednorazowego batch parse, konwertuje się na tail-based stream (czyta nowe linie `.jsonl` na bieżąco) |

## Co trzeba dobudować (nowe komponenty)

### 1. Live server (Node) — nowa paczka `@silent-build/live-server`
- `chokidar` file watcher na `~/.claude/projects/<slug>/<session-uuid>.jsonl`
- Po każdej dopisanej linii: parsuje i dorzuca do in-memory `SessionTimeline`
- WebSocket (ws) lub Server-Sent Events broadcast do wszystkich podpiętych klientów
- Dodatkowy endpoint `/api/trigger-overlay` — do wysłania command z CLI (np. "pokaż PhaseTransition")

### 2. Browser dashboard app — nowa paczka `@silent-build/live-dashboard`
- Next.js albo Vite + React
- Łączy się z WebSocket, dostaje timeline na bieżąco
- Renderuje `Dashboard` component (ten sam co Remotion!) — tylko bindowanie do danych inne
- Obsługuje overlay triggers — kiedy serwer wysyła "show-intro", komponent na 4s pojawia się full-screen z `IntroCard`
- Layout dopasowany do live (nie 30% panel, tylko lower-third albo corner widget — zostawić miejsce na kamerkę)

### 3. OBS integration
- **Browser Source** w OBS wskazuje na `http://localhost:3000/overlay`
- Tło transparent (CSS `background: transparent`), żeby overlay leciało nad screen capture
- Opcjonalnie: Scene switching triggered przez markers via OBS WebSocket plugin

### 4. Markery jako scene triggers
- Rozszerzyć `@silent-build/markers` CLI: po zapisie markera `backend-start`, wysyła POST do live-servera → broadcast `trigger: PhaseTransition(2, Backend)` do wszystkich klientów
- Dzięki temu zachowujemy ten sam interfejs (`pnpm mark backend-start`) ale z różnym efektem:
  - W silent-build: marker zapisany, używany post-factum w renderze
  - W live: marker + natychmiastowa animacja overlay na streamie

## Różnice formatu vs silent-build

| Aspekt | silent-build | live-stream |
|---|---|---|
| **Komunikacja** | Zero VO, dashboard opowiada | Autor gada, czat reaguje |
| **USP** | "Watch AI build in silence" | "Build WITH AI live" |
| **Pacing** | Skompresowane 2-4h sesji do 10-12 min | 2-4h real-time, brak cięć |
| **Dashboard waga** | 30% panel dominuje (bez narracji głosowej) | Lower-third / corner widget — cisza wypełniona gadaniem, dashboard dokleja kontekst |
| **Retention hook** | Thumbnail + tempo montażu | Persona, czat, spontaniczne reakcje na Claude |
| **Monetyzacja** | YT Ads + affiliate | Subs/donations (Twitch), superchats (YT), plus VOD ads |
| **Replay value** | Wysoki (skondensowany content) | Niski (2-4h raw) — stąd potrzeba VOD edits / highlights |

## Content strategy — jak to łączyć z silent-build

Wizja **hybrid pipeline** (najbardziej efficient z biznesowej perspektywy):

1. **Live stream (Twitch/YT Live)** — nagrywa real-time z komentarzem, buduje community, daje superchats/donations jako real-time revenue
2. **VOD zostaje na streaming platform** — dla widzów którzy chcą pełną wersję
3. **Highlights 10-12 min z live streamu** → przepuszczamy przez silent-build pipeline jako post-process → publikujemy na YT w formacie silent coding (bez VO z live, overlay z silent-build jako narracja)

Jeden content → dwie platformy → dwa revenue streams.

**Technical implications:**
- Rozszerzyć harvester żeby umiał parsować nie tylko `.jsonl` ale też OBS recording timestamps (synchronizacja overlay z screen capture)
- `scripts/stream-to-vod.sh` — skrypt który bierze Twitch VOD + `session-timeline.json` z live-servera + overlay MP4 i składa YT highlight w pół-automatu

## Ryzyka i open questions

- **Live bundle size** — Remotion bundler robi kilkusekundowy bundle. W live mode (browser) bundle musi być instant, a niektóre Remotion hooks (`useCurrentFrame`, `useVideoConfig`) zachowują się inaczej bez kontekstu composition. Części widgetów trzeba refaktorować żeby nie zależały od Remotion runtime (tylko React + tokens).
- **Performance w długim streamie** — 4h stream = ~10k events w SessionTimeline. Dashboard trzyma wszystko w pamięci jako array events? Czy przycinamy sliding window (ostatnie N minut)?
- **Privacy** — live stream `.jsonl` zawiera pełne prompty. Czy jakieś sekrety leak'ują na stream? Potrzeba **redactor** (jeszcze jeden module), który przed broadcast filtruje PII / API keys z promptów.
- **Scene continuity** — markery flashują PhaseTransition overlay, ale jak długo? 2.5s jak w silent-build czy krócej (1s) bo live musi być mniej inwazyjny?

## Checklist "jak się za to zabrać"

Gdy wrócimy do tematu, krok po kroku:

- [ ] Brainstorm session: czy live-stream ma być zamiast silent-build, obok, czy jako hybrid (wideo 3 wyżej)
- [ ] Refaktor Dashboard żeby nie zależał od Remotion runtime (wyodrębnić `useCurrentFrame` na osobną warstwę data-binding) — prep dla reuse w Next.js/Vite
- [ ] Stworzyć `packages/live-server` z chokidar + ws
- [ ] Stworzyć `packages/live-dashboard` (Next.js albo Vite)
- [ ] OBS Browser Source POC — podpiąć, test 5 minut live
- [ ] Rozszerzyć markers CLI o POST do live-server
- [ ] Test: 30-minutowy mini stream z real Claude session + overlay
- [ ] Content strategy: pierwszy test live na Twitchu, nagranie VOD, konwersja do YT highlight

## Koszt alternatywnie

Jeśli tylko chcemy stream bez reuse silent-build (greenfield):
- Gotowe narzędzia typu Streamlabs, OBS scenes, plain HTML overlays — możliwe w kilka godzin
- Ale tracimy spójność brand (NASA mission control) i bogactwo dashboardu

Reuse silent-build daje **unikalny visual brand** którego konkurencja nie ma — taki Dashboard na żywo na coding streamie byłby natychmiast rozpoznawalny.

---

## Notatka — inspiration points

- Theo (t3.gg) już robi coding streams — można podebrać UX insights
- Primeagen — vim coding stream, fajny vibe ale bez formalnego brandingu
- Nasz edge: **mission control vibe + realny Claude Code pod spodem + technicznie ambitne projekty** (FocusFeed etc.)

## Related files w projekcie

- Spec silent-build: `docs/superpowers/specs/2026-04-21-silent-build-design.md`
- Plan redesign: `docs/superpowers/plans/2026-04-21-silent-build-pipeline-mvp.md`
- Design brief: `docs/design-brief.md`
- Ten dokument: `ideas/Live Coding Stream...md`

Kiedy wrócimy do tematu, warto przerobić to na formalną spec + plan analogicznie jak dla silent-build MVP.
