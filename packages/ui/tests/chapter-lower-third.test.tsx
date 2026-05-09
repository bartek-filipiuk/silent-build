import { describe, it, expect } from 'vitest'
import { ChapterLowerThird } from '../src/compositions/ChapterLowerThird.js'

describe('ChapterLowerThird', () => {
  it('is exported and is a function component', () => {
    expect(typeof ChapterLowerThird).toBe('function')
  })
})
