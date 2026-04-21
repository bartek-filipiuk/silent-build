# output/

Per-project output folders. Created automatically by `pnpm mark project-start --name <project>`.

Struktura:
- `<project-name>-<YYYY-MM-DD>/manual_markers.json` — manual phase markers
- `<project-name>-<YYYY-MM-DD>/timeline.json` — wygenerowany przez harvester
- `<project-name>-<YYYY-MM-DD>/screen.mp4` — nagranie OBS (gitignored)
- `<project-name>-<YYYY-MM-DD>/dashboard.mov` — wyrenderowany overlay (gitignored)
- `<project-name>-<YYYY-MM-DD>/dashboard_frames/` — PNG sequence (gitignored)

Gitignore wyklucza media, ale zostawia `timeline.json` i `manual_markers.json` jeśli chcesz je commitować.
