import type React from 'react'
import { interpolate, spring } from 'remotion'
import { tokens } from '@silent-build/theme'
import { Logo } from '../brand/Logo.js'
import { useAnimation } from '../context.js'

export interface IntroCardProps {
  projectName: string
  targetDescription: string
  startingAt?: Date
  /** Total length of the card in frames. Defaults to 4 s at current fps. */
  durationInFrames?: number
}

// ---------- decorators ----------

const CornerBracket: React.FC<{
  corner: 'tl' | 'tr' | 'bl' | 'br'
  inset: number
  size: number
  color: string
}> = ({ corner, inset, size, color }) => {
  const pos: React.CSSProperties =
    corner === 'tl' ? { top: inset, left: inset } :
    corner === 'tr' ? { top: inset, right: inset } :
    corner === 'bl' ? { bottom: inset, left: inset } :
                      { bottom: inset, right: inset }
  const d =
    corner === 'tl' ? `M 0 ${size} L 0 0 L ${size} 0` :
    corner === 'tr' ? `M 0 0 L ${size} 0 L ${size} ${size}` :
    corner === 'bl' ? `M 0 0 L 0 ${size} L ${size} ${size}` :
                      `M 0 ${size} L ${size} ${size} L ${size} 0`
  return (
    <svg
      style={{ position: 'absolute', width: size, height: size, pointerEvents: 'none', ...pos }}
      viewBox={`0 0 ${size} ${size}`}
    >
      <path d={d} stroke={color} strokeWidth={2} fill="none" />
    </svg>
  )
}


const formatUTC = (d: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  return `${time} UTC · ${date}`
}

// ---------- status row ----------

const StatusRow: React.FC<{
  label: string
  ready: boolean
  delay: number  // frames until this row activates
  frame: number
  fps: number
}> = ({ label, ready, delay, frame, fps }) => {
  // Entry: fade + slide 8px from left, 12-frame ease-out.
  const entry = Math.max(0, frame - delay)
  const slide = interpolate(entry, [0, 12], [-8, 0], { extrapolateRight: 'clamp' })
  const opacity = interpolate(entry, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  // Once ready (passed threshold), dot becomes green-filled.
  const isReady = ready && entry > 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
      transform: `translateX(${slide}px)`, opacity,
      fontFamily: tokens.typography.fontMono, fontSize: 20,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color: isReady ? tokens.colors.textPrimary : tokens.colors.textDim
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        border: isReady
          ? `2px solid ${tokens.colors.greenOk}`
          : `2px solid ${tokens.colors.amberDim}`,
        background: isReady ? tokens.colors.greenOk : 'transparent',
        boxShadow: isReady ? `0 0 10px ${tokens.colors.greenOk}` : 'none',
        flexShrink: 0
      }} />
      <span>{label}</span>
    </div>
  )
}

// ---------- countdown ----------

