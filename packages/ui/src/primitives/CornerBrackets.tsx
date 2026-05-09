import type React from 'react'
import { tokens } from '@silent-build/theme'

export interface CornerBracketsProps {
  thickness?: number
  color?: string
  inset?: number
  opacity?: number
  segLen?: number
}

/**
 * Four L-shaped brackets in the corners of the parent (which must be
 * `position: relative` or `absolute`). NASA HUD framing.
 */
export const CornerBrackets: React.FC<CornerBracketsProps> = ({
  thickness = 2,
  color = tokens.colors.amber,
  inset = 0,
  opacity = 1,
  segLen = 22
}) => {
  const armV: React.CSSProperties = {
    position: 'absolute',
    width: thickness,
    height: segLen,
    background: color,
    opacity
  }
  const armH: React.CSSProperties = {
    position: 'absolute',
    height: thickness,
    width: segLen,
    background: color,
    opacity
  }
  return (
    <>
      {/* TL */}
      <div style={{ ...armV, top: inset, left: inset }} />
      <div style={{ ...armH, top: inset, left: inset }} />
      {/* TR */}
      <div style={{ ...armV, top: inset, right: inset }} />
      <div style={{ ...armH, top: inset, right: inset }} />
      {/* BL */}
      <div style={{ ...armV, bottom: inset, left: inset }} />
      <div style={{ ...armH, bottom: inset, left: inset }} />
      {/* BR */}
      <div style={{ ...armV, bottom: inset, right: inset }} />
      <div style={{ ...armH, bottom: inset, right: inset }} />
    </>
  )
}
