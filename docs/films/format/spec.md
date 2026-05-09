# Specyfikacja formatu filmu silent-build

**Status:** żywy dokument — aktualizuj po każdej publikacji
**Data:** 2026-05-08 (utworzony) / 2026-05-09 (polonizacja)
**Cel:** uniwersalny przepis na film "watch me build with AI". Co MUSI być, kiedy łamać format, dlaczego konkretne wybory.

Ten dokument NIE jest ani specyfikacją pipeline'u (`docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md`), ani planem produkcji konkretnego filmu (`docs/films/<slug>/production-plan.md`). To **per-film checklista formatu** — bierzesz każdorazowo, walidujesz że masz wszystkie elementy, podejmujesz decyzje wg sekcji 7.

## 0. Filozofia formatu (TL;DR)

YouTube w 2026 nagradza **widoczne ludzkie autorstwo** (twarz, głos, błędy, decyzje) i karze AI-slop (mass-produced, faceless, no-stakes). Cały format silent-build celowo gra w przeciwną stronę niż dominujący nurt vibecodingu — pokazujemy nie tylko "AI zrobiło", ale **"AI zrobiło, ja zauważyłem co poszło nie tak, naprawiłem, audytowałem, wdrożyłem"**. Panel audytu + widoczna ludzka decyzja to differentiator.

7 zasad-pryncypiów (źródła: Retention Rabbit, AIR Media-Tech, SocialRails 2026 benchmarks):

1. **Hook wizualny w pierwszych 5 sekundach** — payoff first, journey second (broken-promise reveal). Bez logo intro, bez "hej kochani".
2. **Promise w 5–15 s** — konkretne zdanie: co + w ile + jakim narzędziem.
3. **Pattern interrupt co 60–90 s** — pane z fokusem musi się zmieniać, nie tylko dashboard tickać.
4. **Rozdziały widoczne** — konwencja 6 stage'y wystawiona jako progress bar / lower-third (~40 % wzrost watch-time).
5. **Stakes raise w 2:30–3:00** — to udokumentowany churn cliff w tutorialach. Tu odpalamy AI-mistake beat lub niespodziewany reveal.
6. **Talking head min. 4–6 cut-inów** — parasocjalność > czysty screencast. To **największy gap** obecnego pipeline'u.
7. **Konkretne demo na końcu** — działający artefakt, URL na ekranie, prawdziwa interakcja. Bez "dzięki za oglądanie".

## 1. Spec formatu — cel 7 minut

Łączny czas: 8:30–9:30 (2 mid-rolle wymagają ≥8:00). Krótszy 7:00 dla speed-runów (1 mid-roll).

