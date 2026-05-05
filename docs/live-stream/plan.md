# silent-build Live Stream — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task. Steps use `- [ ]` for tracking.

**Goal:** Ship a real-time browser dashboard + overlay layer that runs alongside silent-build's VOD pipeline, reusing ~80% of its visual code and delivering <150 ms end-to-end latency from JSONL write to pixel update.

**Architecture (locked):** SSE transport, plain Node `http` server, Vite + React + TypeScript browser app, markers CLI + control panel for triggers. Full detail in `docs/live-stream/spec.md`.

**Tech Stack:** TypeScript 5.5+, Node 22 (works on 20.11+), pnpm 9, Vitest (tests), Vite 6 (browser bundler), `chokidar` v5 (file watcher), `@fontsource/*` (browser fonts), `react` 18 (UI).

**Branch:** `feat/live-stream` (off `main`).

---

## File Structure (after all tasks complete)

```
silent-build/
  packages/
    shared/
      src/
        types.ts              unchanged
        live.ts               NEW — LiveServerMessage discriminated union (Zod)

    theme/                    NEW PACKAGE
      package.json
      tsconfig.json
      src/
        tokens.ts             MOVED from packages/overlay/src/theme/
        fonts.ts              MOVED from packages/overlay/src/theme/
        index.ts              barrel
      tests/
        tokens.test.ts        smoke (schema shape)

    ui/                       NEW PACKAGE
      package.json
      tsconfig.json
      src/
        context.ts            NEW — AnimationCtx + useAnimation hook
        widgets/              MOVED from packages/overlay/src/widgets/
          Timer.tsx           refactored to useAnimation()
          PhaseBar.tsx        refactored
          SecurityPanel.tsx   refactored
          ...5 other widgets
        compositions/         MOVED from packages/overlay/src/compositions/
          IntroCard.tsx       refactored: replace useCurrentFrame with useAnimation
          OutroCard.tsx       refactored
          PhaseTransition.tsx refactored
          Thumbnail.tsx       refactored
        brand/                MOVED from packages/overlay/src/brand/
          Logo.tsx            unchanged
          Wordmark.tsx        unchanged
        Dashboard.tsx         MOVED + refactored
        index.ts              barrel
      tests/
        widgets.test.tsx      renders each widget, asserts no crash

    overlay/                  REFACTOR
      src/
        Root.tsx              imports from @silent-build/ui, wraps in AnimationCtx provider
        render-cli.ts         unchanged
        fixtures/             unchanged
        theme/                DELETE (now in @silent-build/theme)
        widgets/              DELETE (now in @silent-build/ui)
        compositions/         DELETE (now in @silent-build/ui)
        brand/                DELETE (now in @silent-build/ui)
        Dashboard.tsx         DELETE (now in @silent-build/ui)
        lib/                  unchanged

    markers/                  EXTEND
      src/
        cli.ts                add --live flag; if set, POST to live-server after file write
        live-client.ts        NEW — tiny fetch wrapper for live-server triggers

    harvester/                unchanged
                              (parser/extractor also used by live-server; keep exports stable)

    live-server/              NEW PACKAGE
      package.json
      tsconfig.json
      src/
        cli.ts                `pnpm live:server` entry
        server.ts             plain node:http, routing, SSE
        watcher.ts            chokidar wrapper + incremental tail parser
        store.ts              in-memory SessionTimeline + EventEmitter
        redactor.ts           regex scan + replace
        triggers.ts           POST /api/trigger/:scene handler
        static.ts             serve Vite build dirs
        config.ts             load silent-build.live.json
      tests/
        watcher.test.ts       temp file, write lines, assert parsed events
        redactor.test.ts      patterns, replacements, custom config
        store.test.ts         delta vs snapshot semantics
        server.test.ts        SSE handshake, trigger route, snapshot endpoint

    live-dashboard/           NEW PACKAGE
      package.json
      tsconfig.json
      vite.config.ts
      index.html              shell (imports /src/main-dashboard.tsx)
      overlay.html            shell (imports /src/main-overlay.tsx)
      control.html            shell (imports /src/main-control.tsx)
      src/
        main-dashboard.tsx    mounts Dashboard + AnimationCtx + SSE store
        main-overlay.tsx      mounts OverlayHost (shows Intro/Outro/PhaseTransition on trigger)
        main-control.tsx      mounts ControlPanel
        lib/
          sse.ts              EventSource wrapper → store
          store.ts            useSyncExternalStore implementation
          animation.ts        rAF loop → AnimationCtx value at 30 Hz
          api.ts              fetch wrapper for trigger POSTs
        components/
          OverlayHost.tsx     renders current overlay scene or null
          ControlPanel.tsx    button grid
      tests/
        store.test.ts         snapshot + delta + ring buffer

  scripts/
    smoke-live.sh             NEW — E2E smoke (synthesize jsonl, run browser, measure)

  docs/live-stream/
    spec.md                   committed (previous step)
    plan.md                   this file
    obs-setup.md              NEW — OBS scene config walkthrough

  silent-build.live.json      NEW config (gitignored if has secrets)
  .gitignore                  add silent-build.live.json

  package.json                add scripts:
                                "live:server": "pnpm --filter @silent-build/live-server run start",
                                "live:dashboard:dev": "pnpm --filter @silent-build/live-dashboard run dev",
                                "live:build": "pnpm --filter @silent-build/live-dashboard run build"
```

