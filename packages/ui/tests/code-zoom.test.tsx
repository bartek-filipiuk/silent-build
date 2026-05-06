import { describe, it, expect } from 'vitest'
import { CodeZoom } from '../src/compositions/CodeZoom.js'

describe('CodeZoom', () => {
  it('is exported and is a function component', () => {
    expect(typeof CodeZoom).toBe('function')
  })
})
