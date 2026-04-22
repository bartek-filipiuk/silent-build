// packages/overlay/src/compositions/OutroCard.tsx
import type React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '../theme/tokens.js'
import { Logo } from '../brand/Logo.js'

export interface OutroCardProps {
  projectName: string
  metrics: SessionTimeline['metrics']
  durationMs: number
  repoUrl?: string
}

const pad = (n: number) => n.toString().padStart(2, '0')
const formatDuration = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}h ${pad(m)}m ${pad(sec)}s` : `${pad(m)}m ${pad(sec)}s`
}
const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US')

// ---------- decorators ----------
const CornerBracket: React.FC<{
  corner: 'tl' | 'tr' | 'bl' | 'br'
  inset: number; size: number; color: string
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
    <svg style={{ position: 'absolute', width: size, height: size, pointerEvents: 'none', ...pos }}
         viewBox={`0 0 ${size} ${size}`}>
      <path d={d} stroke={color} strokeWidth={2} fill="none" />
    </svg>
  )
}

// Animated check (stroke "draws" in via dashoffset interpolation).
const MissionCheck: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const start = Math.round(fps * 0.5)
  const rel = Math.max(0, frame - start)
  const LEN = 28
  const draw = interpolate(rel, [0, 20], [LEN, 0], { extrapolateRight: 'clamp' })
  const opacity = interpolate(rel, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <svg width="56" height="56" viewBox="0 0 32 32" fill="none" style={{ opacity }}>
      <circle cx="16" cy="16" r="14" stroke={tokens.colors.greenDim} strokeWidth="1.5" />
      <path d="M9 16 L14 21 L23 12"
            stroke={tokens.colors.greenOk} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={LEN} strokeDashoffset={draw} />
    </svg>
  )
}

// ---------- stat row with rolling counter ----------

interface StatRowProps {
  label: string
  finalValue: number
  format: (n: number) => string
  frame: number
  startFrame: number
  rollFrames: number
  color?: string
}

const StatRow: React.FC<StatRowProps> = ({
  label, finalValue, format, frame, startFrame, rollFrames, color
}) => {
  const rel = Math.max(0, frame - startFrame)
  const current = interpolate(rel, [0, rollFrames], [0, finalValue], {
    extrapolateRight: 'clamp'
  })
  const appear = interpolate(rel, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
  const slide = interpolate(rel, [0, 14], [16, 0], { extrapolateRight: 'clamp' })
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: tokens.spacing.xl,
      justifyContent: 'center',
      transform: `translateX(${slide}px)`, opacity: appear
    }}>
      <span style={{
        width: 320, textAlign: 'right',
        fontFamily: tokens.typography.fontMono,
        fontSize: 16, fontWeight: 500,
        letterSpacing: '0.24em',
        color: tokens.colors.textDim, textTransform: 'uppercase'
      }}>{label}</span>
      <span style={{ width: 1, height: 28, background: tokens.colors.grid }} />
      <span style={{
        width: 520, textAlign: 'left',
        fontFamily: tokens.typography.fontHeading,
        fontSize: 44, fontWeight: 700,
        color: color ?? tokens.colors.textPrimary,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.01em'
      }}>{format(current)}</span>
    </div>
  )
}

// ---------- main ----------

export const OutroCard: React.FC<OutroCardProps> = ({
  projectName, metrics, durationMs, repoUrl
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const inset = 32, bracket = 32

  const cardOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })

  const titleSpring = spring({ frame, fps, config: { damping: 16, stiffness: 110 } })
  const titleSlide = interpolate(titleSpring, [0, 1], [24, 0])
  const titleOpacity = interpolate(frame, [4, 24], [0, 1], { extrapolateRight: 'clamp' })

  // Row staggering: first row starts at 1.0s, +6 frames each.
  const rowStart = Math.round(fps * 1.0)
  const stagger = 6
  const rollFrames = 90

  // Repo line fades in after stats.
  const repoStart = rowStart + stagger * 5 + rollFrames
  const repoOpacity = interpolate(frame, [repoStart, repoStart + 20], [0, 1], { extrapolateRight: 'clamp' })

  // "Next mission" pulse (subtle, synced to fps).
  const nextPulse = interpolate(
    frame % (fps * 2),
    [0, fps, fps * 2],
    [1, 0.55, 1]
  )
  const nextStart = repoStart + 20
  const nextOpacity = interpolate(frame, [nextStart, nextStart + 20], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <div style={{
      position: 'relative', width: 1920, height: 1080,
      background: tokens.colors.bg,
      color: tokens.colors.textPrimary,
      fontFamily: tokens.typography.fontMono,
      overflow: 'hidden',
      opacity: cardOpacity
    }}>
      {/* ambient wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(1100px 700px at 50% 38%, ${tokens.colors.amberGlow}, transparent 60%)`,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: inset, left: inset, right: inset, bottom: inset,
        border: `1px solid ${tokens.colors.grid}`, pointerEvents: 'none'
      }} />
      <CornerBracket corner="tl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="tr" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="bl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="br" inset={inset} size={bracket} color={tokens.colors.amberDim} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 72, left: 96, right: 96,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 22, fontWeight: 500,
          letterSpacing: '0.42em',
          color: tokens.colors.textPrimary
        }}>S I L E N T - B U I L D</div>
        <Logo size={48} variant="amber" />
      </div>
      <div style={{
        position: 'absolute', top: 122, left: 96, right: 96, height: 1,
        background: tokens.colors.grid
      }} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: 196, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: tokens.spacing.lg
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: tokens.spacing.lg,
          transform: `translateY(${titleSlide}px)`, opacity: titleOpacity
        }}>
          <MissionCheck frame={frame} fps={fps} />
          <div style={{
            fontFamily: tokens.typography.fontMono, fontSize: 16, fontWeight: 500,
            letterSpacing: '0.32em', color: tokens.colors.greenOk,
            textTransform: 'uppercase'
          }}>Mission Complete</div>
        </div>
        <div style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 96, fontWeight: 700,
          color: tokens.colors.amber,
          letterSpacing: '0.01em', lineHeight: 1,
          transform: `translateY(${titleSlide}px)`, opacity: titleOpacity,
          textShadow: `0 0 40px ${tokens.colors.amberGlow}`
        }}>{projectName}</div>
      </div>

      {/* Stat rows */}
      <div style={{
        position: 'absolute', top: 480, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', gap: tokens.spacing.md,
        alignItems: 'center'
      }}>
        <StatRow label="Total Time"    finalValue={durationMs}
                 format={formatDuration}
                 frame={frame} startFrame={rowStart + stagger * 0}
                 rollFrames={rollFrames} color={tokens.colors.amberBright} />
        <StatRow label="Tokens"        finalValue={metrics.totalTokens}
                 format={fmtInt}
                 frame={frame} startFrame={rowStart + stagger * 1}
                 rollFrames={rollFrames} />
        <StatRow label="Files Touched" finalValue={metrics.filesTouched}
                 format={fmtInt}
                 frame={frame} startFrame={rowStart + stagger * 2}
                 rollFrames={rollFrames} />
        <StatRow label="Prompts"       finalValue={metrics.promptsCount}
                 format={fmtInt}
                 frame={frame} startFrame={rowStart + stagger * 3}
                 rollFrames={rollFrames} />
        <StatRow label="Tool Calls"    finalValue={metrics.toolCallsCount}
                 format={fmtInt}
                 frame={frame} startFrame={rowStart + stagger * 4}
                 rollFrames={rollFrames} />
      </div>

      {/* Repo line */}
      <div style={{
        position: 'absolute', top: 860, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'baseline',
        gap: tokens.spacing.md, opacity: repoOpacity,
        fontFamily: tokens.typography.fontMono, fontSize: 20
      }}>
        <span style={{
          color: tokens.colors.textDim, letterSpacing: '0.28em',
          textTransform: 'uppercase'
        }}>Repo:</span>
        <span style={{ color: tokens.colors.amber, letterSpacing: '0.02em' }}>
          {repoUrl ?? 'github.com/bartek-filipiuk/silent-build'}
        </span>
      </div>

      {/* Next mission */}
      <div style={{
        position: 'absolute', bottom: 96, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: nextOpacity
      }}>
        <div style={{
          fontFamily: tokens.typography.fontMono, fontSize: 22,
          letterSpacing: '0.24em', textTransform: 'uppercase',
          color: tokens.colors.textPrimary,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.xxl}px`,
          border: `1px solid ${tokens.colors.amberDim}`,
          background: `linear-gradient(90deg, transparent, ${tokens.colors.amberGlow}, transparent)`,
          opacity: nextPulse
        }}>
          <span style={{ color: tokens.colors.textDim }}>Next Mission: </span>
          <span style={{ color: tokens.colors.amberBright, fontWeight: 500 }}>
            Subscribe to not miss it.
          </span>
        </div>
      </div>
    </div>
  )
}