---

## Phase 0 — Scaffolding (0.3 day, 2 commits)

### Task 0.1: Workspace layout + shared live schema

**Files:**
- Create: `packages/shared/src/live.ts`
- Modify: `packages/shared/src/index.ts` (barrel re-export)

- [ ] **Step 1: Tests first**

Create `packages/shared/tests/live.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { LiveServerMessageSchema } from '../src/live.js'

describe('LiveServerMessageSchema', () => {
  it('accepts snapshot', () => {
    expect(() => LiveServerMessageSchema.parse({
      kind: 'snapshot',
      timeline: {
        project: { name: 't', startTs: 0, endTs: 1 },
        phases: [
          { index: 1, label: 'A', startTs: 0, endTs: 1, source: 'heuristic' },
          { index: 2, label: 'B', startTs: 0, endTs: 1, source: 'heuristic' },
          { index: 3, label: 'C', startTs: 0, endTs: 1, source: 'heuristic' },
          { index: 4, label: 'D', startTs: 0, endTs: 1, source: 'heuristic' }
        ],
        events: [],
        metrics: { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
      }
    })).not.toThrow()
  })
  it('accepts delta', () => {
    expect(() => LiveServerMessageSchema.parse({
      kind: 'delta',
      events: [{ ts: 1, type: 'prompt', data: { text: 'x', tokensIn: 1 } }]
    })).not.toThrow()
  })
  it('accepts trigger with scene enum', () => {
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'Intro' })).not.toThrow()
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'Clear' })).not.toThrow()
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'Bogus' })).toThrow()
  })
  it('accepts ping', () => {
    expect(() => LiveServerMessageSchema.parse({ kind: 'ping', ts: 123 })).not.toThrow()
  })
  it('rejects unknown kind', () => {
    expect(() => LiveServerMessageSchema.parse({ kind: 'whatever' })).toThrow()
  })
})
```

- [ ] **Step 2: Implement `packages/shared/src/live.ts`**

```typescript
import { z } from 'zod'
import { SessionTimelineSchema, TimelineEventSchema } from './types.js'

export const SnapshotMessageSchema = z.object({
  kind: z.literal('snapshot'),
  timeline: SessionTimelineSchema
})
export type SnapshotMessage = z.infer<typeof SnapshotMessageSchema>

export const DeltaMessageSchema = z.object({
  kind: z.literal('delta'),
  events: z.array(TimelineEventSchema)
})
export type DeltaMessage = z.infer<typeof DeltaMessageSchema>

export const TriggerMessageSchema = z.object({
  kind: z.literal('trigger'),
  scene: z.enum(['Intro', 'Outro', 'PhaseTransition', 'Clear']),
  props: z.unknown().optional()
})
export type TriggerMessage = z.infer<typeof TriggerMessageSchema>

export const PingMessageSchema = z.object({
  kind: z.literal('ping'),
  ts: z.number().nonnegative()
})
export type PingMessage = z.infer<typeof PingMessageSchema>

export const LiveServerMessageSchema = z.discriminatedUnion('kind', [
  SnapshotMessageSchema,
  DeltaMessageSchema,
  TriggerMessageSchema,
  PingMessageSchema
])
export type LiveServerMessage = z.infer<typeof LiveServerMessageSchema>
```

- [ ] **Step 3: Update barrel**

Append to `packages/shared/src/index.ts`:

