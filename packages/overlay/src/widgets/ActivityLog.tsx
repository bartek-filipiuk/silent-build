import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { formatDuration } from '../lib/format-duration.js'

const MAX_ENTRIES = 8

interface Entry {
  ts: number
  icon: string
  text: string
  isSubagent: boolean
}

export const ActivityLog: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const entries: Entry[] = []

  for (const e of timeline.events) {
    if (e.ts > absTs) break
    if (e.type === 'file_write') entries.push({ ts: e.ts, icon: 'W', text: `Writing ${short(e.data.path)}`, isSubagent: false })
    else if (e.type === 'file_edit') entries.push({ ts: e.ts, icon: 'E', text: `Editing ${short(e.data.path)}`, isSubagent: false })
    else if (e.type === 'tool_call') {
      const sub = Boolean(e.data.subagentId)
      entries.push({ ts: e.ts, icon: sub ? 's' : 'T', text: `${e.data.name}${sub ? ' (subagent)' : ''}`, isSubagent: sub })
    }
  }

  const latest = entries.slice(-MAX_ENTRIES)
  return (
    <div style={{ marginTop: 24, border: '1px solid #1a1a1a', padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>Activity log</div>
      {latest.map((e, i) => (
        <div key={i} style={{ fontSize: 13, display: 'flex', gap: 8, color: e.isSubagent ? '#94a3b8' : '#e5e5e5', marginTop: 2 }}>
          <span style={{ opacity: 0.5, width: 56 }}>{formatDuration(e.ts - timeline.project.startTs)}</span>
          <span style={{ width: 18 }}>{e.icon}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text}</span>
        </div>
      ))}
    </div>
  )
}

function short(path: string): string {
  const parts = path.split('/')
  return parts.slice(-2).join('/')
}
