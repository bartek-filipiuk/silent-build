import { describe, it, expect } from 'vitest'
import { tokens } from '../src/tokens.js'

describe('tokens.colors', () => {
  it('has all required color keys', () => {
    const required: Array<keyof typeof tokens.colors> = [
      'bg', 'panel', 'grid',
      'textPrimary', 'textDim', 'textMuted',
      'amber', 'amberBright', 'amberDim', 'amberGlow',
      'greenOk', 'greenDim', 'redAlert', 'cyanData'
    ]
    for (const k of required) {
      expect(tokens.colors[k], `missing color: ${k}`).toBeDefined()
    }
  })

  it('hex values start with #', () => {
    for (const [key, val] of Object.entries(tokens.colors)) {
      if (key === 'amberGlow') continue // rgba()
      expect(val.startsWith('#'), `color ${key} should be hex`).toBe(true)
    }
  })
})

describe('tokens.typography', () => {
  it('has font family strings', () => {
    expect(tokens.typography.fontHeading).toContain('Space Grotesk')
    expect(tokens.typography.fontMono).toContain('JetBrains Mono')
  })

  it('has full hierarchy (h1..micro)', () => {
    const tiers: Array<keyof typeof tokens.typography> = ['h1', 'h2', 'h3', 'label', 'body', 'data', 'micro']
    for (const t of tiers) {
      expect(tokens.typography[t]).toBeDefined()
    }
  })
})

describe('tokens.spacing / borders / effects', () => {
  it('spacing scale is numeric', () => {
    expect(tokens.spacing.md).toBe(16)
    expect(tokens.spacing.xxl).toBe(32)
  })

  it('borders defined', () => {
    expect(tokens.borders.hairline).toBeDefined()
  })

  it('effects have scanInsetPx and cornerBracketPx', () => {
    expect(tokens.effects.scanInsetPx).toBe(12)
    expect(tokens.effects.cornerBracketPx).toBe(16)
  })
})
