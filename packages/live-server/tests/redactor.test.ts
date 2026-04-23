import { describe, it, expect } from 'vitest'
import { createRedactor } from '../src/redactor.js'
import type { TimelineEvent } from '@silent-build/shared'

const cfg = (overrides: Partial<Parameters<typeof createRedactor>[0]> = {}) =>
  createRedactor({
    enabled: true,
    patterns: [],
    keywords: [],
    replacement: '[REDACTED]',
    ...overrides
  })

describe('redactor', () => {
  it('redacts OpenAI-shape key', () => {
    const r = cfg()
    expect(r.scanString('my key is sk-abcdefghijklmnopqrstuvwxyzABCDEF1234'))
      .toContain('[REDACTED]')
    expect(r.scanString('my key is sk-abcdefghijklmnopqrstuvwxyzABCDEF1234'))
      .not.toContain('sk-abcdef')
  })

  it('redacts Anthropic key', () => {
    const r = cfg()
    expect(r.scanString('ANTHROPIC_KEY=sk-ant-api03-abcdef_ghijklmnopqrstuvwxyz1234567890'))
      .toContain('[REDACTED]')
  })

  it('redacts GitHub token', () => {
    const r = cfg()
    expect(r.scanString('tok: ghp_0123456789abcdefghijklmnopqrstuvwxyz')).toContain('[REDACTED]')
  })

  it('redacts AWS access key', () => {
    const r = cfg()
    expect(r.scanString('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE')).toContain('[REDACTED]')
  })

  it('redacts JWT-shape', () => {
    const r = cfg()
    const jwt = 'eyJhbGciOi.JIUzI1NiJ9.eyJpYXQiOjE2MDM2MDAwMDB9'
    expect(r.scanString(`token=${jwt}`)).toContain('[REDACTED]')
  })

  it('accepts custom patterns', () => {
    const r = cfg({ patterns: ['CUSTOM-\\d{4}'] })
    expect(r.scanString('leak CUSTOM-1234 here')).toContain('[REDACTED]')
  })

  it('accepts keyword match', () => {
    const r = cfg({ keywords: ['PASSWORD=secret'] })
    expect(r.scanString('env: PASSWORD=secret\n')).toContain('[REDACTED]')
  })

  it('passes clean strings through unchanged', () => {
    const r = cfg()
    expect(r.scanString('hello world, just a prompt')).toBe('hello world, just a prompt')
  })

  it('disabled redactor is noop', () => {
    const r = cfg({ enabled: false })
    const dirty = 'sk-abcdefghijklmnopqrstuvwxyzABCDEF1234'
    expect(r.scanString(dirty)).toBe(dirty)
  })

  it('redacts in TimelineEvent prompt', () => {
    const r = cfg()
    const ev: TimelineEvent = {
      ts: 1, type: 'prompt',
      data: { text: 'my sk-abcdefghijklmnopqrstuvwxyzABCDEF1234', tokensIn: 1 }
    }
    const cleaned = r.scanEvent(ev)
    if (cleaned.type !== 'prompt') throw new Error('type changed')
    expect(cleaned.data.text).toContain('[REDACTED]')
  })

  it('redacts nested tool_call args', () => {
    const r = cfg()
    const ev: TimelineEvent = {
      ts: 1, type: 'tool_call',
      data: { name: 'Bash', args: { env: { AWS: 'AKIAIOSFODNN7EXAMPLE' } } }
    }
    const cleaned = r.scanEvent(ev)
    const args = (cleaned.type === 'tool_call' ? cleaned.data.args : null) as { env: { AWS: string } } | null
    expect(args?.env.AWS).toBe('[REDACTED]')
  })
})
