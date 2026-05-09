import { describe, it, expect } from 'vitest'
import { StatsPunchIn } from '../src/compositions/StatsPunchIn.js'

describe('StatsPunchIn', () => {
  it('is exported and is a function component', () => {
    expect(typeof StatsPunchIn).toBe('function')
  })
})
