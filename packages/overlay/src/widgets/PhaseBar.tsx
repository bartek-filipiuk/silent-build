import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '../theme/tokens.js'

export const PhaseBar: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const active = timeline.phases.find(p => absTs >= p.startTs && absTs < p.endTs) ?? timeline.phases[timeline.phases.length - 1]!
  const sessionDur = timeline.project.endTs - timeline.project.startTs
  const pct = Math.min(100, (currentMs / sessionDur) * 100)

  return (
    <div style={{ padding: 16, borderTop: tokens.borders.hairline }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {timeline.phases.map(p => {
          const phaseStartPct = ((p.startTs - timeline.project.startTs) / sessionDur) * 100
          const phaseEndPct = ((p.endTs - timeline.project.startTs) / sessionDur) * 100
          const filled = Math.max(0, Math.min(phaseEndPct, pct) - phaseStartPct)
          const width = phaseEndPct - phaseStartPct
          return (
            <div key={p.index} style={{ flex: width, background: tokens.colors.grid, height: 6, position: 'relative' }}>
              <div style={{ width: `${(filled / width) * 100}%`, height: '100%', background: p.index === active.index ? tokens.colors.amber : tokens.colors.textDim }} />
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
        <span>Phase {active.index}/4</span>
        <span style={{ fontWeight: 600 }}>{active.label}</span>
      </div>
    </div>
  )
}
