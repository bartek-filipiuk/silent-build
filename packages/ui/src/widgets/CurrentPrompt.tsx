// packages/overlay/src/widgets/CurrentPrompt.tsx
import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '@silent-build/theme'

export interface CurrentPromptProps {
  timeline: SessionTimeline
  currentMs: number
}

const pad = (n: number) => n.toString().padStart(2, '0')
const formatHMS = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

export const CurrentPrompt: React.FC<CurrentPromptProps> = ({
  timeline,
  currentMs
}) => {
  const absTs = timeline.project.startTs + currentMs
  // Find latest prompt with ts <= absTs (events are sorted ascending).
  let prompt: { ts: number; text: string } | null = null
  for (let i = timeline.events.length - 1; i >= 0; i--) {
    const e = timeline.events[i]
    if (!e) continue
    if (e.ts <= absTs && e.type === 'prompt') {
      prompt = { ts: e.ts, text: e.data.text }
      break
    }
  }

  const elapsedAtPrompt = prompt ? prompt.ts - timeline.project.startTs : 0
  const rawText = prompt?.text ?? ''
  const text =
    rawText.length > 200 ? rawText.slice(0, 180) + '…' : rawText

  return (
    <div
      style={{
        height: 140,
        padding: `${tokens.spacing.md}px ${tokens.spacing.xl}px`,
        borderBottom: tokens.borders.hairline,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.xs,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: tokens.spacing.sm
        }}
      >
        <span
          style={{
            fontFamily: tokens.typography.fontMono,
            fontSize: tokens.typography.label.size,
            fontWeight: tokens.typography.label.weight,
            letterSpacing: tokens.typography.label.ls,
            color: tokens.colors.textDim,
            textTransform: 'uppercase'
          }}
        >
          Current Prompt
        </span>
        <span
          style={{
            fontFamily: tokens.typography.fontMono,
            fontSize: tokens.typography.micro.size,
            color: tokens.colors.textMuted,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          T+{formatHMS(elapsedAtPrompt)}
        </span>
      </div>

      <div
        style={{
          fontFamily: tokens.typography.fontMono,
          fontSize: 15,
          lineHeight: 1.45,
          color: tokens.colors.textPrimary,
          // 3-line clamp via webkit (renders fine in Chrome/Remotion headless).
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          // Left marker — visual anchor without adding an SVG.
          borderLeft: `2px solid ${tokens.colors.amber}`,
          paddingLeft: tokens.spacing.sm
        }}
      >
        {text || <span style={{ color: tokens.colors.textMuted }}>— awaiting first prompt —</span>}
      </div>
    </div>
  )
}
