import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseJsonl, type ParsedEvent } from '../src/parser.js'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function makeTempFile(lines: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'parser-test-'))
  const file = join(dir, 'test.jsonl')
  writeFileSync(file, lines.join('\n'))
  return file
}

afterEach(() => vi.restoreAllMocks())

describe('parseJsonl', () => {
  it('returns only user and assistant events by default', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"hi"}}',
      '{"type":"system","uuid":"s1","timestamp":"2026-04-21T10:00:01.000Z"}',
      '{"type":"assistant","uuid":"a1","timestamp":"2026-04-21T10:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"hello"}],"usage":{"input_tokens":1,"output_tokens":2}}}'
    ])
    const events = parseJsonl(file)
    expect(events).toHaveLength(2)
    expect(events[0]!.type).toBe('user')
    expect(events[1]!.type).toBe('assistant')
  })

  it('skips malformed lines with warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"hi"}}',
      '{not json at all',
      '{"type":"user","uuid":"u2","timestamp":"2026-04-21T10:00:01.000Z","message":{"role":"user","content":"ok"}}'
    ])
    const events = parseJsonl(file)
    expect(events).toHaveLength(2)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('malformed jsonl line 2'))
  })

  it('skips empty lines silently', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"hi"}}',
      '',
      '   ',
      '{"type":"user","uuid":"u2","timestamp":"2026-04-21T10:00:01.000Z","message":{"role":"user","content":"ok"}}'
    ])
    const events = parseJsonl(file)
    expect(events).toHaveLength(2)
  })

  it('normalizes user content (string) to array form', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"elo"}}'
    ])
    const events = parseJsonl(file)
    const user = events[0] as ParsedEvent & { type: 'user' }
    expect(user.message.content).toEqual([{ type: 'text', text: 'elo' }])
  })

  it('keeps user content array form unchanged', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"ok"}]}}'
    ])
    const events = parseJsonl(file)
    const user = events[0] as ParsedEvent & { type: 'user' }
    expect(user.message.content[0]!.type).toBe('tool_result')
  })

  it('throws if file does not exist', () => {
    expect(() => parseJsonl('/nonexistent/path.jsonl')).toThrow(/ENOENT|not found/i)
  })
})

describe('parseJsonl — real fixture', () => {
  it('parses sample-session.jsonl without throwing', () => {
    const path = new URL('../fixtures/sample-session.jsonl', import.meta.url).pathname
    const events = parseJsonl(path)
    expect(events.length).toBeGreaterThan(50)
    expect(events.every(e => e.type === 'user' || e.type === 'assistant')).toBe(true)
  })
})
