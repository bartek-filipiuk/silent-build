import type React from 'react'
import { interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'
import { ProgressDots } from '../primitives/ProgressDots.js'

export interface ChapterLowerThirdProps {
  /** 1-based chapter index. */
  index: number
  /** Total chapters in the film (typically 6). */
  total: number
  /** Chapter label, uppercased on screen (e.g. "CONCEPT", "BUILD"). */
  label: string
  /** Optional unicode glyph for the phase (◇ ⌐ ⊞ ◆ ⊕ ▶). */
  glyph?: string
}

const PHASE_GLYPHS: Record<string, string> = {
  CONCEPT: '◇',
  PLAN: '⌐',
  BUILD: '⊞',
  DESIGN: '◆',
  AUDIT: '⊕',
  RELEASE: '▶'
}

/**
 * Variant A: solid panel + amber border (cleanest). Lower-third chapter chip
 * for the right-bottom corner of the frame. Transparent canvas — designed to
 * stack on top of dashboard pane in Premiere.
 *
 * Timing (60 fps, 3 s = 180 frames):
 * - 0–18: chip fade-in + slide-up (translateY 16→0)
 * - 18–54: amber underline draws-in left-to-right
 * - 54–138: hold (active dot pulses)
 * - 138–180: fade-out
 */
export const ChapterLowerThird: React.FC<ChapterLowerThirdProps> = ({
  index,
  total,
  label,
  glyph
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = (currentMs / 1000) * fps

  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const slideY = interpolate(frame, [0, 18], [16, 0], {
    extrapolateRight: 'clamp'
  })
  const underline = interpolate(frame, [18, 54], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const fadeOut = interpolate(frame, [138, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const overall = Math.min(enter, fadeOut)
  const pulse = interpolate(
    ((frame - 54) % 90) / 90,
    [0, 0.5, 1],
    [0.6, 1, 0.6]
  )

  const padWidth = Math.max(2, total.toString().length)
  const indexStr = index.toString().padStart(padWidth, '0')
  const totalStr = total.toString().padStart(padWidth, '0')
  const resolvedGlyph = glyph ?? PHASE_GLYPHS[label.toUpperCase()] ?? '◇'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: 1920,
        height: 1080,
        // Transparent canvas — stack on top of the dashboard.
        pointerEvents: 'none',
        fontFamily: tokens.typography.fontHeading
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 96,
          bottom: 96,
          transform: `translateY(${slideY}px)`,
          opacity: overall
        }}
      >
        <div
          style={{
            background: tokens.colors.panel,
            border: `1px solid ${tokens.colors.amberDim}`,
            position: 'relative',
            boxShadow: `0 0 0 1px ${tokens.colors.bg}, 0 12px 40px -10px rgba(0,0,0,0.6), 0 0 60px ${tokens.colors.amberHalo}`
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '18px 28px'
              }}
            >
              {/* progress dots */}
              <ProgressDots
                total={total}
                current={index}
                size={6}
                gap={8}
                frame={frame}
              />
              {/* divider */}
              <div
                style={{
                  width: 1,
                  height: 22,
                  background: tokens.colors.grid
                }}
              />
              {/* phase glyph */}
              <div
                style={{
                  fontFamily: tokens.typography.fontMono,
                  fontSize: 22,
                  color: tokens.colors.amber,
                  textShadow: `0 0 8px ${tokens.colors.amberGlow}`,
                  opacity: pulse
                }}
              >
                {resolvedGlyph}
              </div>
              {/* index */}
              <div
                style={{
                  fontFamily: tokens.typography.fontMono,
                  fontSize: 14,
                  color: tokens.colors.textDim,
                  letterSpacing: '0.22em',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {indexStr} / {totalStr}
              </div>
              {/* label */}
              <div
                style={{
                  fontFamily: tokens.typography.fontHeading,
                  fontSize: 22,
                  fontWeight: 600,
                  color: tokens.colors.textPrimary,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase'
                }}
              >
                {label}
              </div>
            </div>
            {/* amber underline */}
            <div
              style={{
                position: 'relative',
                height: 2,
                background: tokens.colors.grid
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${underline * 100}%`,
                  height: '100%',
                  background: tokens.colors.amber,
                  boxShadow: `0 0 6px ${tokens.colors.amberGlow}`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
