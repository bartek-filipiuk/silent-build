# Music assets manifest

Suno-generated lo-fi loops, **standard subscription license**. Files are gitignored — store canonical copies in external storage (Drive/Dropbox), drop them in this folder before running `pnpm assets:generate`.

`pnpm assets:doctor` warns if any of these are missing.

## Files expected here

Either `.wav` (lossless, larger) or `.mp3` (smaller, indistinguishable for film background). Suno lets you download both — pick MP3 if storage matters.

| Base name | Length | Used in |
|---|---|---|
| `intro-chill-60s.{wav,mp3}` | 60 s | film opening (0:05–1:00) |
| `build-hustle-90s.{wav,mp3}` | 90 s | build/design phases (1:30–4:45) |
| `climax-drop-30s.{wav,mp3}` | 30 s | deploy moment + outro reveal (4:45–5:30) |
| `outro-celebratory-45s.{wav,mp3}` | 45 s | demo screencast + stats (5:30–6:45) |

`pnpm assets:doctor` accepts either extension and reports `all 4 expected files present` regardless of format mix.

## Suno prompts (canonical, regenerate as needed)

### intro-chill-60s.wav
> Cinematic lo-fi intro, 60 seconds, atmospheric synth pads, soft kick drum, builds anticipation but stays restrained. Tempo 80 BPM. No vocals. Outro fades.

### build-hustle-90s.wav
> Lo-fi hip-hop with light synth lead, 90 seconds, drives forward, "coding session" vibe, 95 BPM, no vocals, loopable.

### climax-drop-30s.wav
> Cinematic drop, 30 seconds, big synth lead + breakbeat, triumphant feel for a product launch reveal, starts at 30s mark of buildup, ends on cymbal crash.

### outro-celebratory-45s.wav
> Lo-fi celebratory outro, 45 seconds, warm chords, light vocal chops (no words), ends with reverb tail. 90 BPM, hopeful but understated.
