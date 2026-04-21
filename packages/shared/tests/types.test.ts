import { describe, it, expect } from 'vitest'
import { SessionTimelineSchema, PhaseSchema, TimelineEventSchema } from '../src/types.js'

describe('SessionTimelineSchema', () => {
  it('accepts minimal valid timeline', () => {
    const parsed = SessionTimelineSchema.parse({
      project: { name: 'test', startTs: 1000, endTs: 2000 },
      phases: [
        { index: 1, label: 'Architecture', startTs: 1000, endTs: 1250, source: 'heuristic' },
        { index: 2, label: 'Backend', startTs: 1250, endTs: 1500, source: 'heuristic' },
        { index: 3, label: 'Frontend', startTs: 1500, endTs: 1750, source: 'heuristic' },
        { index: 4, label: 'Security', startTs: 1750, endTs: 2000, source: 'heuristic' }
      ],
      events: [],
      metrics: { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
    })
    expect(parsed.project.name).toBe('test')
    expect(parsed.phases).toHaveLength(4)
  })

  it('rejects phase count != 4', () => {
    expect(() => SessionTimelineSchema.parse({
      project: { name: 't', startTs: 0, endTs: 1 },
      phases: [],
      events: [],
      metrics: { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
    })).toThrow()
  })
})

describe('TimelineEventSchema', () => {
  it('accepts prompt event', () => {
    const parsed = TimelineEventSchema.parse({
      ts: 1000,
      type: 'prompt',
      data: { text: 'hello', tokensIn: 6 }
    })
    expect(parsed.type).toBe('prompt')
  })

  it('accepts tool_call event with optional subagentId', () => {
    const parsed = TimelineEventSchema.parse({
      ts: 1000,
      type: 'tool_call',
      data: { name: 'Bash', args: { command: 'ls' }, subagentId: 'agent-abc' }
    })
    expect(parsed.type).toBe('tool_call')
  })

  it('rejects unknown event type', () => {
    expect(() => TimelineEventSchema.parse({
      ts: 1000,
      type: 'unknown',
      data: {}
    })).toThrow()
  })
})

describe('PhaseSchema', () => {
  it('accepts valid phase', () => {
    const parsed = PhaseSchema.parse({
      index: 2,
      label: 'Backend',
      startTs: 100,
      endTs: 200,
      source: 'manual-marker'
    })
    expect(parsed.source).toBe('manual-marker')
  })

  it('rejects index outside 1-4', () => {
    expect(() => PhaseSchema.parse({
      index: 5, label: 'x', startTs: 0, endTs: 1, source: 'heuristic'
    })).toThrow()
  })
})
