import type React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface CodeZoomProps {
  filePath: string
  language: string
  excerpt: string
  highlightLine?: number
}

export const CodeZoom: React.FC<CodeZoomProps> = ({
  filePath,
  excerpt,
  highlightLine
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = Math.floor((currentMs * fps) / 1000)
  const t = frame / fps

  const fade = interpolate(t, [0, 0.5, 2.5, 3], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const stagger = interpolate(t, [0.5, 1.5], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const glowPulse = interpolate(t, [1.5, 2, 2.5], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const lines = excerpt.split('\n')

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        opacity: fade,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          background: '#0d1117',
          border: `1px solid ${tokens.colors.grid}`,
          borderRadius: 12,
          width: 1500,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            background: tokens.colors.panel,
            color: tokens.colors.textDim,
            padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
            fontSize: 18,
            borderBottom: `1px solid ${tokens.colors.grid}`
          }}
        >
          {filePath}
        </div>
        <pre
          style={{
            margin: 0,
            padding: tokens.spacing.lg,
            color: tokens.colors.textPrimary,
            fontSize: 22,
            lineHeight: '1.5em',
            overflow: 'hidden',
            maxHeight: 720
          }}
        >
          {lines.map((line, i) => {
            const reveal = interpolate(
              stagger,
              [i / lines.length, (i + 1) / lines.length],
              [0, 1],
              {
                extrapolateRight: 'clamp',
                extrapolateLeft: 'clamp'
              }
            )
            const isHighlight = highlightLine != null && i + 1 === highlightLine
            return (
              <div
                key={i}
                style={{
                  opacity: reveal,
                  background: isHighlight
                    ? `rgba(255, 178, 71, ${0.1 + glowPulse * 0.18})`
                    : 'transparent',
                  paddingLeft: tokens.spacing.sm,
                  borderLeft: isHighlight
                    ? `3px solid ${tokens.colors.amberBright}`
                    : '3px solid transparent'
                }}
              >
                {line || ' '}
              </div>
            )
          })}
        </pre>
      </div>
    </AbsoluteFill>
  )
}
