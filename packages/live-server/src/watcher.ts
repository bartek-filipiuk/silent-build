import { EventEmitter } from 'node:events'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { open, type FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import { parseLine } from './parseLine.js'
import type { ParsedEvent } from '@silent-build/harvester/parser'

export interface WatcherOptions {
  jsonlPath: string
}

/**
 * Tail-style watcher for a Claude Code .jsonl file.
 * Emits 'events' with new ParsedEvent[] whenever new complete lines arrive.
 * Emits 'error' on fatal issues.
 */
export class JsonlWatcher extends EventEmitter {
  private fsWatcher: FSWatcher | null = null
  private offset = 0
  private pendingBuffer = ''

  constructor(private opts: WatcherOptions) {
    super()
  }

  async start(): Promise<void> {
    if (!existsSync(this.opts.jsonlPath)) {
      // File may not exist yet; chokidar will pick it up when created.
      this.offset = 0
    } else {
      this.offset = 0
      await this.readNewBytes()
    }
    this.fsWatcher = chokidar.watch(this.opts.jsonlPath, {
      awaitWriteFinish: false,
      usePolling: false,
      persistent: true,
      ignoreInitial: true
    })
    this.fsWatcher.on('change', () => { void this.readNewBytes() })
    this.fsWatcher.on('add', () => { void this.readNewBytes() })
    this.fsWatcher.on('unlink', () => {
      this.offset = 0
      this.pendingBuffer = ''
    })
    this.fsWatcher.on('error', (err) => this.emit('error', err))
  }

  async stop(): Promise<void> {
    if (this.fsWatcher) {
      await this.fsWatcher.close()
      this.fsWatcher = null
    }
  }

  private async readNewBytes(): Promise<void> {
    if (!existsSync(this.opts.jsonlPath)) return
    const size = statSync(this.opts.jsonlPath).size
    if (size < this.offset) {
      // File shrunk (truncated / rotated). Reset.
      this.offset = 0
      this.pendingBuffer = ''
    }
    if (size === this.offset) return

    let fh: FileHandle | null = null
    try {
      fh = await open(this.opts.jsonlPath, 'r')
      const len = size - this.offset
      const buf = Buffer.alloc(len)
      await fh.read(buf, 0, len, this.offset)
      this.offset = size
      const chunk = this.pendingBuffer + buf.toString('utf-8')
      const lastNl = chunk.lastIndexOf('\n')
      if (lastNl === -1) {
        this.pendingBuffer = chunk
        return
      }
      this.pendingBuffer = chunk.slice(lastNl + 1)
      const complete = chunk.slice(0, lastNl)
      const parsed: ParsedEvent[] = []
      let lineIdx = 0
      for (const rawLine of complete.split('\n')) {
        lineIdx += 1
        const line = rawLine.trim()
        if (!line) continue
        const p = parseLine(line, lineIdx)
        if (p) parsed.push(p)
      }
      if (parsed.length) this.emit('events', parsed)
    } finally {
      if (fh) await fh.close()
    }
  }
}

/**
 * Resolve jsonl path from project root. If sessionUuid is 'auto', pick latest mtime.
 */
export function resolveJsonlPath(projectRoot: string, sessionUuid: string | 'auto'): string {
  const slug = projectRoot.replace(/\//g, '-')
  const ccDir = join(process.env['HOME'] ?? '', '.claude', 'projects', slug)
  if (!existsSync(ccDir)) {
    throw new Error(`CC project dir not found: ${ccDir}`)
  }
  if (sessionUuid !== 'auto') {
    return join(ccDir, `${sessionUuid}.jsonl`)
  }
  const files = readdirSync(ccDir).filter((f) => f.endsWith('.jsonl'))
  if (files.length === 0) {
    throw new Error(`No jsonl sessions in ${ccDir}`)
  }
  const latest = files
    .map((f) => ({ f, m: statSync(join(ccDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0]!
  return join(ccDir, latest.f)
}
