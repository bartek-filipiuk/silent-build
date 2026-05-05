import type React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface CommitCardProps {
  shortSha: string
  message: string
  filesChanged: number
  insertions: number
  deletions: number
}

export const CommitCard: React.FC<CommitCardProps> = ({
  shortSha,
  message,
  filesChanged,
  insertions,
  deletions
}) => {
  const { currentMs, fps } = useAnimation()
  const frame = Math.floor((currentMs * fps) / 1000)
  const t = frame / fps
  const opacity = interpolate(t, [0, 0.3, 1.7, 2], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const safeMessage =
    message.length <= 80 ? message : message.slice(0, 79) + '…'

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          background: tokens.colors.panel,
          border: `1px solid ${tokens.colors.grid}`,
          borderRadius: 12,
          padding: tokens.spacing.xl,
          width: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.md
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: tokens.spacing.md,
            alignItems: 'center'
          }}
        >
          <span
            style={{
              color: tokens.colors.amberBright,
              fontSize: 24,
              fontFamily: tokens.typography.fontMono,
              padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
              border: `1px solid ${tokens.colors.amberDim}`,
              borderRadius: 4
            }}
          >
            {shortSha}
          </span>
          <span
            style={{
              color: tokens.colors.textPrimary,
              fontSize: 28,
              fontWeight: 600
            }}
          >
            {safeMessage}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: tokens.spacing.lg,
            color: tokens.colors.textDim,
            fontSize: 22
          }}
        >
          <span>
            {filesChanged} file{filesChanged === 1 ? '' : 's'}
          </span>
          <span style={{ color: tokens.colors.greenOk }}>
            +{insertions}
          </span>
          <span style={{ color: tokens.colors.redAlert }}>
            −{deletions}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
