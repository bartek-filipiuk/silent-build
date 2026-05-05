# Duels Best-Of (12 min) — production plan

**Status:** plan, awaiting user decisions
**Date:** 2026-05-05
**Source:** `output/duels-narrative.json` (validated, 6 scenes, 12 clips)
**Target platform:** YouTube (primary), short cuts → Twitter/LinkedIn (secondary)

## TL;DR — czego potrzeba aby ten film był publikowalny

Sam `pnpm render:narrative` to **~30%** roboty. Daje surowe segmenty (overlays + dashboards). Brakuje:

1. **Lewy panel filmu** — co tam jest? (decyzja blokująca; 4 opcje poniżej)
2. **Compositing** w jeden track 1920×1080 (CapCut albo ffmpeg, ~1–2 h)
3. **Audio** — voiceover albo brak (decyzja)
4. **Music** — lo-fi/cinematic w tle (decyzja + źródło)
5. **Captions** — lower-third dla każdej sceny (10–15 min)
6. **Thumbnail** + **YouTube metadata** (30 min)
7. **Final preview round** + iterations

Razem: **~3–6 h post-prod** od momentu "render zielony" do "publish".

---

## 1. Pre-production — decyzje do podjęcia

Te 5 rzeczy trzeba ustalić **zanim** odpalimy pełny render. Większość blokuje compositing.

### 1.1. Lewy panel (1344×1080) — co tam jest? **(blokujące)**

Plan filmu jest "side by side": prawa 30% = dashboard, lewa 70% = "co user widzi". Cztery opcje:

| Opcja | Co | Plus | Minus |
|---|---|---|---|
| **A. Real screencapture** | Nagrasz teraz OBS-em ekran VS Code/terminala odtwarzając ważne fragmenty pracy duels. ~1–2 h nagrywania. | Autentyczne, real code edits | Time-consuming, możesz nie pamiętać dokładnie co się działo |
| **B. Reconstructed typing** | Mock animacja kodu (jak w `/tmp/fake-code-panel.html` z live-stream prototypu). Generujemy z prawdziwych Edit/Write events z jsonl. | Skalowalne, deterministyczne | Mniej autentyczne, "fake" feel |
| **C. Static code panels** | Zrzuty plików w kluczowych momentach (match-room.ts po pierwszym scaffoldingu, +page.svelte w fazie design itp.) jako 5–10 s każdy | Najprostsze, najszybsze | Nudne, brak ruchu |
| **D. Skip lewy panel** | Tylko prawa kolumna 576×1080 jako pełny ekran — wertykalne wideo (TikTok/Reels-friendly) lub centered with side bars | Kosztuje 0 dodatkowego czasu | Tracimy 70% real estate, mniej "filmowo" |

**Rekomendacja: B** — mamy już `/tmp/fake-code-panel.html` z Live-Stream PR-a (działa, syntax-highlighted typing), możemy z każdego scene'a wyciągnąć Edit/Write events i wygenerować odpowiednią sekwencję typowania. To +1 dzień pracy dewelopera (write `tsx generate-code-panel.ts <scene>`), ale automatyzowalne i powtarzalne dla kolejnych projektów.

**Fallback: C** — jeśli nie chce się dodatkowego dewelopmentu, wystarczy 12 statycznych zrzutów (1 per clip).

### 1.2. Voiceover — tak/nie?

| Opcja | Plus | Minus |
|---|---|---|
| **Bez voiceover** ("silent build") | Spójne z brandem `silent-build` — film mówi "tylko dashboard mówi" | Niższe retention dla widzów którzy chcą kontekstu |
| **Krótki voice intro+outro** (10 s na początku, 15 s na końcu) | Hook na początku, CTA na końcu | Trochę wymaga, ale niski koszt |
| **Pełny voiceover narration** (3–4 min text przez 12 min) | Najwyższe retention, edukacyjne | Wymaga pisania + nagrania, ~2–3 h |

**Rekomendacja:** krótki intro+outro voice (mid-range) — 30 s narratorskiego komentarza zachowuje silent-build vibe ale daje hook.

### 1.3. Muzyka

| Wybór | Charakter | Źródło |
|---|---|---|
| **Lo-fi beats** | spokojnie, "coding mood" | YT Audio Library, Pixabay Music, Lofi Girl royalty-free |
| **Cinematic build-up** | dramatyczne (intro/outro) + ambient (build) | Epidemic Sound (paid), Artlist (paid) |
| **Synthwave** | retro NASA mission-control vibe | Pixabay, FMA |
| **Brak** | tylko keyboard SFX + UI dings | — |

