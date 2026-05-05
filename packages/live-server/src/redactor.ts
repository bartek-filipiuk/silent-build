import type { TimelineEvent } from '@silent-build/shared'

/**
 * Default patterns — credential-shaped strings that almost certainly should
 * never appear on a live stream. Kept conservative: a false positive just
 * produces a redacted label, never a crash.
 */
const DEFAULT_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9]{32,}/g,                                  // OpenAI
  /sk-ant-[A-Za-z0-9_-]{32,}/g,                            // Anthropic
  /gh[pousr]_[A-Za-z0-9]{36,}/g,                           // GitHub
  /AKIA[0-9A-Z]{16}/g,                                     // AWS access key
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,    // JWT-shape
  /Bearer\s+[A-Za-z0-9_\-\.]+/gi
]

export interface RedactorConfig {
  enabled: boolean
  patterns: string[]   // extra user-supplied regex source strings
  keywords: string[]   // extra case-insensitive keyword matches
  replacement: string
}

export interface Redactor {
  scanString(input: string): string
  scanEvent(event: TimelineEvent): TimelineEvent
}

export function createRedactor(config: RedactorConfig): Redactor {
  if (!config.enabled) {
    return {
      scanString: (s) => s,
      scanEvent: (e) => e
    }
  }

  const userPatterns: RegExp[] = []
  for (const src of config.patterns) {
    try {
      userPatterns.push(new RegExp(src, 'g'))
    } catch (err) {
      console.warn(`[redactor] invalid pattern: ${src} (${(err as Error).message})`)
    }
  }
  const keywords = config.keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 0)
  const allPatterns = [...DEFAULT_PATTERNS, ...userPatterns]

  const scanString = (input: string): string => {
    if (!input) return input
    let out = input
    for (const re of allPatterns) out = out.replace(re, config.replacement)
    if (keywords.length) {
      const lower = out.toLowerCase()
      for (const kw of keywords) {
        let idx = 0
        while ((idx = lower.indexOf(kw, idx)) !== -1) {
          out = out.slice(0, idx) + config.replacement + out.slice(idx + kw.length)
          // Update lower view since lengths may differ.
          return scanString(out)
        }
      }
    }
    return out
  }

  const scanUnknown = (v: unknown): unknown => {
    if (typeof v === 'string') return scanString(v)
    if (Array.isArray(v)) return v.map(scanUnknown)
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v)) out[k] = scanUnknown(val)
      return out
    }
    return v
  }

  const scanEvent = (event: TimelineEvent): TimelineEvent => {
    switch (event.type) {
      case 'prompt':
        return { ...event, data: { ...event.data, text: scanString(event.data.text) } }
      case 'tool_call':
        return {
          ...event,
          data: { ...event.data, args: scanUnknown(event.data.args) }
        }
      case 'file_write':
      case 'file_edit':
      case 'tokens_delta':
      case 'security_finding':
        return event
    }
  }

  return { scanString, scanEvent }
}