| Segment | Czas | Composition | Muzyka | Visual variety device |
|---|---|---|---|---|
| Hook (face #1 + visual reveal) | 0:00–0:08 | face cam + flash gotowego produktu | brak → intro-chill fade-in | full-screen face |
| Promise (overlay) | 0:08–0:15 | text overlay na face | intro-chill | text reveal |
| ProjectIntro composition | 0:15–0:25 | `ProjectIntro` (10 s, brand reveal) | intro-chill peak | full-screen 1920×1080 |
| **Faza 1 — Concept** | 0:25–1:15 | dashboard + terminal + 1× PhaseTransition | intro-chill bed | StatsCard punch-in @ koniec |
| **Faza 2 — Plan** | 1:15–2:30 | dashboard + terminal + 1× CodeZoom | crossfade chill→hustle | architecture diagram zoom-out (NEW) |
| **Faza 3 — Build (najdłuższa)** | 2:30–5:00 | dashboard + terminal + 2× CommitCard + 1× CodeZoom + face inset | build-hustle bed | **AI-mistake beat @ 2:45–3:00** (mute muzyki, ~8 s ciszy) |
| Mid-roll natural pause #1 | ~3:30–4:00 | granica sceny | hard cut | StatsCard punch-in 2 s |
| **Faza 4 — Design** | 5:00–5:45 | demo split-screen Claude Design output → apply do repo | build-hustle continues | before/after split |
| **Faza 5 — Audit** | 5:45–6:30 | dashboard + terminal + face inset (recovery beat) | build-hustle | red→green security panel transition |
| **Faza 6 — Release/Climax** | 6:30–7:00 | dashboard + terminal + final commit + `git tag` + `gh release` | climax-drop (~10 s drop) | full-screen "RELEASED v0.1.0" overlay |
| Mid-roll natural pause #2 | ~6:30–7:00 | granica sceny | climax tail | — |
| Demo screencast | 7:00–8:30 | OBS demo na live URL / localhost | outro-celebratory | prawdziwa interakcja |
| StatsCard | 8:30–8:35 | `StatsCard` 5 s | outro-celebratory | numbers count-up |
| Face #2 (outro) | 8:35–8:50 | face cam + CTA | outro-celebratory | direct address |
| Subscribe overlay + tail | 8:50–9:00 | end-screen | outro-celebratory tail | YT default |

## 2. Specyfikacja per-segment

### 2.1. Hook (0:00–0:08) — krytyczne

**Co:** pattern-interrupt visual + 1-zdaniowa premise.

**Format (rekomendowany):** broken-promise reveal — najpierw 2–3 s flash działającej aplikacji (live URL na ekranie), potem cut do "this is what I started with two hours ago" + face #1 wypowiada hook line.

**Hook line (5 s, max 14 słów):** konkretny, z liczbami.
- ✅ "Zbudowałem URL shortener z Claude Code w 7 minutach — i to działa lokalnie."
- ✅ "9 dni. 1 gra. Multiplayer. Pełny audyt. Live na fastduels.com."
- ❌ "Dzisiaj pokażę wam coś fajnego" (vague, brak stakes)
- ❌ "Hej kochani, witam was na kanale" (zero promise)

**Dlaczego:** retention 0:00–0:30 to ~50 % odpływu w tutorialach (Vidocu, SocialRails 2026). Pattern interrupt w 5 s daje +23 % retention w benchmarkach (Retention Rabbit).

**Tradeoff — kiedy łamać:** dla cyklu serii ("silent build #N") możesz wymienić full-product flash na 2 s tease poprzedniego epizodu — buduje seryjność, ale słabsze dla nowych viewerów.

### 2.2. Promise (0:08–0:15) — krytyczne

**Co:** text overlay na face / na screencast formułujący kontrakt filmu.

**Format:** jeden tekst, max 2 linie, 7–15 słów.
- "Cloudflare Worker · D1 · auth · audyt · deploy → 7 min"
- "Od pustego repo do działającej apki · zero edycji w tym filmie"

**Dlaczego:** widz musi mieć "umowę" — wie co dostanie. Bez tego dropuje na 30–90 s, gdy jeszcze nie widać payloadu.

### 2.3. ProjectIntro (0:15–0:25)

**Composition:** `ProjectIntro.tsx` (już zaimplementowane, `packages/ui/src/compositions/ProjectIntro.tsx`).

**Props (z `repo-metadata.ts`):**
- `projectName` — z `package.json` lub `--name`
- `punchline` — Claude one-shot, ≤ 8 słów
- `subtitle` — live URL lub repo URL
- `techStack` — top 5–7 zależności

**Animacja:** brand reveal 10 s — number flash → punchline letter-by-letter → subtitle slide → tech stack chips. Paleta NASA.

**Dlaczego:** spójność cross-film (to samo intro = brand recognition), edukacyjne (widz wie co technicznie się buduje), retention bridge między face hookiem a właściwym kontentem.

### 2.4. Bloki faz (Concept → Plan → Build → Design → Audit → Release)

Każda faza ma:
- **PhaseTransition overlay** (2–3 s) — pełny ekran "FAZA N: NAZWA"
- **Body** (kompresja 25–50× z OBS recording + dashboard segments)
- **Lower-third** "01/06 CONCEPT" w pierwszych 3 s fazy → fade-out (rozdziały surface)
- **Min 1× visual variety device** per faza (z listy w sekcji 3.2)

| Faza | Min czas | Max czas | Obowiązkowe devices | Mood (muzyka) |
|---|---|---|---|---|
| Concept | 30 s | 60 s | StatsCard punch-in @ koniec (init metryki) | intro-chill |
| Plan | 45 s | 90 s | Architecture zoom-out (file-tree fly-through lub diagram), CodeZoom 1× | crossfade chill→hustle |
| Build | 90 s | 180 s | CommitCard 2–3×, CodeZoom 1×, face inset 2–3×, **AI-mistake beat 1×** | build-hustle |
| Design | 30 s | 60 s | Before/after split (mockup → applied), face inset 1× | build-hustle |
| Audit | 30 s | 60 s | Red→green security transition, face recovery inset 1× | build-hustle (mute @ recovery beat) |
| Release | 20 s | 40 s | Climax drop @ tag/release moment (`git tag` + `gh release`), full-screen "RELEASED v0.1.0" | climax-drop |

**Reguła pacingu:** żaden clip dashboardu nie może lecieć dłużej niż 25 s bez visual variety device. Wynika z reguły "pattern interrupt co 60–90 s" — przy kompresji 25×, źródłowy widget ticker zachowuje feel "stale frame" po ~25 s.

### 2.5. AI-mistake beat (krytyczne 2026)

**Lokalizacja:** w fazie Build lub Audit, na markerze 2:30–3:00 (churn cliff) lub 5:45–6:00 (audit recovery).

**Co:** segment 8–12 s.
- 0–2 s: terminal pokazuje błąd / złą odpowiedź AI / failing test
- 2–5 s: cut do face inset (zaskoczenie / "hmm" / lekka frustracja — autentyczna, nie zagrana)
- 5–10 s: cut z powrotem na terminal — refactor prompt / poprawka
- 10–12 s: success indicator (zielony test, deploy ok, etc.)
- **Mute muzyki na 5–8 s w środku** — silence as stakes signal

**Dlaczego:** algorytm YT 2026 down-rankuje AI-slop, up-rankuje widoczną ludzką decyzję (ScaleLab, Engineer's Codex). Cursor support-bot blowup + Bard $100B mistake to 2026 reference points — widzowie gotowi na "AI got confused" beat. Bez tego film czyta się jako mass-produced.

**Tradeoff:** jeśli sesja nie miała żadnego AI-mistake (rzadkie ale możliwe), użyj "developer caught a non-obvious bug" beat — face reaction przy znalezieniu problemu (np. open redirect w audit phase tinypath).

### 2.6. Talking head budżet

**Minimum:** 4–6 cut-inów per film (obecny spec ma tylko face #1 hook + face #2 outro = za mało dla standardów 2026).

**Pozycje cut-inów (rekomendowane):**

1. Hook face (0:00–0:05) — full-screen
2. Decision moment "dlaczego wybrałem X" (faza Plan, ~1:30) — PiP top-right ~5 s
3. AI-mistake reaction (faza Build) — PiP ~5 s
4. Design choice "ten kolor / layout" (faza Design) — PiP ~3 s
5. Audit recovery "wykryłem to" (faza Audit) — PiP ~5 s
6. Outro face (8:35–8:50) — full-screen

**Format PiP:** 240×240 top-right na lewym panelu (1344×1080), border 3 px amber NASA palette. Hard cut on/off, bez animacji slidów.

**Dlaczego:** parasocial retention. Czysty dual-pane czyta się jako documentary footage, nie creator content (Subscribr, Buttercut). To **single biggest lever** brakujący w obecnym pipelinie.

**Tradeoff — kiedy łamać:** dla "speed-build challenge" formatu (5-min film, jeden mid-roll) wystarczy face #1 + face #2 + 1× mid-cut. Pełny budżet ma sens dla flagshipów 8–9 min.

### 2.7. Numeric proof — continuous + punctuated

**Continuous:** dashboard panel pokazuje tokens / $ / pliki / czas live (już jest).

**Punctuated:** **StatsCard punch-in 1.5–2 s** na granicach faz (NIE tylko outro).

Cadence:
- Po Concept (1:15): "12k tokens · $0.18 · 0 plików · 50 min realtime"
- Po Plan (2:30): "+8k tokens · $0.12 · 1 plik (spec.md)"
- Po Build (5:00): "+47 plików · 1234 LOC · 23 commity · 3.2 h"
- Po Audit (6:30): "+5 fixów · CSP dodany · rate limit dodany · 0 high-severity"
- Outro: cumulative grand total (już jest w pipeline)

**Dlaczego:** dashboard ticker w tle staje się background noise po 60 s. Discrete cuts converting numbers into payoff moments.

### 2.8. Demo (7:00–8:30)

**Format:** prawdziwy OBS screencast na **live URL** (już zdeployowanym off-camera) lub na **localhost**.
- Sekwencja core flow z concept.md (3–5 kroków user journey)
- Bez voiceover overlay — niech ekran mówi
- Muzyka: outro-celebratory bed
- Czas: 60–90 s (tinypath: 60 s OK, większa apka: 90 s)

**Dlaczego:** payoff filmu. Bez działającego artefaktu film nie ma proof-of-concept.

**⚠️ Deploy off-camera (zasada):** sam proces deploya (Coolify push, wrangler deploy, vercel push, etc.) **nie jest pokazywany w filmie**. Robisz go między Sesją Release (faza 6) a Demo (Day N+1) — poza nagraniem. Film pokazuje **stan zdeployowany** (live URL działa), nie *jak* się deployuje.

**Tradeoff demo target:**
- **Live URL** (np. `tinypath.bartek.dev` na Coolify/Hetznerze) — większy "wow", ale wymaga off-camera deploya przed demo nagraniem
- **Localhost** (np. `localhost:5173`) — mniej "wow", ale uczciwe i działa od razu po Sesji Release. Możesz dodać 5 s text overlay "git clone && pnpm dev → demo na localhost"
- **Split screen** — top half live URL, bottom half terminal pokazujący `git clone` flow, dla widzów którzy chcą sami uruchomić

### 2.9. StatsCard final + Face #2 outro

**StatsCard (8:30–8:35):** composition `StatsCard.tsx` — 5 s count-up wszystkich metryk.

**Face #2 (8:35–8:50):** 15 s, talking head, format:
- 5 s: punchline summary "tinypath w 7 min, w pełni lokalnie, w pełni audytowane"
- 5 s: cliffhanger "next: silent build #N — <X>"
- 5 s: CTA "subscribe + repo link below"

**Tail (8:50–9:00):** subscribe overlay + outro-celebratory music tail z reverbem.

## 3. Elementy cross-cutting

### 3.1. Paleta muzyki + mapping

4 ścieżki Suno (zgodnie z `assets/music/README.md`):

| Track | Czas | Volume | Hard cut / fade |
|---|---|---|---|
| `intro-chill-60s` | 0:00–1:30 | -18 dB pod VO, -12 dB solo | fade-in 0:00–0:03, hard cut do hustle @ 1:30 |
| `build-hustle-90s` | 1:30–6:30 | -18 dB pod VO, -12 dB solo | hard cut z chill, **mute 5–8 s @ AI-mistake beat** |
| `climax-drop-30s` | 6:30–7:00 | -10 dB (peak), tail @ 7:00 | drop align z deploy/tag moment |
| `outro-celebratory-45s` | 7:00–9:00 | -15 dB pod VO, fade @ 8:55 | crossfade z climax tail |

**Reguły:**
- Hard cuts > crossfades dla treści tutorialowej (zachowuje energię, sygnalizuje granicę).
- Mute na AI-mistake beat — silence is a retention tool when it signals stakes.
- VO sidechain: -3 dB ducking podczas voiceover hook/outro.

**Dlaczego:** każdy track ma role-mapping (chill = exposition, hustle = work, climax = payoff, celebratory = closure). Crossfades rozmazują granice faz; hard cuts surface'ują strukturę rozdziałów.

### 3.2. Visual variety budżet

**Reguła:** nie więcej niż 25 s ciągłego dashboardu bez zmiany pane focus.

**Devices** (z których wybierasz per scena):
- **CommitCard** (2 s) — gh-style commit box, używany 2–3× w fazie Build
- **CodeZoom** (3 s) — file path + excerpt z highlight, używany 1× w Plan + 1× w Build
- **StatsCard punch-in** (1.5–2 s) — na granicy każdej fazy
- **Face inset** (3–5 s) — PiP, 4–6× per film
- **Architecture zoom-out** (4–6 s) — file-tree fly-through lub commit graph (NEW, brak w obecnym pipelinie — kandydat do implementacji)
- **Before/after split** (5 s) — faza Design, mockup vs applied
- **Red→green security transition** (3 s) — faza Audit, security panel state change
- **Full-screen takeover** (2–3 s) — PhaseTransition overlay (już jest w pipeline)

**Dlaczego:** reguła pattern-interrupt 60–90 s. Source pane swap > content swap.

### 3.3. Surface rozdziałów

**Lower-third** w pierwszych 3 s każdej fazy: "0N/06 NAZWA" w prawym dolnym rogu, fade-out po 3 s, NASA amber.

**YouTube chapters** w description — czas rozpoczęcia każdej fazy:
```
0:00 Hook
0:15 Intro
0:25 Concept
1:15 Plan
2:30 Build
5:00 Design
5:45 Audit
6:30 Release
7:00 Demo
8:35 What I learned
```

**Dlaczego:** ~40 % wzrost watch-time dla treści z rozdziałami (SocialRails). Lower-third + YT chapters = double layered.

### 3.4. Napisy

- PL primary (auto-generated CapCut, manual review)
- EN jako oddzielny `.srt` (auto-translate, manual review krytycznych zdań — hook, outro, AI-mistake beat narration)
- ~30 % widzów ogląda na mute → napisy obowiązkowe dla wszystkich segmentów z mową

## 4. Wzorce tytułów 2026 (CTR-optimized)

8 sprawdzonych formuł (źródło: FluxNote 2026, Banana Thumbnail). Liczby + konkretny outcome = +36 % CTR vs vague.

1. **Czas + outcome:** "Zbudowałem [X] w [N] min z Claude Code"
2. **Versus:** "Claude Code vs Cursor — ta sama apka w 10 min"
3. **Mistake hook:** "Claude Code napisał 400 linii. 60 z nich było złych."
4. **Cost reveal:** "Zbudowałem SaaS za $0.84 kosztu API"
5. **Authority test:** "Czy Claude Code naprawdę dowiezie do produkcji?"
6. **Contrarian:** "Vibecoding jest przereklamowany. Oto co naprawdę działa."
7. **Transformation:** "Od pustego repo do deploya w 8 minut"
8. **Result hook:** "[Konkretna funkcja] w 7 min — w pełni audytowane"

**Reguła:** tytuł ≤ 70 znaków. Liczby w tytule (czas, koszt, liczba plików, LOC).

**Dla cyklu:** "Silent build #N: <slug> — <hook>" framing pozwala scaleable kolejne filmy. Wariant: bez numeru, każdy film ma indywidualny hook.

## 5. Wzorce thumbnaili 2026

**Top-performer threshold:** 8 %+ CTR.

**Reguły:**
- 1 dominant subject (face lub artefakt, nie oba dominujące)
- 2–3 kolory max (paleta NASA: amber + green + dark = już zgodne)
- ≤ 3–5 słów
- Expressive face beats no-face (tech niche A/B confirmed)
- High contrast, czytelny na mobilce @ 240 px szerokości

**Layout templates:**

```
LEWY PANE (60 %): face z silną emocją (zaskoczenie / focus / "wow")
PRAWY PANE (40 %): split — terminal (góra) + working app (dół)
TEXT (top right, 3 słowa): "$0.84" / "8 MIN" / "FAILED?"
LOGO (bottom right, mały): silent-build wordmark
```

Albo:
```
FULL-WIDTH: artifact screenshot (working app)
OVERLAY (left center): face z reakcją
TEXT (bottom): "BUILT IN 8 MIN" / "AUDITED. SHIPPED."
```

**Generator:** `pnpm render:thumb --project ... --title "..."` (deferred Faza 3 NASA redesign — `Thumbnail.tsx` composition, 1280×720 static).

## 6. Per-film decision checklist (przed renderem)

Te 7 decyzji ustal **przed** odpaleniem `pnpm render:narrative`. Każda blokuje compositing.

- [ ] **Tytuł (≤ 70 zn.):** ___________
- [ ] **Hook line (5 s, ≤ 14 słów):** ___________
- [ ] **Promise overlay (≤ 15 słów, 2 linie):** ___________
- [ ] **AI-mistake beat (8–12 s):** który moment? Build (~3:00) lub Audit (~6:00)? ___________
- [ ] **Demo target:** live URL / localhost / oba (split) ___________
- [ ] **Cliffhanger:** następny silent build #N+1 — co zapowiadasz? ___________
- [ ] **Face cut-iny planowane (4–6):** [hook, _____, _____, _____, _____, outro] (zaznacz pozycje)

Plus 2 globalne decyzje:
- [ ] **Music intensity profile:** standard (default) / quiet (mute więcej dla cinematic feel) / loud (continuous bed)
- [ ] **Talking head dosage:** minimum (4 cut-iny) / standard (6 cut-inów) / maximum (persistent PiP throughout)

## 7. Tradeoffy — kiedy łamać format

| Sytuacja | Co łamać | Dlaczego OK |
|---|---|---|
| Speed-build challenge ≤ 5 min | 1 mid-roll, brak fazy Design, talking head minimum (3 cut-iny) | krótki format = inny kontrakt z viewerem |
| Bez fazy audit (np. throwaway prototype) | Faza 5 zastąpiona "Demo bug-hunt" | nadal AI-mistake beat możliwy w innej fazie |
| Bez fazy deploy (lokalnie) | Faza 6 jako "Release" — `pnpm build` + git tag, bez live URL | demo na localhost, audyt w pełni działa |
| Mega-projekt (3+ tygodnie sesji) | 12–15 min "best-of" wariant z 2 mid-rollami → 3 mid-rolle | kompresja 50–100×, każda faza 2× dłuższa |
| Live coding (real-time) | Bez kompresji, bez face #1/#2 (w trakcie), pre-recorded intro/outro | inny gatunek (livestream → VOD), inne reguły |
| Polish-language only | EN auto-translate captions, PL primary | uncrowded niche, easy localization |
| Pierwszy film (brak następnego) | Cliffhanger zastąpiony "subscribe so you don't miss the next one" | brak brand seriału jeszcze |

## 8. A/B testy dla pierwszych 3 filmów

Mierz w YT Analytics → Audience retention + CTR.

1. **Hook style:** broken-promise reveal vs problem-framing vs bold claim — mierz retention 30 s. Hipoteza: broken-promise wygra.
2. **Face-cam dosage:** 4 cut-iny vs 8 cut-inów vs persistent PiP — mierz retention + CTR przez thumbnail. Hipoteza: 6 cut-inów = sweet spot.
3. **Music density:** continuous bed vs music-only-on-transitions vs silence-during-stakes — mierz retention 3–6 min. Hipoteza: silence-during-stakes wygra dla AI-mistake beat.
4. **Stats-card cadence:** punch-in @ każdej granicy sceny vs tylko 3 strategiczne — mierz click-through do demo URL. Hipoteza: 3 strategic > all (less is more).
5. **Length:** 8:30 (2 mid-rolle, tighter) vs 11:30 (2 mid-rolle, looser pacing) — mierz RPM + total watch-time per impression. Hipoteza: 8:30 wygra dla CTR-driven discovery, 11:30 wygra dla loyalty audience.

## 9. Compatibility matrix — co już jest, co brakuje

| Element | Status | Plik |
|---|---|---|
| ProjectIntro composition | ✅ | `packages/ui/src/widgets/ProjectIntro.tsx` |
| StatsCard composition | ✅ | (TBD — sprawdzić, możliwe że tylko w specu) |
| CommitCard composition | ✅ | (sprawdzić) |
| CodeZoom composition | ✅ | (sprawdzić) |
| Face cam capture (twoje nagranie) | manual | OBS / kamera standalone |
| Face PiP integration w pipelinie | ❌ **GAP** | brak `FaceInset.tsx` lub equivalentu — Premiere manual |
| Paleta muzyki (4 Suno tracks) | ✅ | `assets/music/` (gitignored, manifest committed) |
| Music sidechain VO ducking | ❌ **GAP** | manual w Premiere |
| Voiceover (ElevenLabs Rachel) | ✅ | `pnpm assets:tts` |
| Lower-third rozdziałów | ❌ **GAP** | nie zaimplementowane — Premiere overlay manual |
| AI-mistake beat composition | ❌ **GAP** | nie ma — to manual scripted moment, nie automation |
| Architecture zoom-out (file-tree / commit graph) | ❌ **GAP** | brak — kandydat do implementacji (Faza 3 NASA redesign?) |
| StatsCard punch-in (1.5 s mid-film) | ❌ **GAP** | StatsCard istnieje ale tylko jako outro 5 s — brak short variant |
| Before/after split (faza Design) | ❌ **GAP** | manual Premiere |
| Red→green security transition | ✅ partial | dashboard pokazuje state change, ale brak dedicated 3 s composition |
| YT chapters w description | manual | template w `publish.md` |
| Thumbnail composition | ❌ **GAP** | spec'd jako Faza 3 NASA redesign, nie zaimplementowane |
| Captions PL+EN | manual | CapCut / YT Studio |
| Library wzorców tytułów | ✅ (ten dokument) | sekcja 4 |

**Kluczowe gapy do priorytetyzacji** (jeśli budżet na implementację):
1. **Face PiP integration** — single biggest retention lever
2. **StatsCard punch-in variant** (1.5–2 s)
3. **Lower-third rozdziałów** (3 s overlay przy każdej PhaseTransition)
4. **Architecture zoom-out composition**
5. **Thumbnail.tsx composition** (Faza 3 NASA redesign already planned)

Pozycje 1–3 to ~2 dni implementacji, pozycja 4 ~1 dzień, pozycja 5 ~1 dzień (już w planie redesignu).

## 10. Dlaczego ten format ma sens (źródła)

Dane retencji + benchmarków 2026:
- 30 s churn cliff w tutorialach (Vidocu): https://vidocu.ai/blog/why-most-tutorial-videos-get-skipped-at-the-30-second-mark-and-the-3-fixes-that-work
- Pattern interrupt @ 5 s = +23 % retention (Retention Rabbit): https://www.retentionrabbit.com/blog/youtube-hook-strategy-to-keep-viewers-watching
- Chapters = +40 % watch-time (SocialRails 2026): https://socialrails.com/blog/youtube-audience-retention-complete-guide
- 8-min mid-roll rule (FluxNote 2026): https://fluxnote.io/guides/youtube-mid-roll-ads-minimum-video-length-2026
- AI-slop crackdown (ScaleLab): https://scalelab.com/en/why-youtube-is-cracking-down-on-ai-generated-content-in-2026
- Title formulas 8 %+ CTR (FluxNote 2026): https://fluxnote.io/guides/how-to-write-viral-youtube-titles-2026
- Thumbnail principles 2026 (ThumbMagic): https://www.thumbmagic.co/blog/thumbnail-design-principles
- B-roll for retention (Buttercut): https://buttercut.ai/blog/master-b-roll-high-retention-video
- Talking head editing (Subscribr): https://subscribr.ai/p/editing-talking-head-videos-engaging
- Vibecoding mainstream Q1 2026 (Vogel IT Law): https://www.vogelitlawblog.com/2026/01/ai-claude-code-is-going-viral/
- Cursor AI mistake viral (Fortune): https://fortune.com/article/customer-support-ai-cursor-went-rogue/
- Fireship genre conventions (Engineer's Codex): https://read.engineerscodex.com/p/how-fireship-became-youtubes-favorite

## 11. Jak używać tego dokumentu

**Per nowy film:**
1. Przeczytaj sekcje 1–3 (format spec + per-segment + cross-cutting)
2. Wypełnij sekcję 6 checklist (7 decyzji + 2 globalne)
3. Sprawdź sekcję 7 czy pasuje standard format czy łamiesz
4. Walidacja vs sekcja 9 — które elementy masz, które gapy akceptujesz na ten film

**Per cykl 3 filmów:**
- Sekcja 8 (A/B testy) — wybierz 1 zmienną testową per film
- Po 3 filmach: update sekcji 1–3 z winners

**Aktualizacja tego dokumentu:**
- Po publikacji każdego filmu: dopisz w changelog na końcu (PR + film + retention number)
- Co 3 filmy: review sekcji 1–3, czy hipotezy z sekcji 8 się potwierdziły

## Changelog

- **2026-05-08** — initial spec, oparty na viral-film-pipeline-design + duels production-plan + research-synthesizer Q2 2026 trends (po angielsku)
- **2026-05-09** — pełna polonizacja, przeniesienie do `docs/films/format/spec.md`
- (next) **post tinypath publish** — first retention data point
