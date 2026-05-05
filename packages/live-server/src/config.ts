import { existsSync, readFileSync } from 'node:fs'

export interface LiveConfig {
  server: {
    port: number
    host: string
  }
  watcher: {
    /** Absolute path to jsonl, OR 'auto' to resolve from projectRoot + latest mtime. */
    jsonlPath: string | 'auto'
    /** Used when jsonlPath is 'auto'. */
    projectRoot: string
    /** Used when jsonlPath is 'auto'; pick specific uuid or 'auto' (latest). */
    sessionUuid: string | 'auto'
  }
  redactor: {
    enabled: boolean
    patterns: string[]
    keywords: string[]
    replacement: string
  }
  ui: {
    activityLogMaxEntries: number
    pulseFps: number
    ringBufferSize: number
    pingIntervalMs: number
  }
}

export const DEFAULT_CONFIG: LiveConfig = {
  server: { port: 3333, host: '127.0.0.1' },
  watcher: {
    jsonlPath: 'auto',
    projectRoot: process.cwd(),
    sessionUuid: 'auto'
  },
  redactor: {
    enabled: true,
    patterns: [],
    keywords: [],
    replacement: '[REDACTED]'
  },
  ui: {
    activityLogMaxEntries: 100,
    pulseFps: 30,
    ringBufferSize: 500,
    pingIntervalMs: 15000
  }
}

export function loadConfig(path?: string): LiveConfig {
  if (!path || !existsSync(path)) return DEFAULT_CONFIG
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<LiveConfig>
    return {
      server: { ...DEFAULT_CONFIG.server, ...(raw.server ?? {}) },
      watcher: { ...DEFAULT_CONFIG.watcher, ...(raw.watcher ?? {}) },
      redactor: { ...DEFAULT_CONFIG.redactor, ...(raw.redactor ?? {}) },
      ui: { ...DEFAULT_CONFIG.ui, ...(raw.ui ?? {}) }
    }
  } catch (err) {
    console.warn(`[config] failed to parse ${path}: ${(err as Error).message}; using defaults`)
    return DEFAULT_CONFIG
  }
}
