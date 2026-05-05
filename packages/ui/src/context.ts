import { createContext, useContext } from 'react'

export interface AnimationContextValue {
  /** Milliseconds elapsed since session start. */
  currentMs: number
  /** 0..1 phase that cycles every 1 second. */
  pulse1s: number
  /** 0..1 phase that cycles every 1.5 seconds. */
  pulse15s: number
  /** 0..1 phase that cycles every 2 seconds. */
  pulse2s: number
  /** Target frame rate (60 in Remotion VOD, 30 in live mode). */
  fps: number
}

const DEFAULT: AnimationContextValue = {
  currentMs: 0,
  pulse1s: 0,
  pulse15s: 0,
  pulse2s: 0,
  fps: 60
}

export const AnimationCtx = createContext<AnimationContextValue>(DEFAULT)

export const useAnimation = (): AnimationContextValue => useContext(AnimationCtx)

/**
 * Triangle-wave opacity from a 0..1 phase.
 *   phase = 0    -> hi
 *   phase = 0.5  -> lo
 *   phase = 1    -> hi
 */
export const pulseOpacity = (phase: number, lo = 0.4, hi = 1): number => {
  const tri = Math.abs(phase * 2 - 1)
  return lo + (hi - lo) * tri
}