**Rekomendacja:** Lo-fi w tle (30% volume) + cinematic riser na phase transitions (1 s każdy).

### 1.4. Język + napisy

- Napisy zawsze (~30% widzów ogląda na mute)
- Napisy: PL primary albo EN primary?
- Auto-translate w YouTube (działa OK ale nie idealnie)

**Rekomendacja:** PL primary, EN auto-translate (sprawdzić jakość przed publikacją). Title YouTube: PL + (EN) w nawiasie.

### 1.5. Title + thumbnail copy

Należy ustalić **przed** renderem thumbnail (`pnpm render:thumb` używa title prop).

Propozycje robocze:

| # | Title | Hook |
|---|---|---|
| T1 | "Zbudowałem grę 1v1 w 9 dni — oto cała sesja Claude Code" | timeline drama |
| T2 | "Od pomysłu do produkcji: fastduels.com w 12 minut" | speedrun framing |
| T3 | "175 promptów, 4588 odpowiedzi, 1 gra na produkcji" | numbers hook |
| T4 | "Silent build #1: duels — od kartki do fastduels.com" | series framing |

**Rekomendacja:** T4 (series framing pozwala kolejne filmy: silent build #2, #3...).

---

## 2. Render pipeline — co robi automat

Po podjęciu decyzji 1.1–1.5:

### 2.1. Tweak `output/duels-narrative.json` (opcjonalnie)

Otwórz w edytorze. Sprawdź:
- czy `durationSec` per scene/clip pasuje (sumarycznie ~720 s = 12 min)
- czy `label` per clip czyta się dobrze (to napis na ekranie)
- czy `from`/`to` ranges nie są za małe (jeśli realtime < 60 s, rozszerz aby compressionRatio > 5×)

Iterate przez skill: `claude` w katalogu silent-build, `/curate-narrative output/duels-narrative.json` — Claude czyta, proponuje zmiany, zapisuje.

### 2.2. Full render (~20 min CPU)

```bash
pnpm render:narrative \
  --input output/duels-narrative.json \
  --out output/duels-final
```

Output:
- 6× `scene-XX-<id>-overlay.mov` (1920×1080, 4–7 s każdy, ProRes 4444)
- 12× `scene-XX-<id>-clip-XX.mov` (576×1080, 30–70 s każdy, ProRes 4444)
- `manifest.json` z timing metadata
- `concat-overlays.txt`, `concat-dashboards.txt` (gotowe ffmpeg input)

Łączny rozmiar: **~12–18 GB ProRes 4444** (lossless). Można później skompresować do H.264 dla finalnej publikacji.

### 2.3. Quick concat (sanity check, opcjonalnie)

```bash
# Tylko dashboards w jeden 576×1080 stream (opcjonalnie z muzyką w tle)
ffmpeg -f concat -safe 0 -i output/duels-final/concat-dashboards.txt \
       -c copy output/duels-final/dashboards-all.mov
```

To NIE jest finalny film — to sanity check że dashboards się sklejają poprawnie.

---

## 3. Compositing w CapCut — wytyczne

CapCut bo: free, dobrze radzi sobie z ProRes input, łatwo zrobić chroma key + motion graphics.

### 3.1. Setup project

- 1920×1080, 60 fps, 12 min
- 4 tracki:
  - **V1** (najniższy): muzyka background visual (jeśli jest, np. lekka tekstura albo solid bg)
  - **V2**: lewy panel content (decyzja 1.1)
  - **V3**: prawy panel — dashboard segments (z manifest.json kolejność)
  - **V4** (najwyższy): overlays z Color Key (greenscreen) → fullscreen przy każdej scenie
- 2 audio tracki:
  - **A1**: muzyka background
  - **A2**: voiceover (jeśli decyzja 1.2 = tak)

### 3.2. Timeline — minute-by-minute

```
0:00–0:04   [overlay] scene-01 Intro 1920×1080 fullscreen
0:04–1:00   [code+dashboard] scene-01 clip-01 (Concept)
1:00–1:02   [overlay] scene-02 PhaseTransition "Plan"
1:02–1:49   [code+dashboard] scene-02 clip-01 (Vertical slice)
1:49–2:39   [code+dashboard] scene-02 clip-02 (Account system)
2:39–2:42   [overlay] scene-03 PhaseTransition "Build"
2:42–3:47   [code+dashboard] scene-03 clip-01 (Scaffolding 20 files)
3:47–4:52   [code+dashboard] scene-03 clip-02 (play/+page.svelte burst)
4:52–5:59   [code+dashboard] scene-03 clip-03 (PartyKit scaffolding)
5:59–6:01   [overlay] scene-04 PhaseTransition "Design"
6:01–7:04   [code+dashboard] scene-04 clip-01 (Claude Design impl)
7:04–8:07   [code+dashboard] scene-04 clip-02 (Typography + i18n)
8:07–8:09   [overlay] scene-05 PhaseTransition "Audit"
8:09–8:57   [code+dashboard] scene-05 clip-01 (security-audit pivot)
8:57–9:46   [code+dashboard] scene-05 clip-02 (CSP fix)
9:46–9:48   [overlay] scene-06 PhaseTransition "Ship"
9:48–10:49  [code+dashboard] scene-06 clip-01 (First production push)
10:49–11:51 [code+dashboard] scene-06 clip-02 (fastduels.com primary)
11:51–11:58 [overlay] scene-06 Outro fullscreen
TOTAL ≈ 12:00
```

### 3.3. Compositing per segment

- **Overlay segments (V4)**: wstaw 1920×1080 ProRes, ustaw "Chroma Key" filter → kolor zielony `#00ff00`. Tło staje się przezroczyste (overlay tylko gdzie jest content).
- **Dashboard segments (V3)**: wstaw 576×1080 ProRes, ustaw pozycję `x=1344, y=0`.
- **Lewy panel (V2)**: zależnie od decyzji 1.1. Jeśli opcja B (mock typing): wstaw odpowiedni HTML render dla każdego clip range. Jeśli A (screencap): wstaw OBS clip.
- **Captions**: dla każdej sceny dodaj lower-third (np. "PHASE 3 / 6 — BUILD") w pierwszych 3 s sceny, fade out.

### 3.4. Color & polish

- LUT: subtelny "cyberpunk" lub żaden (NASA palette już jest)
- Light bloom na overlay text (CapCut → Effects → Glow)
- Audio sidechain: muzyka -3 dB podczas voiceover

---

## 4. Audio production

### 4.1. Voiceover (jeśli decyzja 1.2 = tak)

Skrypt 30 s intro:
> "Dzień zerowy. Jeden dokument konceptowy. Pomysł: dwie gry 1v1 w przeglądarce. W ciągu następnych dziewięciu dni Claude Code napisze 18 tysięcy linii kodu, postawi serwer multiplayer, uruchomi audyt bezpieczeństwa i wdroży na produkcję jako fastduels.com. Cisza. Tylko dashboard."

Skrypt 15 s outro:
> "Pełny kod, plan implementacji i ten dashboard są na github.com/bartek-filipiuk. Subscribe — następny silent build za tydzień."

Nagranie:
- Mikrofon: Twój zwykły setup
- Pomieszczenie: ciche, basket-of-clothes pillow trick jeśli echo
- DAW: Audacity, free
- Post: noise reduction → compression → -16 LUFS (YouTube standard)

### 4.2. Muzyka

Plik wybrany w decyzji 1.3, importuj do CapCut, ustaw na -18 dB pod voiceover, -12 dB pod sam dashboard.

### 4.3. SFX (opcjonalnie)

- Keyboard typing (jeśli opcja 1.1 = B mock typing) — można wygenerować z Edit/Write event timestamps
- UI dings przy phase transitions
- Whoosh przy intro/outro

---

## 5. Captions / subtitles

W CapCut: Auto Captions (PL) → review → eksport `.srt`.

Plus statyczne lower-thirds per scenę:

| Scene | Caption (PL) | Caption (EN) |
|---|---|---|
| start | Dzień 0 — koncept | Day 0 — concept |
| plan | Vertical slice + system kont | Vertical slice + accounts |
| build | Monorepo + multiplayer | Monorepo + multiplayer |
| design | Claude Design + i18n | Claude Design + i18n |
| audit | Audit bezpieczeństwa | Security audit |
| end | Production: fastduels.com | Production: fastduels.com |

YouTube: dodaj `.srt` PL + `.srt` EN w studio.

---

## 6. Thumbnail

```bash
pnpm render:thumb -- --project output/duels-final --title "Silent build #1: duels"
```

Output: `output/duels-final/thumbnail.png` (1280×720 NASA palette).

Jeśli wygląda nudno — Figma manual override:
- Hero text: "9 DAYS · 1 GAME"
- Subtitle: "fastduels.com"
- Background: brand pattern + screenshot pl.json edits w lewym dolnym rogu
- Logo silent-build w prawym górnym rogu

---

## 7. YouTube metadata

### Title (decyzja 1.5)

### Description template

```
Pełna sesja "silent build" — 9 dni Claude Code od pomysłu do fastduels.com (multiplayer 1v1 PWA).

— LINKI —
Repo: https://github.com/bartek-filipiuk/duels
Live: https://fastduels.com
silent-build (ten film): https://github.com/bartek-filipiuk/silent-build
Spec curatora: https://github.com/bartek-filipiuk/silent-build/blob/main/docs/superpowers/specs/2026-05-05-curator-best-of-design.md

— TIMESTAMPS —
0:00 Concept
1:00 Plan
2:42 Build
6:01 Design
8:09 Security audit
9:48 Production

— TECH —
SvelteKit · Cloudflare Workers · PartyKit · D1 · Better Auth · Paraglide i18n
Claude Code (Opus 4.7) · superpowers · Claude Design · silent-build pipeline

— KOLEJNE FILMY —
Subscribe — silent build #2 za tydzień
```

### Tagi

`coding`, `claude code`, `ai pair programming`, `svelte`, `cloudflare`, `multiplayer game`, `solo dev`, `silent build`, `vibe coding`, `1v1 game`, `partykit`

### End-screen / cards

- End-screen 20 s: "Subscribe" button + "Watch next" preview (na razie placeholder do następnego filmu)
- Card #1 @ 1:00: link do duels repo
- Card #2 @ 9:48: link do fastduels.com

---

## 8. Publishing checklist

- [ ] decyzje 1.1–1.5 podjęte (zatwierdzone przez Bartka)
- [ ] `output/duels-narrative.json` ostatecznie zaakceptowany
- [ ] `pnpm render:narrative` zielony, manifest.json sprawdzony
- [ ] Lewy panel content (decyzja 1.1) gotowy
- [ ] Voiceover nagrany (jeśli decyzja 1.2 = tak)
- [ ] Muzyka wybrana i licencjonowana
- [ ] CapCut compositing zielony — preview ostateczny
- [ ] Captions PL + EN
- [ ] Thumbnail (Remotion albo Figma)
- [ ] YouTube title + description + tags
- [ ] End-screen + cards skonfigurowane
- [ ] Privacy: unlisted preview → linkowany do 2 osób na review (24 h)
- [ ] Final upload: public, scheduled na konkretny dzień
- [ ] Tweet/LinkedIn pre-announcement (T-1 day)
- [ ] Update repo README z linkiem do filmu
- [ ] Add do silent-build playlist na YT
- [ ] Track first 24 h: views, retention, comments, CTR

---

## 9. Iteration loop dla kolejnych filmów

Każdy następny silent build #N:

1. Pick projekt (najlepiej taki z 3–5 sesji jsonl)
2. `pnpm curate:scan` → candidates
3. `/curate-narrative` → narrative
4. `pnpm render:narrative` → segmenty
5. CapCut compositing (template z #1 ratuje 70% czasu)
6. Voice + music
7. Publish

Cel: drugi film w tydzień, bo workflow już znany.

---

## 10. Open questions dla Bartka

Te 5 odpowiedzi odblokowują pełny render + post:

1. **Lewy panel:** A / B / C / D (recommend B)
2. **Voiceover:** none / krótki intro+outro / pełny narration (recommend krótki)
3. **Muzyka:** lo-fi / cinematic / synthwave / brak (recommend lo-fi + cinematic risers)
4. **Język:** PL primary + EN auto / EN primary + PL napisy / dual mix
5. **Title:** T1 / T2 / T3 / T4 (recommend T4 "Silent build #1: duels")

Plus:

6. Czy zatwierdzasz proponowany 12-min timeline z sekcji 3.2, czy chcesz coś przesunąć (np. dłuższa sekcja audit / krótsza sekcja design)?

7. Mamy już Twój screencast pracy z duels (rzeczywisty terminal/VS Code) gdzieś? Czy musisz nagrać teraz?

---

## 11. Co automat robi sam, co musisz zrobić Ty

| Element | Automat | Ty |
|---|---|---|
| Curator candidates.json | ✅ `pnpm curate:scan` | — |
| narrative.json | semi-auto przez skill | iterate w skill chat |
| Per-segment .mov render | ✅ `pnpm render:narrative` | — |
| Thumbnail | ✅ `pnpm render:thumb` | albo Figma manual |
| Compositing 1920×1080 | — | CapCut, ~1.5 h |
| Lewy panel content | zależy od decyzji 1.1 | nagrać / Figma / nic |
| Voiceover | — | nagrać + edit, ~1 h |
| Muzyka | — | wybrać źródło + import |
| Captions | YouTube auto-caption | review + edit, 15 min |
| YouTube upload + meta | — | manual, 30 min |
