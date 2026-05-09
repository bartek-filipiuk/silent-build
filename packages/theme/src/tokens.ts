/**
 * Design tokens for silent-build overlay.
 *
 * V2 "Vintage NASA" palette — warm dark espresso/charcoal, Apollo mission-control
 * aesthetic. Replaces V1 "Deep Space" (#05070a cold black) with #1a1410 espresso —
 * easier on the eye, cinematic warmth, brand amber stays primary.
 *
 * Source: Claude Design handoff `9isgQbiAFbgltCXxH2fnLA` (2026-05-09).
 * Brief: "mile dla oka, nie agresywne, nie za ciemne" + "trzymaj amber jako primary".
 */
export const tokens = {
  colors: {
    // Surfaces — warm espresso/charcoal, never pitch black
    bg:           '#1a1410', // deepest background (was #05070a)
    bgSoft:       '#211a13', // section backgrounds in design canvas
    panel:        '#241c14', // raised widget surface (was #0d1117)
    panelRaised:  '#2d241a', // hover / nested raise
    grid:         '#3a2e21', // subtle grid & dividers (was #131a24)
    gridStrong:   '#4a3b2a', // emphasized grid lines

    // Text — warm cream ramp
    textPrimary: '#ede4d3',
    textDim:     '#b0a08a',
    textMuted:   '#7a6b56',
    textWhisper: '#5a4d3d',

    // Amber ramp (primary brand) — warmed toward the espresso ground
    amber:       '#f5a635', // primary accent (was #ffb347)
    amberBright: '#ffd27d', // hover / pulse peak
    amberDim:    '#9a6b2c', // subdued
    amberDeep:   '#6e4a1d', // deepest amber (for outlines on inactive states)
    amberGlow:   'rgba(245, 166, 53, 0.20)', // diffuse halo
    amberHalo:   'rgba(245, 166, 53, 0.08)', // soft outer glow

    // Status — warmed to match palette
    greenOk:   '#9bc97a',
    greenDim:  '#5a7a3f',
    redAlert:  '#e07b5e',
    amberWarn: '#f5a635',
    cyanData:  '#8fb8b8'
  },

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

  borders: {
    hairline:      '1px solid #3a2e21',
    hairlineAmber: '1px solid #9a6b2c',
    hairlineAlert: '1px solid #e07b5e'
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
