/**
 * Multi-theme palette system. Six themes, all sharing identical KEY names
 * — they act as SEMANTIC slots, not literal hex values.
 *
 * - `amber` = primary brand accent (may be green/blue/etc. depending on theme)
 * - `greenOk` = success / positive delta
 * - `redAlert` = error / negative
 * - `cyanData` = info / data accent
 *
 * This means a widget that imports `tokens.colors.amber` works in every
 * theme without code changes — the theme just swaps the value.
 *
 * Source: Claude Design handoff `0Leam7Sij7ffo6Tbh8X0uQ` (2026-05-11).
 */

export type ThemeKey =
  | 'terminal'
  | 'graphite'
  | 'midnight'
  | 'ops'
  | 'cobalt'
  | 'espresso'

export interface ThemeColors {
  // Surfaces
  bg: string
  bgSoft: string
  panel: string
  panelRaised: string
  grid: string
  gridStrong: string

  // Text
  textPrimary: string
  textDim: string
  textMuted: string
  textWhisper: string

  // Amber ramp (semantic: primary brand)
  amber: string
  amberBright: string
  amberDim: string
  amberDeep: string
  amberGlow: string
  amberHalo: string

  // Status
  greenOk: string
  greenDim: string
  redAlert: string
  amberWarn: string
  cyanData: string
}

export interface ThemeMeta {
  key: ThemeKey
  name: string
  blurb: string
  swatches: readonly [string, string, string]
}

export interface Theme extends ThemeMeta {
  colors: ThemeColors
}

const TERMINAL: Theme = {
  key: 'terminal',
  name: 'TERMINAL',
  blurb: 'Classic hacker — pitch base · soft phosphor green · muted amber',
  swatches: ['#070a09', '#7fd187', '#e0a14e'],
  colors: {
    bg: '#070a09',
    bgSoft: '#0c110e',
    panel: '#0f1612',
    panelRaised: '#141d18',
    grid: '#1c2620',
    gridStrong: '#28342c',
    textPrimary: '#d4e4d8',
    textDim: '#7d927f',
    textMuted: '#4d5b50',
    textWhisper: '#2f3833',
    amber: '#7fd187',
    amberBright: '#a8e8ad',
    amberDim: '#3a7344',
    amberDeep: '#234829',
    amberGlow: 'rgba(127,209,135,0.22)',
    amberHalo: 'rgba(127,209,135,0.08)',
    greenOk: '#7fd187',
    greenDim: '#3a7344',
    redAlert: '#d96f5e',
    amberWarn: '#e0a14e',
    cyanData: '#6cb6d4'
  }
}

const GRAPHITE: Theme = {
  key: 'graphite',
  name: 'GRAPHITE',
  blurb: 'NBA muted — slate base · royal blue primary · basketball red accent',
  swatches: ['#0e1217', '#5b8def', '#e0584e'],
  colors: {
    bg: '#0e1217',
    bgSoft: '#131923',
    panel: '#181f29',
    panelRaised: '#1e2632',
    grid: '#2a323d',
    gridStrong: '#38424f',
    textPrimary: '#e3e9f0',
    textDim: '#8b97a6',
    textMuted: '#5d6878',
    textWhisper: '#3e4653',
    amber: '#5b8def',
    amberBright: '#8aaeff',
    amberDim: '#2f4d7a',
    amberDeep: '#1e3454',
    amberGlow: 'rgba(91,141,239,0.22)',
    amberHalo: 'rgba(91,141,239,0.08)',
    greenOk: '#4ec9b0',
    greenDim: '#2a7a6a',
    redAlert: '#e0584e',
    amberWarn: '#e0a14e',
    cyanData: '#6fb3ff'
  }
}

const MIDNIGHT: Theme = {
  key: 'midnight',
  name: 'MIDNIGHT',
  blurb: 'Deep navy — cool indigo base · ice-cyan primary · soft coral alert',
  swatches: ['#080d18', '#7fc4e8', '#e07c8c'],
  colors: {
    bg: '#080d18',
    bgSoft: '#0d1422',
    panel: '#121a2c',
    panelRaised: '#172238',
    grid: '#1e2a42',
    gridStrong: '#283853',
    textPrimary: '#dde7f5',
    textDim: '#8898b3',
    textMuted: '#566480',
    textWhisper: '#37425a',
    amber: '#7fc4e8',
    amberBright: '#a8dbf2',
    amberDim: '#3a6d8e',
    amberDeep: '#234458',
    amberGlow: 'rgba(127,196,232,0.22)',
    amberHalo: 'rgba(127,196,232,0.08)',
    greenOk: '#7fd1a8',
    greenDim: '#3a7a5a',
    redAlert: '#e07c8c',
    amberWarn: '#e0a14e',
    cyanData: '#7fc4e8'
  }
}

