# silent-build — Visual Design Brief for Claude Design

**Version:** 1.0 (2026-04-22)
**Repo:** https://github.com/bartek-filipiuk/silent-build
**Status:** Active redesign — waiting for Claude Design input

---

## How to use this brief

Read Sections 1–4 for context, palette, typography. Section 5 has per-component specs. When you generate code for a single component (e.g. just `Timer` widget, or just `IntroCard`), respond with:

1. A single `.tsx` file for that component
2. (If new tokens are needed) an updated `tokens.ts`
3. No Tailwind, no styled-components, no CSS modules. **Inline `style={{ ... }}` only**, with values read from imported `tokens`.

**Do NOT** generate the whole visual system in one shot. Ask which component to design first.

Respect all constraints in Section 7 and 8. Violating them breaks Remotion server-side rendering.

---

## 1. Project context

**silent-build** is the overlay pipeline for a viral-style YouTube channel. Format: long-form (10–12 min) silent coding videos — creator pairs with Claude Code (AI coding assistant), no voiceover, continuous screen recording on the LEFT, and on the RIGHT is our Dashboard: a live telemetry panel that "translates" what the AI is doing (timer, current prompt, token usage, file activity, phase progress, security findings).

The data source is a `.jsonl` session log that Claude Code writes automatically. Our harvester parses this log into a `SessionTimeline` JSON, and Remotion renders the Dashboard frame-by-frame as a PNG sequence that gets dropped into CapCut next to the OBS screen capture.

**Aesthetic direction:** NASA mission control. Dark, precise, monospace, amber-on-black, calm authority. The Dashboard is the "mission console" — it watches the AI do its thing, reports status, surfaces alerts when something critical happens (security finding, phase transition).

**Not cyberpunk. Not hacker-terminal green. Not Apple minimalist.** Mission control.

---

## 2. Brand keywords

`silent-build` · `mission-control` · `telemetry` · `dark-mode` · `precise` · `monospace` · `amber-on-black` · `calm-authority` · `signal-over-noise` · `instruments-panel`

If in doubt, ask: *"Would this look at home in a 1970s Apollo flight-ops console, updated with 2026 typography and color fidelity?"*

---

## 3. Palette — choose one variant

Three proposed palettes. **Default to V1 "Deep Space"** unless a specific component needs a different variant (e.g. a warmer outro card might prefer V2).

### V1 — Deep Space (default)

```
bg              #05070a   deepest background
panel           #0d1117   raised surface / widget background
grid            #131a24   subtle grid lines / dividers
text-primary    #d8e1ec   main text
text-dim        #7a8699   labels, inactive state
text-muted      #4a5667   separators, ghost states

amber           #ffb347   primary accent (active state, key numbers)
amber-bright    #ffd27d   highlight / hover / pulse peak
amber-dim       #996a2a   dimmed amber (inactive indicator)

green-ok        #5ae38a   healthy / fixed / confirmed
red-alert       #ff5a5a   unfixed vulnerability / critical
cyan-data       #6fd3ff   secondary data (subagent, metadata)
```

### V2 — Apollo (warmer, for outro/celebratory moments)

```
bg              #0a0805
panel           #13100a
text-primary    #ece3c7   cream
text-dim        #8a7f63
amber           #f5a623   dominant
green-ok        #4ade80
red-alert       #ef4444
```

### V3 — Houston (colder LED feel, for phase transitions)

```
bg              #050a0d
panel           #0b141b
text-primary    #dbeafe
text-dim        #64748b
cyan            #22d3ee   primary indicator
green-ok        #10b981
amber           #fbbf24   warnings only (not primary)
```

---

## 4. Typography

### Fonts

- **Headings / numbers:** `Space Grotesk` (500, 700). Fallback: `Inter`, then system sans-serif.
- **Monospace / data / timestamps:** `JetBrains Mono` (400, 500, 700). Fallback: `IBM Plex Mono`, `Menlo`, `monospace`.

Both are available via `@remotion/google-fonts` and MUST be loaded through Remotion's official font-loading pattern — do NOT use `<link>` tags, Next.js `next/font`, or `@font-face` rules manually.

### Hierarchy

