import type { ParsedEvent } from './parser.js'
import type { TimelineEvent } from '@silent-build/shared'

const PROMPT_MAX_LEN = 500

export function extractPrompts(events: ParsedEvent[]): Extract<TimelineEvent, { type: 'prompt' }>[] {
  const prompts: Extract<TimelineEvent, { type: 'prompt' }>[] = []
  for (const ev of events) {
    if (ev.type !== 'user') continue
    const textPart = ev.message.content.find(p => p.type === 'text')
    if (!textPart?.text) continue
    prompts.push({
      ts: new Date(ev.timestamp).getTime(),
      type: 'prompt',
      data: {
        text: truncate(textPart.text, PROMPT_MAX_LEN),
        tokensIn: 0
      }
    })
  }
  return prompts
}

export function extractTokens(events: ParsedEvent[]): Extract<TimelineEvent, { type: 'tokens_delta' }>[] {
  const out: Extract<TimelineEvent, { type: 'tokens_delta' }>[] = []
  for (const ev of events) {
    if (ev.type !== 'assistant') continue
    const usage = ev.message.usage
    if (!usage) continue
    out.push({
      ts: new Date(ev.timestamp).getTime(),
      type: 'tokens_delta',
      data: { input: usage.input_tokens, output: usage.output_tokens }
    })
  }
  return out
}

export function computeTimerBounds(events: ParsedEvent[]): { startTs: number; endTs: number } {
  if (events.length === 0) {
    throw new Error('computeTimerBounds: no events')
  }
  let min = Infinity
  let max = -Infinity
  for (const ev of events) {
    const t = new Date(ev.timestamp).getTime()
    if (t < min) min = t
    if (t > max) max = t
  }
  return { startTs: min, endTs: max }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '...'
}

const FILE_TOOLS = new Set(['Write', 'Edit'])

export function extractToolCalls(events: ParsedEvent[]): Extract<TimelineEvent, { type: 'tool_call' }>[] {
  const out: Extract<TimelineEvent, { type: 'tool_call' }>[] = []
  for (const ev of events) {
    if (ev.type !== 'assistant') continue
    for (const part of ev.message.content) {
      if (part.type !== 'tool_use') continue
      if (!part.name) continue
      if (FILE_TOOLS.has(part.name)) continue
      out.push({
        ts: new Date(ev.timestamp).getTime(),
        type: 'tool_call',
        data: { name: part.name, args: part.input }
      })
    }
  }
  return out
}

export function extractFileOps(
  events: ParsedEvent[]
): Array<Extract<TimelineEvent, { type: 'file_write' }> | Extract<TimelineEvent, { type: 'file_edit' }>> {
  const out: Array<Extract<TimelineEvent, { type: 'file_write' }> | Extract<TimelineEvent, { type: 'file_edit' }>> = []
  for (const ev of events) {
    if (ev.type !== 'assistant') continue
    for (const part of ev.message.content) {
      if (part.type !== 'tool_use' || !part.name) continue
      if (!FILE_TOOLS.has(part.name)) continue
      const input = (part.input ?? {}) as Record<string, unknown>
      const path = typeof input.file_path === 'string' ? input.file_path : undefined
      if (!path) continue
      const ts = new Date(ev.timestamp).getTime()

      if (part.name === 'Write') {
        const content = typeof input.content === 'string' ? input.content : ''
        const linesAdded = content === '' ? 0 : content.split('\n').length
        out.push({ ts, type: 'file_write', data: { path, linesAdded } })
      } else {
        const oldLines = typeof input.old_string === 'string' ? input.old_string.split('\n').length : 0
        const newLines = typeof input.new_string === 'string' ? input.new_string.split('\n').length : 0
        out.push({
          ts,
          type: 'file_edit',
          data: { path, linesChanged: Math.max(oldLines, newLines) }
        })
      }
    }
  }
  return out
}