```typescript
export * from './live.js'
```

- [ ] **Step 4: Test + typecheck + commit**

Run:
```bash
pnpm --filter @silent-build/shared test
pnpm --filter @silent-build/shared typecheck
```
Expected: all pass.

```bash
git add packages/shared
git commit -m "feat(shared): add LiveServerMessage schema (snapshot|delta|trigger|ping)"
```

---

## Phase 1 — Extract theme + ui packages (0.7 day, ~5 commits)

**This refactor is pure code movement + animation abstraction. Silent-build VOD pipeline MUST keep working after each commit.** Every commit runs full suite + renders `output/drupal-test/` smoke PNG to verify zero visual diff.

### Task 1.1: Create `@silent-build/theme` package

**Files:**
- Create: `packages/theme/package.json`
- Create: `packages/theme/tsconfig.json`
- Move: `packages/overlay/src/theme/tokens.ts` → `packages/theme/src/tokens.ts`
- Move: `packages/overlay/src/theme/fonts.ts` → `packages/theme/src/fonts.ts`
- Create: `packages/theme/src/index.ts`
- Create: `packages/theme/tests/tokens.test.ts`

- [ ] **Step 1: Create package skeleton**

Create `packages/theme/package.json`:

```json
{
  "name": "@silent-build/theme",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@remotion/google-fonts": "^4.0.451"
  }
}
```

Create `packages/theme/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 2: Move files**

```bash
mv packages/overlay/src/theme/tokens.ts packages/theme/src/tokens.ts
mv packages/overlay/src/theme/fonts.ts packages/theme/src/fonts.ts
rmdir packages/overlay/src/theme
```

- [ ] **Step 3: Create barrel**

`packages/theme/src/index.ts`:

```typescript
export * from './tokens.js'
export * from './fonts.js'
```

- [ ] **Step 4: Basic smoke test**

`packages/theme/tests/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { tokens } from '../src/tokens.js'

describe('tokens', () => {
  it('has all required color keys', () => {
    const required = ['bg', 'panel', 'grid', 'textPrimary', 'textDim', 'textMuted',
      'amber', 'amberBright', 'amberDim', 'amberGlow',
      'greenOk', 'greenDim', 'redAlert', 'cyanData']
    for (const k of required) {
      expect(tokens.colors[k as keyof typeof tokens.colors]).toBeDefined()
    }
  })
  it('typography hierarchy is present', () => {
    expect(tokens.typography.h1).toBeDefined()
    expect(tokens.typography.label).toBeDefined()
    expect(tokens.typography.fontMono).toBeDefined()
  })
  it('effects and spacing present', () => {
    expect(tokens.effects.scanInsetPx).toBe(12)
    expect(tokens.spacing.md).toBe(16)
  })
})
```

- [ ] **Step 5: Update all overlay imports**

In `packages/overlay`, all files currently importing from `'./theme/tokens.js'` or `'../theme/tokens.js'` need to import from `'@silent-build/theme'` instead. Files to update:

- `packages/overlay/src/Dashboard.tsx`
- `packages/overlay/src/Root.tsx`
- `packages/overlay/src/widgets/Timer.tsx`
- `packages/overlay/src/widgets/CurrentPrompt.tsx`
- `packages/overlay/src/widgets/TokenCounter.tsx`
- `packages/overlay/src/widgets/FileActivity.tsx`
- `packages/overlay/src/widgets/ActivityLog.tsx`
- `packages/overlay/src/widgets/PhaseBar.tsx`
- `packages/overlay/src/widgets/SecurityPanel.tsx`
- `packages/overlay/src/compositions/IntroCard.tsx`
- `packages/overlay/src/compositions/OutroCard.tsx`
- `packages/overlay/src/compositions/PhaseTransition.tsx`
- `packages/overlay/src/compositions/Thumbnail.tsx`
- `packages/overlay/src/brand/Logo.tsx`
- `packages/overlay/src/brand/Wordmark.tsx`

For each: replace `import { tokens } from '.../theme/tokens.js'` with `import { tokens } from '@silent-build/theme'`. Same for `loadFonts` from `fonts.js`.

- [ ] **Step 6: Add dep in overlay**

In `packages/overlay/package.json`, add to `dependencies`:

```json
"@silent-build/theme": "workspace:*"
```

- [ ] **Step 7: Install, typecheck, test, render smoke**

```bash
pnpm install
pnpm --filter @silent-build/theme test
pnpm --filter @silent-build/overlay typecheck
pnpm --filter @silent-build/overlay test
rm -rf output/drupal-test/dashboard_frames
pnpm render:dashboard --project output/drupal-test --format png --fps 30 --start-frame 539 --max-frames 1
md5sum output/drupal-test/dashboard_frames/*.png docs/reference-frames/current-dashboard.png
```

Expected: both md5s identical (pure refactor, zero visual diff).

- [ ] **Step 8: Commit**

```bash
git add packages/theme packages/overlay pnpm-lock.yaml
git commit -m "refactor: extract @silent-build/theme package (tokens + fonts)"
```

### Task 1.2: Create `@silent-build/ui` package + animation context

**Files:**
- Create: `packages/ui/{package.json, tsconfig.json}`
- Create: `packages/ui/src/context.ts` — NEW AnimationCtx
- Move: `packages/overlay/src/widgets/*` → `packages/ui/src/widgets/*`
- Move: `packages/overlay/src/compositions/*` → `packages/ui/src/compositions/*`
- Move: `packages/overlay/src/brand/*` → `packages/ui/src/brand/*`
- Move: `packages/overlay/src/Dashboard.tsx` → `packages/ui/src/Dashboard.tsx`
- Refactor widgets to use `useAnimation()` instead of `useCurrentFrame()`

- [ ] **Step 1: Create context**

`packages/ui/src/context.ts`:

```typescript
import { createContext, useContext } from 'react'

export interface AnimationContextValue {
  currentMs: number
  pulse1s: number
  pulse15s: number
  pulse2s: number
  fps: number
}

const DEFAULT: AnimationContextValue = {
  currentMs: 0, pulse1s: 0, pulse15s: 0, pulse2s: 0, fps: 60
}

export const AnimationCtx = createContext<AnimationContextValue>(DEFAULT)
export const useAnimation = () => useContext(AnimationCtx)

/**
 * Helper: 0..1 phase → opacity that pulses [lo, hi, lo]
 */
