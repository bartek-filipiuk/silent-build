import type React from 'react'
import { tokens } from '@silent-build/theme'
import { useAnimation, pulseOpacity } from '../context.js'

export interface TimerProps {
  elapsedMs: number
  totalMs?: number
}

const pad = (n: number) => n.toString().padStart(2, '0')
const formatHMS = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

export const Timer: React.FC<TimerProps> = ({ elapsedMs, totalMs }) => {
  const { pulse1s } = useAnimation()
  const dotOpacity = pulseOpacity(pulse1s, 0.35, 1)

  const progress =
    totalMs && totalMs > 0
      ? Math.min(1, Math.max(0, elapsedMs / totalMs))
      : 0

  return (
    <div
      style={{
        height: 120,
        padding: `${tokens.spacing.md}px ${tokens.spacing.xl}px`,
        borderBottom: tokens.borders.hairline,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: tokens.spacing.xs
      }}
    >
      <div
        style={{
          fontFamily: tokens.typography.fontMono,
          fontSize: tokens.typography.label.size,
          fontWeight: tokens.typography.label.weight,
          letterSpacing: tokens.typography.label.ls,
          color: tokens.colors.textDim,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.xs
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: tokens.colors.amber,
            opacity: dotOpacity,
            boxShadow: `0 0 6px ${tokens.colors.amberGlow}`
          }}
        />
        Session Time
      </div>

      <div
        style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: tokens.typography.h1.size,
          fontWeight: tokens.typography.h1.weight,
          lineHeight: tokens.typography.h1.lh,
          color: tokens.colors.textPrimary,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0
        }}
      >
        {formatHMS(elapsedMs)}
      </div>

      {/* Hairline progress bar */}
      <div
        style={{
          height: 2,
          width: '100%',
          background: tokens.colors.grid,
          position: 'relative',
          marginTop: tokens.spacing.xs
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${progress * 100}%`,
            background: tokens.colors.amberDim
          }}
        />
      </div>
    </div>
  )
}
