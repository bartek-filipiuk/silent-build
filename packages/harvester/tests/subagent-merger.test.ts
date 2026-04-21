import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mergeSubagents } from '../src/subagent-merger.js'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('mergeSubagents', () => {
  let tmp: string
  let subagentsDir: string

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'subagents-test-'))
    subagentsDir = join(tmp, 'subagents')
    mkdirSync(subagentsDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns empty array when subagents dir does not exist', () => {
    const empty = join(tmpdir(), 'nonexistent-' + Math.random())
    const result = mergeSubagents(empty)
    expect(result).toEqual([])
  })

  it('returns empty array when subagents dir is empty', () => {
    const result = mergeSubagents(subagentsDir)
    expect(result).toEqual([])
  })

  it('tags each tool_call event with subagentId from filename', () => {
    writeFileSync(join(subagentsDir, 'agent-abc123.jsonl'),
      '{"type":"assistant","uuid":"a1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"assistant","content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls"}}]}}'
    )
    const events = mergeSubagents(subagentsDir)
    const toolCalls = events.filter(e => e.type === 'tool_call')
    expect(toolCalls).toHaveLength(1)
    if (toolCalls[0]!.type === 'tool_call') {
      expect(toolCalls[0]!.data.subagentId).toBe('agent-abc123')
    }
  })

  it('merges events from multiple subagent files', () => {
    writeFileSync(join(subagentsDir, 'agent-aaa.jsonl'),
      '{"type":"assistant","uuid":"a1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"assistant","content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"x"}}]}}'
    )
    writeFileSync(join(subagentsDir, 'agent-bbb.jsonl'),
      '{"type":"assistant","uuid":"a2","timestamp":"2026-04-21T10:00:01.000Z","message":{"role":"assistant","content":[{"type":"tool_use","id":"t2","name":"Grep","input":{"pattern":"y"}}]}}'
    )
    const events = mergeSubagents(subagentsDir).filter(e => e.type === 'tool_call')
    expect(events).toHaveLength(2)
    const ids = events.flatMap(e => e.type === 'tool_call' ? [e.data.subagentId] : [])
    expect(ids).toContain('agent-aaa')
    expect(ids).toContain('agent-bbb')
  })
})
