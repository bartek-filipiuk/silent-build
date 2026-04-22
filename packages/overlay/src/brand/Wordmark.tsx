import type React from 'react'
import { tokens } from '../theme/tokens.js'

export interface WordmarkProps {
  size?: number
  color?: string
  weight?: 'regular' | 'bold'
}

/**
 * "silent-build" wordmark lockup in Space Grotesk.
 *
 * Treatment: lowercase, tight tracking, mixed weights.
 *   "silent"  -> weight 400 (quiet, watching)
 *   "-build"  -> weight 700 (the active verb)
 * Hyphen at 70% opacity binds visually to "silent".
 *
 * `weight="bold"` forces the whole mark to 700 (for small/favicon use).
 */
export const Wordmark: React.FC<WordmarkProps> = ({
  size = 16,
  color,
  weight = 'regular'
}) => {
  const resolvedColor = color ?? tokens.colors.textPrimary
  const silentWeight = weight === 'bold' ? 700 : 400
  const buildWeight = 700

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: tokens.typography.fontHeading,
        fontSize: size,
        color: resolvedColor,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap'
      }}
      role="text"
      aria-label="silent-build"
    >
      <span style={{ fontWeight: silentWeight }}>silent</span>
      <span style={{ fontWeight: silentWeight, opacity: 0.7 }}>-</span>
      <span style={{ fontWeight: buildWeight }}>build</span>
    </span>
  )
}
