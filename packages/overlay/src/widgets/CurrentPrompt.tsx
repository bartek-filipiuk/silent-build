import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'

export const CurrentPrompt: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const prompts = timeline.events.filter(e => e.type === 'prompt')
  const last = [...prompts].reverse().find(p => p.ts <= absTs)
  const text = last && last.type === 'prompt' ? last.data.text : '—'
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 14, opacity: 0.6, textTransform: 'uppercase' }}>Current prompt</div>
      <div style={{ fontSize: 18, marginTop: 8, lineHeight: 1.4 }}>{text}</div>
    </div>
  )
}
