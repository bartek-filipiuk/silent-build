import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'

export interface DashboardProps {
  timeline: SessionTimeline
}

export const Dashboard: React.FC<DashboardProps> = ({ timeline }) => (
  <div style={{ width: 576, height: 1080, background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace', padding: 24 }}>
    <h2 style={{ fontSize: 24 }}>Dashboard placeholder</h2>
    <p>Project: {timeline.project.name}</p>
    <p>Phases: {timeline.phases.length}</p>
    <p>Events: {timeline.events.length}</p>
  </div>
)
