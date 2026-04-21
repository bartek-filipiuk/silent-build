import type React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import type { SessionTimeline } from '@silent-build/shared'
import { Timer } from './widgets/Timer.js'
import { CurrentPrompt } from './widgets/CurrentPrompt.js'
import { TokenCounter } from './widgets/TokenCounter.js'
import { FileActivity } from './widgets/FileActivity.js'
import { ActivityLog } from './widgets/ActivityLog.js'
import { PhaseBar } from './widgets/PhaseBar.js'
import { SecurityPanel } from './widgets/SecurityPanel.js'

export interface DashboardProps {
  timeline: SessionTimeline
}

export const Dashboard: React.FC<DashboardProps> = ({ timeline }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentMs = Math.floor((frame / fps) * 1000)
  const sessionDur = timeline.project.endTs - timeline.project.startTs
  const clampedMs = Math.min(currentMs, sessionDur)

  return (
    <div style={{
      width: 576, height: 1080,
      background: '#0a0a0a', color: '#e5e5e5',
      fontFamily: 'monospace',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: 16, borderBottom: '1px solid #1a1a1a', fontSize: 14, opacity: 0.8 }}>
        Project: <span style={{ fontWeight: 700, opacity: 1 }}>{timeline.project.name}</span>
      </div>

      <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
        <Timer elapsedMs={clampedMs} />
        <CurrentPrompt timeline={timeline} currentMs={clampedMs} />
        <TokenCounter timeline={timeline} currentMs={clampedMs} />
        <FileActivity timeline={timeline} currentMs={clampedMs} />
        <ActivityLog timeline={timeline} currentMs={clampedMs} />
        <SecurityPanel timeline={timeline} currentMs={clampedMs} />
      </div>

      <PhaseBar timeline={timeline} currentMs={clampedMs} />
    </div>
  )
}
