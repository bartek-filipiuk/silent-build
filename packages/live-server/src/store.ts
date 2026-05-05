import { EventEmitter } from 'node:events'
import type {
  ParsedEvent
} from '@silent-build/harvester/parser'
import {
  extractPrompts,
  extractTokens,
  extractFileOps,
  extractToolCalls
} from '@silent-build/harvester/extractor'
import { detectPhases } from '@silent-build/harvester/phase-detector'
import type {
  SessionTimeline,
  TimelineEvent,
  Phase,
  ManualMarkersFile
} from '@silent-build/shared'

export interface StoreOptions {
  projectName: string
  ringBufferSize: number
}

let nextId = 1

/**
 * In-memory growing SessionTimeline. Emits 'delta' on apply with new events.
 * Maintains a ring buffer of the last N events for SSE reconnection backfill.
 */
export class TimelineStore extends EventEmitter {
  private projectName: string
  private ringBufferSize: number
  private allEvents: TimelineEvent[] = []
  private ring: Array<{ id: number; event: TimelineEvent }> = []
  private startTs: number | null = null
  private endTs: number | null = null
  private markers: ManualMarkersFile | null = null
  private phases: Phase[] = []

  constructor(opts: StoreOptions) {
    super()
    this.projectName = opts.projectName
    this.ringBufferSize = opts.ringBufferSize
    this.recomputePhases()
  }

  /** Consume a batch of parsed events and emit delta. */
  applyParsed(events: ParsedEvent[]): void {
    if (events.length === 0) return
    const derived: TimelineEvent[] = [
      ...extractPrompts(events),
      ...extractTokens(events),
      ...extractFileOps(events),
      ...extractToolCalls(events)
    ]
    if (derived.length === 0) return
    derived.sort((a, b) => a.ts - b.ts)

    for (const e of derived) {
      if (this.startTs === null || e.ts < this.startTs) this.startTs = e.ts
      if (this.endTs === null || e.ts > this.endTs) this.endTs = e.ts
      this.allEvents.push(e)
      this.ring.push({ id: nextId++, event: e })
      if (this.ring.length > this.ringBufferSize) this.ring.shift()
    }
    this.recomputePhases()
    this.emit('delta', derived)
  }

  setMarkers(markers: ManualMarkersFile | null): void {
    this.markers = markers
    this.recomputePhases()
    this.emit('phases-updated', this.phases)
  }

  setProjectName(name: string): void {
    this.projectName = name
  }

  snapshot(): SessionTimeline {
    const start = this.startTs ?? Date.now()
    const end = this.endTs ?? start
    return {
      project: { name: this.projectName, startTs: start, endTs: end },
      phases: this.phases.length ? this.phases : this.fallbackPhases(start, end),
      events: [...this.allEvents],
      metrics: this.computeMetrics()
    }
  }

  /** For SSE reconnect with Last-Event-ID: return events with id > sinceId. */
  since(sinceId: number): TimelineEvent[] {
    return this.ring.filter((r) => r.id > sinceId).map((r) => r.event)
  }

  /** Current tail id (for snapshot responses). */
  tailId(): number {
    return nextId - 1
  }

  private recomputePhases(): void {
    const start = this.startTs ?? Date.now()
    const end = this.endTs ?? start
    this.phases = detectPhases({
      markers: this.markers,
      startTs: this.markers?.markers[0]?.timestamp ?? start,
      endTs: end
    })
  }

  private fallbackPhases(start: number, end: number): Phase[] {
    return detectPhases({ markers: null, startTs: start, endTs: end })
  }

  private computeMetrics() {
    let totalTokens = 0
    const files = new Set<string>()
    let promptsCount = 0
    let toolCallsCount = 0
    for (const e of this.allEvents) {
      if (e.type === 'tokens_delta') totalTokens += e.data.input + e.data.output
      else if (e.type === 'prompt') promptsCount += 1
      else if (e.type === 'tool_call') toolCallsCount += 1
      else if (e.type === 'file_write' || e.type === 'file_edit') files.add(e.data.path)
    }
    return {
      totalTokens,
      filesTouched: files.size,
      promptsCount,
      toolCallsCount
    }
  }
}
