import type React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface StatsCardProps {
  projectName: string
  totalPrompts: number
  totalToolCalls: number
  totalDays: number
  totalTokens: number
  filesTouched: number
  liveUrl?: string
  tokensCostUsd?: number
}

const fmt = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : n.toString()

const Row: React.FC<{
  label: string
  current: number
  target: number
  asMoney?: boolean
}> = ({ label, current, target, asMoney = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: tokens.spacing.lg,
      borderBottom: `1px solid ${tokens.colors.grid}`,
      padding: `${tokens.spacing.sm}px 0`,
      width: 800
    }}
  >
    <span
      style={{
        color: tokens.colors.textDim,
        fontSize: 22,
        textTransform: 'uppercase',
        letterSpacing: '0.12em'
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: tokens.colors.amberBright,
        fontSize: 44,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {asMoney
        ? `$${current.toFixed(2)}`
        : fmt(Math.round(current))}
    </span>
  </div>
)

export const StatsCard: React.FC<StatsCardProps> = ({
  projectName,
  totalPrompts,
  totalToolCalls,
  totalDays,
  totalTokens,
  filesTouched,
  liveUrl,
  tokensCostUsd
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = Math.floor((currentMs * fps) / 1000)
  const t = frame / fps

  const headerFade = interpolate(t, [0, 1.2], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const ramp = interpolate(t, [1.5, 4], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp'
  })
  const urlFade = interpolate(t, [4, 4.8], [0, 1], {
    extrapolateRight: 'clamp'
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: tokens.spacing.lg
      }}
    >
      <div
        style={{
          color: tokens.colors.greenOk,
          fontSize: 22,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          opacity: headerFade
        }}
      >
        ◆ MISSION COMPLETE
      </div>

      <div
        style={{
          color: tokens.colors.textPrimary,
          fontSize: 56,
          fontWeight: 700,
          opacity: headerFade
        }}
      >
        {projectName}
      </div>

      <div
        style={{
          marginTop: tokens.spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.xs
        }}
      >
        <Row label="Days" current={ramp * totalDays} target={totalDays} />
        <Row
          label="Prompts"
          current={ramp * totalPrompts}
          target={totalPrompts}
        />
        <Row
          label="Tool calls"
          current={ramp * totalToolCalls}
          target={totalToolCalls}
        />
        <Row
          label="Tokens"
          current={ramp * totalTokens}
          target={totalTokens}
        />
        <Row
          label="Files touched"
          current={ramp * filesTouched}
          target={filesTouched}
        />
        {tokensCostUsd !== undefined ? (
          <Row
            label="Cost"
            current={ramp * tokensCostUsd}
            target={tokensCostUsd}
            asMoney
          />
        ) : null}
      </div>

      {liveUrl ? (
        <div
          style={{
            marginTop: tokens.spacing.xl,
            color: tokens.colors.amberBright,
            fontSize: 36,
            padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
            border: `2px solid ${tokens.colors.amberBright}`,
            borderRadius: 8,
            opacity: urlFade
          }}
        >
          {liveUrl}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
