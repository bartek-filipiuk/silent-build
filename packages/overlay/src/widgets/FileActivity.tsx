// packages/overlay/src/widgets/FileActivity.tsx
import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '../theme/tokens.js'

export interface FileActivityProps {
  timeline: SessionTimeline
  currentMs: number
}

export const FileActivity: React.FC<FileActivityProps> = ({
  timeline,
  currentMs
}) => {
  const absTs = timeline.project.startTs + currentMs
  const written = new Set<string>()
  const edited = new Set<string>()
  for (const e of timeline.events) {
    if (e.ts > absTs) break
    if (e.type === 'file_write') written.add(e.data.path)
    else if (e.type === 'file_edit') edited.add(e.data.path)
  }

  const Stat: React.FC<{ n: number; label: string }> = ({ n, label }) => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'baseline',
        gap: tokens.spacing.sm
      }}
    >
      <span
        style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 24,
          fontWeight: 600,
          color: tokens.colors.textPrimary,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontFamily: tokens.typography.fontMono,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.14em',
          color: tokens.colors.textDim,
          textTransform: 'uppercase'
        }}
      >
        {label}
      </span>
    </div>
  )

  return (
    <div
      style={{
        height: 80,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.xl}px`,
        borderBottom: tokens.borders.hairline,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: tokens.spacing.xs
      }}
    >
      <div
        style={{
          fontFamily: tokens.typography.fontMono,
          fontSize: tokens.typography.label.size,
          fontWeight: tokens.typography.label.weight,
          letterSpacing: tokens.typography.label.ls,
          color: tokens.colors.textDim,
          textTransform: 'uppercase'
        }}
      >
        Files
      </div>
      <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center' }}>
        <Stat n={written.size} label="Written" />
        <div
          style={{
            width: 1,
            height: 28,
            background: tokens.colors.grid
          }}
        />
        <Stat n={edited.size} label="Edited" />
      </div>
    </div>
  )
}
