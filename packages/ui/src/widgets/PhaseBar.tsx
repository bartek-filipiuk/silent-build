import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '@silent-build/theme'
import { useAnimation, pulseOpacity as computePulse } from '../context.js'

export interface PhaseBarProps {
  timeline: SessionTimeline
  currentMs: number
}

export const PhaseBar: React.FC<PhaseBarProps> = ({
  timeline,
  currentMs
}) => {
  const { pulse15s } = useAnimation()
  const pulseOpacity = computePulse(pulse15s, 0.6, 1)

  const absTs = timeline.project.startTs + currentMs
  const phases = timeline.phases
  const totalDur =
    timeline.project.endTs - timeline.project.startTs || 1

  // Find active phase. Treat absTs exactly at a phase boundary as still
  // inside the preceding phase (so `absTs === endTs` on the last phase means
  // "finishing that phase", not "all complete").
  const activeIdx = phases.findIndex(
    (p) => absTs >= p.startTs && absTs <= p.endTs
  )
  const resolvedActive = activeIdx === -1 ? 0 : activeIdx
  const active = phases[resolvedActive]

  return (
    <div
      style={{
        height: 80,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.xl}px`,
        borderTop: tokens.borders.hairline,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: tokens.spacing.xs,
        background: tokens.colors.bg
      }}
    >
      {/* Blocks row */}
      <div style={{ display: 'flex', gap: 4, height: 18 }}>
        {phases.map((p, i) => {
          const widthPct = ((p.endTs - p.startTs) / totalDur) * 100
          const isCompleted = i < resolvedActive
          const isActive = i === resolvedActive

          const phaseElapsed = Math.max(
            0,
            Math.min(absTs, p.endTs) - p.startTs
          )
          const phaseTotal = p.endTs - p.startTs || 1
          const fillPct = (phaseElapsed / phaseTotal) * 100

          let background: string = tokens.colors.panel
          let borderColor: string = tokens.colors.grid
          let fillStyle: React.CSSProperties = {}

          if (isCompleted) {
            background = tokens.colors.amberDim
            borderColor = tokens.colors.amberDim
          } else if (isActive) {
            borderColor = tokens.colors.amberBright
            fillStyle = {
              background: `linear-gradient(90deg, ${tokens.colors.amberDim} 0%, ${tokens.colors.amberBright} 100%)`,
              width: `${fillPct}%`,
              height: '100%'
            }
          }

          return (
            <div
              key={i}
              style={{
                flex: `${widthPct} 0 0`,
                minWidth: 0,
                height: '100%',
                background,
                border: `1px solid ${borderColor}`,
                opacity: isActive ? pulseOpacity : 1,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isActive && <div style={fillStyle} />}
            </div>
          )
        })}
      </div>

      {/* Phase label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: tokens.spacing.sm,
          fontFamily: tokens.typography.fontMono,
          fontSize: 12
        }}
      >
        <span
          style={{
            color: tokens.colors.textDim,
            textTransform: 'uppercase',
            letterSpacing: '0.12em'
          }}
        >
          Phase {resolvedActive + 1} / {phases.length}
        </span>
        <span style={{ color: tokens.colors.textMuted }}>·</span>
        <span
          style={{
            color: tokens.colors.amberBright,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          {active?.label ?? 'Complete'}
        </span>
      </div>
    </div>
  )
}
