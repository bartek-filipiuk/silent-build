import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '../theme/tokens.js'

export const SecurityPanel: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const findings = timeline.events.filter(e => e.type === 'security_finding' && e.ts <= absTs)
  const hasAny = findings.length > 0

  return (
    <div style={{ marginTop: 16, border: tokens.borders.hairline, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>Security</div>
      {!hasAny && <div style={{ fontSize: 14, opacity: 0.7 }}>Idle</div>}
      {findings.map((f, i) => {
        if (f.type !== 'security_finding') return null
        return (
          <div key={i} style={{ fontSize: 13, color: f.data.fixed ? tokens.colors.greenOk : tokens.colors.redAlert, marginTop: 4 }}>
            [{f.data.severity}] {f.data.title} {f.data.fixed ? '(fixed)' : ''}
          </div>
        )
      })}
    </div>
  )
}
