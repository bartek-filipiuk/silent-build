import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'
import { CornerBrackets } from '../primitives/CornerBrackets.js'
import { ScanFrame } from '../primitives/ScanFrame.js'
import { ProgressDots } from '../primitives/ProgressDots.js'
import { Sparkline } from '../primitives/Sparkline.js'

export interface StatsPunchInMetric {
  label: string
  value: number
  prefix?: string
  isMoney?: boolean
  /** Optional micro line "Δ THIS PHASE" override; default `+62%` of value. */
  deltaText?: string
  /** Optional sparkline data for the trend below the number. */
  sparkline?: number[]
}

export interface StatsPunchInProps {
  /** Where in the narrative this punch-in lands (e.g. "AFTER PLAN"). */
  phaseLabel: string
  /** Up to 4 metrics. */
  metrics: StatsPunchInMetric[]
  /** Phase index for the progress dots in the header (1..6). */
  phaseIndex?: number
  /** Total phases (typically 6). */
  phaseTotal?: number
  /** Mission-clock string for the footer (e.g. "T+02:14:08"). */
  missionClock?: string
}

const fmtNumber = (
  n: number,
  opts: { prefix?: string; isMoney?: boolean } = {}
): string => {
  if (opts.isMoney) {
    const s = `$${n.toFixed(2)}`
    return opts.prefix === '+' ? `+${s}` : s
  }
  let s: string
  if (n >= 1_000_000) s = `${(n / 1_000_000).toFixed(1)}M`
  else if (n >= 10_000) s = `${(n / 1000).toFixed(1)}k`
  else if (n >= 1000) s = `${(n / 1000).toFixed(2)}k`
  else s = `${Math.round(n)}`
  return (opts.prefix ?? '') + s
}

const VerticalDivider: React.FC<{ height?: number }> = ({ height = 260 }) => (
  <div
    style={{
      width: 1,
      height,
      background: tokens.colors.grid,
      position: 'relative'
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: -2,
        width: 5,
        height: 5,
        background: tokens.colors.amber,
        borderRadius: 5,
        boxShadow: `0 0 10px ${tokens.colors.amberGlow}`,
        transform: 'translateY(-50%)'
      }}
    />
  </div>
)

