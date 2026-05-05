import {
  type RawEvent,
  extractUserText,
  isToolResultOnly,
  extractToolUses
} from './jsonl-reader.js'
import type { Candidate, CandidateTag } from './narrative-schema.js'

const TEN_MIN_MS = 10 * 60 * 1000
const LONG_PAUSE_MS = 30 * 60 * 1000
const DESIGN_FILE_RX = /(\.(svelte|tsx|jsx))$|\/messages\/[^/]+\.json$/i

const RX_AUDIT = /\b(audit|security|recon|cve|vulnerability)\b/i
const RX_END = /\b(deploy|launch|prod|production|release|ship|merge)\b/i
const RX_DESIGN = /\b(design|figma|brief|ui|ux|brand|logo)\b/i
const RX_PLAN = /\b(plan|spec|roadmap|architecture|concept)\b/i

const truncate = (s: string, n = 280): string =>
  s.length > n ? s.slice(0, n - 1).trim() + '…' : s.trim()

const filePathOf = (input: Record<string, unknown>): string | null => {
  const fp = input['file_path'] ?? input['path']
  return typeof fp === 'string' ? fp : null
}

const isoOf = (ev: RawEvent): string => ev.isoTs

interface CandidateRaw {
  from: string
  to: string
  sourceJsonl: string
  tag: CandidateTag
  reason: string
  metricsSummary: string
  firstPromptText: string
  signal: number
}

const SYNTHETIC_PROMPT_PREFIXES = [
  'Base directory for this skill:',
  '<command-name>',
  '<task-notification>',
  '<system-reminder>',
  '<local-command-caveat>',
  '<bash-input>',
  '<bash-stdout>',
  '[Request interrupted'
]

const isSyntheticPrompt = (text: string): boolean =>
  SYNTHETIC_PROMPT_PREFIXES.some((prefix) => text.trimStart().startsWith(prefix))

const userPromptsWithText = (events: RawEvent[]): RawEvent[] =>
  events.filter((e) => {
    if (e.type !== 'user') return false
    if (isToolResultOnly(e)) return false
    const text = extractUserText(e).trim()
    if (!text) return false
    if (isSyntheticPrompt(text)) return false
    return true
  })

const firstPromptInRange = (
  events: RawEvent[],
  fromTs: number,
  toTs: number
): string => {
  for (const ev of events) {
    if (ev.ts < fromTs || ev.ts > toTs) continue
    if (ev.type !== 'user' || isToolResultOnly(ev)) continue
    const txt = extractUserText(ev).trim()
    if (!txt || isSyntheticPrompt(txt)) continue
    return truncate(txt, 280)
  }
  return ''
}

export const detectFirstPrompts = (
  events: RawEvent[],
  n = 5
): CandidateRaw[] => {
  const userEvents = userPromptsWithText(events)
  const slice = userEvents.slice(0, n)
  if (slice.length === 0) return []
  const first = slice[0]!
  const last = slice[slice.length - 1]!
  return [
    {
      from: isoOf(first),
      to: isoOf(last),
      sourceJsonl: first.sourceJsonl,
      tag: 'start',
      reason: `first ${slice.length} user prompts`,
      metricsSummary: `${slice.length} prompts`,
      firstPromptText: truncate(extractUserText(first), 280),
      signal: 9
    }
  ]
}

export const detectLastPrompts = (
  events: RawEvent[],
  n = 3
): CandidateRaw[] => {
  const userEvents = userPromptsWithText(events)
  if (userEvents.length === 0) return []
  const slice = userEvents.slice(-n)
  const first = slice[0]!
  const last = slice[slice.length - 1]!
  return [
    {
      from: isoOf(first),
      to: isoOf(last),
      sourceJsonl: last.sourceJsonl,
      tag: 'end',
      reason: `last ${slice.length} user prompts`,
      metricsSummary: `${slice.length} prompts`,
      firstPromptText: truncate(extractUserText(first), 280),
      signal: 7
    }
  ]
}

interface ToolCallRecord {
  ev: RawEvent
  name: string
  filePath: string | null
}

const flattenToolCalls = (events: RawEvent[]): ToolCallRecord[] => {
  const out: ToolCallRecord[] = []
  for (const ev of events) {
    for (const t of extractToolUses(ev)) {
      out.push({ ev, name: t.name, filePath: filePathOf(t.input) })
    }
  }
  return out
}

