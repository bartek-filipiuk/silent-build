// Cost calculation for Claude Code sessions, based on Anthropic public API rates.
// Used by TokenCounter widget + StatsCard + OutroCard to show "what would this
// have cost if you ran it on the API". Claude Code Pro/Max users don't pay
// per-token directly — the figure is illustrative.
//
// Rates as of 2026-05; update if Anthropic publishes a change.

import type { TimelineEvent } from '@silent-build/shared'

export type ModelFamily = 'opus' | 'sonnet' | 'haiku'

export interface ModelRates {
  /** Per 1M tokens, USD. */
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export const RATES: Record<ModelFamily, ModelRates> = {
  opus:   { input: 15, output: 75, cacheRead: 1.5,  cacheWrite: 18.75 },
  sonnet: { input: 3,  output: 15, cacheRead: 0.3,  cacheWrite: 3.75  },
  haiku:  { input: 1,  output: 5,  cacheRead: 0.1,  cacheWrite: 1.25  }
}

const FAMILY_LABEL: Record<ModelFamily, string> = {
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku'
}

/** Detect family from a model id like "claude-opus-4-7" or "claude-sonnet-4-6-20250109". Defaults to opus. */
export const detectFamily = (model: string | undefined): ModelFamily => {
  if (!model) return 'opus'
  const lower = model.toLowerCase()
  if (lower.includes('opus')) return 'opus'
  if (lower.includes('sonnet')) return 'sonnet'
  if (lower.includes('haiku')) return 'haiku'
  return 'opus'
}

/** Pretty label for screen, e.g. "Opus 4.7" from "claude-opus-4-7". Strips the date suffix if present. */
export const formatModelLabel = (model: string | undefined): string => {
  if (!model) return 'Claude'
  const family = detectFamily(model)
  // Try to extract a version like "4-7" or "4-6-20250109" → "4.7"
  const match = model.match(/(\d+[-.]\d+)/)
  if (match && match[1]) {
    const version = match[1].replace('-', '.')
    return `${FAMILY_LABEL[family]} ${version}`
  }
  return FAMILY_LABEL[family]
}

/** Cost for a single tokens_delta event in USD, using the model field if present. */
export const eventCost = (
  ev: Extract<TimelineEvent, { type: 'tokens_delta' }>
): number => {
  const r = RATES[detectFamily(ev.data.model)]
  return (
    (ev.data.input / 1e6) * r.input +
    (ev.data.output / 1e6) * r.output +
    ((ev.data.cacheRead ?? 0) / 1e6) * r.cacheRead +
    ((ev.data.cacheWrite ?? 0) / 1e6) * r.cacheWrite
  )
}

/** Cumulative cost up to currentMs. Iterates events in order, sums per-event cost. */
export const computeCostUpTo = (
  events: TimelineEvent[],
  currentTs: number
): number => {
  let total = 0
  for (const e of events) {
    if (e.ts > currentTs) break
    if (e.type !== 'tokens_delta') continue
    total += eventCost(e)
  }
  return total
}

/** Most-recent model seen up to currentMs. Falls back to "Opus" if no events have a model. */
export const currentModelLabel = (
  events: TimelineEvent[],
  currentTs: number
): string => {
  let lastModel: string | undefined
  for (const e of events) {
    if (e.ts > currentTs) break
    if (e.type !== 'tokens_delta') continue
    if (e.data.model) lastModel = e.data.model
  }
  return formatModelLabel(lastModel)
}

/** Format cost as "$1.23" or "$0.45" with 2 decimal places. Above $999 falls back to "$1.2k". */
export const formatCost = (cost: number): string => {
  if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}k`
  if (cost >= 100) return `$${cost.toFixed(0)}`
  return `$${cost.toFixed(2)}`
}
