import { readFileSync } from 'node:fs'

export interface ContentPart {
  type: string
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
}

export interface UserEvent {
  type: 'user'
  uuid: string
  parentUuid: string | null
  timestamp: string
  sessionId?: string
  message: {
    role: 'user'
    content: ContentPart[]
  }
}

export interface AssistantEvent {
  type: 'assistant'
  uuid: string
  parentUuid: string | null
  timestamp: string
  sessionId?: string
  message: {
    role: 'assistant'
    id?: string
    model?: string
    content: ContentPart[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
}

export type ParsedEvent = UserEvent | AssistantEvent

export function parseJsonl(path: string): ParsedEvent[] {
  const raw = readFileSync(path, 'utf-8')
  const lines = raw.split('\n')
  const events: ParsedEvent[] = []

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed === '') return

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      console.warn(`[parser] malformed jsonl line ${idx + 1}, skipped`)
      return
    }

    if (typeof parsed !== 'object' || parsed === null) return
    const obj = parsed as Record<string, unknown>
    const type = obj['type']
    if (type !== 'user' && type !== 'assistant') return
    if (typeof obj['message'] !== 'object' || obj['message'] === null) return

    const msg = obj['message'] as Record<string, unknown>
    const normalized = normalizeContent(msg['content'])
    if (!normalized) return

    events.push({
      ...obj,
      message: { ...msg, content: normalized }
    } as ParsedEvent)
  })

  return events
}

function normalizeContent(content: unknown): ContentPart[] | null {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (Array.isArray(content)) {
    return content.filter((c): c is ContentPart => typeof c === 'object' && c !== null && typeof (c as any).type === 'string')
  }
  return null
}