export const pulseOpacity = (phase: number, lo = 0.4, hi = 1): number => {
  const tri = 1 - Math.abs(phase * 2 - 1)
  return lo + (hi - lo) * tri
}
```

- [ ] **Step 2: Refactor widgets — Timer**

Current `Timer.tsx` uses `useCurrentFrame` + `useVideoConfig`. Replace:

```typescript
// OLD
const frame = useCurrentFrame()
const { fps } = useVideoConfig()
const dotOpacity = interpolate(frame % fps, [0, fps/2, fps], [1, 0.35, 1])

// NEW
import { useAnimation, pulseOpacity } from '../context.js'
const { pulse1s } = useAnimation()
const dotOpacity = pulseOpacity(pulse1s, 0.35, 1)
```

Drop all `remotion` imports from widget. Props contract (`elapsedMs`, `totalMs`) unchanged.

- [ ] **Step 3: Repeat for PhaseBar, SecurityPanel**

Both use `useCurrentFrame` for pulse. Replace identically:
- PhaseBar: uses 1.5s cycle → `pulse15s`
- SecurityPanel: uses 1.5s cycle → `pulse15s`

- [ ] **Step 4: Refactor Dashboard**

`Dashboard.tsx` computes `currentMs` from `frame / fps`:

```typescript
// OLD
const frame = useCurrentFrame()
const { fps } = useVideoConfig()
const currentMs = Math.floor((frame / fps) * 1000)

// NEW
const { currentMs } = useAnimation()
```

Drop `remotion` imports. Also update `HeaderStrip` internal component (uses beacon pulse).

- [ ] **Step 5: Refactor compositions (IntroCard, OutroCard, PhaseTransition)**

Each currently uses `useCurrentFrame` heavily for animations. Replace with `useAnimation().currentMs + fps` and compute `frame = Math.floor(currentMs * fps / 1000)` locally at the top of the component. Rest of the math stays the same (interpolate on "frame" variable). This is the minimum-change path.

Example for `IntroCard.tsx`:

```typescript
// OLD
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion'
// ...
const frame = useCurrentFrame()
const { fps, durationInFrames } = useVideoConfig()

