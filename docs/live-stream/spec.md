# silent-build Live Stream — Technical Spec

**Date:** 2026-04-23
**Branch:** `feat/live-stream` (off `main`)
**Status:** Architecture locked — implementation pending
**Context:** Reuse silent-build visual stack (NASA mission-control dashboard, brand, 4 compositions) in a real-time browser-rendered overlay, for live coding streams (Twitch/YT Live) where the author speaks, Claude Code works in the background, and viewers watch both.

## TL;DR

- **Data path:** `~/.claude/projects/<slug>/<uuid>.jsonl` → `fs.watch` tail → Node http server → SSE → Vite React browser app → OBS Browser Source
- **Targets:** <150 ms latency from jsonl write to pixel change; <200 MB browser memory after 4 h stream; <2% idle / <10% burst server CPU
- **Reuse:** ~80% of silent-build code (tokens, widgets, compositions, brand) extracted to shared `@silent-build/theme` + `@silent-build/ui` packages, consumed by both Remotion (VOD) and Vite (live)
- **Overlay triggers:** markers CLI auto-flashes PhaseTransition on `pnpm mark`; small webapp `/control` for manual Intro/Outro
- **Privacy:** redactor middleware scans every event for API keys / tokens before SSE broadcast

## Non-goals (explicitly out of scope for MVP)

- Multi-client stream (one author, one OBS instance)
- Twitch/YT chat integration (events flow one-way, no chat commands triggering overlays)
- Remote deployment (everything runs on localhost; stream is pushed to Twitch/YT by OBS, not by us)
- Authentication (localhost only; no Internet-facing surface)
- VOD pipeline — silent-build Remotion pipeline stays as-is for post-stream edits

## Architecture

### Runtime topology

```
  Claude Code CLI                        OBS Studio
  (writes .jsonl)                         (Display Capture + Browser Source)
         |                                       ^
         | file append                           | renders
         v                                       |
  ~/.claude/projects/<slug>/<uuid>.jsonl         | HTTP GET /dashboard  (static Vite build)
         |                                       | HTTP GET /events     (SSE stream)
         |  fs.watch 'change' event              | HTTP GET /api/timeline (initial snapshot)
         v                                       |
  +--------------------------------------+       |
  |  live-server (Node http)             |-------+
  |  :3333                               |
  |   - Watcher (chokidar/fs.watch)      |
  |   - Incremental JSONL parser         |  triggers:
  |   - In-memory SessionTimeline store  |  POST /api/trigger/phase?n=2
  |   - Redactor middleware              |<---------- pnpm mark backend-start
  |   - SSE broadcaster                  |<---------- Browser /control panel
  |   - Trigger bus                      |
  +--------------------------------------+
         ^
         |
  Terminal: pnpm mark <phase>  --live
```

### Monorepo layout (after refactor)

```
packages/
  shared/              unchanged  — Zod schemas, types
  theme/               NEW        — tokens.ts, fonts.ts (pure data, no runtime deps)
  ui/                  NEW        — widgets, compositions, brand; pure React components,
                                     Remotion-free. Animations driven by injected prop
                                     (pulsePhase: number 0..1) from host.
  markers/             extended   — gains --live flag → POST to live-server after file write
  harvester/           unchanged  — VOD post-processing
  overlay/             refactor   — Remotion host; wraps @silent-build/ui components in
                                     <Composition>, supplies pulsePhase from useCurrentFrame
  live-server/         NEW        — Node http, fs watcher, SSE, redactor
  live-dashboard/      NEW        — Vite React app; consumes SSE, renders @silent-build/ui
```

### Why extract `theme` and `ui`

Today `tokens.ts` lives in `packages/overlay/src/theme/tokens.ts` and widgets live in `packages/overlay/src/widgets/`. Live-dashboard (Vite) and overlay (Remotion) both need them, and cross-package imports from `live-dashboard → overlay` would force Vite to bundle Remotion (200+ MB dep tree). Clean fix: hoist the presentation layer to `theme` + `ui`, both zero-dep-on-Remotion.

### Widget animation abstraction

Widgets today use `useCurrentFrame()` for pulse animations. In live mode there's no Remotion frame. Solution: **host-injected animation phases via React Context**.

```typescript
// @silent-build/ui/context.ts
interface AnimationContext {
  currentMs: number   // elapsed session time
  pulse1s: number     // 0..1 phase, repeats every 1s
  pulse15s: number    // 0..1 phase, repeats every 1.5s
  pulse2s: number     // 0..1 phase, repeats every 2s
}

export const AnimationCtx = createContext<AnimationContext>({
  currentMs: 0, pulse1s: 0, pulse15s: 0, pulse2s: 0
})
export const useAnimation = () => useContext(AnimationCtx)
```

