import { existsSync, readdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { parseJsonl } from './parser.js'
import { extractToolCalls, extractFileOps } from './extractor.js'
import type { TimelineEvent } from '@silent-build/shared'

export function mergeSubagents(subagentsDir: string): TimelineEvent[] {
  if (!existsSync(subagentsDir)) return []
  const files = readdirSync(subagentsDir).filter(f => f.endsWith('.jsonl'))
  const merged: TimelineEvent[] = []

  for (const file of files) {
    const subagentId = basename(file, extname(file))
    const events = parseJsonl(join(subagentsDir, file))
    const toolCalls = extractToolCalls(events).map(tc => ({
      ...tc,
      data: { ...tc.data, subagentId }
    }))
    const fileOps = extractFileOps(events)
    merged.push(...toolCalls, ...fileOps)
  }
  return merged
}
