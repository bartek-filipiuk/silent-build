import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'

export const FileActivity: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const writes = new Set<string>()
  const edits = new Set<string>()
  for (const e of timeline.events) {
    if (e.ts > absTs) break
    if (e.type === 'file_write') writes.add(e.data.path)
    else if (e.type === 'file_edit') edits.add(e.data.path)
  }
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 14, opacity: 0.6, textTransform: 'uppercase' }}>Files</div>
      <div style={{ fontSize: 18, marginTop: 4 }}>
        {writes.size} written · {edits.size} edited
      </div>
    </div>
  )
}
