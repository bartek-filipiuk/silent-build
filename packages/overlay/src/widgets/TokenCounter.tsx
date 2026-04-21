import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { formatNumber } from '../lib/format-number.js'

const MAX_TOKENS = 200_000

export const TokenCounter: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const used = timeline.events
    .filter(e => e.type === 'tokens_delta' && e.ts <= absTs)
    .reduce((s, e) => s + (e.type === 'tokens_delta' ? e.data.input + e.data.output : 0), 0)
  const pct = Math.min(100, (used / MAX_TOKENS) * 100)
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 14, opacity: 0.6, textTransform: 'uppercase' }}>Tokens</div>
      <div style={{ fontSize: 20, marginTop: 4 }}>{formatNumber(used)} / {formatNumber(MAX_TOKENS)}</div>
      <div style={{ width: '100%', height: 6, background: '#1a1a1a', marginTop: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#4ade80', transition: 'width 0.2s' }} />
      </div>
    </div>
  )
}
