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

  return (
    <div
      style={{
        height: 92,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.xl}px`,
        borderBottom: tokens.borders.hairline,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.spacing.md
      }}
    >
      {/* Left column: TOKENS label + big number */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minWidth: 0
        }}
      >
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
            fontSize: 32,
            fontWeight: 600,
            color: tokens.colors.amber,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1
          }}
        >
          {formatNumber(total)}
        </span>
      </div>

      {/* Right column: model badge + cost */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          flexShrink: 0
        }}
      >
        <span
          style={{
            fontFamily: tokens.typography.fontMono,
            fontSize: 10,
            fontWeight: 600,
            color: tokens.colors.amberBright,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: `2px ${tokens.spacing.sm}px`,
            border: `1px solid ${tokens.colors.amberDim}`,
            borderRadius: 3,
            whiteSpace: 'nowrap'
          }}
        >
          {modelLabel}
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: tokens.spacing.xs
          }}
        >
          <span
            style={{
              fontFamily: tokens.typography.fontMono,
              fontSize: 10,
              color: tokens.colors.textDim,
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}
          >
            API cost
          </span>
          <span
            style={{
              fontFamily: tokens.typography.fontHeading,
              fontSize: 26,
              fontWeight: 600,
              color: tokens.colors.greenOk,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1
            }}
          >
            {formatCost(cost)}
          </span>
        </div>
      </div>
    </div>
  )
}
