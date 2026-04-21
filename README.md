# silent-build

Post-processing pipeline dla wiralowych filmow silent-coding. Zamienia sesje Claude Code (`.jsonl`) w PNG/MOV overlay, ktory wklejamy obok OBS recording w CapCut.

## Architektura

Monorepo pnpm workspaces z 4 paczkami:
- `@silent-build/shared` — Zod schemas, TS types (kontrakt miedzy paczkami)
- `@silent-build/markers` — CLI, zapisuje manual phase markers
- `@silent-build/harvester` — CLI, parsuje `.jsonl` sesje -> `timeline.json`
- `@silent-build/overlay` — Remotion project, renderuje dashboard -> PNG/MOV

Spec: `docs/superpowers/specs/2026-04-21-silent-build-design.md`
Plan: `docs/superpowers/plans/2026-04-21-silent-build-pipeline-mvp.md`

## Wymagania

- Node 22+ (dziala tez na Node 20.11+ z warningiem)
- pnpm 9+

## Setup

```bash
pnpm install
pnpm test         # wszystkie paczki
pnpm typecheck
```

## Workflow per film

1. **Przed sesja:**
   ```bash
   pnpm mark project-start --name "FocusFeed"
   # zapisz komende `export SILENT_BUILD_DIR=...` z outputu
   ```

2. **OBS:** rozpocznij nagrywanie -> `output/focusfeed-<date>/screen.mp4`

3. **Claude Code:** koduj jak normalnie. Sesja sie loguje do `~/.claude/projects/.../<session-uuid>.jsonl`

4. **Na zmianach faz (w trakcie sesji):**
   ```bash
   pnpm mark backend-start
   pnpm mark frontend-start
   pnpm mark security-start
   pnpm mark polish-start
   ```

5. **Po sesji — harvest + render:**
   ```bash
   pnpm harvest --project $SILENT_BUILD_DIR
   pnpm render --project $SILENT_BUILD_DIR
   ```

6. **Montaz w CapCut:**
   - Import `screen.mp4` (70% lewa)
   - Import `dashboard_frames/` jako image sequence (30% prawa)
   - Sync po pierwszej klatce, ciecia, tempo, muzyka, thumbnail

## Struktura

```
packages/
  shared/       # typy i schematy (Zod)
  markers/      # pnpm mark <phase>
  harvester/    # pnpm harvest
  overlay/      # pnpm render / pnpm studio
output/
  <project>-<date>/
    manual_markers.json
    timeline.json
    screen.mp4              # gitignored
    dashboard.mov           # gitignored
    dashboard_frames/       # gitignored
docs/
  superpowers/
    specs/                  # design docs
    plans/                  # implementation plans
scripts/
  smoke-e2e.sh              # end-to-end verification
```

## Development

- `pnpm studio` — Remotion Studio z mock timeline, hot reload dashboardu
- `pnpm test` — Vitest we wszystkich paczkach
- `pnpm typecheck` — TS check we wszystkich paczkach
- `./scripts/smoke-e2e.sh` — pelen pipeline na biezacej sesji CC (renderuje 60 klatek dla szybkiej weryfikacji)
