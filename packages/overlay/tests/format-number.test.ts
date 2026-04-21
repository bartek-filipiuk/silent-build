import { describe, it, expect } from 'vitest'
import { formatNumber } from '../src/lib/format-number.js'

describe('formatNumber', () => {
  it('returns raw number under 1000', () => {
    expect(formatNumber(999)).toBe('999')
  })
  it('formats thousands with k suffix', () => {
    expect(formatNumber(1_500)).toBe('1.5k')
    expect(formatNumber(127_321)).toBe('127k')
  })
  it('formats millions with M suffix', () => {
    expect(formatNumber(2_500_000)).toBe('2.5M')
  })
})
