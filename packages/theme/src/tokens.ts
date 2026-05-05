/**
 * Design tokens for silent-build overlay.
 *
 * V1 "Deep Space" palette — amber-on-black mission-control aesthetic.
 * Hex values kept within the brief's emotional territory; minor refinements
 * documented in the Design Notes alongside delivery.
 */
export const tokens = {
  colors: {
    // Surfaces
    bg:           '#05070a', // deepest background
    panel:        '#0d1117', // raised widget surface
    panelRaised: '#111823', // hover / nested raise (new)
    grid:         '#131a24', // subtle grid & dividers

    // Text
    textPrimary: '#d8e1ec',
    textDim:     '#7a8699',
    textMuted:   '#4a5667',

    // Amber ramp
    amber:       '#ffb347', // primary accent
    amberBright: '#ffd27d', // hover / pulse peak
    amberDim:    '#8a5e25', // refined from #996a2a → slightly deeper so amberDim
                            // sits ~one step below amber on a dark bg without
                            // muddying completed phase blocks
    amberGlow:   'rgba(255, 179, 71, 0.18)', // diffuse halo (new)

    // Status
    greenOk:   '#5ae38a',
    greenDim:  '#2f6b44',
    redAlert:  '#ff5a5a',
    amberWarn: '#ffb347',
    cyanData:  '#6fd3ff'
  },

  typography: {
    fontHeading: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    fontMono:    "'JetBrains Mono', 'IBM Plex Mono', 'Menlo', monospace",

    // Scale
    h1:     { size: 48, weight: 700, lh: 1.0, ls: '0em' },
    h2:     { size: 28, weight: 600, lh: 1.2, ls: '0em' },
    h3:     { size: 16, weight: 500, lh: 1.2, ls: '0em' },
    label:  { size: 11, weight: 500, lh: 1.4, ls: '0.12em' }, // uppercase
    body:   { size: 13, weight: 400, lh: 1.5, ls: '0em' },
    data:   { size: 16, weight: 500, lh: 1.4, ls: '0em' },
    micro:  { size: 11, weight: 400, lh: 1.3, ls: '0em' }
  },

  spacing: {
    xxs: 4,
    xs:  8,
    sm:  12,
    md:  16,
    lg:  20,
    xl:  24,
    xxl: 32
  },

  radii: {
    none: 0,
    sm:   2,
    md:   3
  },

  borders: {
    hairline:      '1px solid #131a24',
    hairlineAmber: '1px solid #8a5e25',
    hairlineAlert: '1px solid #ff5a5a'
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
