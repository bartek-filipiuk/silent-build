import { describe, it, expect } from 'vitest'
import {
  RATES,
  detectFamily,
  formatModelLabel,
  eventCost,
  computeCostUpTo,
  currentModelLabel,
  formatCost
} from '../src/lib/cost.js'
import type { TimelineEvent } from '@silent-build/shared'

const tdelta = (
  ts: number,
  input: number,
  output: number,
  extras: { cacheRead?: number; cacheWrite?: number; model?: string } = {}
): Extract<TimelineEvent, { type: 'tokens_delta' }> => ({
  ts,
  type: 'tokens_delta',
  data: { input, output, ...extras }
})

describe('detectFamily', () => {
  it('detects opus', () => {
    expect(detectFamily('claude-opus-4-7')).toBe('opus')
    expect(detectFamily('claude-opus-4-1-20250805')).toBe('opus')
  })

  it('detects sonnet', () => {
    expect(detectFamily('claude-sonnet-4-6')).toBe('sonnet')
    expect(detectFamily('claude-3-5-sonnet-20241022')).toBe('sonnet')
  })

  it('detects haiku', () => {
    expect(detectFamily('claude-haiku-4-5')).toBe('haiku')
  })

  it('defaults to opus on unknown', () => {
    expect(detectFamily('claude-mystery-model')).toBe('opus')
    expect(detectFamily(undefined)).toBe('opus')
    expect(detectFamily('')).toBe('opus')
  })
})

describe('formatModelLabel', () => {
  it('extracts version from opus model id', () => {
    expect(formatModelLabel('claude-opus-4-7')).toBe('Opus 4.7')
    expect(formatModelLabel('claude-opus-4-1-20250805')).toBe('Opus 4.1')
  })

  it('extracts sonnet version', () => {
    expect(formatModelLabel('claude-sonnet-4-6')).toBe('Sonnet 4.6')
  })

  it('falls back to family name when no version', () => {
    expect(formatModelLabel('claude-haiku')).toBe('Haiku')
  })

  it('returns "Claude" when undefined', () => {
    expect(formatModelLabel(undefined)).toBe('Claude')
  })
})

describe('eventCost', () => {
  it('computes opus baseline cost (input + output only)', () => {
    // 1M input + 1M output on Opus = $15 + $75 = $90
    const ev = tdelta(0, 1_000_000, 1_000_000, { model: 'claude-opus-4-7' })
    expect(eventCost(ev)).toBeCloseTo(90, 5)
  })

  it('adds cache reads at 0.1× input rate (opus)', () => {
    // 1M cache read on Opus = $1.50
    const ev = tdelta(0, 0, 0, {
      cacheRead: 1_000_000,
      model: 'claude-opus-4-7'
    })
    expect(eventCost(ev)).toBeCloseTo(1.5, 5)
  })

  it('adds cache writes at 1.25× input rate (opus)', () => {
    // 1M cache write on Opus = $18.75
    const ev = tdelta(0, 0, 0, {
      cacheWrite: 1_000_000,
      model: 'claude-opus-4-7'
    })
    expect(eventCost(ev)).toBeCloseTo(18.75, 5)
  })

  it('uses sonnet rates when model is sonnet', () => {
    // 1M input + 1M output on Sonnet = $3 + $15 = $18
    const ev = tdelta(0, 1_000_000, 1_000_000, {
      model: 'claude-sonnet-4-6'
    })
    expect(eventCost(ev)).toBeCloseTo(18, 5)
  })

  it('defaults to opus rates when model omitted', () => {
    const ev = tdelta(0, 1_000_000, 1_000_000)
    expect(eventCost(ev)).toBeCloseTo(90, 5)
  })

  it('combines all four token kinds correctly', () => {
    // Opus: 100k input + 50k output + 200k cache_read + 10k cache_write
    // = 0.1*15 + 0.05*75 + 0.2*1.5 + 0.01*18.75
    // = 1.5 + 3.75 + 0.3 + 0.1875
    // = 5.7375
    const ev = tdelta(0, 100_000, 50_000, {
      cacheRead: 200_000,
      cacheWrite: 10_000,
      model: 'claude-opus-4-7'
    })
    expect(eventCost(ev)).toBeCloseTo(5.7375, 4)
  })
})