// NEW
import { interpolate } from './interpolate.js'    // new local copy
import { spring } from './spring.js'              // new local copy
import { useAnimation } from '../context.js'
// ...
const { currentMs, fps } = useAnimation()
const frame = Math.floor(currentMs * fps / 1000)
const durationInFrames = /* from props or computed */
```

- [ ] **Step 6: Port `interpolate` and `spring` into ui package**

Remotion's `interpolate` and `spring` are pure math. Copy them into `packages/ui/src/remotion-shim/` with their original license. Compositions import from the shim instead of `remotion`.

Sources (to copy verbatim under MIT license):
- `interpolate`: standard linear interpolation with extrapolate options
- `spring`: damped spring physics

Actually simpler: write minimal implementations. `interpolate` is just a linear lerp; `spring` can be a `k * (1 - exp(-t/tau))` approximation. Keep the same function signature so compositions compile unchanged. Write unit tests for both matching Remotion behavior for standard cases.

- [ ] **Step 7: Also replace `Sequence` uses in IntroCard**

`Sequence` in Remotion shifts a child component's `useCurrentFrame` by a frame offset. In live mode there's no frame per se. IntroCard uses `<Sequence from={Math.round(fps * 0.2)}>` wrapping the data rows.

Replace with plain conditional render based on `frame >= from`:

```typescript
// OLD
<Sequence from={Math.round(fps * 0.2)}>
  <DataRows />
</Sequence>

// NEW
{frame >= Math.round(fps * 0.2) && <DataRows />}
```

- [ ] **Step 8: Tests**

`packages/ui/tests/widgets.test.tsx` renders each widget in a test AnimationCtx provider and asserts no crash. Use `@testing-library/react` (new devDep).

Also `packages/ui/tests/context.test.ts`: unit test `pulseOpacity` for representative phases.

- [ ] **Step 9: Update overlay to wrap in provider**

`packages/overlay/src/Root.tsx` — for each `<Composition>`, wrap component via `defaultProps` OR, better, create local `RemotionAnimationProvider` that computes phases from `useCurrentFrame` and wraps all compositions. Update each composition to be wrapped at registration time.

```typescript
// packages/overlay/src/RemotionAnimationProvider.tsx (new)
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { AnimationCtx, type AnimationContextValue } from '@silent-build/ui'

