import { describe, it, expect } from 'vitest'
import {
  readJsonlFile,
  findJsonlsIn,
  readMergedJsonls,
  extractUserText,
  isToolResultOnly,
  extractToolUses
} from '../src/jsonl-reader.js'

const TINY = new URL('../fixtures/tiny-session.jsonl', import.meta.url)
  .pathname
const MULTI_DIR = new URL('../fixtures/multi-session/', import.meta.url)
  .pathname

describe('readJsonlFile', () => {
  it('parses well-formed lines and skips malformed', () => {
    const events = readJsonlFile(TINY)
    expect(events.length).toBe(6)
    expect(events.every((e) => e.ts > 0)).toBe(true)
  })

  it('preserves order via sort by ts', () => {
    const events = readJsonlFile(TINY)
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.ts).toBeGreaterThanOrEqual(events[i - 1]!.ts)
    }
  })

  it('skips entries without timestamp', () => {
    const events = readJsonlFile(TINY)
    expect(events.every((e) => Number.isFinite(e.ts))).toBe(true)
  })
})

describe('findJsonlsIn', () => {
  it('returns all .jsonl files in directory', () => {
    const files = findJsonlsIn(MULTI_DIR)
    expect(files.length).toBe(3)
    expect(files.every((f) => f.endsWith('.jsonl'))).toBe(true)
  })

  it('throws on non-directory', () => {
    expect(() => findJsonlsIn(TINY)).toThrow()
  })
})

describe('readMergedJsonls', () => {
  it('merges and sorts cross-file by timestamp', () => {
    const events = readMergedJsonls(MULTI_DIR)
    expect(events.length).toBeGreaterThan(20)
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.ts).toBeGreaterThanOrEqual(events[i - 1]!.ts)
    }
  })

  it('first event is from session-c (earliest date 2026-04-30)', () => {
    const events = readMergedJsonls(MULTI_DIR)
    expect(events[0]!.sourceJsonl).toContain('session-c.jsonl')
  })

  it('last event is from session-b (deploy at 2026-05-02)', () => {
    const events = readMergedJsonls(MULTI_DIR)
    const last = events[events.length - 1]!
    expect(last.sourceJsonl).toContain('session-b.jsonl')
  })

  it('accepts an explicit array of paths', () => {
    const files = findJsonlsIn(MULTI_DIR)
    const events = readMergedJsonls(files)
    expect(events.length).toBeGreaterThan(20)
  })
})

describe('extractUserText', () => {
  it('returns text for string content', () => {
    const events = readJsonlFile(TINY)
    const firstUser = events.find((e) => e.type === 'user')!
    expect(extractUserText(firstUser)).toContain('fastduels')
  })

  it('returns empty for assistant events', () => {
    const events = readJsonlFile(TINY)
    const a = events.find((e) => e.type === 'assistant')!
    expect(extractUserText(a)).toBe('')
  })

  it('joins array text blocks', () => {
    const fakeEv = {
      ts: 0,
      isoTs: '2026-01-01T00:00:00.000Z',
      type: 'user' as const,
      sourceJsonl: '',
      lineNumber: 0,
      raw: {
        message: {
          content: [
            { type: 'text', text: 'hello' },
            { type: 'text', text: 'world' }
          ]
        }
      }
    }
    expect(extractUserText(fakeEv)).toBe('hello world')
  })
})

describe('isToolResultOnly', () => {
  it('detects tool_result-only user message', () => {
    const events = readJsonlFile(TINY)
    const trUser = events.filter(
      (e) => e.type === 'user' && isToolResultOnly(e)
    )
    expect(trUser.length).toBe(1)
  })
})

describe('extractToolUses', () => {
  it('returns tool_use blocks from assistant message', () => {
    const events = readJsonlFile(TINY)
    const calls = events.flatMap(extractToolUses)
    const names = calls.map((c) => c.name)
    expect(names).toContain('Read')
    expect(names).toContain('Write')
    expect(names).toContain('Edit')
  })

  it('captures file_path input', () => {
    const events = readJsonlFile(TINY)
    const writes = events
      .flatMap(extractToolUses)
      .filter((c) => c.name === 'Write')
    expect(writes[0]!.input['file_path']).toBe('/p/foo.ts')
  })
})
