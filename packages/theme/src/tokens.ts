/**
 * Design tokens for silent-build overlay.
 *
 * V3 multi-theme system — 6 palettes selectable at render time via the
 * `SILENT_BUILD_THEME` env var (or `--theme <key>` CLI flag).
 *
 * Default: `terminal` (classic hacker phosphor green). Other options:
 * graphite / midnight / ops / cobalt / espresso. See `themes.ts` for the
 * full palette table + semantic key contract.
 *
 * Source: Claude Design handoff `0Leam7Sij7ffo6Tbh8X0uQ` (2026-05-11).
 */
import { resolveTheme, type Theme } from './themes.js'

const activeTheme: Theme = resolveTheme(
  typeof process !== 'undefined' ? process.env['SILENT_BUILD_THEME'] : undefined
)

const c = activeTheme.colors

export const tokens = {
  colors: c,

  typography: {
    fontHeading: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    fontMono:    "'JetBrains Mono', 'IBM Plex Mono', 'Menlo', monospace",

    // Scale
    h1:     { size: 48, weight: 700, lh: 1.0, ls: '-0.01em' },
    h2:     { size: 28, weight: 600, lh: 1.1, ls: '-0.005em' },
    h3:     { size: 16, weight: 500, lh: 1.2, ls: '0em' },
    label:  { size: 11, weight: 500, lh: 1.4, ls: '0.14em' }, // uppercase
    body:   { size: 13, weight: 400, lh: 1.5, ls: '0em' },
    data:   { size: 16, weight: 500, lh: 1.4, ls: '0em' },
    micro:  { size: 11, weight: 400, lh: 1.3, ls: '0.05em' }
  },

  spacing: {
    xxs:  4,
    xs:   8,
    sm:  12,
    md:  16,
    lg:  20,
    xl:  24,
    xxl: 32,
    xxxl: 48
  },

  radii: {
    none: 0,
    sm:   2,
    md:   3
  },

  // Derived borders so swapping theme keeps consistency.
  borders: {
    hairline:      `1px solid ${c.grid}`,
    hairlineAmber: `1px solid ${c.amberDim}`,
    hairlineAlert: `1px solid ${c.redAlert}`
  },

  effects: {
    // Used sparingly — Remotion pays per-frame cost
    pulseKeyframesMs: 1500,   // pulse period for active phase / live dot
    scanInsetPx:      12,     // grid frame inset
    cornerBracketPx:  16,     // corner bracket size
    safePadPx:        24      // horizontal safe padding
  }
} as const

export type Tokens = typeof tokens
export { activeTheme }
