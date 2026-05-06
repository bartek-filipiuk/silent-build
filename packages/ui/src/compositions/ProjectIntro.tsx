import type React from 'react'
import { AbsoluteFill, interpolate, spring } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface ProjectIntroProps {
  projectName: string
  punchline: string
  subtitle: string
  techStack: string[]
  startTs: string
}

export const ProjectIntro: React.FC<ProjectIntroProps> = ({
  projectName,
  punchline,
  subtitle,
  techStack
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = Math.floor((currentMs * fps) / 1000)
  const t = frame / fps

  const headOpacity = interpolate(t, [0, 0.6], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const punchOpacity = interpolate(t, [1.2, 2.4], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const subOpacity = interpolate(t, [3.6, 4.4], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const subTranslate = interpolate(t, [3.6, 4.4], [40, 0], {
    extrapolateRight: 'clamp'
  })
  const chipsBaseT = 5.5
  const fadeOut = interpolate(t, [9, 10], [1, 0], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp'
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        opacity: fadeOut,
        padding: tokens.spacing.xxl,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: tokens.spacing.lg
      }}
    >
      <div
        style={{
          color: tokens.colors.textDim,
          fontSize: 18,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          opacity: headOpacity
        }}
      >
        SILENT-BUILD · PROJECT REVEAL
      </div>

      <div
        style={{
          color: tokens.colors.amberBright,
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textAlign: 'center',
          opacity: punchOpacity,
          textShadow: `0 0 24px ${tokens.colors.amberDim}`
        }}
      >
        {projectName}
      </div>

      <div
        style={{
          color: tokens.colors.textPrimary,
          fontSize: 36,
          textAlign: 'center',
          opacity: punchOpacity,
          maxWidth: 1400
        }}
      >
        {punchline}
      </div>

      <div
        style={{
          color: tokens.colors.textPrimary,
          fontSize: 28,
          letterSpacing: '0.08em',
          opacity: subOpacity,
          transform: `translateY(${subTranslate}px)`,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
          borderBottom: `2px solid ${tokens.colors.amberBright}`
        }}
      >
        {subtitle}
      </div>

      <div
        style={{
          display: 'flex',
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.xl,
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        {techStack.map((chip, i) => {
          const chipT = chipsBaseT + i * 0.2
          const chipOpacity = interpolate(t, [chipT, chipT + 0.4], [0, 1], {
            extrapolateRight: 'clamp'
          })
          const chipScale = spring({
            frame: frame - chipT * fps,
            fps,
            config: { damping: 12 }
          })
          return (
            <div
              key={chip}
              style={{
                color: tokens.colors.textPrimary,
                fontSize: 20,
                padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
                border: `1px solid ${tokens.colors.amberDim}`,
                borderRadius: 4,
                opacity: chipOpacity,
                transform: `scale(${chipScale})`,
                background: tokens.colors.panel
              }}
            >
              {chip}
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