| Role | Font | Size | Weight | Letter-spacing | Line-height | Notes |
|---|---|---|---|---|---|---|
| H1 — Timer, main stat | Space Grotesk | 48px | 700 | 0 | 1.0 | Tabular nums |
| H2 — Phase label, card title | Space Grotesk | 28px | 600 | 0 | 1.2 | |
| H3 — Widget title | Space Grotesk | 16px | 500 | 0 | 1.2 | |
| Label (UPPERCASE) | JetBrains Mono | 11px | 500 | 0.12em | 1.4 | Uppercase, e.g. "TOKENS", "SECURITY" |
| Body / log line | JetBrains Mono | 13px | 400 | 0 | 1.5 | |
| Data / number | JetBrains Mono | 16px | 500 | 0 | 1.4 | Tabular nums |
| Micro / timestamp | JetBrains Mono | 11px | 400 | 0 | 1.3 | Opacity 0.6 for inactive |

Use `font-variant-numeric: tabular-nums` on anything that displays changing numbers (timer, token counts, activity-log timestamps) so digits don't jitter.

---

## 5. Per-component specs

### 5.1 Dashboard (576 × 1080, main overlay)

The right panel of the final 1920×1080 video. Runs for the duration of the session (typically 2–4 h compressed to 10–12 min in CapCut, but rendered at full source length — CapCut handles speed ramps).

**Layout (top to bottom):**

```
+------------------------------------+ 0
|  HEADER STRIP                      | 72 px
|  [logo]  silent-build              |
|  PROJECT: FocusFeed      STATUS:on |
+------------------------------------+ 72
|  TIMER                             | 120 px
|  02:14:33                          |
+------------------------------------+ 192
|  CURRENT PROMPT                    | 140 px
|  (latest user prompt, truncated)   |
+------------------------------------+ 332
|  TOKENS           [=====   ] 127k  | 80 px
+------------------------------------+ 412
|  FILES                             | 80 px
|  14 written · 8 edited             |
+------------------------------------+ 492
|  ACTIVITY LOG        (scrolling)   | flex
|  14:22  [W]  writing auth.ts       |
|  14:22  [R]  reading db.schema     |
|  14:23  [T]  Bash (subagent)       |
|  ...                               |
+------------------------------------+ 908
|  SECURITY                          | 92 px
|  [status indicator + findings]     |
+------------------------------------+ 1000
|  PHASE BAR                         | 80 px
|  [====][=][   ][   ]  2/4: Backend |
+------------------------------------+ 1080
```

**Mission-control decorators (please add):**

- Thin grid-line frame around the whole panel (1px, `tokens.colors.grid`, 12px inset)
- Small corner brackets in each of the 4 corners (L-shapes, 16×16px, 1.5px stroke, `tokens.colors.amber-dim`)
- Widget dividers: 1px horizontal lines between sections, `tokens.colors.grid`
- UPPERCASE labels with `tokens.colors.text-dim` and 0.12em letter-spacing for all widget headers
- Blinking pulse (1.5s cycle) on the active phase indicator in PhaseBar — use `interpolate(frame, [0, 45, 90], [1, 0.5, 1])` for opacity

**Safe zones:** 24px padding on left/right edges, 16px top/bottom within each widget section.

---

### 5.2 Timer widget

```tsx
// Props contract
interface TimerProps {
  elapsedMs: number
}
```

Display HH:MM:SS, tabular nums, 48px Space Grotesk 700. Above the digits, a small label "SESSION TIME" in uppercase mono. Below the digits, a thin hairline progress bar showing where we are in the total session duration (needs total duration as prop too — add `totalMs?: number`, falls back to just the time).

Optional: amber dot pulsing at 1 Hz left of the digits to indicate "live" state.

---

### 5.3 CurrentPrompt widget

```tsx
interface CurrentPromptProps {
  timeline: SessionTimeline
  currentMs: number
}
```

Finds the most recent `prompt` event where `ts <= startTs + currentMs`. Displays:

- Label "CURRENT PROMPT"  (uppercase mono)
- Small timestamp showing when the prompt was sent (e.g. "02:14:33" elapsed)
- Prompt text in 15px JetBrains Mono, max 3 lines, text-overflow ellipsis after

If prompt is very long (>200 chars), show first 180 + "…". Do NOT scroll or animate the text — keep it static per frame for 60fps performance.

---

### 5.4 TokenCounter widget

```tsx
interface TokenCounterProps {
  timeline: SessionTimeline
  currentMs: number
}

const MAX_TOKENS = 200_000
```

