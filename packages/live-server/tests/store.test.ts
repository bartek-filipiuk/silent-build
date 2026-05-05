import { describe, it, expect } from 'vitest'
import { TimelineStore } from '../src/store.js'
import type { ParsedEvent } from '@silent-build/harvester/parser'

const mkUser = (ts: string, text: string): ParsedEvent => ({
  type: 'user',
  uuid: 'u-' + Math.random(),
  parentUuid: null,
  timestamp: ts,
  message: { role: 'user', content: [{ type: 'text', text }] }
})

const mkAsst = (ts: string, usage = { input_tokens: 10, output_tokens: 20 }): ParsedEvent => ({
  type: 'assistant',
  uuid: 'a-' + Math.random(),
  parentUuid: null,
  timestamp: ts,
  message: {
    role: 'assistant',
    content: [{ type: 'text', text: 'ok' }],
    usage
  }
})

describe('TimelineStore', () => {
  it('starts empty with fallback phases', () => {
    const s = new TimelineStore({ projectName: 'x', ringBufferSize: 100 })
    const snap = s.snapshot()
    expect(snap.events.length).toBe(0)
    expect(snap.phases.length).toBe(4)
  })

  it('applyParsed updates events, metrics, bounds', () => {
    const s = new TimelineStore({ projectName: 'x', ringBufferSize: 100 })
    s.applyParsed([
      mkUser('2026-04-23T10:00:00.000Z', 'first'),
      mkAsst('2026-04-23T10:00:01.000Z', { input_tokens: 5, output_tokens: 15 })
    ])
    const snap = s.snapshot()
    expect(snap.metrics.promptsCount).toBe(1)
    expect(snap.metrics.totalTokens).toBe(20)
    expect(snap.project.startTs).toBeGreaterThan(0)
    expect(snap.project.endTs).toBeGreaterThanOrEqual(snap.project.startTs)
  })

  it('emits delta on applyParsed', () => {
    const s = new TimelineStore({ projectName: 'x', ringBufferSize: 100 })
    let delta: unknown = null
    s.on('delta', (d) => { delta = d })
    s.applyParsed([mkUser('2026-04-23T10:00:00.000Z', 'x')])
    expect(Array.isArray(delta)).toBe(true)
  })

  it('ring buffer retains last N events only for since() backfill', () => {
    const s = new TimelineStore({ projectName: 'x', ringBufferSize: 3 })
    // add 5 prompts; ring keeps last 3
    for (let i = 0; i < 5; i++) {
      s.applyParsed([mkUser(`2026-04-23T10:00:0${i}.000Z`, `p${i}`)])
    }
    // since(0) should return ≤ 3
    const recent = s.since(0)
    expect(recent.length).toBeLessThanOrEqual(3)
  })

  it('snapshot.events is a copy (mutating snapshot does not mutate store)', () => {
    const s = new TimelineStore({ projectName: 'x', ringBufferSize: 100 })
    s.applyParsed([mkUser('2026-04-23T10:00:00.000Z', 'x')])
    const snap = s.snapshot()
    snap.events.push({ ts: 999, type: 'prompt', data: { text: 'mutated', tokensIn: 0 } })
    expect(s.snapshot().events.length).toBe(1)
  })
})
