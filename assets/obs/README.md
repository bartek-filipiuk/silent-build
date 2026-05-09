# OBS recording layer

silent-build films are side-by-side: real OBS recording of your CC session on the left (1344×1080), dashboard render on the right (576×1080). Total 1920×1080.

This folder is a manual cookbook (not auto-importable) — the OBS scene-collection format is too coupled to your local hardware/sources to ship as a single JSON.

## One-time OBS Studio setup (~10 min, once per machine)

### 1. Create scene collection

OBS Studio → Scene Collection → New → name it `silent-build`.

### 2. Set output canvas

Settings → Video:

| Setting | Value |
|---|---|
| Base (Canvas) Resolution | **1344×1080** |
| Output (Scaled) Resolution | **1344×1080** (no scaling) |
| Common FPS Values | **30** |

The 1344×1080 canvas matches the left panel of the final 1920×1080 film. The right 576×1080 comes from `silent-build/output/<slug>/segments/*.mov` and is composed in Premiere — not in OBS.

### 3. Set output recording

Settings → Output → Output Mode: **Advanced** → Recording tab:

| Setting | Value |
|---|---|
| Type | Standard |
| Recording Path | `~/video-projects/<slug>/raw-recordings/` ← change per project |
| Recording Format | `mkv` (safer than mp4 — survives OBS crashes; remux later) |
| Encoder | x264 (CPU) **or** NVENC HEVC (GPU, faster) |
| Rate Control | CRF (x264) / CQP (NVENC) |
| CRF / CQ value | **23** |
| Keyframe Interval | 2 s |
| CPU Usage Preset (x264) | `medium` |
| Audio Tracks | track 1 only |

CRF 23 on a 30 fps 1344×1080 capture ≈ 4-5 GB/h. NVENC at CQ 23 is similar size, ~4× faster encode.

### 4. Set audio

Settings → Audio:

- Desktop Audio: **Disabled** (silent build = silent recording)
- Mic/Auxiliary: **Disabled**

You're recording for the dashboard layer, not for narration. Voice/face recording happens separately on Day N+3.

### 5. Set hotkeys

Settings → Hotkeys → set:

- **Start Recording**: F9
- **Stop Recording**: F10

(If F9/F10 conflict with your DE, pick something free; just be consistent.)

### 6. Create the scene + source

Scenes panel → `+` → name `cc-session`.

In the new scene, Sources → `+` → **Window Capture** (xcomposite or wlroots on Linux; "Window Capture" on macOS/Windows):

| Setting | Value |
|---|---|
| Window | your terminal app (the one running `claude`) |
| Capture Method | (Linux) `xcomposite`, (macOS) auto, (Windows) BitBlt |
| Capture Cursor | yes |
| Cursor Hover (Win) | yes |

Resize the source so it fills the 1344×1080 canvas. If the terminal aspect doesn't match, pad with letterbox bars on the canvas — don't crop content.

If you sometimes work in VS Code instead of the terminal, add a second Window Capture source for it (toggle visibility per scene, or duplicate the scene as `cc-session-editor`).

### 7. Test

F9 → wait 5 s → F10. Check `~/video-projects/<slug>/raw-recordings/` for the `.mkv`. Open in mpv/VLC. If it plays clean, OBS is good.

## Per-project recording workflow

When starting a new project (e.g. `tinypath`):

```bash
mkdir -p ~/video-projects/tinypath/raw-recordings
```

Then in OBS: Settings → Output → change Recording Path to that dir.

For each CC session (Day 1 build, Day 2 audit, Day 3 deploy):

1. Open OBS (start of session)
2. Verify the `cc-session` scene is selected and the Window Capture source is targeting your terminal
3. **F9** to start recording
4. Open `claude` in the terminal → work
5. **F10** to stop when you close CC
6. Rename the file (OBS uses timestamp by default): `mv <timestamp>.mkv day-1-build.mkv`

After a few sessions you'll have:

```
~/video-projects/tinypath/raw-recordings/
├── day-1-build.mkv          (~ 10 GB if 2 h)
├── day-2-audit.mkv          (~ 5 GB if 1 h)
├── day-3-deploy.mkv         (~ 2.5 GB if 30 min)
```

These are the source clips Premiere razor-cuts in the assembly stage (per `docs/films/workflow/project-starter.md` Day N+4).

## Storage management

Raw recordings are **ephemeral**. After YT publish + 1 week (so you can re-render if a fix is needed), delete:

```bash
rm -rf ~/video-projects/<slug>/raw-recordings/
```

A typical project: 25-30 GB total → reclaimed after publish.

## Privacy notes

- **Don't record env files / secrets visible on screen.** If you `cat .env` in the terminal mid-session, OBS captures it. Pause recording (F10) before any sensitive output, resume (F9) after.
- API keys in env vars are usually fine (they don't show in the terminal unless you `echo` them).
- `claude` itself doesn't print your `ANTHROPIC_API_KEY` — safe to record.

## Troubleshooting

- **Recording is choppy / drops frames** — drop to 24 fps in Settings → Video, or use NVENC if available.
- **File size too big** — bump CRF to 26 (smaller, slightly less quality but indistinguishable for terminal text).
- **Window Capture is black on Wayland** — switch to `xcomposite` or set capture method to `pipewire-screencast` if available.
- **Audio captured despite Disabled** — under Audio Mixer panel in main view, mute Desktop Audio; the global setting doesn't always stick.

## Why mkv not mp4

mp4 stores its index at the end of the file. If OBS or your machine crashes mid-session, the file is unreadable. mkv writes the index incrementally; you lose only the last few seconds. Premiere reads mkv natively (and you can `ffmpeg -i in.mkv -c copy out.mp4` for free if a tool insists on mp4).