Sums all `tokens_delta` events up to `currentMs`. Displays:

- Label "TOKENS"
- Large number on left (e.g. "127k", auto-formatted via `formatNumber`), 24px Space Grotesk 600
- "of 200k" on right in text-dim
- Horizontal progress bar below, 4px high, full width. Fill color: amber when < 80%, amber-bright when 80–95%, red-alert when > 95%.

---

### 5.5 FileActivity widget

```tsx
interface FileActivityProps {
  timeline: SessionTimeline
  currentMs: number
}
```

Computes: unique paths seen in `file_write` events = "written"; unique paths seen in `file_edit` = "edited". Displays:

- Label "FILES"
- Two stats side by side, each with a big number + small uppercase label:
  - `14  WRITTEN`
  - `8  EDITED`
- Number in 24px Space Grotesk, label in 10px mono text-dim

---

### 5.6 ActivityLog widget

```tsx
interface ActivityLogProps {
  timeline: SessionTimeline
  currentMs: number
}

const MAX_ENTRIES = 8
```

Shows the last 8 events up to `currentMs`. Each entry:

- Timestamp (elapsed MM:SS format, mono 11px, text-dim)
- Icon/glyph: 16×16px inline SVG indicating type. Replace current single-char letters with proper SVG icons:
  - `file_write` → page with downward arrow
  - `file_edit` → pencil
  - `tool_call` generic → crosshair or terminal chevron
  - `tool_call` subagent → branched arrows
  - Icon color: amber for normal, cyan-data for subagents
- Text: filename (last 2 path segments) or tool name, 13px mono

Subagent entries have text-dim color. Normal entries full contrast. Truncate each line with ellipsis if too wide.

Container: boxed with 1px `grid` border, 12px padding, `panel` background.

---

### 5.7 SecurityPanel widget

```tsx
interface SecurityPanelProps {
  timeline: SessionTimeline
  currentMs: number
}
```

Filters `security_finding` events with `ts <= currentMs`. Two visual states:

**Idle** (no findings yet): label "SECURITY" + status "IDLE" in text-dim + a small circle icon with `amber-dim` fill.

**Active scan** (findings present): for each finding, a line:
- Severity badge (colored pill): `LOW`, `MED`, `HIGH`, `CRIT`. Colors: green/amber/amber-bright/red-alert
- Title (13px mono, text-primary)
- If `fixed: true`, line gets 0.5 opacity and a strikethrough + small green checkmark icon on right
- If `fixed: false`, title in red-alert color, optional pulsing border (same interpolate pattern as phase pulse)

---

### 5.8 PhaseBar footer

```tsx
interface PhaseBarProps {
  timeline: SessionTimeline
  currentMs: number
}
```

Shows progress through the 4 phases. Layout:

```
[####################][========][            ][            ]
 Architecture          Backend   Frontend      Security
 ^                     ^active
 100% filled amber     in-progress, amber-bright + pulse
```

- Each phase block width proportional to its duration (`endTs - startTs`)
- Fill level = (how much of this phase elapsed)
- Inactive phase blocks: `panel` bg, `grid` border
- Completed phase blocks: solid `amber-dim` fill
- Active phase block: gradient fill from `amber-dim` to `amber-bright`, with the pulsing border
- Below the blocks, centered: "Phase 2 / 4 · Backend" (label from `phase.label`, bold for active phase name)

---

### 5.9 IntroCard — NEW (1920 × 1080, 3–5 s)

```tsx
interface IntroCardProps {
  projectName: string                // "FocusFeed"
  targetDescription: string          // "Anti-doomscroll PWA with AI micro-lessons"
  startingAt?: Date                  // optional, defaults to now
}
```

The first 3–5 seconds of the video. A "mission briefing" card:

```
    s i l e n t - b u i l d                  [logo]
    ────────────────────────────────────────────────────────

                  MISSION:  FocusFeed

                  OBJECTIVE
                  Anti-doomscroll PWA with AI micro-lessons

                  START TIME
                  14:22 UTC · 2026-04-22

                  STATUS:  ○ INITIATING
                           ● READY
                           ○ CLAUDE CODE CONNECTED

                              LAUNCH IN 3...
```

