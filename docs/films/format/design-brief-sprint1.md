# Claude Design brief — Sprint 1 compositions

**Scope:** wizualny redesign 2 nowych Remotion compositions: `StatsPunchIn` (mid-film stats overlay 2 s) + `ChapterLowerThird` (chapter chip 3 s). Bartek wkleja ten brief do Claude Design + screenshot current state, dostaje propozycję React/Tailwind/CSS, adaptujemy ręcznie do Remotion (tokens + interpolate).

**Status:** funkcjonalna wersja działa (smoke renders w `/tmp/sprint1-smoke/`), wymagana wizualna iteracja.

## 1. Project context

`silent-build` to YouTube channel pokazujący jak budować apki z Claude Code. Każdy film 7-9 min, side-by-side layout: lewa = real OBS recording terminala, prawa = animowany dashboard z metrykami. Format: NASA mission-control aesthetics — calm authority, mission-precise data display, amber-on-black telemetry.

W każdym filmie jest **6 faz** (Concept → Plan → Build → Design → Audit → Release). Te 2 compositions to **B-roll'owe wstawki** wkomponowywane w Premiere między fazami:
- **StatsPunchIn** — 2 s pełnoekranowy "co się stało w tej fazie" — pokazuje 3-4 deltę-metryki (+47 plików, +1.2k tokens, +5 commitów, +$0.18). Wkomponowywane na granicy każdej fazy (4-5× per film).
- **ChapterLowerThird** — 3 s mały chip w prawym dolnym rogu wyświetlający "0N/06 NAZWA_FAZY". Pojawia się na początku każdej fazy jako overlay nad dashboardem (nie pełen ekran). 6× per film.

Kanał celuje w polski-language angle, ale brand visual language = international tech. Film ma być spójny stylistycznie z istniejącym dashboardem (`packages/ui/src/Dashboard.tsx`) i innymi compositions (ProjectIntro, StatsCard, PhaseTransition).

## 2. Brand keywords

`silent-build, mission-control, telemetry, dark-mode, precise, monospace, amber-on-black, calm-authority, motion-precision, nasa-aerospace, hud-aesthetic, hard-edged, no-decoration`

## 3. Design system (already established)

### Palette (V1 "Deep Space")

Surfaces:
- `bg: #05070a` (deepest background)
- `panel: #0d1117` (raised surface)
- `panelRaised: #111823` (hover/nested)
- `grid: #131a24` (dividers, subtle grid)

Text:
- `textPrimary: #d8e1ec`
- `textDim: #7a8699`
- `textMuted: #4a5667`

Amber ramp (primary brand):
- `amber: #ffb347` (primary accent)
- `amberBright: #ffd27d` (hover/pulse peak)
- `amberDim: #8a5e25` (subdued)
- `amberGlow: rgba(255, 179, 71, 0.18)` (diffuse halo)

Status:
- `greenOk: #5ae38a` (success)
- `redAlert: #ff5a5a` (danger)
- `cyanData: #6fd3ff` (data accent — używaj sparingly)

### Typography

- **Heading font:** `Space Grotesk` (cwsfix: 'Inter', system-ui)
- **Mono font:** `JetBrains Mono` (fallback: 'IBM Plex Mono', 'Menlo')
- **Hierarchy:**
  - H1: 48 / 700 / lh 1.0
  - H2: 28 / 600
  - Label: 11 / 500 / 0.12em uppercase
  - Body: 13 / 400 / lh 1.5
  - Data: 16 / 500 (tabular-nums)
  - Micro: 11 / 400

### Spacing

`xxs: 4 · xs: 8 · sm: 12 · md: 16 · lg: 20 · xl: 24 · xxl: 32`

### Effects

- `pulseKeyframesMs: 1500` (pulse period dla active phase / live dot)
- `scanInsetPx: 12` (grid frame inset)
- `cornerBracketPx: 16` (corner bracket size)
- `safePadPx: 24` (horizontal safe padding)

## 4. Component specs

### 4.1. StatsPunchIn

**Cel:** 2-sekundowy mid-film payoff moment. Konwertuje cichą metrykę w dashboard tickerze na **discrete celebrationy** na granicach faz.

**Wymiary:** 1920×1080 (full-screen takeover dla 2 s, potem cut z powrotem do dashboardu).

**Tło:** opaque `#05070a` (deep space) — to jest takeover, NIE overlay (różnie od ChapterLowerThird).

**Props:**
```ts
interface StatsPunchInProps {
  phaseLabel: string                      // "AFTER BUILD" / "AFTER PLAN"
  metrics: Array<{
    label: string                         // "Tokens" / "Files"
    value: number                         // 47000 / 14
    prefix?: string                       // "+" / "Δ"
    isMoney?: boolean                     // formatuje "$0.84"
  }>                                      // up to 4
}
```

**Animation timing (60 fps, 2 s = 120 frames):**
- 0.0–0.3 s (frames 0–18): header fade-in `▸ AFTER BUILD`
- 0.3–1.0 s (18–60): numbers count-up z 0 do final value (spring easing, tabular-nums)
- 1.0–1.7 s (60–102): hold (peak — to jest screenshot frame)
- 1.7–2.0 s (102–120): wszystko fade-out

