import { parseJsonl } from './parser.js'
import {
  computeActiveTimeMs,
  extractAssistantText,
  extractPrompts,
  extractTokens,
  extractToolCalls,
  extractFileOps,
  computeTimerBounds
} from './extractor.js'
import { detectPhases } from './phase-detector.js'
import { mergeSubagents } from './subagent-merger.js'
import type { SessionTimeline, TimelineEvent, ManualMarkersFile } from '@silent-build/shared'

export interface BuildArgs {
  sessionJsonlPath: string
  subagentsDir: string | null
  markers: ManualMarkersFile | null
  projectName: string
}

export function buildTimeline(args: BuildArgs): SessionTimeline {
  const parsed = parseJsonl(args.sessionJsonlPath)
  const { startTs, endTs } = computeTimerBounds(parsed)

  const events: TimelineEvent[] = [
    ...extractPrompts(parsed),
    ...extractTokens(parsed),
    ...extractFileOps(parsed),
    ...extractToolCalls(parsed),
    ...extractAssistantText(parsed)
  ]

  if (args.subagentsDir) {
    events.push(...mergeSubagents(args.subagentsDir))
  }

  events.sort((a, b) => a.ts - b.ts)

  const phases = detectPhases({
    markers: args.markers,
    startTs: args.markers?.markers[0]?.timestamp ?? startTs,
    endTs
  })

  // totalTokens includes cache reads + writes — they ARE billable tokens
  // (cache read at $1.5/M, cache write at $18.75/M for Opus) and the
  // dashboard widget (TokenCounter) already sums them. Without this the
  // outro showed e.g. "1.5M tokens · API EST. $746" which looks like a
  // mismatch — really it's 212M tokens of which 191M is cacheRead.
  const totalTokens = events
    .filter(e => e.type === 'tokens_delta')
    .reduce((sum, e) => {
      if (e.type !== 'tokens_delta') return sum
      return sum
        + e.data.input
        + e.data.output
        + (e.data.cacheRead ?? 0)
        + (e.data.cacheWrite ?? 0)
    }, 0)

  const filesTouched = new Set(
    events
      .filter(e => e.type === 'file_write' || e.type === 'file_edit')
      .map(e => (e.data as { path: string }).path)
  ).size

  const promptsCount = events.filter(e => e.type === 'prompt').length
  const toolCallsCount = events.filter(e => e.type === 'tool_call').length

  const activeTimeMs = computeActiveTimeMs(parsed)

  let linesAdded = 0
  let linesChanged = 0
  for (const e of events) {
    if (e.type === 'file_write') linesAdded += e.data.linesAdded
    if (e.type === 'file_edit') linesChanged += e.data.linesChanged
  }

  return {
    project: { name: args.projectName, startTs, endTs },
    phases,
    events,
    metrics: {
      totalTokens,
      filesTouched,
      promptsCount,
      toolCallsCount,
      activeTimeMs,
      linesAdded,
      linesChanged
    }
  }
}
