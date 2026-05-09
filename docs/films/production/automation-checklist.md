# Automation checklist — co robi automat, co manual, kiedy

**Cel:** dla każdego elementu formatu filmu (z `format/spec.md`) wskazać: (a) czy już zautomatyzowane, (b) czy da się zautomatyzować, (c) **kiedy** to robić względem produkcji aplikacji (przed / po / w trakcie / nie ma znaczenia).

Skróty:
- ✅ AUTO — pipeline robi to za Ciebie, nic nie klikasz
- 🔧 SEMI — istnieje narzędzie, Ty triggerujesz / weryfikujesz wynik
- ✋ MANUAL — Ty robisz w Premiere / na klawiaturze / w OBS
- 💡 GAP — można zautomatyzować, jeszcze nie ma — z estymatą

Skróty timing:
- **PRE** — przed pierwszą sesją CC (Day 0 prep)
- **DURING** — w trakcie produkcji aplikacji (Days 1–N, zachowanie sesji)
- **POST** — po zakończeniu produkcji aplikacji (Day N+3 onward)
- **ANY** — bez znaczenia, da się zrobić w dowolnym momencie

## 1. Per-element matrix

### Format wizualny filmu (compositions)

| Element | Status | Timing | Narzędzie / Plik | Notatki |
|---|---|---|---|---|
| ProjectIntro composition | ✅ AUTO | POST | `pnpm render:projectintro` (lub via film-assets bundle) | Props z `repo-metadata.ts`, ~10 s ProRes |
| Dashboard segments (per scena) | ✅ AUTO | POST | `pnpm render:narrative` | Z narrative.json, kompresja 25–50× |
| Overlay PhaseTransition (per scena) | ✅ AUTO | POST | `pnpm render:narrative` | Pełny ekran 2–3 s |
| StatsCard (final 5 s) | ✅ AUTO | POST | `pnpm render:stats` | Numbers count-up |
| StatsCard punch-in (1.5–2 s mid-film) | 💡 GAP | POST | brak | **Estymata: 0.5 dnia** — short variant istniejącego StatsCard |
| CommitCard (B-roll insert) | ✅ AUTO | POST | (sprawdzić — w specu, status?) | gh-style commit box |
| CodeZoom (B-roll insert) | ✅ AUTO | POST | (sprawdzić) | File path + excerpt z syntax highlight |
| Architecture zoom-out (file-tree / commit graph) | 💡 GAP | POST | brak | **Estymata: 1 dzień** — Remotion composition + git log parser |
| Before/after split (faza Design) | ✋ MANUAL | POST | Premiere split-screen | Mockup vs applied — zwykle screenshoty |
| Red→green security transition | 🔧 SEMI | POST | dashboard pokazuje state change naturalnie | Można dedicated 3 s composition (~0.5 dnia) |
| Face PiP integration | ✋ MANUAL | POST | Premiere PiP track | **Single biggest gap** — kompozycja możliwa, ale wymaga capture face cam (manual OBS) |
| Lower-third rozdziałów | 💡 GAP | POST | brak | **Estymata: 0.5 dnia** — Remotion overlay z fade-out |
| Thumbnail (1280×720 static) | 💡 GAP | POST | brak | **Estymata: 1 dzień** — w planie NASA redesign Faza 3 |
| Subscribe overlay / end-screen | ✋ MANUAL | POST | YT Studio | YouTube-native feature |
| AI-mistake beat (8–12 s) | ✋ MANUAL | DURING+POST | scripted moment | **Nie da się zautomatyzować** — wymaga real reaction face cam |

### Audio

| Element | Status | Timing | Narzędzie | Notatki |
|---|---|---|---|---|
| Voiceover hook + outro (ElevenLabs) | ✅ AUTO | POST | `pnpm assets:tts` | Skrypt z `/generate-voiceover-script` skill |
| Voice cloning (Twój głos zamiast Rachel) | 🔧 SEMI | ANY | ElevenLabs UI | Jednorazowo: 30 s nagrania → voice ID → `assets/voices/bartek-clone-id.txt` |
| Suno music tracks (4 loops) | 🔧 SEMI | PRE (jednorazowo) | Suno UI + `assets/music/` | Generujesz raz, używasz w każdym filmie |
| Music mapping per scenę | ✋ MANUAL | POST | Premiere | Wg sekcji 3.1 spec'u — można skryptować przyszłościowo |
| Music sidechain VO ducking | ✋ MANUAL | POST | Premiere audio compressor | -3 dB ducking podczas VO |
| Music mute @ AI-mistake beat | ✋ MANUAL | POST | Premiere razor-cut | Critical retention lever |
| Captions PL (auto-generated) | 🔧 SEMI | POST | CapCut auto-caption + manual review | YouTube też auto-captionuje |
| Captions EN (translation) | 🔧 SEMI | POST | YT Studio auto-translate + manual review krytycznych | Hook, outro, AI-mistake beat — review obowiązkowy |
| SFX (UI dings, whoosh) | 💡 GAP | POST | brak | **Optional** — można generować z timeline events |

