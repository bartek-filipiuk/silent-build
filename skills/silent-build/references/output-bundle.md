# Output bundle — what the skill writes, where, how big

Default output (lightweight, ~50 KB total — no render):

```
docs/films/<slug>/
├── metadata.json         ~280 B   — repo metadata (name + tech stack + start/end TS)
├── narrative.json        3-5 KB   — scene + clip schema, the render input
├── scenariusz.md         6-8 KB   — hook + per-scene face cam script + storytelling beats
└── publish.md            2-3 KB   — title shortlist + description draft + tags

output/<slug>/
├── candidates.json       10-20 KB — curator output (all detected candidates)
└── (segments/ — empty until user requests render)
```

## When user says "renderuj"

```
output/<slug>/segments/
├── scene-01-start-overlay.mov     ~300 MB  — IntroCard 8s, 1920×1080 ProRes 4444
├── scene-01-start-clip-01.mov     ~1 GB    — dashboard, 576×1080
├── scene-NN-*-overlay.mov         ~100-300 MB
├── scene-NN-*-clip-NN.mov         ~500 MB-1.5 GB
├── manifest.json                  ~3 KB    — segment metadata
├── concat-dashboards.txt          <1 KB    — ffmpeg concat list
├── concat-overlays.txt            <1 KB
└── scene-NN-*.timeline.json       5-50 KB  — per-clip event data
```

Total: ~5-15 GB depending on scene count + durations.

## When user says "renderuj scenę N"

Only that scene's overlay + dashboard MOV — typical 1-2 GB per scene.

## When user says "concat dashboards-all"

`--with-concat` runs ffmpeg post-render:

```
output/<slug>/segments/
├── dashboards-all.mov     ~4-6 GB  — 576×1080, full dashboard reel
└── overlays-all.mov       ~0.5-1 GB — 1920×1080, full overlay reel
```

These are convenience preview reels. Premiere doesn't need them (it drags per-segment).

## Preview PNGs (auto-extract after render)

```
/tmp/<slug>-scene-01-start-clip-01.png    ~500 KB-1 MB
/tmp/<slug>-scene-NN-*-clip-NN.png
```

One per scene at frame 150 (~2.5 s into clip). For quick visual sanity check.

## Cleanup

The skill never deletes anything. User cleans manually:

```bash
# Remove all segments for a slug
rm -rf output/<slug>/segments

# Remove only concat reels
rm -f output/<slug>/segments/dashboards-all.mov output/<slug>/segments/overlays-all.mov

# Remove preview PNGs
rm -f /tmp/<slug>-*.png
```

Per `CLAUDE.md` convention: `output/` is gitignored except `output/README.md`. Per-film artifacts in `docs/films/<slug>/` ARE committed.
