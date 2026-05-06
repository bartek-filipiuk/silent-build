// packages/overlay/src/widgets/TokenCounter.tsx
import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '@silent-build/theme'
import {
  computeCostUpTo,
  currentModelLabel,
  formatCost
} from '../lib/cost.js'

export interface TokenCounterProps {
  timeline: SessionTimeline
  currentMs: number
}

const MAX_TOKENS = 200_000

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1) + 'M'
  }
  if (n >= 1000) {
    const k = n / 1000
    return (k >= 100 ? k.toFixed(0) : k.toFixed(1)) + 'k'
  }
  return n.toString()
}

export const TokenCounter: React.FC<TokenCounterProps> = ({
  timeline,
  currentMs
}) => {
  const absTs = timeline.project.startTs + currentMs
  let total = 0
  for (const e of timeline.events) {
    if (e.ts > absTs) break
    if (e.type === 'tokens_delta') {
      total +=
        e.data.input +
        e.data.output +
        (e.data.cacheRead ?? 0) +
        (e.data.cacheWrite ?? 0)
    }
  }

  const cost = computeCostUpTo(timeline.events, absTs)
  const modelLabel = currentModelLabel(timeline.events, absTs)

  const pct = Math.min(1, total / MAX_TOKENS)
  const fillColor =
    pct > 0.95
      ? tokens.colors.redAlert
      : pct > 0.8
      ? tokens.colors.amberBright
      : tokens.colors.amber

  return (
    <div
      style={{
        height: 110,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.xl}px`,
        borderBottom: tokens.borders.hairline,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: tokens.spacing.xs
      }}
    >
      {/* Top row: TOKENS label + big number, model badge on right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: tokens.spacing.sm }}>
          <span
            style={{
              fontFamily: tokens.typography.fontMono,
              fontSize: tokens.typography.label.size,
              fontWeight: tokens.typography.label.weight,
              letterSpacing: tokens.typography.label.ls,
              color: tokens.colors.textDim,
              textTransform: 'uppercase'
            }}
          >
            Tokens
          </span>
          <span
            style={{
              fontFamily: tokens.typography.fontHeading,
              fontSize: 24,
              fontWeight: 600,
              color: fillColor,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {formatNumber(total)}
          </span>
        </div>
        <span
          style={{
            fontFamily: tokens.typography.fontMono,
            fontSize: 11,
            fontWeight: 600,
            color: tokens.colors.amberBright,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: `2px ${tokens.spacing.xs}px`,
            border: `1px solid ${tokens.colors.amberDim}`,
            borderRadius: 3
          }}
        >
          {modelLabel}
        </span>
      </div>

      {/* Progress bar (context window utilization) */}
      <div
        style={{
          height: 4,
          width: '100%',
          background: tokens.colors.grid,
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${pct * 100}%`,
            background: fillColor
          }}
        />
      </div>

      {/* Bottom row: "of 200k" left, COST $ right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between'
        }}
      >
        <span
          style={{
            fontFamily: tokens.typography.fontMono,
            fontSize: tokens.typography.micro.size,
            color: tokens.colors.textDim,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          of 200k context
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: tokens.spacing.xs }}>
          <span
            style={{
              fontFamily: tokens.typography.fontMono,
              fontSize: 10,
              color: tokens.colors.textDim,
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}
          >
            Cost
          </span>
          <span
            style={{
              fontFamily: tokens.typography.fontHeading,
              fontSize: 18,
              fontWeight: 600,
              color: tokens.colors.greenOk,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {formatCost(cost)}
          </span>
        </div>
      </div>
    </div>
  )
}
