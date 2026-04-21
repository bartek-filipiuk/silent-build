import type React from 'react'
import { formatDuration } from '../lib/format-duration.js'

export const Timer: React.FC<{ elapsedMs: number }> = ({ elapsedMs }) => (
  <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: 2 }}>
    {formatDuration(elapsedMs)}
  </div>
)
