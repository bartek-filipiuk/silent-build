import { describe, it, expect } from 'vitest'
import {
  preprocess,
  detectFirstPrompts,
  detectLastPrompts,
  detectEditBursts,
  detectScaffolding,
  detectInlineTags,
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
  const fakeEvent = (
    isoTs: string,
    text: string
  ): import('../src/jsonl-reader.js').RawEvent => ({
    ts: Date.parse(isoTs),
    isoTs,
    type: 'user',
    sourceJsonl: '/fake.jsonl',
    lineNumber: 1,
    raw: { message: { content: text } }
  })

  it('tags audit, design, plan, end keywords', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const cands = detectPromptKeywords(events)
    const tags = new Set(cands.map((c) => c.tag))
    expect(tags.has('audit')).toBe(true)
    expect(tags.has('end')).toBe(true)
    expect(tags.has('design')).toBe(true)
    expect(tags.has('plan')).toBe(true)
  })

  it('detects refactor keywords (simplify/refactor/cleanup) → build', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', 'simplify the auth module'),
      fakeEvent('2026-05-01T10:01:00.000Z', "let's refactor the API layer"),
      fakeEvent('2026-05-01T10:02:00.000Z', 'cleanup the unused imports')
    ]
    const cands = detectPromptKeywords(events)
    expect(cands).toHaveLength(3)
    expect(cands.every((c) => c.tag === 'build')).toBe(true)
    expect(cands.every((c) => c.reason === 'refactor keyword')).toBe(true)
  })

  it('detects implement/scaffold keyword → build', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', "let's implement the redirect handler"),
      fakeEvent('2026-05-01T10:01:00.000Z', 'scaffold the routes for /[code]/stats')
    ]
    const cands = detectPromptKeywords(events)
    expect(cands).toHaveLength(2)
    expect(cands.every((c) => c.tag === 'build')).toBe(true)
    expect(cands.every((c) => c.reason === 'implement keyword')).toBe(true)
  })

  it('detects mvp/scope/brainstorm keywords → plan', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', 'define the MVP scope'),
      fakeEvent('2026-05-01T10:01:00.000Z', "let's brainstorm the data model")
    ]
    const cands = detectPromptKeywords(events)
    expect(cands).toHaveLength(2)
    expect(cands.every((c) => c.tag === 'plan')).toBe(true)
  })

  it('audit keyword wins over refactor when both present', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', 'simplify and audit the security module')
    ]
    const cands = detectPromptKeywords(events)
    expect(cands).toHaveLength(1)
    expect(cands[0]!.tag).toBe('audit')
  })
})

describe('detectInlineTags', () => {
  const fakeEvent = (
    isoTs: string,
    text: string
  ): import('../src/jsonl-reader.js').RawEvent => ({
    ts: Date.parse(isoTs),
    isoTs,
    type: 'user',
    sourceJsonl: '/fake.jsonl',
    lineNumber: 1,
    raw: { message: { content: text } }
  })

  it('matches [SECURITY] tag at start of prompt', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', '[SECURITY] check open redirect on /r/<code>'),
      fakeEvent('2026-05-01T10:01:00.000Z', 'next prompt')
    ]
    const cands = detectInlineTags(events)
    expect(cands).toHaveLength(1)
    expect(cands[0]!.tag).toBe('audit')
    expect(cands[0]!.reason).toContain('[SECURITY]')
  })

  it('maps CODE_REVIEW and CODE-REVIEW to audit', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', '[CODE_REVIEW] zerknij na auth.ts'),
      fakeEvent('2026-05-01T10:01:00.000Z', '[CODE-REVIEW] also check the API layer'),
      fakeEvent('2026-05-01T10:02:00.000Z', 'next')
    ]
    const cands = detectInlineTags(events)
    expect(cands).toHaveLength(2)
    expect(cands.every((c) => c.tag === 'audit')).toBe(true)
  })

  it('maps DEPLOY/SHIP/RELEASE to end', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', '[DEPLOY] wrangler deploy please'),
      fakeEvent('2026-05-01T10:01:00.000Z', '[SHIP] tag v0.1.0'),
      fakeEvent('2026-05-01T10:02:00.000Z', 'next')
    ]
    const cands = detectInlineTags(events)
    expect(cands).toHaveLength(2)
    expect(cands.every((c) => c.tag === 'end')).toBe(true)
  })

  it('ignores tags inside the body (only matches prefix)', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', 'here is some context [SECURITY] but not a marker'),
      fakeEvent('2026-05-01T10:01:00.000Z', 'next')
    ]
    const cands = detectInlineTags(events)
    expect(cands).toHaveLength(0)
  })

  it('ignores unknown tag tokens', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', '[GIBBERISH] something'),
      fakeEvent('2026-05-01T10:01:00.000Z', 'next')
    ]
    const cands = detectInlineTags(events)
    expect(cands).toHaveLength(0)
  })

  it('case-insensitive on tag token', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', '[security] lowercase still matches'),
      fakeEvent('2026-05-01T10:01:00.000Z', 'next')
    ]
    const cands = detectInlineTags(events)
    expect(cands).toHaveLength(1)
    expect(cands[0]!.tag).toBe('audit')
  })

  it('signal=8 (stronger than promptKeywords=5)', () => {
    const events = [
      fakeEvent('2026-05-01T10:00:00.000Z', '[AUDIT] check this'),
      fakeEvent('2026-05-01T10:01:00.000Z', 'next')
    ]
    const cands = detectInlineTags(events)
    expect(cands[0]!.signal).toBe(8)
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
