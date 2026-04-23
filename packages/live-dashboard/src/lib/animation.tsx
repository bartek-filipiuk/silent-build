import { useEffect, useState, type ReactNode } from 'react'
import { AnimationCtx, type AnimationContextValue } from '@silent-build/ui'

interface Props {
  /** Session start in ms-since-epoch; when null, provider waits. */
  sessionStartTs: number | null
  /** Update rate for pulse phases. 30 Hz is visually smooth and half the CPU of 60. */
  pulseFps?: number
  children: ReactNode
}

/**
 * rAF loop throttled to pulseFps emits new AnimationContextValue so pulsing
 * widgets re-render smoothly. In live mode currentMs = wall clock since
 * sessionStartTs (falls back to 0 until first event arrives).
 */
export const LiveAnimationProvider = ({ sessionStartTs, pulseFps = 30, children }: Props) => {
  const [value, setValue] = useState<AnimationContextValue>({
    currentMs: 0, pulse1s: 0, pulse15s: 0, pulse2s: 0, fps: pulseFps
  })

  useEffect(() => {
    let rafId = 0
    let last = 0
    const interval = 1000 / pulseFps
    const tick = (now: number) => {
      if (now - last >= interval) {
        last = now
        const wall = performance.now()
        setValue({
          currentMs: sessionStartTs ? Math.max(0, Date.now() - sessionStartTs) : 0,
          pulse1s: (wall / 1000) % 1,
          pulse15s: (wall / 1500) % 1,
          pulse2s: (wall / 2000) % 1,
          fps: pulseFps
        })
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [sessionStartTs, pulseFps])

  return <AnimationCtx.Provider value={value}>{children}</AnimationCtx.Provider>
}
