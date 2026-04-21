import { describe, it, expect } from 'vitest'
import { formatDuration } from '../src/lib/format-duration.js'

describe('formatDuration', () => {
  it('formats zero as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })
  it('formats seconds under a minute', () => {
    expect(formatDuration(45_000)).toBe('00:00:45')
  })
  it('formats minutes and seconds', () => {
    expect(formatDuration(125_000)).toBe('00:02:05')
  })
  it('formats hours', () => {
    expect(formatDuration(3_725_000)).toBe('01:02:05')
  })
  it('clamps negative input to 00:00:00', () => {
    expect(formatDuration(-100)).toBe('00:00:00')
  })
})
