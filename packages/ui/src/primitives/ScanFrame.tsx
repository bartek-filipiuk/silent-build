import type React from 'react'
import { tokens } from '@silent-build/theme'

export interface ScanFrameProps {
  inset?: number
  color?: string
  opacity?: number
}

/**
 * Subtle inset rectangle drawn 1px inside the parent. Defines the "safe area"
 * line in mission-control overlays. Parent must be `position: relative`.
 */
export const ScanFrame: React.FC<ScanFrameProps> = ({
  inset = 12,
  color = tokens.colors.gridStrong,
  opacity = 0.7
}) => (
  <div
    style={{
      position: 'absolute',
      inset,
      border: `1px solid ${color}`,
      opacity,
      pointerEvents: 'none'
    }}
  />
)