- Dark bg, grid frame, corner brackets (scale up — maybe 32×32 corner Ls for 1080p)
- Typography: center-aligned, Space Grotesk for "MISSION" / "OBJECTIVE" / "START TIME" labels in uppercase text-dim, values below in text-primary, medium weight
- At end of card (last 0.5s), a countdown `3 → 2 → 1 → LAUNCH` using `interpolate(frame, [duration-90, duration-60, duration-30, duration], ["3", "2", "1", "LAUNCH"])` — actually use conditional rendering based on frame, not string interpolation
- Status checklist items animate on one-by-one (first at 0.5s, second at 1.0s, third at 1.5s) — fade + slide in 8px from left
- After all 3 are green, "LAUNCH IN 3..." appears

---

### 5.10 OutroCard — NEW (1920 × 1080, 5–8 s)

```tsx
interface OutroCardProps {
  projectName: string
  metrics: {
    totalTokens: number
    filesTouched: number
    promptsCount: number
    toolCallsCount: number
  }
  durationMs: number
  repoUrl?: string                   // e.g. https://github.com/bartek-filipiuk/silent-build
}
```

Final card, similar "mission debrief" feel:

```
          s i l e n t - b u i l d                           [logo]
          ─────────────────────────────────────────────────────

                        MISSION COMPLETE:  FocusFeed

              TOTAL TIME        2h 47m 13s
              TOKENS            514,535
              FILES TOUCHED     32
              PROMPTS           23
              TOOL CALLS        167

                        REPO:  github.com/bartek-filipiuk/silent-build

                        NEXT MISSION:  Subscribe to not miss it.
```

- Numbers animate in with a "terminal rolling" effect — use `interpolate` + `Math.round` to count up from 0 to final value over first 1.5s
- "MISSION COMPLETE" label at top, optional subtle check-mark animation
- "NEXT MISSION: Subscribe" has a subtle pulse

---

### 5.11 PhaseTransition — NEW (1920 × 1080, 2–3 s)

```tsx
interface PhaseTransitionProps {
  phase: {
    index: 1 | 2 | 3 | 4
    label: string
    startTs: number
    endTs: number
  }
  phaseNumber: 1 | 2 | 3 | 4
}
```

A "stage separator" that plays between phases in the video. Minimal:

```
        P H A S E   2  /  4

        BACKEND

        ─────────────────────────────
        "build the API that powers FocusFeed"
```

- Large "P H A S E N / 4" label, spaced letters
- Phase label (e.g. "BACKEND") in 96px Space Grotesk 700, amber
- Optional phase-specific tagline (can be hardcoded per phase number, or generated)
- Animated grid-line draw-in effect at top and bottom, using `interpolate` on width
- Duration 60–90 frames at 30fps (2–3s)

---

### 5.12 Thumbnail — NEW (1280 × 720, static single frame)

```tsx
interface ThumbnailProps {
  title: string                      // "I built an AI to replace TikTok in 3h"
  projectName: string                // "FocusFeed"
  episode?: number                   // optional, e.g. 1
}
```

YouTube thumbnail generator. **Render as single frame, not animation.**

Layout (16:9):

```
+------------------------------------------------------------+
|                                                            |
|   [left half]                    [right half]              |
|   Large title text               Stylized dashboard        |
|   split across 2-3 lines         mockup (screenshot        |
|   with dramatic weight           style, amber glow)        |
|                                                            |
|   "I BUILT AN AI                  [timer 02:47:13]         |
|    THAT REPLACED                  [progress bars]          |
|    MY TIKTOK"                     [silent-build logo]      |
|                                                            |
|                                                            |
+------------------------------------------------------------+
```

- Left half: title, 84px Space Grotesk 700, tight line-height 0.95, with high color contrast (text-primary on bg, or amber for emphasis words)
- Right half: mini dashboard mockup — shows Timer, 1-2 widgets, phase bar
- Small "EP. N" badge in top right corner if `episode` provided
- silent-build wordmark bottom right
- Amber glow radial gradient behind right-half elements for depth

Keep it simple — CTR is driven by title text clarity, not clutter.

---

## 6. Data schema (what each component has access to)

The harvester produces `SessionTimeline`. Every Dashboard widget receives `timeline: SessionTimeline` + `currentMs: number` (milliseconds elapsed in composition). Derive everything from these two.

