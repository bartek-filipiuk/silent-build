import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export type EventType = 'user' | 'assistant' | 'system' | 'summary' | 'other'

export interface RawEvent {
  ts: number
  isoTs: string
  type: EventType
  sourceJsonl: string
  lineNumber: number
  raw: Record<string, unknown>
}

const classifyType = (t: unknown): EventType => {
  if (t === 'user') return 'user'
  if (t === 'assistant') return 'assistant'
  if (t === 'system') return 'system'
  if (t === 'summary') return 'summary'
  return 'other'
}

export const readJsonlFile = (path: string): RawEvent[] => {
  const txt = readFileSync(path, 'utf8')
  const lines = txt.split('\n')
  const events: RawEvent[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    let obj: Record<string, unknown>
    try {
      obj = JSON.parse(line) as Record<string, unknown>
    } catch {
      continue
    }
    const isoTs = typeof obj['timestamp'] === 'string' ? obj['timestamp'] : null
    if (!isoTs) continue
    const ts = Date.parse(isoTs)
    if (Number.isNaN(ts)) continue
    events.push({
      ts,
      isoTs,
      type: classifyType(obj['type']),
      sourceJsonl: path,
      lineNumber: i + 1,
      raw: obj
    })
  }

  return events
}

export const findJsonlsIn = (dir: string): string[] => {
  if (!statSync(dir).isDirectory()) {
    throw new Error(`Not a directory: ${dir}`)
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl') && !f.includes('.bak'))
    .map((f) => join(dir, f))
    .sort()
}

export const readMergedJsonls = (
  pathsOrDir: string | string[]
): RawEvent[] => {
  const paths =
    typeof pathsOrDir === 'string' ? findJsonlsIn(pathsOrDir) : pathsOrDir
  const all = paths.flatMap(readJsonlFile)
  all.sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts
    if (a.sourceJsonl !== b.sourceJsonl)
      return a.sourceJsonl.localeCompare(b.sourceJsonl)
    return a.lineNumber - b.lineNumber
  })
  return all
}

export const extractUserText = (ev: RawEvent): string => {
  if (ev.type !== 'user') return ''
  const msg = ev.raw['message'] as Record<string, unknown> | undefined
  if (!msg) return ''
  const content = msg['content']
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const c of content) {
      if (typeof c === 'string') parts.push(c)
      else if (c && typeof c === 'object') {
        const obj = c as Record<string, unknown>
        if (typeof obj['text'] === 'string') parts.push(obj['text'])
      }
    }
    return parts.join(' ')
  }
  return ''
}

export const isToolResultOnly = (ev: RawEvent): boolean => {
  if (ev.type !== 'user') return false
  const msg = ev.raw['message'] as Record<string, unknown> | undefined
  if (!msg) return false
  const content = msg['content']
  if (!Array.isArray(content)) return false
  return content.every((c) => {
    if (!c || typeof c !== 'object') return false
    return (c as Record<string, unknown>)['type'] === 'tool_result'
  })
}

export interface ToolUseInfo {
  name: string
  input: Record<string, unknown>
  durationMs?: number
}

export const extractToolUses = (ev: RawEvent): ToolUseInfo[] => {
  if (ev.type !== 'assistant') return []
  const msg = ev.raw['message'] as Record<string, unknown> | undefined
  if (!msg) return []
  const content = msg['content']
  if (!Array.isArray(content)) return []
  const out: ToolUseInfo[] = []
  for (const c of content) {
    if (!c || typeof c !== 'object') continue
    const obj = c as Record<string, unknown>
    if (obj['type'] !== 'tool_use') continue
    const name = typeof obj['name'] === 'string' ? obj['name'] : 'unknown'
    const input =
      obj['input'] && typeof obj['input'] === 'object'
        ? (obj['input'] as Record<string, unknown>)
        : {}
    out.push({ name, input })
  }
  return out
}
