import type React from 'react'
import { interpolate, spring } from 'remotion'
import type { Phase } from '@silent-build/shared'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface PhaseTransitionProps {
  phase: Phase
  phaseNumber: 1 | 2 | 3 | 4
  durationInFrames?: number
}

// Taglines keyed on phase NUMBER (not label), so this works regardless of
// how the upstream phase.label is localized/customized.
const TAGLINES: Record<1 | 2 | 3 | 4, string> = {
  1: 'scaffold the world',
  2: 'build the API that powers this',
  3: 'make it feel right',
  4: 'break it before the internet does'
}

// Decorative spaced-letters formatter.
const spacedPhase = (n: number): string =>
  `P H A S E   ${n}  /  4`

export const PhaseTransition: React.FC<PhaseTransitionProps> = ({
  phase, phaseNumber, durationInFrames: durProp
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = Math.floor(currentMs * fps / 1000)
  const durationInFrames = durProp ?? Math.round(fps * 2.5)

  // Card fades in/out cleanly at both ends (last 18 frames fade out).
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
  })
  const cardOpacity = Math.min(fadeIn, fadeOut)

  // Grid-line draw-in: width goes 0 → 100% over the first 30 frames.
  const lineWidthPct = interpolate(frame, [0, 30], [0, 100], { extrapolateRight: 'clamp' })
  const lineOpacity  = interpolate(frame, [0, 30], [0, 1],   { extrapolateRight: 'clamp' })

  // Label spring.
  const labelSpring = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 14, stiffness: 120 } })
  const labelTranslate = interpolate(labelSpring, [0, 1], [30, 0])
  const labelOpacity = interpolate(frame, [12, 32], [0, 1], { extrapolateRight: 'clamp' })

  // Small-caps "PHASE N / 4" just above label.
  const phaseLineOpacity = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: 'clamp' })
  const phaseLineTranslate = interpolate(frame, [6, 22], [8, 0], { extrapolateRight: 'clamp' })

  // Tagline fades in last.
  const taglineOpacity = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: 'clamp' })

  // Subtle zoom-out of the label: 1.04 → 1.00 so it feels like settling into place.
  const labelScale = interpolate(frame, [12, 45], [1.04, 1.0], { extrapolateRight: 'clamp' })

  const tagline = TAGLINES[phaseNumber]

  return (
    <div style={{
      position: 'relative', width: 1920, height: 1080,
      background: tokens.colors.bg,
      color: tokens.colors.textPrimary,
      fontFamily: tokens.typography.fontMono,
      overflow: 'hidden',
      opacity: cardOpacity
    }}>
      {/* ambient backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(900px 600px at 50% 50%, ${tokens.colors.amberGlow}, transparent 65%)`,
        pointerEvents: 'none'
      }} />

      {/* Top grid line (draws in from center) */}
      <div style={{
        position: 'absolute', top: 200, left: '50%',
        transform: `translateX(-50%)`,
        width: `${lineWidthPct}%`, maxWidth: 1728,
        height: 1, background: tokens.colors.amberDim,
        opacity: lineOpacity,
        boxShadow: `0 0 8px ${tokens.colors.amberGlow}`
      }} />

      {/* Bottom grid line */}
      <div style={{
        position: 'absolute', bottom: 200, left: '50%',
        transform: `translateX(-50%)`,
        width: `${lineWidthPct}%`, maxWidth: 1728,
        height: 1, background: tokens.colors.amberDim,
        opacity: lineOpacity,
        boxShadow: `0 0 8px ${tokens.colors.amberGlow}`
      }} />

      {/* Centered content */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: tokens.spacing.xxl
      }}>
        {/* spaced-letters PHASE N / 4 */}
        <div style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 28, fontWeight: 500,
          letterSpacing: '0.2em',
          color: tokens.colors.textDim,
          textTransform: 'uppercase',
          opacity: phaseLineOpacity,
          transform: `translateY(${phaseLineTranslate}px)`
        }}>{spacedPhase(phaseNumber)}</div>

        {/* Big phase label */}
        <div style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 160, fontWeight: 700,
          color: tokens.colors.amber,
          letterSpacing: '0.04em', lineHeight: 1,
          textTransform: 'uppercase',
          textShadow: `0 0 60px ${tokens.colors.amberGlow}`,
          opacity: labelOpacity,
          transform: `translateY(${labelTranslate}px) scale(${labelScale})`
        }}>{phase.label}</div>

        {/* Tagline */}
        <div style={{
          fontFamily: tokens.typography.fontMono,
          fontSize: 24, fontWeight: 400,
          color: tokens.colors.textDim,
          letterSpacing: '0.08em',
          opacity: taglineOpacity,
          fontStyle: 'italic',
          borderTop: `1px solid ${tokens.colors.grid}`,
          paddingTop: tokens.spacing.lg,
          minWidth: 640, textAlign: 'center'
        }}>“{tagline}”</div>
      </div>
    </div>
  )
}
