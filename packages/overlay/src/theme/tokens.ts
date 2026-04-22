/**
 * Design tokens for silent-build overlay.
 *
 * Current values preserve the pre-redesign state (MVP inline hex values)
 * so this refactor produces pixel-identical output. Claude Design will
 * update these in the visual redesign phase.
 */
export const tokens = {
  colors: {
    bg: '#0a0a0a',
    panel: '#0a0a0a',
    grid: '#1a1a1a',
    textPrimary: '#e5e5e5',
    textDim: '#64748b',
    textMuted: '#94a3b8',

    amber: '#4ade80',
    amberBright: '#4ade80',
    amberDim: '#64748b',

    greenOk: '#4ade80',
    redAlert: '#f87171',
    cyanData: '#94a3b8'
  },

  typography: {
    fontSans: 'monospace',
    fontMono: 'monospace',
    fontPrimary: 'monospace'
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24
  },

  borders: {
    hairline: '1px solid #1a1a1a'
  }
} as const

export type Tokens = typeof tokens