const OPS: Theme = {
  key: 'ops',
  name: 'OPS',
  blurb: 'Industrial neutral — graphite base · amber primary · red+blue duo',
  swatches: ['#0e1114', '#e6a651', '#d9695e'],
  colors: {
    bg: '#0e1114',
    bgSoft: '#13171c',
    panel: '#181d23',
    panelRaised: '#1e242c',
    grid: '#262d36',
    gridStrong: '#323b46',
    textPrimary: '#e1e6ec',
    textDim: '#8a93a0',
    textMuted: '#5a6271',
    textWhisper: '#3a414c',
    amber: '#e6a651',
    amberBright: '#ffc78a',
    amberDim: '#8a6225',
    amberDeep: '#553c14',
    amberGlow: 'rgba(230,166,81,0.22)',
    amberHalo: 'rgba(230,166,81,0.08)',
    greenOk: '#7fc488',
    greenDim: '#3a6d44',
    redAlert: '#d9695e',
    amberWarn: '#e6a651',
    cyanData: '#6f9fd9'
  }
}

const COBALT: Theme = {
  key: 'cobalt',
  name: 'COBALT',
  blurb: 'Tech-blue ops — onyx base · cobalt primary · ember red secondary',
  swatches: ['#0a0e14', '#5fa8ff', '#e07560'],
  colors: {
    bg: '#0a0e14',
    bgSoft: '#0f141d',
    panel: '#141a25',
    panelRaised: '#1a2231',
    grid: '#222b3b',
    gridStrong: '#2e3a4e',
    textPrimary: '#dee5f0',
    textDim: '#8893a6',
    textMuted: '#586378',
    textWhisper: '#3a4254',
    amber: '#5fa8ff',
    amberBright: '#92c5ff',
    amberDim: '#3a6791',
    amberDeep: '#1f3d5b',
    amberGlow: 'rgba(95,168,255,0.22)',
    amberHalo: 'rgba(95,168,255,0.08)',
    greenOk: '#5fcb9f',
    greenDim: '#2a7a5a',
    redAlert: '#e07560',
    amberWarn: '#e0a14e',
    cyanData: '#9fb6cc'
  }
}

const ESPRESSO: Theme = {
  key: 'espresso',
  name: 'ESPRESSO',
  blurb: 'V2 Vintage NASA warm espresso (kept as option)',
  swatches: ['#1a1410', '#f5a635', '#e07b5e'],
  colors: {
    bg: '#1a1410',
    bgSoft: '#211a13',
    panel: '#241c14',
    panelRaised: '#2d241a',
    grid: '#3a2e21',
    gridStrong: '#4a3b2a',
    textPrimary: '#ede4d3',
    textDim: '#b0a08a',
    textMuted: '#7a6b56',
    textWhisper: '#5a4d3d',
    amber: '#f5a635',
    amberBright: '#ffd27d',
    amberDim: '#9a6b2c',
    amberDeep: '#6e4a1d',
    amberGlow: 'rgba(245,166,53,0.20)',
    amberHalo: 'rgba(245,166,53,0.08)',
    greenOk: '#9bc97a',
    greenDim: '#5a7a3f',
    redAlert: '#e07b5e',
    amberWarn: '#f5a635',
    cyanData: '#8fb8b8'
  }
}

export const THEMES: Record<ThemeKey, Theme> = {
  terminal: TERMINAL,
  graphite: GRAPHITE,
  midnight: MIDNIGHT,
  ops: OPS,
  cobalt: COBALT,
  espresso: ESPRESSO
}

export const DEFAULT_THEME: ThemeKey = 'terminal'

export const resolveTheme = (key: string | undefined): Theme => {
  if (key && key in THEMES) return THEMES[key as ThemeKey]
  return THEMES[DEFAULT_THEME]
}
