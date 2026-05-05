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
}

const state: StoreState = {
  timeline: null,
  overlay: null,
  connected: false
}
const listeners = new Set<() => void>()

const emit = (): void => {
  for (const l of listeners) l()
}

/** Shallow-clone timeline wrapper so useSyncExternalStore detects change. */
const bumpTimeline = (): void => {
  if (state.timeline) state.timeline = { ...state.timeline }
}
const bumpOverlay = (): void => {
  if (state.overlay) state.overlay = { ...state.overlay }
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
          project: { name: 'Session', startTs: 0, endTs: 0 },
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
      bumpTimeline()
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
  },

  /** Test/debug helper — reset all state. */
  reset(): void {
    state.timeline = null
    state.overlay = null
    state.connected = false
    emit()
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

/**
 * Used by LiveAnimationProvider: wall-clock time when this browser tab first
 * saw a session, not the (possibly historical) timestamp of the first event.
 * Keeps timer monotonic from the viewer's perspective even when the jsonl's
 * event timestamps are older (e.g. replay demo). On live streams the two
 * coincide to within a few hundred ms.
 */
let viewerEpoch: number | null = null
export const useViewerEpoch = (): number | null => {
  const timeline = useTimeline()
  if (timeline && viewerEpoch === null) {
    viewerEpoch = Date.now()
  }
  if (!timeline) {
    viewerEpoch = null
  }
  return viewerEpoch
}
