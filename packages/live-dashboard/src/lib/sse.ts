import { LiveServerMessageSchema } from '@silent-build/shared'
import { store } from './store.js'

export function connectSse(url = '/events'): () => void {
  let es: EventSource | null = null
  let closed = false

  const open = (): void => {
    if (closed) return
    es = new EventSource(url)
    es.onopen = () => store.setConnected(true)
    es.onerror = () => {
      store.setConnected(false)
      // EventSource auto-reconnects; nothing to do.
    }
    const handle = (ev: MessageEvent) => {
      try {
        const parsed = LiveServerMessageSchema.parse(JSON.parse(ev.data))
        store.applyMessage(parsed)
      } catch (err) {
        console.warn('[sse] invalid message', err)
      }
    }
    // Named events
    es.addEventListener('snapshot', handle as EventListener)
    es.addEventListener('delta', handle as EventListener)
    es.addEventListener('trigger', handle as EventListener)
    es.addEventListener('ping', handle as EventListener)
    // Fallback for generic `message` events (when no `event: foo` header)
    es.onmessage = handle
  }

  open()

  return () => {
    closed = true
    if (es) {
      es.close()
      es = null
    }
    store.setConnected(false)
  }
}