describe('computeCostUpTo', () => {
  const events: TimelineEvent[] = [
    tdelta(100, 1_000_000, 0, { model: 'claude-opus-4-7' }),  // $15
    tdelta(200, 0, 1_000_000, { model: 'claude-opus-4-7' }),  // $75
    tdelta(300, 0, 0, { cacheRead: 1_000_000, model: 'claude-opus-4-7' }), // $1.50
    tdelta(400, 1_000_000, 1_000_000, { model: 'claude-sonnet-4-6' })  // $18
  ]

  it('returns 0 before any event', () => {
    expect(computeCostUpTo(events, 50)).toBe(0)
  })

  it('cumulates as time advances', () => {
    expect(computeCostUpTo(events, 100)).toBeCloseTo(15, 4)
    expect(computeCostUpTo(events, 200)).toBeCloseTo(90, 4)
    expect(computeCostUpTo(events, 300)).toBeCloseTo(91.5, 4)
    expect(computeCostUpTo(events, 400)).toBeCloseTo(109.5, 4)
  })

  it('ignores non-tokens events', () => {
    const mixed: TimelineEvent[] = [
      ...events,
      { ts: 500, type: 'prompt', data: { text: 'x', tokensIn: 0 } }
    ]
    expect(computeCostUpTo(mixed, 1000)).toBeCloseTo(109.5, 4)
  })
})

describe('currentModelLabel', () => {
  const events: TimelineEvent[] = [
    tdelta(100, 100, 50, { model: 'claude-opus-4-7' }),
    tdelta(200, 100, 50, { model: 'claude-sonnet-4-6' })
  ]

  it('returns most-recent model up to currentTs', () => {
    expect(currentModelLabel(events, 100)).toBe('Opus 4.7')
    expect(currentModelLabel(events, 200)).toBe('Sonnet 4.6')
    expect(currentModelLabel(events, 1000)).toBe('Sonnet 4.6')
  })

  it('returns Claude default before any tokens_delta', () => {
    expect(currentModelLabel(events, 50)).toBe('Claude')
  })
})

describe('formatCost', () => {
  it('formats below $100 with 2 decimals', () => {
    expect(formatCost(0.45)).toBe('$0.45')
    expect(formatCost(1.23)).toBe('$1.23')
    expect(formatCost(99.99)).toBe('$99.99')
  })

  it('formats $100-999 with no decimals', () => {
    expect(formatCost(100)).toBe('$100')
    expect(formatCost(456.78)).toBe('$457')
  })

  it('formats $1000+ as $X.Xk', () => {
    expect(formatCost(1234)).toBe('$1.2k')
    expect(formatCost(15_000)).toBe('$15.0k')
  })
})

describe('RATES sanity', () => {
  it('opus is most expensive, haiku cheapest', () => {
    expect(RATES.opus.input).toBeGreaterThan(RATES.sonnet.input)
    expect(RATES.sonnet.input).toBeGreaterThan(RATES.haiku.input)
  })

  it('cache read is 0.1× input price for all families', () => {
    expect(RATES.opus.cacheRead).toBeCloseTo(RATES.opus.input * 0.1, 5)
    expect(RATES.sonnet.cacheRead).toBeCloseTo(RATES.sonnet.input * 0.1, 5)
    expect(RATES.haiku.cacheRead).toBeCloseTo(RATES.haiku.input * 0.1, 5)
  })

  it('cache write is 1.25× input price for all families', () => {
    expect(RATES.opus.cacheWrite).toBeCloseTo(RATES.opus.input * 1.25, 5)
    expect(RATES.sonnet.cacheWrite).toBeCloseTo(RATES.sonnet.input * 1.25, 5)
    expect(RATES.haiku.cacheWrite).toBeCloseTo(RATES.haiku.input * 1.25, 5)
  })
})
