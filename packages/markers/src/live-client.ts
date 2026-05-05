import type { ManualMarker } from '@silent-build/shared'

export interface LiveTriggerOptions {
  url: string
}

/**
 * Map markers → live-server trigger endpoints. Returns null when the marker
 * has no mapped scene (e.g. polish-start — no overlay defined for it).
 */
const markerToTrigger = (phase: ManualMarker['phase']): { path: string; n?: number } | null => {
  switch (phase) {
    case 'project-start':   return { path: '/api/trigger/intro' }
    case 'backend-start':   return { path: '/api/trigger/phase', n: 2 }
    case 'frontend-start':  return { path: '/api/trigger/phase', n: 3 }
    case 'security-start':  return { path: '/api/trigger/phase', n: 4 }
    case 'polish-start':    return null
  }
}

export async function notifyLive(
  phase: ManualMarker['phase'],
  opts: LiveTriggerOptions
): Promise<boolean> {
  const trig = markerToTrigger(phase)
  if (!trig) return false
  const qs = trig.n !== undefined ? `?n=${trig.n}` : ''
  try {
    const res = await fetch(`${opts.url}${trig.path}${qs}`, { method: 'POST' })
    if (!res.ok) {
      console.warn(`[markers --live] ${trig.path} → ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.warn(`[markers --live] failed: ${(err as Error).message} (is live-server running?)`)
    return false
  }
}
