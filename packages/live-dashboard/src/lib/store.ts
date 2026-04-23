import type {
  LiveServerMessage,
  SessionTimeline,
  TimelineEvent,
  TriggerScene
} from '@silent-build/shared'
import { useSyncExternalStore } from 'react'

export interface OverlayState {
  scene: TriggerScene
  props: unknown
  startedAt: number
}

interface StoreState {
  timeline: SessionTimeline | null
  overlay: OverlayState | null
  connected: boolean
  version: number
}

const DEFAULT: StoreState = {
  timeline: null,
  overlay: null,
  connected: false,
  version: 0
}

const state: StoreState = { ...DEFAULT }
const listeners = new Set<() => void>()

const emit = (): void => {
  state.version += 1
  for (const l of listeners) l()
}

export const store = {
  getState: (): StoreState => state,

  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  setConnected(v: boolean): void {
    state.connected = v
    emit()
  },

  applyMessage(msg: LiveServerMessage): void {
    if (msg.kind === 'snapshot') {
      state.timeline = msg.timeline
      emit()
    } else if (msg.kind === 'delta') {
      if (!state.timeline) {
        state.timeline = {
          project: { name: 'Session', startTs: Date.now(), endTs: Date.now() },
          phases: [
            { index: 1, label: 'Architecture', startTs: 0, endTs: 0, source: 'heuristic' },
            { index: 2, label: 'Backend',      startTs: 0, endTs: 0, source: 'heuristic' },
            { index: 3, label: 'Frontend',     startTs: 0, endTs: 0, source: 'heuristic' },
            { index: 4, label: 'Security',     startTs: 0, endTs: 0, source: 'heuristic' }
          ],
          events: [],
          metrics: { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
        }
      }
      mergeEvents(state.timeline, msg.events)
      emit()
    } else if (msg.kind === 'trigger') {
      if (msg.scene === 'Clear') {
        state.overlay = null
      } else {
        state.overlay = { scene: msg.scene, props: msg.props, startedAt: Date.now() }
      }
      emit()
    }
    // ping: ignore (connection keepalive only)
  },

  clearOverlay(): void {
    if (state.overlay) {
      state.overlay = null
      emit()
    }
  }
}

function mergeEvents(t: SessionTimeline, newEvents: TimelineEvent[]): void {
  for (const e of newEvents) {
    if (t.project.startTs === 0 || e.ts < t.project.startTs) t.project.startTs = e.ts
    if (e.ts > t.project.endTs) t.project.endTs = e.ts
    t.events.push(e)
    if (e.type === 'prompt') t.metrics.promptsCount += 1
    else if (e.type === 'tool_call') t.metrics.toolCallsCount += 1
    else if (e.type === 'tokens_delta') t.metrics.totalTokens += e.data.input + e.data.output
    else if (e.type === 'file_write' || e.type === 'file_edit') {
      if (!t.events.some((ev, i) => i < t.events.length - 1 &&
        (ev.type === 'file_write' || ev.type === 'file_edit') &&
        ev.data.path === e.data.path)) {
        t.metrics.filesTouched += 1
      }
    }
  }
}

export const useTimeline = (): SessionTimeline | null =>
  useSyncExternalStore(store.subscribe, () => store.getState().timeline, () => null)

export const useOverlay = (): OverlayState | null =>
  useSyncExternalStore(store.subscribe, () => store.getState().overlay, () => null)

export const useConnected = (): boolean =>
  useSyncExternalStore(store.subscribe, () => store.getState().connected, () => false)
