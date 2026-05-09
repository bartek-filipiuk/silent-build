# Premiere project template — silent-build

**Cel:** raz przygotowany Premiere project (`silent-build-template.prproj`) z 5 trackami video + 3 audio + bin folder hierarchy. Otwierasz, save-as nowy projekt per film, drag pliki do gotowych tracków. Oszczędza ~30 min compositingu per film.

Plik `.prproj` jest **binary** i nie może być wygenerowany ze skryptu — musisz go stworzyć ręcznie raz, potem już tylko kopiujesz.

## Lokalizacja docelowa

```
assets/premiere/
├── README.md                              ← ten plik
└── silent-build-template.prproj           ← Twój manualny output (gitignored, ~50-200 KB)
```

`.prproj` jest **gitignored** (binary file, niewersjonowane). Trzymasz go w `assets/premiere/` lokalnie + backup na zewnętrznym storage (Drive/Dropbox).

## Krok-po-kroku — utworzenie templatu (jednorazowo, ~15 min)

### 1. New Project

Premiere Pro → File → New → Project.
- **Name:** `silent-build-template`
- **Location:** `~/video-projects/silent-build/assets/premiere/`
- **Video Renderer:** Mercury Playback Engine GPU Acceleration (preferred) lub Software Only
- **Display Format:** Timecode

### 2. New Sequence

File → New → Sequence (Cmd/Ctrl+N).
- **Preset:** Custom
- **Editing mode:** Custom
- **Frame Size:** 1920 horizontal × 1080 vertical
- **Pixel Aspect Ratio:** Square Pixels (1.0)
- **Fields:** No Fields (Progressive Scan)
- **Frame Rate:** 60 fps (lub 30 jeśli chcesz lighter pliki finalne)
- **Audio Sample Rate:** 48000 Hz
- **Sequence Name:** `Main Timeline`

### 3. Tracks Setup

Po utworzeniu sequence:
- Right-click w track header → Add Tracks
- **Video tracks:** dodaj do łącznie 5 (V1-V5)
- **Audio tracks:** dodaj do łącznie 3 (A1-A3) — type: Stereo

Rename tracki (right-click track header → Rename):

| Track | Nazwa | Zawartość |
|---|---|---|
| V1 | `Background` | tło, plain bg w razie potrzeby (zwykle pusty) |
| V2 | `Left Pane (OBS)` | razor-cut OBS recordings z `~/video-projects/<slug>/raw-recordings/` |
| V3 | `Right Pane (Dashboards)` | dashboard segments z `output/<slug>/segments/scene-XX-*-clip-NN.mov` |
| V4 | `Overlays + B-roll` | PhaseTransition, CommitCard, CodeZoom, StatsPunchIn, ChapterLowerThird |
| V5 | `Face PiP + Top Layer` | face cam cut-iny, ProjectIntro, StatsCard final |

| Track | Nazwa | Zawartość |
|---|---|---|
| A1 | `Music` | Suno tracks (intro-chill, build-hustle, climax-drop, outro-celebratory) |
| A2 | `Voiceover` | ElevenLabs hook.mp3 + outro.mp3 |
| A3 | `SFX (opt)` | UI dings, whoosh, keyboard typing — opcjonalne |

### 4. Bins (Project panel folder hierarchy)

W Project panel → New Bin (Cmd/Ctrl+B), stwórz:

```
01_RawRecordings        ← drag tu day-N-*.mkv z raw-recordings/
02_Dashboards           ← drag scene-XX-*-clip-*.mov
03_Compositions         ← drag projectintro.mov, stats-card.mov, stats-punchin-*.mov, chapter-lt-*.mov, commit-card-*.mov, code-zoom-*.mov
04_PhaseOverlays        ← drag scene-XX-*-overlay.mov
05_Face                 ← drag face.mov + ewentualne face-take-N.mov
06_Demo                 ← drag demo.mov
07_Audio                ← drag music tracks (Suno) + voiceover/*.mp3
08_Thumbnail            ← drag thumbnail.png (jeśli używasz statycznego)
99_Exports              ← target dla Media Encoder export
```

Ten układ to NIE wymóg — Premiere binsy to tylko organizacja, nie wpływa na timeline. Ale ułatwia szybkie znajdowanie pliku gdy masz 50+ assetów.

### 5. Effect Presets (jednorazowo, oszczędza 5 min/film)

Premiere → Effects panel → Presets → New Preset Bin: `silent-build`.