**Current state (PNG @ frame 60):** w `/tmp/sprint1-smoke/stats-punchin_frames/element-060.png`

```
[czarny ekran 1920×1080]

                    ▸ AFTER BUILD
              45.0k    14    23    89
              TOKENS  FILES PROMPTS TOOLS
```

**Co działa:**
- Czytelne 4-column grid
- Amber 64px numbers, dim labels
- Spacing OK

**Co warto wzbogacić (ZADANIE dla Claude Design):**
1. **Frame / brackets** — corner brackets w 4 rogach screen'a (NASA HUD style), albo subtelny "frame inset 12px" jak grid frame na dashboard'zie.
2. **Phase progress chip** w prawym górnym rogu — "PHASE 3/6 COMPLETE" lub mini-dots `○ ○ ● ○ ○ ○`
3. **Number prefixy** — gdy `prefix: "+"` powinno pokazać `+47.0k` z subtle green glow (greenOk) — to są **delty**, nie cumulative. Zaproponuj design dla deltas vs absolute.
4. **Vertical separator** między metrykami — np. cienka grid line `1px #131a24` z amber glow tip (jak na dashboard)
5. **Micro-data linia** poniżej liczb — typu sparkline lub progress bar dla każdej metryki, pokazując "this phase added vs total"
6. **Pulse / shimmer** na liczbach przy peak hold — żeby nie były statyczne 0.7 s
7. **Subtle scanline / CRT effect** całej kompozycji (opcjonalne, NASA-vintage)

**Inspiracje (tym ma się stylem przypominać):**
- NASA Apollo Mission Control telemetry boards
- Modern flight HUDs (gauges + tabular data)
- Cyberpunk 2077 codex screens (NIE neon — bardziej restrained)
- Linear app stats / Vercel dashboard cards (clean precision)

### 4.2. ChapterLowerThird

**Cel:** 3-sekundowy chip wyświetlający "który rozdział filmu właśnie się zaczyna". Pojawia się na początku każdej fazy jako overlay nad dashboard'em (nie zasłania go, tylko nakłada się w prawym dolnym rogu).

**Wymiary:** 1920×1080 z **transparent background** (alpha channel — yuva444p10le ProRes). Tylko chip jest visible, reszta = przezroczyste.

**Props:**
```ts
interface ChapterLowerThirdProps {
  index: number              // 1..total
  total: number              // typically 6
  label: string              // "BUILD" / "AUDIT"
}
```

**Animation timing (60 fps, 3 s = 180 frames):**
- 0.0–0.3 s (0–18): chip fade-in + slide-up from bottom (translateY 16→0)
- 0.3–0.9 s (18–54): underline draws-in left-to-right (0% → 100% width)
- 0.9–2.3 s (54–138): hold (peak — screenshot frame)
- 2.3–3.0 s (138–180): fade-out

**Current state (PNG @ frame 90):** w `/tmp/sprint1-smoke/chapter-lt_frames/element-090.png`

```
[transparent 1920×1080]
                                                         (puste, transparent)




                                                                                      [3/6  BUILD]
                                                                                      ════════════
```

