import type React from 'react'
import { tokens } from '../theme/tokens.js'

export interface LogoProps {
  size?: number
  variant?: 'amber' | 'mono' | 'inverse'
  color?: string
}

const resolveColor = (
  variant: NonNullable<LogoProps['variant']>,
  explicit?: string
): string => {
  if (explicit) return explicit
  switch (variant) {
    case 'amber':   return tokens.colors.amber
    case 'mono':    return tokens.colors.textPrimary
    case 'inverse': return tokens.colors.bg
  }
}

/**
 * silent-build logo — bracket-framed instrumentation glyph.
 *
 * [ reticle ]  square brackets echo the Dashboard corner brackets;
 * the reticle (circle + 4 ticks + center dot) echoes the
 * "watching the build" theme.
 * Reads cleanly at 24px favicon scale and holds at 200px hero.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 48,
  variant = 'amber',
  color
}) => {
  const c = resolveColor(variant, color)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="silent-build"
    >
      {/* Left bracket */}
      <path
        d="M 11 8 L 6 8 L 6 40 L 11 40"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Right bracket */}
      <path
        d="M 37 8 L 42 8 L 42 40 L 37 40"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Reticle outer ring */}
      <circle cx="24" cy="24" r="10" stroke={c} strokeWidth="2" />
      {/* Crosshair ticks */}
      <path
        d="M 24 10 L 24 14 M 24 34 L 24 38 M 10 24 L 14 24 M 34 24 L 38 24"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="square"
      />
      {/* Center dot */}
      <circle cx="24" cy="24" r="2.5" fill={c} />
    </svg>
  )
}
