import { describe, it, expect } from 'vitest'
import { CommitCard } from '../src/compositions/CommitCard.js'

describe('CommitCard', () => {
  it('is exported and is a function component', () => {
    expect(typeof CommitCard).toBe('function')
  })
})