**Co działa:**
- Transparent bg (composit'ing OK)
- Right-bottom positioning
- Amber underline animation
- Czytelny "3/6 BUILD" chip

**Co warto wzbogacić (ZADANIE dla Claude Design):**
1. **Progress dots** — zamiast tylko "3/6" tekstowo, pokaż 6 kropek/segmentów: `○ ○ ● ○ ○ ○` gdzie `●` to current, lewo od niego = completed, prawo = upcoming
2. **Corner brackets** wokół chipu — `⌐ ¬` jak HUD frame
3. **Backplate** — obecnie `rgba(5,7,10,0.78)` z `backdrop-filter: blur(2px)`. Rozważ:
   - Solid `panel #0d1117` z `border 1px amberDim`
   - Albo dual-frame: outer ghost + inner solid
4. **Phase icon** — mała ikona left of label (concept = ◇, plan = ⌐, build = ⊞, design = ◆, audit = ⊕, release = ▶). Lucide icons OK.
5. **Subtle glow** wokół całego chipu (amberGlow halo)
6. **Animation polish** — underline obecnie linear, może spring? Albo segment-by-segment fill (6 segments dla progress dots)

**Inspiracje:**
- Ableton Live transport bar
- Final Cut Pro chapter markers
- Aerospace HUD waypoint indicators
- Tłem przez subtitle bars w high-end docu (Netflix Rabbit Hole, Apple TV+ Foundation)

## 5. Motion constraints (Remotion specific)

To jest **Remotion**, nie regular React. Wymagania:

- **60 fps** — wszystkie animacje muszą używać `useCurrentFrame()` + `interpolate()` / `spring()`
- **Wallclock NIEMOŻLIWY** — nie ma `setTimeout`, `setInterval`, `requestAnimationFrame`, `Date.now()` for animation timing
- **No Framer Motion** — wszystko inline z Remotion primitives
- **No CSS animations** zależne od browser timing (`@keyframes`, `transition`)
- **No browser APIs** — `window`, `document`, `localStorage`, `fetch` w komponencie ZABRONIONE
- **No `useEffect` for state** — props-only, wszystko derives from current frame

Jeśli Claude Design zwróci kod z Framer Motion / Tailwind / CSS animations — to jest OK jako visual reference, my przepiszemy na Remotion `interpolate`.

## 6. Technical constraints

- **React 18 functional components** (typed z TypeScript strict)
- **Inline styles** preferowane (Remotion nie ma SSR-friendly Tailwind setup w naszym bundle). Acceptujemy też styled-components → konwertujemy ręcznie.
- **Single `.tsx` file** per composition — bez podziału na 5 sub-components, jeden plik 100-200 linii.
- **Props-driven** — żadnych internal state'ów oprócz tych które są derived z frame.
- **Reuse `tokens` z `@silent-build/theme`** — jeśli proponujesz nowe kolory, zaproponuj je jako rozszerzenie palette V1 (np. `tokens.colors.amberDeep` dla nowego accent).

## 7. Reference images / current state

Wkleisz do Claude Design razem z brief'em:

1. `/tmp/sprint1-smoke/stats-punchin_frames/element-060.png` — current StatsPunchIn peak
2. `/tmp/sprint1-smoke/chapter-lt_frames/element-090.png` — current ChapterLowerThird peak
3. (jeśli masz) screenshot dashboardu (`packages/ui/src/Dashboard.tsx` w studio) jako reference dla wider visual language

Plus 2-3 NASA mission-control reference images z Pinterest/Dribbble — search:
- "apollo mission control panel"
- "modern aerospace HUD telemetry"
- "linear app stats card dark"
- "cyberpunk 2077 codex menu"

## 8. Deliverables

Per composition (StatsPunchIn + ChapterLowerThird) chcę:

1. **Wizualny mockup** (single PNG/JPG @ 1920×1080) dla peak hold moment
2. **React/Tailwind code** dla layoutu (możemy adaptować inline styles)
3. **Animation suggestions** w prozie — "header fade-in 0.3s, then numbers spring count-up, peak with subtle pulse, fade out" — my przepiszemy na Remotion `interpolate`/`spring`
4. **2-3 wariante** per composition jeśli możesz — np. dla StatsPunchIn:
   - Variant A: kompaktowy 4-column grid (jak teraz, ale wzbogacony)
   - Variant B: 2×2 grid dla większej czytelności
   - Variant C: vertical stack z większymi numerami

5. **Color/spacing notes** — jeśli proponujesz odejście od tokens (np. nowy accent), uzasadnij

## 9. Out of scope

NIE rób:
- Logo / wordmark (mamy `Logo.tsx` + `Wordmark.tsx`)
- Dashboard widget redesign (osobny scope, Faza 1 NASA redesign w `~/.claude/plans/composed-petting-elephant.md`)
- ProjectIntro / StatsCard / PhaseTransition redesign (osobne briefy)
- Captions / subtitles styling (Premiere robi)
- Music visualization (off-scope)
- Face PiP frame (osobny task, Sprint 4)

## 10. Adaptation flow (po dostarczeniu przez Claude Design)

Bartek zwraca output, ja:
1. Wyciągam wizualne intencje (kolory, spacing, layout, motion)
2. Konwertuję Tailwind/styled → inline styles z `tokens.colors.X` / `tokens.spacing.Y`
3. Konwertuję Framer Motion / CSS animations → Remotion `interpolate(frame, [a,b], [from,to])` z odpowiednimi easings
4. Uruchamiam smoke render — porównuję mockup vs render
5. Iteracja jeśli rozbieżność > 20% wizualnie
6. Commit jako `feat(ui): redesign StatsPunchIn — Claude Design pass 1`

Czas adaptacji per composition: 15-30 min ręcznej konwersji.

## 11. Open questions for designer

Pomocnicze decyzje, które Claude Design może podjąć:
1. Czy progress chip w StatsPunchIn powinien być persistent (cały czas widoczny) czy fade-in razem z liczbami?
2. ChapterLowerThird — czy rozdział numbers powinien być Roman ("III") czy Arabic ("3")? Pinmark NASA = Arabic, ale Roman wygląda bardziej "cinematic".
3. Background opacity dla ChapterLowerThird chip — `rgba(5,7,10,0.78)` (current) vs `solid panel #0d1117` vs `gradient`? Pierwsza wersja z blur backdrop, druga prostsza, trzecia bardziej dramatic.
4. Czy phase icon w ChapterLowerThird ma sens, czy tylko zaśmieca? Audience benchmark: ich attention budget na chip = 3 sekundy, max 4 elementy poznawcze.

---

## Quick checklist dla Bartka przed wklejeniem do Claude Design

- [ ] Wkleić cały ten brief
- [ ] Załączyć screenshot StatsPunchIn current state
- [ ] Załączyć screenshot ChapterLowerThird current state
- [ ] Załączyć 1-2 NASA mission control reference images
- [ ] Sprecyzować deliverable format: "2 mockups @ 1920×1080 + React+Tailwind code per komponent"
- [ ] Po zwróceniu: pokaż mi output, ja adaptuję do Remotion
