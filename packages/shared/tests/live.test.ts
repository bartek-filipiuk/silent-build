import { describe, it, expect } from 'vitest'
import { LiveServerMessageSchema } from '../src/live.js'

const validTimeline = {
  project: { name: 't', startTs: 0, endTs: 1 },
  phases: [
    { index: 1, label: 'A', startTs: 0, endTs: 1, source: 'heuristic' as const },
    { index: 2, label: 'B', startTs: 0, endTs: 1, source: 'heuristic' as const },
    { index: 3, label: 'C', startTs: 0, endTs: 1, source: 'heuristic' as const },
    { index: 4, label: 'D', startTs: 0, endTs: 1, source: 'heuristic' as const }
  ],
  events: [],
  metrics: { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
}

describe('LiveServerMessageSchema', () => {
  it('accepts snapshot', () => {
    expect(() => LiveServerMessageSchema.parse({ kind: 'snapshot', timeline: validTimeline })).not.toThrow()
  })

  it('accepts delta with event list', () => {
    expect(() => LiveServerMessageSchema.parse({
      kind: 'delta',
      events: [{ ts: 1, type: 'prompt', data: { text: 'x', tokensIn: 1 } }]
    })).not.toThrow()
  })

  it('accepts trigger with scene enum', () => {
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'Intro' })).not.toThrow()
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'Outro' })).not.toThrow()
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'PhaseTransition', props: { n: 2 } })).not.toThrow()
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'Clear' })).not.toThrow()
    expect(() => LiveServerMessageSchema.parse({ kind: 'trigger', scene: 'Bogus' })).toThrow()
  })

  it('accepts ping', () => {
    expect(() => LiveServerMessageSchema.parse({ kind: 'ping', ts: 123 })).not.toThrow()
  })

  it('rejects unknown kind', () => {
    expect(() => LiveServerMessageSchema.parse({ kind: 'whatever' })).toThrow()
  })
})
