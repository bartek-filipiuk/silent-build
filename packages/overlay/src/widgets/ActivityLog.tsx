// packages/overlay/src/widgets/ActivityLog.tsx
import type React from 'react'
import type { SessionTimeline, TimelineEvent } from '@silent-build/shared'
import { tokens } from '../theme/tokens.js'

export interface ActivityLogProps {
  timeline: SessionTimeline
  currentMs: number
}

const MAX_ENTRIES = 8

const pad = (n: number) => n.toString().padStart(2, '0')
const formatMMSS = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${pad(m)}:${pad(s % 60)}`
}

const lastTwoSegments = (path: string) => {
  const parts = path.split('/').filter(Boolean)
  return parts.slice(-2).join('/')
}

// -------- Inline SVG icons (16×16, 1.5 stroke) --------
const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.5
}

// Page with downward arrow — file_write
const IconWrite: React.FC<{ color: string }> = ({ color }) => (
  <svg {...iconProps} stroke={color}>
    <path d="M3.5 2.5h5l3 3V13.5h-8z" />
    <path d="M8 8.5v3.5" />
    <path d="M6.5 10.5L8 12l1.5-1.5" />
  </svg>
)

// Pencil — file_edit
const IconEdit: React.FC<{ color: string }> = ({ color }) => (
  <svg {...iconProps} stroke={color}>
    <path d="M11.5 2.8l1.7 1.7-7.2 7.2-2.2.5.5-2.2z" />
    <path d="M10 4.3l1.7 1.7" />
  </svg>
)

// Crosshair — tool_call generic
const IconTool: React.FC<{ color: string }> = ({ color }) => (
  <svg {...iconProps} stroke={color}>
    <circle cx="8" cy="8" r="4" />
    <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" />
  </svg>
)

// Branched arrows — subagent
const IconSubagent: React.FC<{ color: string }> = ({ color }) => (
  <svg {...iconProps} stroke={color}>
    <circle cx="4" cy="4" r="1.25" />
    <circle cx="12" cy="4" r="1.25" />
    <circle cx="8" cy="12" r="1.25" />
    <path d="M4 5.25v2.25A1.5 1.5 0 0 0 5.5 9h5A1.5 1.5 0 0 0 12 7.5V5.25" />
    <path d="M8 9v1.75" />
  </svg>
)

const iconFor = (
  e: TimelineEvent,
  color: string
): React.ReactElement => {
  switch (e.type) {
    case 'file_write':
      return <IconWrite color={color} />
    case 'file_edit':
      return <IconEdit color={color} />
    case 'tool_call':
      return e.data.subagentId
        ? <IconSubagent color={color} />
        : <IconTool color={color} />
    default:
      return <IconTool color={color} />
  }
}

const labelFor = (e: TimelineEvent): string => {
  switch (e.type) {
    case 'file_write': return lastTwoSegments(e.data.path)
    case 'file_edit':  return lastTwoSegments(e.data.path)
    case 'tool_call': {
      const suffix = e.data.subagentId ? ' (subagent)' : ''
      return e.data.name + suffix
    }
    default: return ''
  }
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  timeline,
  currentMs
}) => {
  const absTs = timeline.project.startTs + currentMs
  const visibleTypes = new Set<TimelineEvent['type']>([
    'file_write',
    'file_edit',
    'tool_call'
  ])

  const entries: TimelineEvent[] = []
  for (let i = timeline.events.length - 1; i >= 0; i--) {
    const e = timeline.events[i]
    if (!e) continue
    if (e.ts > absTs) continue
    if (!visibleTypes.has(e.type)) continue
    entries.push(e)
    if (entries.length === MAX_ENTRIES) break
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: `${tokens.spacing.md}px ${tokens.spacing.xl}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.sm,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          fontFamily: tokens.typography.fontMono,
          fontSize: tokens.typography.label.size,
          fontWeight: tokens.typography.label.weight,
          letterSpacing: tokens.typography.label.ls,
          color: tokens.colors.textDim,
          textTransform: 'uppercase',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <span>Activity Log</span>
        <span style={{ color: tokens.colors.textMuted }}>
          {entries.length}/{MAX_ENTRIES}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: tokens.borders.hairline,
          background: tokens.colors.panel,
          padding: tokens.spacing.sm,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflow: 'hidden'
        }}
      >
        {entries.length === 0 ? (
          <span
            style={{
              fontFamily: tokens.typography.fontMono,
              fontSize: 12,
              color: tokens.colors.textMuted
            }}
          >
            — no activity yet —
          </span>
        ) : (
          entries.map((e, i) => {
            const isSubagent =
              e.type === 'tool_call' && !!e.data.subagentId
            const color = isSubagent
              ? tokens.colors.cyanData
              : tokens.colors.amber
            const textColor = isSubagent
              ? tokens.colors.textDim
              : tokens.colors.textPrimary
            const rowOpacity = isSubagent ? 0.7 : 1
            const elapsed = e.ts - timeline.project.startTs
            return (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 20px 1fr',
                  gap: tokens.spacing.xs,
                  alignItems: 'center',
                  opacity: rowOpacity,
                  height: 22
                }}
              >
                <span
                  style={{
                    fontFamily: tokens.typography.fontMono,
                    fontSize: 11,
                    color: tokens.colors.textDim,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {formatMMSS(elapsed)}
                </span>
                <span style={{ display: 'inline-flex' }}>
                  {iconFor(e, color)}
                </span>
                <span
                  style={{
                    fontFamily: tokens.typography.fontMono,
                    fontSize: 13,
                    color: textColor,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {labelFor(e)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
