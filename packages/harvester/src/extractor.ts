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