- Remotion host (`packages/overlay`) wraps compositions with provider computed from `useCurrentFrame + fps`
- Live host (`packages/live-dashboard`) wraps App with provider computed from `performance.now()` in a `requestAnimationFrame` loop (throttled to 30 Hz — sufficient for pulse cosmetics, saves CPU)

Widget code is identical in both hosts. This is the **one pattern** for cross-mode sharing.

## Data flow

### JSONL ingest

1. `chokidar.watch(jsonlPath, { awaitWriteFinish: false, usePolling: false })` (v5, native `fs.watch` under the hood)
2. On `change` event: read file stats, read bytes from last known offset to new size
3. Split on `\n`, keep trailing partial line in buffer (stream may flush mid-line)
4. For each complete line: JSON.parse, reuse `parseJsonl` logic from `@silent-build/harvester/parser` (extract into shared module)
5. Extract relevant events via existing `extractor` functions (reuse harvester's `extractPrompts`, `extractTokens`, `extractFileOps`, `extractToolCalls`)
6. Merge into in-memory `SessionTimeline` store
7. Emit `timeline-delta` event on internal bus with new events only

**Why not `awaitWriteFinish`:** it delays events until file size stabilizes (>200 ms blocker). We want <50 ms from line-flush to SSE push. A partial line just stays in our buffer until the next `change` event completes it.

### SSE broadcast

- `GET /events` establishes `text/event-stream` response
- Server immediately sends `event: snapshot\ndata: {full timeline}\n\n` so the client has initial state
- Every subsequent `timeline-delta` → `event: delta\ndata: {new events}\n\n`
- Every trigger → `event: trigger\ndata: {scene, props}\n\n`
- Heartbeat every 15 s: `event: ping\ndata: {}\n\n` (prevents intermediary buffering / idle disconnect)
- Client sets `Last-Event-ID` on reconnect; server uses it to backfill only events with higher id

### Browser state store

- `useSyncExternalStore` (React 18 built-in) over a plain observable object
- Mutations are **structural**: `events.push(newEvent)` in place, subscribers notified via version counter
- Widgets subscribe via selector: `useStore(s => s.timeline.events.filter(...))` — re-renders only when selector result changes
- For long streams (~1000s of events): use a **ring buffer** for activity log (only last 100 events in UI-reachable state; full history available if needed)

### Trigger bus

- `POST /api/trigger/intro` → emits `{ scene: 'Intro' }`
- `POST /api/trigger/phase?n=2` → emits `{ scene: 'PhaseTransition', props: { n: 2, phase: currentPhaseFromTimeline } }`
- `POST /api/trigger/outro` → emits `{ scene: 'Outro', props: { metrics: timeline.metrics, durationMs } }`
- `POST /api/trigger/clear` → emits `{ scene: null }`
- SSE event `trigger` → browser sets `overlayState`, renders `<IntroCard/>` / `<OutroCard/>` / `<PhaseTransition/>` full-screen on top of Dashboard for their natural duration (4s/7s/2.5s), then auto-clears

## Visual layout

### OBS scene (what streamer configures)

```
Canvas 1920x1080 @ 60fps
  Layer 1 (bottom) — Display Capture: terminal/editor at full size
  Layer 2          — Browser Source #1: http://localhost:3333/dashboard (576x1080, right 30%)
  Layer 3          — Browser Source #2: http://localhost:3333/overlay   (1920x1080, transparent bg,
                                                                          fires only on triggers)
  Layer 4 (top)    — Webcam Source (optional corner picture-in-picture)
```

Dashboard always visible (real-time telemetry); overlay is "empty transparent page" 99% of the time, fills with IntroCard/OutroCard/PhaseTransition for 2.5–7 s when triggered.

### Browser routes

- `GET /dashboard` — Vite static build of dashboard SPA (576×1080, transparent bg, runs the Dashboard component from `@silent-build/ui`)
- `GET /overlay` — same SPA mounted differently: 1920×1080, transparent, only shows overlay scenes
- `GET /control` — mini control panel (buttons: Intro / Phase 1-4 / Outro / Clear)

All three routes hit same SSE endpoint. Control panel POSTs to trigger API; dashboard and overlay are pure listeners.

## Redactor (privacy)

Between parser and SSE broadcast, every event passes through `scan(event) → event`. Patterns matched in `event.data.text` (for `prompt` events), `event.data.args` (for `tool_call` events where args may contain credentials), and `event.data.content` (for file writes).

### Default patterns

- `sk-[a-zA-Z0-9]{32,}` — OpenAI
- `sk-ant-[a-zA-Z0-9_-]{32,}` — Anthropic
- `gh[pousr]_[a-zA-Z0-9]{36,}` — GitHub
- `AKIA[0-9A-Z]{16}` — AWS access key
- `eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+` — JWT-shaped
- `Bearer\s+[A-Za-z0-9_-]+\.?[A-Za-z0-9_-]*\.?[A-Za-z0-9_-]*`

### User-configurable

`packages/live-server/config.json`:

```json
{
  "redactor": {
    "patterns": ["custom-regex-1", "custom-regex-2"],
    "keywords": ["PASSWORD", "SECRET_KEY"],
    "replacement": "[REDACTED]",
    "enabled": true
  }
}
```

On startup, load user patterns; merge with defaults. If a field matches any pattern or contains a keyword (case-insensitive), replace the matching substring with `replacement`.

### What redactor does NOT touch

- `tool_call.name` — always OK (`Bash`, `Read`, etc.)
- `file_write.path` / `file_edit.path` — file paths rarely sensitive; keep for Activity Log readability
- Metrics (counters) — just numbers

If an event becomes fully redacted (entire prompt text stripped), replace with a single `[REDACTED]` placeholder so the Activity Log still shows a beat occurred.

## Performance

### Targets (hard limits)

- **End-to-end latency** (jsonl write → Dashboard pixel update): **<150 ms p95**, **<50 ms p50**
- **Server memory** after 4 h session: **<100 MB**
- **Browser memory** after 4 h session: **<200 MB**
- **Server CPU**: **<2% idle, <10% burst** (per core, 1 core machine fine)
- **Browser CPU** (OBS Browser Source tab): **<15% average** on mid-range laptop

### Techniques

- fs.watch native (not polling) — zero CPU at rest
- Incremental read (only new bytes) — O(δ), not O(filesize) per event
- SSE with HTTP/2 keepalive — no per-event TCP overhead
- `useSyncExternalStore` + selectors — selective re-renders, not whole tree
- Ring buffer for activity log — bounded memory regardless of session length
- `requestAnimationFrame` throttled to 30 Hz for pulse animation updates (live mode) — visually smooth, half the CPU of 60 Hz
- CSS `will-change` + `transform: translateZ(0)` on animated widgets — GPU-accelerated paint
- Vite production build with code-split compositions (IntroCard / OutroCard / PhaseTransition lazy-loaded on first trigger)

### Benchmarks to verify (smoke test)

- Synthesize a jsonl with 1000 events spanning 10 min, feed incrementally, measure p50/p95/p99 event-to-paint latency
- Run browser tab for 4 h with periodic event injection; watch memory via devtools
- Measure CPU over a 30 min span via `top -p <node_pid>` and Chromium task manager

## Public contracts

### Shared types (unchanged from silent-build)

Still `SessionTimeline`, `Phase`, `TimelineEvent`, `ManualMarker` from `@silent-build/shared`.

### New: LiveServerMessage (SSE envelope)

```typescript
// packages/shared/src/live.ts (new file)
import { z } from 'zod'
import { SessionTimelineSchema, TimelineEventSchema } from './types.js'

export const SnapshotMessageSchema = z.object({
  kind: z.literal('snapshot'),
  timeline: SessionTimelineSchema
})

export const DeltaMessageSchema = z.object({
  kind: z.literal('delta'),
  events: z.array(TimelineEventSchema)
})

export const TriggerMessageSchema = z.object({
  kind: z.literal('trigger'),
  scene: z.enum(['Intro', 'Outro', 'PhaseTransition', 'Clear']),
  props: z.unknown().optional()
})

export const PingMessageSchema = z.object({ kind: z.literal('ping'), ts: z.number() })

export const LiveServerMessageSchema = z.discriminatedUnion('kind', [
  SnapshotMessageSchema,
  DeltaMessageSchema,
  TriggerMessageSchema,
  PingMessageSchema
])
export type LiveServerMessage = z.infer<typeof LiveServerMessageSchema>
```

### New: AnimationContext (UI package)

```typescript
// packages/ui/src/context.ts
export interface AnimationContextValue {
  currentMs: number
  pulse1s: number   // 0..1
  pulse15s: number  // 0..1
  pulse2s: number   // 0..1
}
```

Widgets `useAnimation()` to get pulse phases; compute opacity via `Math.abs(phase * 2 - 1)` or `Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5`.

## Server endpoints

| Method | Path | Purpose | Body | Response |
|---|---|---|---|---|
| GET | `/events` | SSE stream of `LiveServerMessage` | — | `text/event-stream` |
| GET | `/api/timeline` | Full snapshot (initial load, no SSE) | — | `SessionTimeline` JSON |
| GET | `/api/health` | Liveness | — | `{ ok: true, uptimeMs }` |
| POST | `/api/trigger/:scene` | Fire overlay; `:scene` in `intro / outro / phase / clear`; `?n=1..4` for phase | — | `204 No Content` |
| GET | `/dashboard/*` | Vite static build (dashboard SPA) | — | html/js/css |
| GET | `/overlay/*` | Vite static build (overlay SPA) | — | html/js/css |
| GET | `/control/*` | Vite static build (control panel) | — | html/js/css |

All three static bundles are the same Vite multi-entry build — dashboard / overlay / control pick mode from URL path.

## Configuration

Single config file `silent-build.live.json` at repo root (gitignored if contains secrets):

```json
{
  "server": {
    "port": 3333,
    "host": "127.0.0.1"
  },
  "watcher": {
    "projectPath": "auto",
    "sessionUuid": "auto",
    "pollInterval": null
  },
  "redactor": {
    "enabled": true,
    "patterns": [],
    "keywords": [],
    "replacement": "[REDACTED]"
  },
  "ui": {
    "activityLogMaxEntries": 100,
    "pulseFps": 30
  }
}
```

`auto` for watcher: resolve from `process.cwd()` → `.claude/projects/<slug>/` → latest `.jsonl` by mtime (same logic as `harvester/cli.ts`).

## Error handling

- JSONL malformed line: warn to stderr with line number, skip, continue watching
- jsonl file rotated / deleted: detect via `fs.watch 'rename'`, reset offset to 0, re-read fresh file
- SSE client drops: detect via `res.on('close')`, remove from broadcaster set
- SSE client reconnects with `Last-Event-ID`: server keeps last 500 events in a ring; replay those after header id
- Browser loses server (server restarts): EventSource auto-reconnects in 3 s, full snapshot re-fetched
- Redactor regex fails (bad user pattern): log, skip that pattern, don't crash
- fs.watch hits inotify limit: log warning with `sysctl fs.inotify.max_user_watches` hint, continue with polling fallback

## Deployment

Localhost-only. No Docker, no PM2 needed.

```bash
# Terminal 1: start live-server + watch the currently-active CC session
pnpm live:server

# Terminal 2: start Vite dev (hot reload)  — dev mode
pnpm live:dashboard:dev

# OR: production build + serve via live-server's static handler
pnpm live:build && pnpm live:server   # serves http://localhost:3333/dashboard
```

OBS points to `http://localhost:3333/dashboard` and `/overlay`. Streamer optionally opens `http://localhost:3333/control` in a separate browser tab for manual triggers.

## Security posture

- Server binds `127.0.0.1` by default — not reachable from network
- No auth; localhost trust boundary
- Redactor catches most obvious credential leaks; it's **not** a security boundary, it's a "don't accidentally stream a key" hygiene filter
- If user opens `/control` on phone via LAN: optional flag `--host 0.0.0.0` + simple shared secret header (planned P2, not MVP)

## Future / P2

- Stream Deck HTTP endpoint integration (drop-in with existing `/api/trigger` contract)
- OBS WebSocket bridge: scene change on phase transition
- Chat-driven triggers (Twitch/YT IRC) with allow-list moderation
- Record-mode: live-server writes `timeline.json` + markers at session end → feed to silent-build Remotion pipeline for VOD auto-edit
- Multi-composition blending (Phase 2 transition fades into Dashboard, not cuts)
- `--remote` flag for tailscale / cloudflared exposure with auth

## Verification (end-to-end smoke)

`scripts/smoke-live.sh`:

1. Start live-server on :3333
2. Synthesize jsonl: write 50 events to `/tmp/smoke.jsonl` over 10 s (one every 200 ms)
3. Spawn headless Chromium via Playwright pointing at `http://localhost:3333/dashboard`
4. Measure time from jsonl write → Playwright sees corresponding DOM change (via `page.waitForFunction`)
5. Fire triggers via `curl POST /api/trigger/phase?n=2`; verify DOM overlay appears within 150 ms
6. Assert p95 latency < 150 ms, no memory leak after 5 min

## Timeline

Estimated 4.5 days of dev work spread over one feature branch. Details in `docs/live-stream/plan.md`.

## References

- Silent-build VOD spec: `docs/superpowers/specs/2026-04-21-silent-build-design.md`
- VOD plan: `docs/superpowers/plans/2026-04-21-silent-build-pipeline-mvp.md`
- Design brief (visual): `docs/design-brief.md`
- Live stream idea seed: `ideas/Live Coding Stream - wykorzystanie silent-build do formatu live z gadaniem.md`
