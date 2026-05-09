import type React from 'react'
import { interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'

export interface ProgressDotsProps {
  total?: number
  current?: number  // 1-indexed
  size?: number
  gap?: number
  /** Current frame, used for the active-dot pulse. */
  frame?: number
}

/**
 * Phase progress indicator: ○ ○ ● ○ ○ ○
 * - completed dots: filled amberDim
 * - current dot: filled amber + pulse + glow
 * - upcoming dots: hollow ring (amberDeep border)
 */
export const ProgressDots: React.FC<ProgressDotsProps> = ({
  total = 6,
  current = 3,
  size = 7,
  gap = 10,
  frame = 0
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap }}>
    {Array.from({ length: total }).map((_, i) => {
      const idx = i + 1
      const isCurrent = idx === current
      const isComplete = idx < current
      let bg: string
      let border: string
      let glow: string
      if (isCurrent) {
        bg = tokens.colors.amber
        border = 'none'
        glow = `0 0 ${size * 2}px ${tokens.colors.amberGlow}`
      } else if (isComplete) {
        bg = tokens.colors.amberDim
        border = 'none'
        glow = 'none'
      } else {
        bg = 'transparent'
        border = `1px solid ${tokens.colors.amberDeep}`
        glow = 'none'
      }
      const pulse = isCurrent
        ? interpolate(((frame % 90) / 90), [0, 0.5, 1], [0.65, 1, 0.65])
        : 1
      return (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size,
            background: bg,
            border,
            boxShadow: glow,
            opacity: isComplete ? 0.85 * pulse : pulse
          }}
        />
      )
    })}
  </div>
)
