import type { ParsedEvent, ContentPart } from '@silent-build/harvester/parser'

/**
 * Parses a single JSONL line. Returns null for unparseable / irrelevant events.
 * Mirrors the relaxed parsing logic in harvester/parser but operates per-line
 * (no file IO), so the watcher can pipe incremental bytes.
 */
export function parseLine(line: string, lineNumber?: number): ParsedEvent | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    if (lineNumber !== undefined) {
      console.warn(`[parseLine] malformed jsonl line ${lineNumber}, skipped`)
    }
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const obj = parsed as Record<string, unknown>
  const type = obj['type']
  if (type !== 'user' && type !== 'assistant') return null
  if (typeof obj['message'] !== 'object' || obj['message'] === null) return null
  const msg = obj['message'] as Record<string, unknown>
  const normalized = normalizeContent(msg['content'])
  if (!normalized) return null
  return {
    ...obj,
    message: { ...msg, content: normalized }
  } as ParsedEvent
}

function normalizeContent(content: unknown): ContentPart[] | null {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (Array.isArray(content)) {
    return content.filter((c): c is ContentPart =>
      typeof c === 'object' && c !== null && typeof (c as { type?: unknown }).type === 'string'
    )
  }
  return null
}
