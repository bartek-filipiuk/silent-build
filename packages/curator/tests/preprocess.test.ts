import { describe, it, expect } from 'vitest'
import {
  preprocess,
  detectFirstPrompts,
  detectLastPrompts,
  detectEditBursts,
  detectScaffolding,
  detectPromptKeywords,
  detectCommitPush,
  detectLongPauses
} from '../src/preprocess.js'
import { readMergedJsonls, readJsonlFile } from '../src/jsonl-reader.js'
import type { CandidateTag } from '../src/narrative-schema.js'

const TINY = new URL('../fixtures/tiny-session.jsonl', import.meta.url)
  .pathname
const MULTI_DIR = new URL('../fixtures/multi-session/', import.meta.url)
  .pathname

describe('detectFirstPrompts', () => {
  it('emits one start candidate covering first 5 user prompts', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const cands = detectFirstPrompts(events, 5)
    expect(cands.length).toBe(1)
    expect(cands[0]!.tag).toBe('start')
    expect(cands[0]!.firstPromptText).toContain('design')
  })
})

describe('detectLastPrompts', () => {
  it('emits one end candidate at the tail', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const cands = detectLastPrompts(events, 3)
    expect(cands.length).toBe(1)
    expect(cands[0]!.tag).toBe('end')
  })
})

describe('detectEditBursts', () => {
  it('detects 11 edits on /p/server.ts as build burst', () => {
    const events = readJsonlFile(
      new URL('../fixtures/multi-session/session-a.jsonl', import.meta.url)
        .pathname
    )
    const cands = detectEditBursts(events)
    expect(cands.length).toBeGreaterThan(0)
    expect(cands[0]!.tag).toBe('build')
    expect(cands[0]!.reason).toContain('server.ts')
  })

  it('detects 10 edits on /p/home.svelte as design burst', () => {
    const events = readJsonlFile(
      new URL('../fixtures/multi-session/session-c.jsonl', import.meta.url)
        .pathname
    )
    const cands = detectEditBursts(events)
    expect(cands.length).toBeGreaterThan(0)
    expect(cands[0]!.tag).toBe('design')
    expect(cands[0]!.reason).toContain('home.svelte')
  })
})

describe('detectScaffolding', () => {
  it('does not fire when below threshold', () => {
    const events = readJsonlFile(TINY)
    const cands = detectScaffolding(events, 600_000, 5)
    expect(cands.length).toBe(0)
  })
})

describe('detectPromptKeywords', () => {
  it('tags audit, design, plan, end keywords', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const cands = detectPromptKeywords(events)
    const tags = new Set(cands.map((c) => c.tag))
    expect(tags.has('audit')).toBe(true)
    expect(tags.has('end')).toBe(true)
    expect(tags.has('design')).toBe(true)
    expect(tags.has('plan')).toBe(true)
  })
})

describe('detectCommitPush', () => {
  it('matches git commit and git push commands', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const cands = detectCommitPush(events)
    expect(cands.length).toBe(2)
    expect(cands.every((c) => c.tag === 'end')).toBe(true)
  })
})

describe('detectLongPauses', () => {
  it('finds gaps ≥30 min', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const pauses = detectLongPauses(events)
    expect(pauses.length).toBeGreaterThan(0)
  })
})

describe('preprocess (full pipeline)', () => {
  it('returns candidates with required tags from multi-session fixtures', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const { candidates, totalEvents } = preprocess(events)
    expect(totalEvents).toBe(events.length)

    const tags = new Set<CandidateTag>(candidates.map((c) => c.tag))
    expect(tags.has('start')).toBe(true)
    expect(tags.has('build')).toBe(true)
    expect(tags.has('end')).toBe(true)
  })

  it('caps output at 50', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const { candidates } = preprocess(events, 50)
    expect(candidates.length).toBeLessThanOrEqual(50)
  })

  it('candidates are sorted ascending by from timestamp', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const { candidates } = preprocess(events)
    for (let i = 1; i < candidates.length; i++) {
      expect(
        Date.parse(candidates[i]!.from)
      ).toBeGreaterThanOrEqual(Date.parse(candidates[i - 1]!.from))
    }
  })

  it('produces deterministic output on same input', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const a = preprocess(events).candidates
    const b = preprocess(events).candidates
    expect(a).toEqual(b)
  })

  it('assigns unique sequential ids', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const { candidates } = preprocess(events)
    const ids = candidates.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe('cand-001')
  })
})