```typescript
interface SessionTimeline {
  project: {
    name: string
    startTs: number        // ms since epoch
    endTs: number
  }
  phases: Phase[]          // always exactly 4
  events: TimelineEvent[]  // sorted ascending by ts
  metrics: {
    totalTokens: number
    filesTouched: number
    promptsCount: number
    toolCallsCount: number
  }
}

interface Phase {
  index: 1 | 2 | 3 | 4
  label: string            // e.g. "Backend", "Frontend (Claude Design)"
  startTs: number
  endTs: number
  source: 'manual-marker' | 'heuristic'
}

type TimelineEvent =
  | { ts: number; type: 'prompt'; data: { text: string; tokensIn: number } }
  | { ts: number; type: 'tool_call'; data: { name: string; args: unknown; subagentId?: string } }
  | { ts: number; type: 'file_write'; data: { path: string; linesAdded: number } }
  | { ts: number; type: 'file_edit'; data: { path: string; linesChanged: number } }
  | { ts: number; type: 'tokens_delta'; data: { input: number; output: number } }
  | { ts: number; type: 'security_finding'; data: { severity: 'low'|'medium'|'high'|'critical'; title: string; fixed: boolean } }
```

**Convention:** `absTs = timeline.project.startTs + currentMs`. Filter events `e.ts <= absTs` to get state at current frame.

---

## 7. Motion constraints

- **60 fps render target.** Every animation must be cheap.
- **Use `useCurrentFrame()` and `interpolate` / `spring` from `remotion`.** Never `setTimeout`, `setInterval`, `requestAnimationFrame`, or `Date.now()` for animation timing.
- **No Framer Motion.** It doesn't render server-side correctly in Remotion.
- **No CSS `animation` or `@keyframes`** — these depend on browser paint timing which Remotion can't control frame-by-frame.
- **Acceptable patterns:**
  - `const opacity = interpolate(frame, [0, 30], [0, 1])`
  - `spring({ frame, fps, config: { damping: 12 } })`
  - `<Sequence from={60} durationInFrames={90}>...</Sequence>`

Heavy filters (blur, large shadows) multiply render cost per frame — use sparingly and only for 1–2 elements at a time.

---

## 8. Technical constraints (hard rules)

**Allowed:**
- React 18 function components
- Props and pure derivations from props
- `remotion` exports: `useCurrentFrame`, `useVideoConfig`, `interpolate`, `spring`, `Sequence`, `Series`, `Composition`
- Inline `style={{ ... }}` objects referencing `tokens`
- Inline SVG (for icons, logos, decorative elements)
- Named imports from `@silent-build/shared` for types

**Forbidden:**
- `window`, `document`, `localStorage`, any browser API
- `useEffect`, `useState` driven by time (use `useCurrentFrame` instead)
- `fetch`, `XMLHttpRequest`, any I/O
- Next.js imports (`next/image`, `next/font`, etc.)
- Tailwind classes (will be stripped in adaptation)
- `styled-components`, `@emotion/*` (runtime cost at render scale)
- Framer Motion (`motion.div`, `AnimatePresence`)
- CSS animations, CSS keyframes
- External image URLs (no `<img src="https://...">`) — use inline SVG or Remotion `staticFile()`
- Manual `@font-face` rules — fonts come through `@remotion/google-fonts`

---

## 9. Reference images

- **Current (before) state:** https://raw.githubusercontent.com/bartek-filipiuk/silent-build/main/docs/reference-frames/current-dashboard.png
- **NASA mission control inspiration:** (user will add 2–3 Pinterest/Dribbble links here before first CD session)
  - TODO: link 1
  - TODO: link 2
  - TODO: link 3

---

## 10. Deliverables per request

When I (the user) paste this brief + ask for a specific component, return:

1. **One `.tsx` file** for that component, with named export
2. **Updated `tokens.ts`** if new color/spacing/typography tokens are needed (full file, so we can diff)
3. **Brief summary (3–5 bullets)** of your design decisions — what you emphasized, what trade-offs you made
4. **No demo code, no App.tsx, no `ReactDOM.render` calls.** Just the component and its tokens.

### Example request I'll send

> "Please design the Dashboard for silent-build, using V1 Deep Space palette, Space Grotesk + JetBrains Mono fonts. Layout per Section 5.1. Return `Dashboard.tsx` + updated `tokens.ts`. No Tailwind, only inline styles reading from tokens. Respect the motion and technical constraints."

Respond to each request with **ONE** component. If the next request says "now do the Timer widget", that becomes a separate response.

---

**End of brief. Ready for first component request.**
