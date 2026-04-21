import { describe, it, expect } from 'vitest'
import { extractPrompts, extractTokens, computeTimerBounds, extractToolCalls, extractFileOps } from '../src/extractor.js'
import type { ParsedEvent } from '../src/parser.js'

const userPrompt = (uuid: string, ts: string, text: string): ParsedEvent => ({
  type: 'user',
  uuid,
  parentUuid: null,
  timestamp: ts,
  message: { role: 'user', content: [{ type: 'text', text }] }
})

const assistantWithText = (uuid: string, ts: string, text: string, usage = { input_tokens: 10, output_tokens: 20 }): ParsedEvent => ({
  type: 'assistant',
  uuid,
  parentUuid: null,
  timestamp: ts,
  message: {
    role: 'assistant',
    content: [{ type: 'text', text }],
    usage
  }
})

describe('extractPrompts', () => {
  it('returns prompt event for each user message with text content', () => {
    const events = [
      userPrompt('u1', '2026-04-21T10:00:00.000Z', 'first prompt'),
      assistantWithText('a1', '2026-04-21T10:00:01.000Z', 'reply'),
      userPrompt('u2', '2026-04-21T10:00:05.000Z', 'second prompt')
    ]
    const prompts = extractPrompts(events)
    expect(prompts).toHaveLength(2)
    expect(prompts[0]).toEqual({
      ts: new Date('2026-04-21T10:00:00.000Z').getTime(),
      type: 'prompt',
      data: { text: 'first prompt', tokensIn: 0 }
    })
    expect(prompts[1]!.data.text).toBe('second prompt')
  })

  it('skips user messages that are only tool_result (not real prompts)', () => {
    const events: ParsedEvent[] = [
      {
        type: 'user',
        uuid: 'u1',
        parentUuid: null,
        timestamp: '2026-04-21T10:00:00.000Z',
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] }
      }
    ]
    expect(extractPrompts(events)).toHaveLength(0)
  })

  it('truncates very long prompts to 500 chars', () => {
    const longText = 'a'.repeat(1200)
    const events = [userPrompt('u1', '2026-04-21T10:00:00.000Z', longText)]
    const [prompt] = extractPrompts(events)
    expect(prompt!.data.text.length).toBeLessThanOrEqual(500 + 3)
    expect(prompt!.data.text.endsWith('...')).toBe(true)
  })
})

describe('extractTokens', () => {
  it('emits tokens_delta event per assistant message with usage', () => {
    const events = [
      assistantWithText('a1', '2026-04-21T10:00:01.000Z', 'r1', { input_tokens: 100, output_tokens: 50 }),
      assistantWithText('a2', '2026-04-21T10:00:02.000Z', 'r2', { input_tokens: 200, output_tokens: 75 })
    ]
    const tokens = extractTokens(events)
    expect(tokens).toHaveLength(2)
    expect(tokens[0]!.data).toEqual({ input: 100, output: 50 })
    expect(tokens[1]!.data).toEqual({ input: 200, output: 75 })
  })

  it('skips assistant events without usage', () => {
    const events: ParsedEvent[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        parentUuid: null,
        timestamp: '2026-04-21T10:00:01.000Z',
        message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] }
      }
    ]
    expect(extractTokens(events)).toHaveLength(0)
  })
})

describe('computeTimerBounds', () => {
  it('returns min and max timestamps', () => {
    const events = [
      userPrompt('u1', '2026-04-21T10:00:00.000Z', 'a'),
      userPrompt('u2', '2026-04-21T10:05:00.000Z', 'b'),
      userPrompt('u3', '2026-04-21T10:02:00.000Z', 'c')
    ]
    const bounds = computeTimerBounds(events)
    expect(bounds.startTs).toBe(new Date('2026-04-21T10:00:00.000Z').getTime())
    expect(bounds.endTs).toBe(new Date('2026-04-21T10:05:00.000Z').getTime())
  })

  it('throws on empty events', () => {
    expect(() => computeTimerBounds([])).toThrow(/no events/i)
  })
})

const assistantWithToolUse = (
  uuid: string,
  ts: string,
  toolName: string,
  input: unknown
): ParsedEvent => ({
  type: 'assistant',
  uuid,
  parentUuid: null,
  timestamp: ts,
  message: {
    role: 'assistant',
    content: [{ type: 'tool_use', id: `t_${uuid}`, name: toolName, input }]
  }
})

describe('extractToolCalls', () => {
  it('emits tool_call per tool_use in assistant content', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Bash', { command: 'ls' }),
      assistantWithToolUse('a2', '2026-04-21T10:00:05.000Z', 'Grep', { pattern: 'foo' })
    ]
    const calls = extractToolCalls(events)
    expect(calls).toHaveLength(2)
    expect(calls[0]!.data.name).toBe('Bash')
    expect(calls[1]!.data.name).toBe('Grep')
  })

  it('excludes Write and Edit (handled by extractFileOps)', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Write', { file_path: '/tmp/x', content: 'hi' }),
      assistantWithToolUse('a2', '2026-04-21T10:00:01.000Z', 'Bash', { command: 'ls' })
    ]
    const calls = extractToolCalls(events)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.data.name).toBe('Bash')
  })
})

describe('extractFileOps', () => {
  it('emits file_write for Write tool_use', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Write', {
        file_path: '/home/u/app.ts',
        content: 'line1\nline2\nline3'
      })
    ]
    const ops = extractFileOps(events)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toEqual({
      ts: new Date('2026-04-21T10:00:00.000Z').getTime(),
      type: 'file_write',
      data: { path: '/home/u/app.ts', linesAdded: 3 }
    })
  })

  it('emits file_edit for Edit tool_use', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Edit', {
        file_path: '/home/u/app.ts',
        old_string: 'a\nb',
        new_string: 'a\nb\nc\nd'
      })
    ]
    const ops = extractFileOps(events)
    expect(ops).toHaveLength(1)
    expect(ops[0]!.type).toBe('file_edit')
    if (ops[0]!.type === 'file_edit') {
      expect(ops[0]!.data.path).toBe('/home/u/app.ts')
      expect(ops[0]!.data.linesChanged).toBe(4)
    }
  })

  it('ignores tool_use without file_path', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Write', { content: 'no path' })
    ]
    expect(extractFileOps(events)).toHaveLength(0)
  })
})
