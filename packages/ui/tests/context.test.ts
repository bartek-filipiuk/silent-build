import { describe, it, expect } from 'vitest'
import { pulseOpacity } from '../src/context.js'

describe('pulseOpacity', () => {
  it('returns hi at phase 0', () => {
    expect(pulseOpacity(0, 0.4, 1)).toBeCloseTo(1, 5)
  })

  it('returns lo at phase 0.5', () => {
    expect(pulseOpacity(0.5, 0.4, 1)).toBeCloseTo(0.4, 5)
  })

  it('returns hi at phase 1', () => {
    expect(pulseOpacity(1, 0.4, 1)).toBeCloseTo(1, 5)
  })

  it('uses default lo/hi when omitted', () => {
    expect(pulseOpacity(0)).toBeCloseTo(1, 5)
    expect(pulseOpacity(0.5)).toBeCloseTo(0.4, 5)
  })

  it('scales correctly for non-default range', () => {
    expect(pulseOpacity(0.25, 0.2, 0.8)).toBeCloseTo(0.5, 5)
  })
})