W tym bin'ie zapisz:

#### a) Face PiP transform preset
- Aplikuj na clip face cam → Effect Controls → Motion:
  - Position: 1184, 144 (top-right corner of left pane 1344×1080, with 240×240 PiP)
  - Scale: 22 (240/1080 ≈ 22%)
- Right-click Motion in Effect Controls → Save Preset → Name: `Face PiP top-right 240×240`
- Type: Scale
- Description: "Face cam cut-in for left-pane PiP"

#### b) Dashboard right-pane positioning
- Aplikuj na dashboard clip → Effect Controls → Motion:
  - Position: 1632, 540 (1344 + 576/2)
  - Scale: 100
- Save Preset → Name: `Dashboard right-pane 576×1080`

#### c) Music sidechain ducking
- Aplikuj Multiband Compressor (Audio Effects) na music track:
  - Sidechain key: voiceover track A2
  - Threshold: -18 dB
  - Ratio: 4:1
  - Attack: 30 ms
  - Release: 150 ms
- Save Preset → Name: `Music VO ducking -3 dB`

### 6. Audio Levels (Audio Track Mixer)

Audio Track Mixer (Window → Audio Track Mixer):
- A1 Music: -18 dB (default level)
- A2 Voiceover: 0 dB (peak)
- A3 SFX: -12 dB

Save jako "Audio Mix Workspace" preset.

### 7. Save as Template

File → Save As → `silent-build-template.prproj` w `~/video-projects/silent-build/assets/premiere/`.

**Jeszcze ważne:** w Premiere preferences ustaw "Auto Save" na 5 min, żeby nie zgubić templatu.

## Per-film usage

Dla każdego nowego filmu:

```bash
# 1. Skopiuj template
cp ~/video-projects/silent-build/assets/premiere/silent-build-template.prproj \
   ~/video-projects/silent-build/output/<slug>/<slug>-silent-build.prproj
```

W Premiere:
1. File → Open Project → wybierz nowy `<slug>-silent-build.prproj`
2. Bins są już gotowe — drag pliki:
   - `01_RawRecordings`: drag z `~/video-projects/<slug>/raw-recordings/`
   - `02_Dashboards`: drag z `output/<slug>/segments/scene-*-clip-*.mov`
   - `03_Compositions`: drag z `output/<slug>/segments/` (projectintro.mov, stats-card.mov, etc.)
   - `04_PhaseOverlays`: drag z `output/<slug>/segments/scene-*-overlay.mov`
   - `05_Face`: drag `output/<slug>/face.mov`
   - `06_Demo`: drag `output/<slug>/demo.mov`
   - `07_Audio`: drag z `assets/music/*.mp3` + `output/<slug>/voiceover/*.mp3`
3. Compositing per `docs/films/production/film-checklist.md` sekcja D
4. Export → `output/<slug>/final/<slug>-silent-build-N.mp4`

Tracks już są pre-set, presets dostępne, audio levels zdefiniowane. Kompletny setup oszczędza ~30 min vs. zaczynanie od zera.

## Aktualizacja templatu

Gdy nauczysz się czegoś po publish-ed filmie (lepszy effect preset, nowa kolejność tracków, itp.):

1. Otwórz `silent-build-template.prproj`
2. Zaaplikuj zmiany
3. Save (Cmd/Ctrl+S)
4. Update tego README jeśli zmiana jest niebanalna

Nie wersjonujesz templatu w git (jest binary), ale możesz commitować updates tego README z opisem co się zmieniło.

## Co NIE jest w templacie (świadomie)

- **Konkretny content** — bo każdy film ma inne pliki
- **Hardcoded timestamps** — bo każdy film ma inną długość scen (z narrative.json)
- **Title text** — bo każdy film ma inny tytuł
- **Music auto-placement** — Suno tracks są podobne ale crossfade points różne per scenariusz

Te rzeczy ustawiasz manualnie per film, ale dzięki templatowi nie tworzysz tracków, bins, presets od zera.

## Powiązane

- `docs/films/format/spec.md` sekcja 1 (timeline 7-min target) — które tracki idą w jakie sloty
- `docs/films/production/film-checklist.md` sekcja D (Premiere assembly) — krok po kroku checklist
- `docs/films/production/broll-templates.md` — co kompozycje renderują się przed importem do Premiere
- `assets/music/README.md` — Suno tracks manifest
- `assets/voices/bartek-clone-id.txt` — ElevenLabs voice ID (lub default Rachel)