export const RemotionAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const value: AnimationContextValue = {
    currentMs: Math.floor(frame * 1000 / fps),
    pulse1s:  (frame % fps) / fps,
    pulse15s: (frame % Math.round(fps * 1.5)) / Math.round(fps * 1.5),
    pulse2s:  (frame % (fps * 2)) / (fps * 2),
    fps
  }
  return <AnimationCtx.Provider value={value}>{children}</AnimationCtx.Provider>
}
```

Then in `Root.tsx`, instead of `component={Dashboard}`, do `component={WithProvider(Dashboard)}` via a small HOC.

- [ ] **Step 10: Smoke render**

Re-render the reference frame:

```bash
pnpm render:dashboard --project output/drupal-test --format png --fps 30 --start-frame 539 --max-frames 1
md5sum output/drupal-test/dashboard_frames/*.png docs/reference-frames/current-dashboard.png
```

The md5 may NOT match byte-for-byte now (minor interpolate/spring differences if we rewrote rather than copied). Acceptable tolerance: visual inspection; open side-by-side and confirm identical. Document any delta.

If visual is OK, update `docs/reference-frames/current-dashboard.png` with new render.

- [ ] **Step 11: Commit**

```bash
git add packages/ui packages/overlay pnpm-lock.yaml docs/reference-frames
git commit -m "refactor: extract @silent-build/ui (widgets + compositions + brand) with AnimationCtx"
```

### Task 1.3: Full verification

- [ ] **Step 1: Full renders**

Render one frame from each composition:

```bash
pnpm render:dashboard --project output/drupal-test --format png --fps 30 --start-frame 539 --max-frames 1
pnpm render:intro --project output/drupal-test --format png --fps 60 --start-frame 60 --max-frames 1
pnpm render:outro --project output/drupal-test --format png --fps 60 --start-frame 210 --max-frames 1
pnpm render:phase --project output/drupal-test --format png --fps 60 --start-frame 70 --max-frames 1
pnpm render:thumb --project output/drupal-test --title "Refactor smoke test"
```

Visual inspection — open each PNG. All should match their pre-refactor counterparts.

- [ ] **Step 2: All tests green**

```bash
pnpm -r test
pnpm -r typecheck
```

Expected: 51+ tests pass (theme ~3 + ui widget snapshots + unchanged harvester/markers/shared).

---

## Phase 2 — live-server (1 day, ~6 commits)

### Task 2.1: Package scaffolding

- [ ] Create `packages/live-server/package.json`:

```json
{
  "name": "@silent-build/live-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "live-server": "./dist/cli.js" },
  "scripts": {
    "start": "tsx src/cli.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@silent-build/shared": "workspace:*",
    "chokidar": "^5.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

- [ ] Create `packages/live-server/tsconfig.json` (same pattern as harvester).
- [ ] Install: `pnpm install`.

### Task 2.2: Config loader

**Files:** `packages/live-server/src/config.ts`, `tests/config.test.ts`

- [ ] Tests first. Config defaults; override from JSON file; invalid JSON returns defaults with warning.
- [ ] Implement `loadConfig(path?: string): LiveConfig` with defaults from spec.

### Task 2.3: Watcher + incremental parser

**Files:** `packages/live-server/src/watcher.ts`, `tests/watcher.test.ts`

- [ ] Tests first (using `mkdtempSync` and `writeFileSync` appends):
  - Creating new jsonl → emits events
  - Appending more lines → emits delta
  - Partial line flush (no `\n` at end) → buffered, emitted on next append
  - Malformed JSON line → warns, skips, continues
  - File rotation (delete + recreate) → resets offset, re-reads fresh
- [ ] Implement class `JsonlWatcher extends EventEmitter` with `.start()` and `.stop()`.
- [ ] Reuse `parseJsonl` logic by importing from `@silent-build/harvester` (requires exposing it from harvester's barrel — add `export * from './parser.js'` if not present).

Actually harvester currently doesn't expose parser as a package export. Decision: expose it. Update `packages/harvester/package.json`:

```json
"exports": {
  ".": "./src/cli.ts",
  "./parser": "./src/parser.ts",
  "./extractor": "./src/extractor.ts"
}
```

And `live-server` depends on `@silent-build/harvester: "workspace:*"` and imports from `@silent-build/harvester/parser`.

### Task 2.4: Store

**Files:** `packages/live-server/src/store.ts`, `tests/store.test.ts`

- [ ] Tests first:
  - New store empty timeline with no events
  - `apply(newEvents)` sorts by ts, appends, updates metrics counters
  - `snapshot()` returns full timeline
  - `subscribe(fn)` fires on `apply`
  - Ring buffer behavior: activity log shows last N events, total count preserved
- [ ] Implement class `TimelineStore extends EventEmitter`:
  - `snapshot(): SessionTimeline`
  - `apply(events: TimelineEvent[]): void` — emits `delta`
  - Phase detection: on startup, use heuristic fallback from `@silent-build/harvester/phase-detector`; re-run on each marker added via `applyMarkers()`

### Task 2.5: Redactor

**Files:** `packages/live-server/src/redactor.ts`, `tests/redactor.test.ts`

- [ ] Tests first for each default pattern (OpenAI key, Anthropic key, GitHub token, AWS, JWT, Bearer). Plus:
  - Custom pattern from config
  - Keyword match (case-insensitive)
  - Full redaction → returns `[REDACTED]` placeholder
  - Nested `event.data.args` object traversal
- [ ] Implement `redactEvent(event, config): TimelineEvent`.

### Task 2.6: SSE server

**Files:** `packages/live-server/src/server.ts`, `tests/server.test.ts`

- [ ] Tests first (use `node:http` request + manual SSE parse):
  - GET `/events` returns 200 with `Content-Type: text/event-stream`
  - First event is `snapshot`
  - Store `.apply([event])` → next SSE message is `delta` with that event
  - Trigger POST → SSE `trigger` event
  - Heartbeat `ping` fires every `pingIntervalMs` (configured short for test)
  - Client disconnect → removed from broadcaster set
  - Last-Event-ID backfill from ring buffer
- [ ] Implement `createServer(deps): http.Server` with routing for all endpoints from spec.

### Task 2.7: CLI + static serving

**Files:** `packages/live-server/src/cli.ts`, `src/static.ts`

- [ ] CLI:
  - Auto-detect jsonl path via same logic as `harvester` CLI
  - `--port <n>`, `--project-root <path>`, `--session <uuid>`, `--config <path>`, `--no-redactor`
  - Prints `live-server on http://127.0.0.1:3333 — dashboard, /control, /overlay`
  - Keyboard Ctrl+C → graceful shutdown (close HTTP, flush SSE clients)
- [ ] Static handler: if `GET /dashboard/*` or `/overlay/*` or `/control/*`, resolve to `packages/live-dashboard/dist/<mode>/...`. If dist missing, return `503 Service Unavailable` with message "Run `pnpm live:build` first".

Smoke:
```bash
pnpm live:server &
curl http://localhost:3333/api/health
curl http://localhost:3333/api/timeline
curl -N http://localhost:3333/events  # should stream snapshot + pings
```

---

## Phase 3 — live-dashboard (1.5 day, ~7 commits)

### Task 3.1: Package + Vite config

- [ ] `packages/live-dashboard/package.json`:

```json
{
  "name": "@silent-build/live-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@silent-build/shared": "workspace:*",
    "@silent-build/theme": "workspace:*",
    "@silent-build/ui": "workspace:*",
    "@fontsource/space-grotesk": "^5.0.0",
    "@fontsource/jetbrains-mono": "^5.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] `vite.config.ts` with multi-entry (dashboard / overlay / control), `server.port: 5173`, alias matching tsconfig paths.

### Task 3.2: Store + SSE wrapper

**Files:** `src/lib/store.ts`, `src/lib/sse.ts`, `tests/store.test.ts`

- [ ] Store via `useSyncExternalStore` with external store object holding `{ timeline, overlay, version }`. Selectors via `subscribeWithSelector` pattern.
- [ ] SSE module opens `EventSource('/events')`, dispatches message handler per kind.
- [ ] Ring buffer for activity log: max 100 events in rendered slice.

### Task 3.3: Animation provider

**Files:** `src/lib/animation.ts`

- [ ] `<LiveAnimationProvider>`: starts rAF loop (throttled to config.ui.pulseFps Hz). Computes `pulse1s = (now % 1000) / 1000`, etc. Wraps children in `AnimationCtx.Provider` from `@silent-build/ui`.

### Task 3.4: Main dashboard page

**Files:** `src/main-dashboard.tsx`, `index.html`

- [ ] `index.html`: body transparent, module script to `/src/main-dashboard.tsx`
- [ ] `main-dashboard.tsx`: mounts `<Dashboard timeline={timeline} />` from `@silent-build/ui`, wrapped in `<LiveAnimationProvider>` and `<StoreProvider>`.
- [ ] Font imports via `@fontsource/space-grotesk/500.css` + `700.css` + `@fontsource/jetbrains-mono/400.css` + `500.css` + `700.css`.

### Task 3.5: Overlay page

**Files:** `src/main-overlay.tsx`, `overlay.html`, `src/components/OverlayHost.tsx`

- [ ] `OverlayHost`: reads `store.overlay` ({scene, props, startedAt}); renders corresponding composition (`<IntroCard/>`, `<OutroCard/>`, `<PhaseTransition/>`) absolutely positioned 1920×1080 with `pointerEvents: none`. When scene changes, auto-clear after its natural duration (4s/7s/2.5s).

Composition durations stored as static map:

```typescript
const DURATIONS_MS = { Intro: 4000, Outro: 7000, PhaseTransition: 2500 } as const
```

### Task 3.6: Control panel

**Files:** `src/main-control.tsx`, `control.html`, `src/components/ControlPanel.tsx`

- [ ] Simple button grid: Intro / Phase 1-4 / Outro / Clear / (optional) shortcuts preview
- [ ] POST to `/api/trigger/<scene>` via fetch on click
- [ ] Keyboard hotkeys registered: `I`=Intro, `1-4`=Phase, `O`=Outro, `Esc`=Clear

### Task 3.7: Production build wire-up

- [ ] Root `package.json` scripts:

```json
"live:server":        "pnpm --filter @silent-build/live-server run start",
"live:dashboard:dev": "pnpm --filter @silent-build/live-dashboard run dev",
"live:build":         "pnpm --filter @silent-build/live-dashboard run build",
"live:studio":        "run-p -r live:server live:dashboard:dev"
```

- [ ] Build output: `packages/live-dashboard/dist/{dashboard.html, overlay.html, control.html, assets/*.js, *.css}`. live-server `static.ts` serves from that dir.

---

## Phase 4 — markers extension + triggers (0.4 day, ~2 commits)

### Task 4.1: markers `--live` flag

**Files:** `packages/markers/src/live-client.ts`, modify `packages/markers/src/cli.ts`

- [ ] `live-client.ts`: tiny `postTrigger(serverUrl, scene, params): Promise<void>`. Uses native `fetch`. Swallow errors with warning (live-server may not be running during VOD sessions).

- [ ] `cli.ts`: add `--live [url]` option (default `http://127.0.0.1:3333`). After each successful marker write (non-project-start), POST to `/api/trigger/phase?n=<2|3|4>` mapping:
  - `backend-start` → phase 2
  - `frontend-start` → phase 3
  - `security-start` → phase 4
  - `polish-start` → no trigger (no overlay for polish)
  - `project-start` → POST `/api/trigger/intro` instead

- [ ] Tests: mock fetch, assert correct endpoint + body.

### Task 4.2: Control panel hotkeys + server validation

Already covered by Task 3.6. Just verify end-to-end:

- [ ] Run `pnpm live:server` + `pnpm live:dashboard:dev`
- [ ] Open `http://localhost:5173/control.html`
- [ ] Click "Intro" → dashboard tab should show IntroCard for 4s

---

## Phase 5 — OBS docs + smoke E2E (0.4 day, ~2 commits)

### Task 5.1: OBS setup walkthrough

**File:** `docs/live-stream/obs-setup.md`

- [ ] Step-by-step scene config:
  - Canvas 1920×1080 60fps
  - Display Capture source (full screen)
  - Browser Source 1: URL `http://localhost:3333/dashboard`, width 576, height 1080, custom CSS `body{margin:0;background:transparent}`, position right
  - Browser Source 2: URL `http://localhost:3333/overlay`, width 1920, height 1080, same CSS, position full
  - Webcam source (optional)
- [ ] Suggested hotkeys in OBS: F7 send `curl POST /api/trigger/intro`, F8/F9/F10 for phases. Uses OBS "Custom Browser" plugin or OS `xdotool` keybinding calling `curl`.
- [ ] Screenshot placeholders where the docs need final images (to be captured during first real stream).

### Task 5.2: Smoke E2E

**File:** `scripts/smoke-live.sh`

- [ ] Script:
  - Start live-server in background, store pid
  - Write synthetic jsonl at `/tmp/smoke-live.jsonl` (50 events over 10 s, one every 200 ms)
  - Use Playwright or plain curl to connect to `/events` and parse the stream
  - Measure time per event from file-write → SSE-emit
  - Fire triggers via curl
  - Assert p95 latency < 150 ms; kill live-server
  - Print summary, exit 0 on pass

- [ ] Add to `scripts/` and make executable.

### Task 5.3: Full test run + commit

```bash
pnpm -r test
pnpm -r typecheck
./scripts/smoke-live.sh
```

All green → final commit.

---

## Estimated timeline

| Phase | Tasks | Days | Commits |
|---|---|---|---|
| 0 | Shared live schema | 0.3 | 2 |
| 1 | theme + ui refactor | 0.7 | 5 |
| 2 | live-server | 1.0 | 6 |
| 3 | live-dashboard | 1.5 | 7 |
| 4 | markers extension | 0.4 | 2 |
| 5 | OBS docs + smoke | 0.4 | 2 |
| **Total** | | **~4.3 days** | **~24 commits** |

## Success criteria (merge gate)

- [ ] `pnpm -r test` → all packages green (theme / ui / live-server / live-dashboard / existing)
- [ ] `pnpm -r typecheck` clean
- [ ] `./scripts/smoke-live.sh` passes p95 latency assertion
- [ ] Visual diff of pre-refactor vs post-refactor Dashboard render: either byte-identical OR reviewed side-by-side and confirmed acceptable
- [ ] Manual E2E: start `live:server`, open `localhost:3333/dashboard` in OBS Browser Source, run a real Claude Code session for 10 minutes, confirm updates flow live and triggers work
- [ ] Live-dashboard bundle size: <100 KB gzipped (excluding fonts)
- [ ] Server memory after 10-minute smoke: <50 MB (eyeball via `top`)

## Dependencies on silent-build main

The live-stream branch depends on silent-build pipeline being in a working state. Phase 1 (refactor) touches shared code used by the VOD pipeline. Rule: **every commit on `feat/live-stream` must leave `pnpm -r test` green and `pnpm render:dashboard` producing a valid frame identical (or visually equivalent) to the pre-branch reference**.

If the refactor introduces regression in VOD, block merge and fix before proceeding.