const StatHeader: React.FC<{
  phaseLabel: string
  phaseIndex: number
  phaseTotal: number
  frame: number
  opacity: number
}> = ({ phaseLabel, phaseIndex, phaseTotal, frame, opacity }) => (
  <div
    style={{
      position: 'absolute',
      top: 80,
      left: 80,
      right: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      opacity
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div
        style={{
          width: 12,
          height: 12,
          background: tokens.colors.amber,
          boxShadow: `0 0 16px ${tokens.colors.amberGlow}`,
          transform: 'rotate(45deg)'
        }}
      />
      <div
        style={{
          fontFamily: tokens.typography.fontMono,
          color: tokens.colors.amber,
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '0.32em',
          textTransform: 'uppercase'
        }}
      >
        ▸ {phaseLabel}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <ProgressDots
        total={phaseTotal}
        current={phaseIndex}
        size={9}
        gap={14}
        frame={frame}
      />
      <div
        style={{
          fontFamily: tokens.typography.fontMono,
          color: tokens.colors.textMuted,
          fontSize: 14,
          letterSpacing: '0.2em',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        PHASE {String(phaseIndex).padStart(2, '0')} / {String(phaseTotal).padStart(2, '0')} COMPLETE
      </div>
    </div>
  </div>
)

const StatFooter: React.FC<{ opacity: number; missionClock: string }> = ({
  opacity,
  missionClock
}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 80,
      left: 80,
      right: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      opacity,
      fontFamily: tokens.typography.fontMono,
      color: tokens.colors.textMuted,
      fontSize: 12,
      letterSpacing: '0.22em'
    }}
  >
    <div>SILENT-BUILD · TELEMETRY</div>
    <div style={{ fontVariantNumeric: 'tabular-nums' }}>{missionClock}</div>
  </div>
)

const DEFAULT_SPARKS: number[][] = [
  [3, 4, 4, 5, 6, 7, 8, 9, 11, 14],
  [1, 1, 2, 2, 2, 3, 3, 4, 5, 6],
  [2, 3, 3, 4, 5, 6, 7, 8, 9, 11],
  [1, 1, 1, 2, 2, 3, 3, 4, 4, 5]
]

/**
 * Variant A: 4-column compact grid with sparklines + delta micro-lines.
 * Full-screen 1920×1080, opaque warm-dark bg, NASA HUD framing.
 *
 * Timing (60 fps, 2 s = 120 frames):
 * - 0–18: header fade-in
 * - 18–60: numbers count-up (spring)
 * - 60–78: sparklines fade-in
 * - 60–102: hold (peak — pulse on numbers)
 * - 102–120: full fade-out
 */
export const StatsPunchIn: React.FC<StatsPunchInProps> = ({
  phaseLabel,
  metrics,
  phaseIndex = 3,
  phaseTotal = 6,
  missionClock = 'T+02:14:08'
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = (currentMs / 1000) * fps

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const numberProgress = interpolate(frame, [18, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const sparkOpacity = interpolate(frame, [60, 78], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const fadeOut = interpolate(frame, [102, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const overallOpacity = Math.min(
    fadeOut,
    interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' })
  )
  const peakPulse = interpolate(
    ((frame - 60) % 45) / 45,
    [0, 0.5, 1],
    [0.85, 1, 0.85]
  )

  const visible = metrics.slice(0, 4)

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        opacity: overallOpacity
      }}
    >
      <ScanFrame inset={24} />
      <CornerBrackets inset={36} segLen={42} thickness={2} />

      <StatHeader
        phaseLabel={phaseLabel}
        phaseIndex={phaseIndex}
        phaseTotal={phaseTotal}
        frame={frame}
        opacity={headerOpacity}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 80,
          right: 80,
          transform: 'translateY(-50%)',
          display: 'grid',
          gridTemplateColumns: visible
            .map((_, i) => (i < visible.length - 1 ? '1fr auto' : '1fr'))
            .join(' '),
          alignItems: 'center',
          justifyItems: 'center',
          gap: 0
        }}
      >
        {visible.map((m, i) => {
          const v = m.value * numberProgress
          const isDelta = m.prefix === '+' || m.prefix === 'Δ'
          const numberColor = isDelta
            ? tokens.colors.greenOk
            : tokens.colors.amberBright
          const numberGlow = isDelta
            ? 'rgba(155, 201, 122, 0.22)'
            : tokens.colors.amberGlow
          const display = fmtNumber(v, m)
          const fallbackSpark =
            DEFAULT_SPARKS[i % DEFAULT_SPARKS.length] ?? DEFAULT_SPARKS[0]!
          const sparkValues = m.sparkline ?? fallbackSpark
          const deltaLabel =
            m.deltaText ?? `+${Math.round(m.value * 0.62)}`
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0
                }}
              >
                <div
                  style={{
                    fontFamily: tokens.typography.fontMono,
                    fontSize: 104,
                    fontWeight: 500,
                    color: numberColor,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: `0 0 28px ${numberGlow}`,
                    opacity: peakPulse
                  }}
                >
                  {display}
                </div>
                <div
                  style={{
                    fontFamily: tokens.typography.fontMono,
                    fontSize: 13,
                    fontWeight: 500,
                    color: tokens.colors.textDim,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    marginTop: 14
                  }}
                >
                  {m.label}
                </div>
                <div style={{ marginTop: 22, opacity: sparkOpacity }}>
                  <Sparkline values={sparkValues} width={120} height={22} />
                </div>
                <div
                  style={{
                    fontFamily: tokens.typography.fontMono,
                    fontSize: 11,
                    color: tokens.colors.textMuted,
                    letterSpacing: '0.18em',
                    marginTop: 10,
                    opacity: 0.85
                  }}
                >
                  Δ THIS PHASE:{' '}
                  <span style={{ color: tokens.colors.textDim }}>
                    {deltaLabel}
                  </span>
                </div>
              </div>
              {i < visible.length - 1 ? (
                <VerticalDivider height={260} />
              ) : null}
            </React.Fragment>
          )
        })}
      </div>

      <StatFooter opacity={headerOpacity} missionClock={missionClock} />
    </AbsoluteFill>
  )
}
