import { describe, it, expect } from 'vitest'
import { StatsCard } from '../src/compositions/StatsCard.js'

describe('StatsCard', () => {
  it('is exported and is a function component', () => {
    expect(typeof StatsCard).toBe('function')
  })
})
