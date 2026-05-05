import type React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { AnimationCtx, type AnimationContextValue } from '@silent-build/ui'

/**
 * Wraps a composition tree and injects AnimationCtx values computed from
 * Remotion's useCurrentFrame + useVideoConfig. Any @silent-build/ui widget
 * rendered under this provider sees the same pulse phases / currentMs as it
 * would have done under Remotion's own frame-based hooks.
 */
export const RemotionAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const period1s = fps
  const period15s = Math.round(fps * 1.5)
  const period2s = fps * 2
  const value: AnimationContextValue = {
    currentMs: Math.floor((frame * 1000) / fps),
    pulse1s: (frame % period1s) / period1s,
    pulse15s: (frame % period15s) / period15s,
    pulse2s: (frame % period2s) / period2s,
    fps
  }
  return <AnimationCtx.Provider value={value}>{children}</AnimationCtx.Provider>
}

/**
 * HOC: wraps a component so Remotion's <Composition component={...} /> receives
 * a wrapper that injects the animation context around the real component.
 */
export const withRemotionAnimation = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const Wrapped: React.FC<P> = (props) => (
    <RemotionAnimationProvider>
      <Component {...props} />
    </RemotionAnimationProvider>
  )
  Wrapped.displayName = `WithRemotionAnimation(${Component.displayName ?? Component.name ?? 'Component'})`
  return Wrapped
}
