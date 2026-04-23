// packages/overlay/src/Dashboard.tsx
import type React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import type { SessionTimeline } from '@silent-build/shared'
import { Timer } from './widgets/Timer.js'
import { CurrentPrompt } from './widgets/CurrentPrompt.js'
import { TokenCounter } from './widgets/TokenCounter.js'
import { FileActivity } from './widgets/FileActivity.js'
import { ActivityLog } from './widgets/ActivityLog.js'
import { PhaseBar } from './widgets/PhaseBar.js'
import { SecurityPanel } from './widgets/SecurityPanel.js'
import { tokens } from '@silent-build/theme'

export interface DashboardProps {
  timeline: SessionTimeline
}

// --- Mission-control decorators (inline SVG, composed via absolute layout) ---

const CornerBracket: React.FC<{
  corner: 'tl' | 'tr' | 'bl' | 'br'
  inset: number
  size: number
  color: string
}> = ({ corner, inset, size, color }) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    pointerEvents: 'none'
  }
  const pos: React.CSSProperties =
    corner === 'tl' ? { top: inset, left: inset } :
    corner === 'tr' ? { top: inset, right: inset } :
    corner === 'bl' ? { bottom: inset, left: inset } :
                       { bottom: inset, right: inset }

  // Draw two strokes forming an L on the appropriate corner.
  const pathD =
    corner === 'tl' ? `M 0 ${size} L 0 0 L ${size} 0` :
    corner === 'tr' ? `M 0 0 L ${size} 0 L ${size} ${size}` :
    corner === 'bl' ? `M 0 0 L 0 ${size} L ${size} ${size}` :
                       `M 0 ${size} L ${size} ${size} L ${size} 0`

  return (
    <svg style={{ ...base, ...pos }} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={pathD} stroke={color} strokeWidth={1.5} fill="none" />
    </svg>
  )
}

const HeaderStrip: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const beacon = interpolate(
    frame % fps,
    [0, fps / 2, fps],
    [1, 0.4, 1]
  )
  return (
    <div
      style={{
        height: 72,
        padding: `0 ${tokens.spacing.xl}px`,
        borderBottom: tokens.borders.hairline,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.md,
        background: tokens.colors.bg
      }}
    >
      {/* Monogram */}
      <div
        style={{
          width: 28,
          height: 28,
          border: `1.5px solid ${tokens.colors.amber}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: tokens.typography.fontHeading,
          fontSize: 14,
          fontWeight: 700,
          color: tokens.colors.amber,
          letterSpacing: 0
        }}
      >
        sb
      </div>
      <div
        style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 14,
          fontWeight: 600,
          color: tokens.colors.textPrimary,
          letterSpacing: '0.02em',
          flex: 1
        }}
      >
        silent-build
        <span
          style={{
            color: tokens.colors.textMuted,
            fontFamily: tokens.typography.fontMono,
            fontWeight: 400,
            fontSize: 11,
            marginLeft: tokens.spacing.xs
          }}
        >
          /telemetry
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.xs,
          fontFamily: tokens.typography.fontMono,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.14em',
          color: tokens.colors.textDim,
          textTransform: 'uppercase'
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: tokens.colors.greenOk,
            opacity: beacon,
            boxShadow: `0 0 6px ${tokens.colors.greenOk}`
          }}
        />
        LIVE · {name}
      </div>
    </div>
  )
}

export const Dashboard: React.FC<DashboardProps> = ({ timeline }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentMs = Math.floor((frame / fps) * 1000)
  const sessionDur = timeline.project.endTs - timeline.project.startTs
  const clampedMs = Math.min(currentMs, sessionDur)

  const inset = tokens.effects.scanInsetPx
  const bracket = tokens.effects.cornerBracketPx

  return (
    <div
      style={{
        position: 'relative',
        width: 576,
        height: 1080,
        background: tokens.colors.bg,
        color: tokens.colors.textPrimary,
        fontFamily: tokens.typography.fontMono,
        overflow: 'hidden'
      }}
    >
      {/* 12px inset grid frame */}
      <div
        style={{
          position: 'absolute',
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          border: `1px solid ${tokens.colors.grid}`,
          pointerEvents: 'none'
        }}
      />

      {/* Corner brackets (amberDim) */}
      <CornerBracket corner="tl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="tr" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="bl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="br" inset={inset} size={bracket} color={tokens.colors.amberDim} />

      {/* Content stack */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <HeaderStrip name={timeline.project.name} />
        <Timer elapsedMs={clampedMs} totalMs={sessionDur} />
        <CurrentPrompt timeline={timeline} currentMs={clampedMs} />
        <TokenCounter timeline={timeline} currentMs={clampedMs} />
        <FileActivity timeline={timeline} currentMs={clampedMs} />
        <ActivityLog timeline={timeline} currentMs={clampedMs} />
        <SecurityPanel timeline={timeline} currentMs={clampedMs} />
        <PhaseBar timeline={timeline} currentMs={clampedMs} />
      </div>
    </div>
  )
}