### Materiały surowe (capture)

| Element | Status | Timing | Narzędzie | Notatki |
|---|---|---|---|---|
| OBS recording sesji CC (left panel source) | ✋ MANUAL | DURING | OBS Studio + F9/F10 | Obowiązkowe per sesja |
| Face cam (#1 hook + #2 outro + cut-iny) | ✋ MANUAL | POST | OBS / standalone camera | 4–6 takes, 5–15 s każdy |
| Demo screencast (60–90 s) | ✋ MANUAL | POST | OBS na live URL / localhost | Wg shot-list |
| jsonl Claude Code | ✅ AUTO | DURING | sam Claude Code zapisuje | `~/.claude/projects/-…-<slug>/` |
| Repo metadata (commits, files, LOC) | ✅ AUTO | POST | `pnpm assets:metadata` | Z repo + jsonl-dir |
| Token/cost metryki | ✅ AUTO | DURING | harvester czyta z jsonl | Per-event w live + cumulative w outro |

### Narrative + curation

| Element | Status | Timing | Narzędzie | Notatki |
|---|---|---|---|---|
| Curator candidates scan | ✅ AUTO | POST | `pnpm curate:scan` | Heuristics: edit bursts, prompt keywords, inline tags |
| Narrative kuracja (wybór 6 scen) | 🔧 SEMI | POST | `/curate-narrative` skill w CC | Skill prowadzi dialog — Ty decydujesz top scen |
| Voiceover script (hook + outro lines) | 🔧 SEMI | POST | `/generate-voiceover-script` skill w CC | Claude pisze, Ty iterujesz |
| Shot-list (talking head + demo click-list) | ✅ AUTO | POST | `pnpm assets:shotlist` | Z metadata.json |
| YT description (chapters + tagi + opis) | ✋ MANUAL | POST | template `publish.md` | Skopiuj i wypełnij |

### Premiere assembly (compositing)

| Element | Status | Timing | Narzędzie | Notatki |
|---|---|---|---|---|
| Razor-cut OBS recording per clip range | ✋ MANUAL | POST | Premiere razor tool | Wg narrative.json clip from/to |
| Time-stretch lewy panel do durationSec | ✋ MANUAL | POST | Premiere time stretch | Compression 25–50× |
| Pozycjonowanie dashboard segments (1344, 0) | ✋ MANUAL | POST | Premiere transform | 576×1080 z prawej |
| Overlay tracks (V4 chroma key na PhaseTransition) | ✋ MANUAL | POST | Premiere chroma key | Pełny screen takeover |
| Face PiP tracks (V5, 240×240 top-right) | ✋ MANUAL | POST | Premiere PiP positioning | 4–6 cut-inów |
| Final export H.264 → mp4 | ✋ MANUAL | POST | Premiere export | ~1 GB dla 9 min |
| Premiere project template | 🔧 SEMI | PRE (jednorazowo) | `assets/premiere/README.md` (Sprint 1) — step-by-step do utworzenia `.prproj` (manual ~15 min) |

### Publish

| Element | Status | Timing | Narzędzie | Notatki |
|---|---|---|---|---|
| YT upload (privacy unlisted → public) | ✋ MANUAL | POST | YT Studio | Można `youtube-upload` CLI ale rzadko warto |
| YT title / description / tags | ✋ MANUAL | POST | YT Studio | Z `publish.md` template |
| YT chapters (timestamps) | ✋ MANUAL | POST | YT description | Auto z narrative.json — można generować |
| YT thumbnail upload | ✋ MANUAL | POST | YT Studio | Z `output/<slug>/thumbnail.png` |
| End-screen + cards | ✋ MANUAL | POST | YT Studio | Subscribe + watch-next |
| Tweet/LinkedIn cross-post | ✋ MANUAL | POST | manual | Można zautomatyzować ale low priority |
| README repo update z YT link | 🔧 SEMI | POST | `gh repo edit` lub manual | Po publikacji |

## 2. Co MOŻNA zautomatyzować (priorytetyzacja gap'ów)

Posortowane po ROI (impact / effort):

| # | Gap | Effort | Impact | ROI |
|---|---|---|---|---|
| 1 | Lower-third rozdziałów | 0.5 dnia | wysoki (chapters surface = +40% watch-time) | ⭐⭐⭐ |
| 2 | StatsCard punch-in variant (1.5 s) | 0.5 dnia | wysoki (numeric proof discrete) | ⭐⭐⭐ |
| 3 | Premiere project template | 0.5 dnia | wysoki (oszczędza 30 min compositingu per film) | ⭐⭐⭐ |
| 4 | YT chapters generator z narrative.json | 0.5 dnia | średni (ułatwia publish.md template) | ⭐⭐ |
| 5 | Architecture zoom-out (file-tree fly-through) | 1 dzień | średni (visual variety device #1) | ⭐⭐ |
| 6 | Thumbnail.tsx composition | 1 dzień | wysoki (CTR=8% threshold) | ⭐⭐ (już planowane w NASA redesign Faza 3) |
| 7 | Red→green security transition (3 s composition) | 0.5 dnia | niski (dashboard już pokazuje) | ⭐ |
| 8 | SFX generator (UI dings z timeline events) | 1 dzień | niski (audio polish) | ⭐ |
| 9 | Face PiP composition (placeholder dla face cam) | 1 dzień | wysoki ale capture nadal manual | ⭐⭐ |
| 10 | Music mapping skrypt (per-scene volume + cuts) | 1 dzień | średni (reproducibility) | ⭐⭐ |

**Mój głos do priorytetyzacji** (po publikacji tinypath jako baseline data):
- Faza 1 sprintu: #1, #2, #3 (1.5 dnia, retention + speed boost)
- Faza 2 sprintu: #4, #6 (już w NASA redesign), #5 (visual variety)
- Faza 3 (jeśli ROI się potwierdzi): pozostałe

## 3. Co MUSI być manual (i dlaczego)

Te elementy nie da się sensownie zautomatyzować — wymagają ludzkiej decyzji / capture / kreatywności:

| Element | Dlaczego manual | Czy jest workaround |
|---|---|---|
| Face cam recording (hook + outro + cut-iny) | Twoja twarz + głos + autentyczna reakcja | Można pre-record bibliotekę 20 reaction takes i mixować, ale czytelne jest |
| AI-mistake beat scripting | Zależy od konkretnego momentu w sesji — co AI zepsuło | Curator może oznaczyć kandydatów (failing test event), ale finalny wybór + face reaction = manual |
| Demo screencast (60–90 s) | Real interaction z aplikacją | Można skryptować bot click-through, ale wygląda fake |
| Suno music generation | Jednorazowa twórcza decyzja | Zrobione raz, używasz w każdym filmie |
| Voice cloning (Twój głos) | Jednorazowa konfiguracja | 30 s nagrania → voice ID, na zawsze |
| YT title / hook line / cliffhanger | Kreatywne decyzje, każdy film inny | LLM może proponować draft, ale finalna decyzja Twoja |
| Concept.md per projekt | Twoja domena / pomysł | LLM może draft'ować, ale weryfikujesz |

## 4. Kiedy co robić — timeline produkcji

```
══════════════════ PRE (Day -1, jednorazowo per kanał) ══════════════════
- Suno: wygeneruj 4 music tracks                                  🔧 SEMI
- ElevenLabs: nagraj voice clone (opcjonalnie)                    🔧 SEMI
- OBS: setup scena, hotkeys, recording path                       ✋ MANUAL
- Premiere project template (gdy gap zaimplementowany)            💡 GAP

══════════════════ PRE (Day 0, per projekt) ══════════════════
- concept.md (1 strona)                                           ✋ MANUAL
- README.md, .gitignore, git init                                 ✋ MANUAL
- raw-recordings/ folder                                          ✋ MANUAL
- gh repo create (opcjonalnie)                                    🔧 SEMI

══════════════════ DURING (Days 1–N, sesje CC) ══════════════════
- F9 OBS przed każdą sesją                                        ✋ MANUAL
- Sesje CC (Concept, Build, Audit, Release)                       ✋ MANUAL
- jsonl auto-zapisywany przez Claude Code                         ✅ AUTO
- token/cost metryki harvested live                               ✅ AUTO
- Inline tagi w pivotach `[REFACTOR]` / `[SECURITY]`              ✋ MANUAL
- F10 OBS po każdej sesji                                         ✋ MANUAL

══════════════════ POST (Day N+0.5, deploy off-camera, jeśli idzie na live URL) ══════════════════
- Coolify push / wrangler deploy / vercel push / fly deploy       ✋ MANUAL (off-camera, NIE w filmie)
- Verify live URL działa (smoke test ręczny)                       ✋ MANUAL

══════════════════ POST (Day N+1, capture face + demo) ══════════════════
- Face cam #1 hook + #2 outro + 4 cut-iny (4–6 takes total)       ✋ MANUAL
- Demo screencast 60–90 s na live URL (z poprzedniego kroku) lub localhost  ✋ MANUAL

══════════════════ POST (Day N+2, pipeline run) ══════════════════
- pnpm assets:metadata                                             ✅ AUTO
- pnpm curate:scan                                                 ✅ AUTO
- /curate-narrative w CC (kuracja)                                 🔧 SEMI
- /generate-voiceover-script w CC                                  🔧 SEMI
- pnpm assets:shotlist                                             ✅ AUTO
- pnpm render:narrative (segments + overlays)                      ✅ AUTO
- pnpm render:projectintro / render:stats                          ✅ AUTO
- pnpm assets:tts (ElevenLabs)                                     ✅ AUTO

══════════════════ POST (Day N+3, Premiere assembly) ══════════════════
- Razor-cut + time-stretch lewy panel (OBS recordings)             ✋ MANUAL
- Pozycjonowanie dashboard segments (prawy panel)                  ✋ MANUAL
- Overlay tracks (PhaseTransition + Face PiP)                      ✋ MANUAL
- Music tracks + sidechain VO ducking                              ✋ MANUAL
- Captions PL (auto-caption + review)                              🔧 SEMI
- Final export H.264 mp4                                           ✋ MANUAL

══════════════════ POST (Day N+3, publish) ══════════════════
- YT upload (unlisted preview)                                     ✋ MANUAL
- Title + description + tags + chapters + thumbnail                ✋ MANUAL
- End-screen + cards                                               ✋ MANUAL
- Public + cross-post                                              ✋ MANUAL
- README repo update z YT link                                     ✋ MANUAL
```

## 5. Czy MOŻNA zrobić wszystko POST?

**Krótka odpowiedź: TAK, prawie wszystko można zrobić po produkcji aplikacji.**

Wyjątki (rzeczy które MUSZĄ być w trakcie / przed):

1. **OBS recording sesji CC** — DURING. Bez tego brakuje lewego panelu dla całej fazy build/audit/release. Można nadrobić tylko reconstruction, ale traci autentyczność.
2. **Inline tagi w prompcie** — DURING. Nie dorobisz ich post-fact bez edycji jsonl (czego nie zalecam).
3. **AI-mistake beat moment** — DURING przynajmniej na poziomie "zauważ że się stało", potem POST face reaction.
4. **Suno music + voice clone** — PRE (raz). Bez tego POST jest zablokowany.
5. **Concept.md** — PRE. Bez tego pierwsza sesja nie jest start clip kandydatem.

Wszystko inne (face cam, demo, pipeline run, Premiere, publish) — POST.

**⚠️ Deploy aplikacji jest off-camera, NIE w filmie.** Proces deploya (Coolify push, wrangler deploy, vercel push, fly deploy) nie jest częścią narracji. Możesz go zrobić:
- **Przed Demo capture** — żeby pokazać działający live URL (preferowane dla "wow")
- **Po publish** — jeśli demo jest na localhost
- **Wcale** — jeśli projekt zostaje lokalny

Faza 6 w filmie to **Release** (`git tag v0.1.0` + `gh release create`), a nie deploy. Climax-drop align z momentem `git tag` lub `gh release` — to jest payoff scena, NIE wrangler push.

**Konsekwencja praktyczna:** możesz mieć **zaległości** filmów. Zrobiłeś 3 projekty w ostatnich 2 miesiącach z OBS recordingami → możesz teraz w 3 dni zrobić 3 filmy POST (po 1 dzień Premiere + capture per film).

## 6. Skrypt walidacji per film

Każdy film przechodzi przez `film-checklist.md` (sąsiedni dokument). Checkboxy validate:
- Pre-flight (PRE): concept.md, OBS, skille
- Capture (DURING): jsonle, mkv recordings, inline tagi
- Pipeline (POST): metadata, narrative, segments, voiceover
- Premiere (POST): tracks, music, captions, export
- Publish (POST): YT, README, cross-post

## 7. Roadmap automatyzacji

**Sprint 1 (DONE 2026-05-09):**
- [x] Lower-third rozdziałów (Remotion overlay 3 s) — `ChapterLowerThird.tsx`
- [x] StatsCard punch-in variant (1.5 s short) — `StatsPunchIn.tsx`
- [x] Premiere project template — `assets/premiere/README.md` (manual `.prproj` step-by-step)

**Sprint 2 (2 dni, rider obecny plan):**
- [ ] YT chapters generator z narrative.json (skrypt)
- [ ] Architecture zoom-out (file-tree fly-through composition)

**Sprint 3 (NASA redesign Faza 3 — już zaplanowane):**
- [ ] Thumbnail.tsx composition
- [ ] IntroCard / OutroCard / PhaseTransition refresh

**Sprint 4 (jeśli retention data uzasadni):**
- [ ] Face PiP composition placeholder + workflow
- [ ] SFX generator
- [ ] Music mapping skrypt
- [ ] Red→green dedicated transition

## Changelog

- **2026-05-09** — initial document