export const detectEditBursts = (
  events: RawEvent[],
  windowMs = TEN_MIN_MS,
  minCount = 10,
  fileShareThreshold = 0.8
): CandidateRaw[] => {
  const calls = flattenToolCalls(events).filter(
    (c) =>
      (c.name === 'Edit' || c.name === 'Write' || c.name === 'NotebookEdit') &&
      c.filePath !== null
  )
  if (calls.length < minCount) return []

  const out: CandidateRaw[] = []
  const seen = new Set<string>()

  for (let i = 0; i < calls.length; i++) {
    const start = calls[i]!.ev.ts
    let j = i
    while (j < calls.length && calls[j]!.ev.ts - start <= windowMs) j++
    const window = calls.slice(i, j)
    if (window.length < minCount) continue

    const fileCounts = new Map<string, number>()
    for (const c of window) {
      const key = c.filePath ?? ''
      fileCounts.set(key, (fileCounts.get(key) ?? 0) + 1)
    }
    let topFile = ''
    let topCount = 0
    for (const [f, n] of fileCounts) {
      if (n > topCount) {
        topCount = n
        topFile = f
      }
    }
    if (topCount / window.length < fileShareThreshold) continue

    const firstEv = window[0]!.ev
    const lastEv = window[window.length - 1]!.ev
    const dedupKey = `${firstEv.ts}-${topFile}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)

    const tag: CandidateTag = DESIGN_FILE_RX.test(topFile) ? 'design' : 'build'
    out.push({
      from: isoOf(firstEv),
      to: isoOf(lastEv),
      sourceJsonl: firstEv.sourceJsonl,
      tag,
      reason: `edit-burst on ${topFile.split('/').pop() ?? topFile}`,
      metricsSummary: `${window.length} ${tag === 'design' ? 'edits' : 'edits'}, ${fileCounts.size} file${fileCounts.size === 1 ? '' : 's'}`,
      firstPromptText: firstPromptInRange(events, firstEv.ts, lastEv.ts),
      signal: 8
    })

    i = j - 1
  }

  return out
}

export const detectScaffolding = (
  events: RawEvent[],
  windowMs = TEN_MIN_MS,
  minWrites = 5
): CandidateRaw[] => {
  const writes = flattenToolCalls(events).filter(
    (c) => c.name === 'Write' && c.filePath !== null
  )
  if (writes.length < minWrites) return []

  const out: CandidateRaw[] = []
  for (let i = 0; i < writes.length; i++) {
    const start = writes[i]!.ev.ts
    let j = i
    while (j < writes.length && writes[j]!.ev.ts - start <= windowMs) j++
    const window = writes.slice(i, j)
    if (window.length < minWrites) continue

    const distinctFiles = new Set(window.map((w) => w.filePath))
    if (distinctFiles.size < minWrites) continue

    const firstEv = window[0]!.ev
    const lastEv = window[window.length - 1]!.ev
    out.push({
      from: isoOf(firstEv),
      to: isoOf(lastEv),
      sourceJsonl: firstEv.sourceJsonl,
      tag: 'build',
      reason: `scaffolding (${distinctFiles.size} new files)`,
      metricsSummary: `${window.length} writes, ${distinctFiles.size} files`,
      firstPromptText: firstPromptInRange(events, firstEv.ts, lastEv.ts),
      signal: 7
    })
    i = j - 1
  }
  return out
}

export const detectAgentRuns = (
  events: RawEvent[],
  minDurationMs = 5 * 60 * 1000
): CandidateRaw[] => {
  const out: CandidateRaw[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.type !== 'assistant') continue
    const tools = extractToolUses(ev)
    const hasAgent = tools.some((t) => t.name === 'Agent')
    if (!hasAgent) continue

    let nextUserTs: number | null = null
    for (let j = i + 1; j < events.length; j++) {
      const ej = events[j]!
      if (ej.type === 'user' && !isToolResultOnly(ej)) {
        nextUserTs = ej.ts
        break
      }
    }
    const endTs = nextUserTs ?? events[events.length - 1]!.ts
    const duration = endTs - ev.ts
    if (duration < minDurationMs) continue

    out.push({
      from: isoOf(ev),
      to: new Date(endTs).toISOString(),
      sourceJsonl: ev.sourceJsonl,
      tag: 'build',
      reason: `agent run (${Math.round(duration / 60000)} min)`,
      metricsSummary: `Agent + ${Math.round(duration / 60000)} min wallclock`,
      firstPromptText: firstPromptInRange(events, ev.ts, endTs),
      signal: 6
    })
  }
  return out
}

export const detectPromptKeywords = (events: RawEvent[]): CandidateRaw[] => {
  const out: CandidateRaw[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.type !== 'user' || isToolResultOnly(ev)) continue
    const text = extractUserText(ev)
    if (!text.trim()) continue
    if (isSyntheticPrompt(text)) continue

    let tag: CandidateTag | null = null
    let reason = ''
    if (RX_AUDIT.test(text)) {
      tag = 'audit'
      reason = 'audit/security keyword'
    } else if (RX_END.test(text)) {
      tag = 'end'
      reason = 'deploy/launch keyword'
    } else if (RX_DESIGN.test(text)) {
      tag = 'design'
      reason = 'design keyword'
    } else if (RX_PLAN.test(text)) {
      tag = 'plan'
      reason = 'plan/spec keyword'
    }
    if (!tag) continue

    const nextEv = events[i + 1] ?? ev
    out.push({
      from: isoOf(ev),
      to: isoOf(nextEv),
      sourceJsonl: ev.sourceJsonl,
      tag,
      reason,
      metricsSummary: 'keyword match in prompt',
      firstPromptText: truncate(text, 280),
      signal: 5
    })
  }
  return out
}

export const detectCommitPush = (events: RawEvent[]): CandidateRaw[] => {
  const out: CandidateRaw[] = []
  for (const ev of events) {
    if (ev.type !== 'assistant') continue
    for (const t of extractToolUses(ev)) {
      if (t.name !== 'Bash') continue
      const cmd = t.input['command']
      if (typeof cmd !== 'string') continue
      if (!/(git\s+(commit|push)|gh\s+pr\s+(create|merge))/.test(cmd)) continue
      out.push({
        from: isoOf(ev),
        to: isoOf(ev),
        sourceJsonl: ev.sourceJsonl,
        tag: 'end',
        reason: cmd.includes('push')
          ? 'git push'
          : cmd.includes('gh pr')
            ? 'PR action'
            : 'git commit',
        metricsSummary: truncate(cmd, 80),
        firstPromptText: '',
        signal: 6
      })
    }
  }
  return out
}

export const detectLongPauses = (
  events: RawEvent[]
): { fromTs: number; toTs: number }[] => {
  const out: { fromTs: number; toTs: number }[] = []
  for (let i = 1; i < events.length; i++) {
    const gap = events[i]!.ts - events[i - 1]!.ts
    if (gap >= LONG_PAUSE_MS) {
      out.push({ fromTs: events[i - 1]!.ts, toTs: events[i]!.ts })
    }
  }
  return out
}

const PROXIMITY_MS = 30 * 60 * 1000

const overlapsOrNear = (a: CandidateRaw, b: CandidateRaw): boolean => {
  if (a.tag !== b.tag) return false
  if (a.sourceJsonl !== b.sourceJsonl) return false
  const aFrom = Date.parse(a.from)
  const aTo = Date.parse(a.to)
  const bFrom = Date.parse(b.from)
  const bTo = Date.parse(b.to)
  if (aFrom <= bTo && bFrom <= aTo) return true
  const gap = Math.min(
    Math.abs(aFrom - bTo),
    Math.abs(bFrom - aTo)
  )
  return gap <= PROXIMITY_MS
}

const dedupe = (raws: CandidateRaw[]): CandidateRaw[] => {
  const sorted = [...raws].sort((a, b) => b.signal - a.signal)
  const kept: CandidateRaw[] = []
  for (const r of sorted) {
    if (kept.some((k) => overlapsOrNear(k, r))) continue
    kept.push(r)
  }
  return kept
}

const capPerTag = (
  raws: CandidateRaw[],
  perTagMax: number
): CandidateRaw[] => {
  const counts = new Map<CandidateTag, number>()
  const sorted = [...raws].sort((a, b) => b.signal - a.signal)
  const kept: CandidateRaw[] = []
  for (const r of sorted) {
    const c = counts.get(r.tag) ?? 0
    if (c >= perTagMax) continue
    counts.set(r.tag, c + 1)
    kept.push(r)
  }
  return kept
}

export interface PreprocessResult {
  candidates: Candidate[]
  totalEvents: number
}

export const preprocess = (
  events: RawEvent[],
  cap = 50,
  perTagMax = 12
): PreprocessResult => {
  const all: CandidateRaw[] = [
    ...detectFirstPrompts(events),
    ...detectLastPrompts(events),
    ...detectEditBursts(events),
    ...detectScaffolding(events),
    ...detectAgentRuns(events),
    ...detectPromptKeywords(events),
    ...detectCommitPush(events)
  ]

  const deduped = dedupe(all)
  const capped = capPerTag(deduped, perTagMax)
  const ordered = capped
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from))
    .slice(0, cap)

  const candidates: Candidate[] = ordered.map((c, i) => ({
    id: `cand-${String(i + 1).padStart(3, '0')}`,
    from: c.from,
    to: c.to,
    sourceJsonl: c.sourceJsonl,
    tag: c.tag,
    reason: c.reason,
    metricsSummary: c.metricsSummary,
    firstPromptText: c.firstPromptText
  }))

  return { candidates, totalEvents: events.length }
}