// 3 → 2 → 1 → LAUNCH, breathing pace. Each digit lives ~50 frames (~0.83s
// @ 60fps), LAUNCH holds for another 70 frames (~1.17s). Total countdown
// budget: 220 frames (~3.67s). Just the digit, no awkward "LAUNCH IN…"
// scaffolding around it.
const COUNTDOWN_FRAMES = 220
const DIGIT_WINDOW = 50
const Countdown: React.FC<{ frame: number; durationInFrames: number }> = ({
  frame, durationInFrames
}) => {
  const start = durationInFrames - COUNTDOWN_FRAMES
  const rel = frame - start
  if (rel < 0) return null

  let label = ''
  let phaseStart = 0
  if (rel < DIGIT_WINDOW) {
    label = '3'; phaseStart = 0
  } else if (rel < DIGIT_WINDOW * 2) {
    label = '2'; phaseStart = DIGIT_WINDOW
  } else if (rel < DIGIT_WINDOW * 3) {
    label = '1'; phaseStart = DIGIT_WINDOW * 2
  } else {
    label = 'LAUNCH'; phaseStart = DIGIT_WINDOW * 3
  }

  const local = rel - phaseStart
  const isLaunch = label === 'LAUNCH'

  // Digit: punch-in (scale 0.78 → 1.08 → 1.0) over first 12f, then hold for
  // ~28f, then fade out last 10f.
  const digitScale = interpolate(local, [0, 8, 14, 40, 50], [0.78, 1.08, 1, 1, 0.98], {
    extrapolateRight: 'clamp'
  })
  const digitOpacity = interpolate(local, [0, 8, 38, 50], [0, 1, 1, 0], {
    extrapolateRight: 'clamp'
  })

  // LAUNCH: scale-in to 1.0 over 18f, then hold full opacity for the
  // remainder. No fade-out — final composition cuts to dashboard.
  const launchScale = interpolate(local, [0, 12, 22], [0.7, 1.08, 1], {
    extrapolateRight: 'clamp'
  })
  const launchOpacity = interpolate(local, [0, 14], [0, 1], {
    extrapolateRight: 'clamp'
  })

  // Pulsing ring around the digit during the hold window. Pulse period
  // 18f, soft amber halo.
  const ringPulse = interpolate(
    ((local - 14) % 18) / 18,
    [0, 0.5, 1],
    [0.35, 0.75, 0.35],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  )
  const ringOpacity = isLaunch
    ? 0
    : (local > 14 && local < 40 ? ringPulse : 0)

  return (
    <div style={{
      position: 'relative',
      marginTop: tokens.spacing.xxl * 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Pulsing ring behind digit (hides on LAUNCH) */}
      {!isLaunch && (
        <div style={{
          position: 'absolute',
          width: 220, height: 220,
          borderRadius: '50%',
          border: `2px solid ${tokens.colors.amber}`,
          boxShadow: `0 0 60px ${tokens.colors.amberGlow}, inset 0 0 30px ${tokens.colors.amberHalo}`,
          opacity: ringOpacity,
          pointerEvents: 'none'
        }} />
      )}
      <div style={{
        fontFamily: tokens.typography.fontHeading,
        fontSize: isLaunch ? 132 : 156,
        fontWeight: 700,
        color: isLaunch ? tokens.colors.amberBright : tokens.colors.amber,
        letterSpacing: isLaunch ? '0.28em' : '0em',
        transform: isLaunch ? `scale(${launchScale})` : `scale(${digitScale})`,
        opacity: isLaunch ? launchOpacity : digitOpacity,
        textShadow: `0 0 50px ${tokens.colors.amberGlow}`,
        lineHeight: 1
      }}>
        {label}
      </div>
      {/* T-MINUS micro-label below the digit (hides on LAUNCH) */}
      {!isLaunch && (
        <div style={{
          marginTop: tokens.spacing.lg,
          fontFamily: tokens.typography.fontMono,
          fontSize: 14,
          color: tokens.colors.textDim,
          letterSpacing: '0.36em',
          textTransform: 'uppercase',
          opacity: digitOpacity * 0.7
        }}>
          T-Minus
        </div>
      )}
    </div>
  )
}

// ---------- main ----------

export const IntroCard: React.FC<IntroCardProps> = ({
  projectName, targetDescription, startingAt, durationInFrames: durProp
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = Math.floor(currentMs * fps / 1000)
  // 8s default (was 4s) — gives the eye time to land on project name + data
  // rows + status sequence before countdown begins. Countdown itself is
  // ~3.67s (220 frames) within this budget.
  const durationInFrames = durProp ?? fps * 8

  const startDate = startingAt ?? new Date()
  const inset = 32
  const bracket = 32

  // Overall card fade-in (first 18 frames) and subtle drift.
  const cardOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })

  // Title entry spring.
  const titleY = spring({ frame, fps, config: { damping: 16, stiffness: 120 } })
  const titleTranslate = interpolate(titleY, [0, 1], [24, 0])
  const titleOpacity   = interpolate(frame, [6, 24], [0, 1], { extrapolateRight: 'clamp' })

  // Status thresholds: more breathing room with 8s budget. First at 1.0s,
  // second at 1.6s, third at 2.2s — each gets ~600ms to read before next.
  const t1 = Math.round(fps * 1.0)
  const t2 = Math.round(fps * 1.6)
  const t3 = Math.round(fps * 2.2)

  const countdownStart = Math.max(0, durationInFrames - COUNTDOWN_FRAMES)

  return (
    <div style={{
      position: 'relative',
      width: 1920, height: 1080,
      background: tokens.colors.bg,
      color: tokens.colors.textPrimary,
      fontFamily: tokens.typography.fontMono,
      overflow: 'hidden',
      opacity: cardOpacity
    }}>
      {/* background wash — static, cheap */}
      <div style={{
        position: 'absolute', inset: 0,
        background:
          `radial-gradient(1200px 800px at 50% 40%, ${tokens.colors.amberGlow}, transparent 65%)`,
        pointerEvents: 'none'
      }} />

      {/* Grid frame */}
      <div style={{
        position: 'absolute', top: inset, left: inset, right: inset, bottom: inset,
        border: `1px solid ${tokens.colors.grid}`, pointerEvents: 'none'
      }} />
      <CornerBracket corner="tl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="tr" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="bl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="br" inset={inset} size={bracket} color={tokens.colors.amberDim} />

      {/* Top: wordmark left, logo right */}
      <div style={{
        position: 'absolute', top: 72, left: 96, right: 96,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 22, fontWeight: 500,
          color: tokens.colors.textPrimary, letterSpacing: '0.42em'
        }}>
          S I L E N T - B U I L D
        </div>
        <Logo size={48} variant="amber" />
      </div>

      {/* Hairline divider under header */}
      <div style={{
        position: 'absolute', top: 122, left: 96, right: 96, height: 1,
        background: tokens.colors.grid
      }} />

      {/* Center column */}
      <div style={{
        position: 'absolute', top: 200, left: 0, right: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: tokens.spacing.xxl
      }}>
        {/* MISSION label */}
        <div style={{
          fontFamily: tokens.typography.fontMono,
          fontSize: 16, fontWeight: 500,
          letterSpacing: '0.28em',
          color: tokens.colors.textDim,
          textTransform: 'uppercase',
          transform: `translateY(${titleTranslate}px)`,
          opacity: titleOpacity
        }}>
          Mission Briefing
        </div>

        {/* MISSION: {project} */}
        <div style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 88, fontWeight: 700,
          color: tokens.colors.textPrimary,
          letterSpacing: '0.01em', lineHeight: 1,
          transform: `translateY(${titleTranslate}px)`,
          opacity: titleOpacity,
          display: 'flex', alignItems: 'baseline', gap: tokens.spacing.lg
        }}>
          <span style={{
            fontSize: 40, color: tokens.colors.textDim,
            letterSpacing: '0.22em', textTransform: 'uppercase'
          }}>Mission:</span>
          <span style={{ color: tokens.colors.amber }}>{projectName}</span>
        </div>

        {/* Data rows */}
        {frame >= Math.round(fps * 0.2) && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: tokens.spacing.lg, alignItems: 'center',
            marginTop: tokens.spacing.lg
          }}>
            <DataRow label="Objective"  value={targetDescription} />
            <DataRow label="Start Time" value={formatUTC(startDate)} />
          </div>
        )}

        {/* Status list */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: tokens.spacing.md, marginTop: tokens.spacing.xl
        }}>
          <StatusRow label="Initiating"            ready={frame >= t1} delay={t1} frame={frame} fps={fps} />
          <StatusRow label="Ready"                 ready={frame >= t2} delay={t2} frame={frame} fps={fps} />
          <StatusRow label="Claude Code Connected" ready={frame >= t3} delay={t3} frame={frame} fps={fps} />
        </div>

        {/* Countdown */}
        {frame >= countdownStart && (
          <Countdown frame={frame} durationInFrames={durationInFrames} />
        )}
      </div>
    </div>
  )
}

const DataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', gap: tokens.spacing.lg,
    minWidth: 720, justifyContent: 'center'
  }}>
    <span style={{
      fontFamily: tokens.typography.fontMono,
      fontSize: 14, fontWeight: 500,
      letterSpacing: '0.24em',
      color: tokens.colors.textDim,
      textTransform: 'uppercase',
      width: 220, textAlign: 'right'
    }}>{label}</span>
    <span style={{
      width: 1, height: 24, background: tokens.colors.grid
    }} />
    <span style={{
      fontFamily: tokens.typography.fontHeading,
      fontSize: 28, fontWeight: 500,
      color: tokens.colors.textPrimary,
      letterSpacing: '0.02em',
      minWidth: 520
    }}>{value}</span>
  </div>
)
