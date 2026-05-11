import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '@silent-build/theme'

export interface AssistantOutputProps {
  timeline: SessionTimeline
  currentMs: number
}

const MAX_LINES = 12
const STREAM_CHARS_PER_SEC = 60 // typing-reveal pace for fresh events

const splitToLines = (text: string, maxCharsPerLine = 64): string[] => {
  // Soft-wrap monospace text at word boundaries, capped at maxCharsPerLine.
  const out: string[] = []
  for (const para of text.split('\n')) {
    if (para.length <= maxCharsPerLine) {
      out.push(para)
      continue
    }
    const words = para.split(' ')
    let line = ''
    for (const w of words) {
      if (!line) {
        line = w
        continue
      }
      if (line.length + 1 + w.length <= maxCharsPerLine) {
        line += ' ' + w
      } else {
        out.push(line)
        line = w
      }
    }
    if (line) out.push(line)
  }
  return out
}

export const AssistantOutput: React.FC<AssistantOutputProps> = ({
  timeline,
  currentMs
}) => {
  const absTs = timeline.project.startTs + currentMs

  // Find most recent assistant_text event up to currentMs.
  let latest:
    | Extract<
        SessionTimeline['events'][number],
        { type: 'assistant_text' }
      >
    | null = null
  for (let i = timeline.events.length - 1; i >= 0; i--) {
    const e = timeline.events[i]
    if (!e) continue
    if (e.ts > absTs) continue
    if (e.type === 'assistant_text') {
      latest = e
      break
    }
  }

  // Character-stream reveal: if the event landed within the last 6s of
  // narrative time, type out at STREAM_CHARS_PER_SEC. Older events show fully.
  let visibleText = ''
  if (latest) {
    const elapsedSinceMs = Math.max(0, absTs - latest.ts)
    const elapsedSinceSec = elapsedSinceMs / 1000
    const fullText = latest.data.text
    if (elapsedSinceSec < 6) {
      const charsRevealed = Math.min(
        fullText.length,
        Math.floor(elapsedSinceSec * STREAM_CHARS_PER_SEC)
      )
      visibleText = fullText.slice(0, charsRevealed)
    } else {
      visibleText = fullText
    }
  }

  const lines = splitToLines(visibleText).slice(-MAX_LINES)
  // Show typing cursor only while streaming.
  const isStreaming =
    !!latest &&
    visibleText.length > 0 &&
    visibleText.length < latest.data.text.length

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
          justifyContent: 'space-between',
          alignItems: 'baseline'
        }}
      >
        <span>▸ Claude Output</span>
        {latest?.data.model ? (
          <span
            style={{
              color: tokens.colors.amberDim,
              fontSize: 9,
              letterSpacing: '0.18em'
            }}
          >
            {latest.data.model
              .replace(/^claude-/, '')
              .replace(/-\d{8}$/, '')
              .toUpperCase()}
          </span>
        ) : null}
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
          overflow: 'hidden',
          fontFamily: tokens.typography.fontMono
        }}
      >
        {!latest ? (
          <span
            style={{
              fontSize: 12,
              color: tokens.colors.textMuted,
              letterSpacing: '0.04em'
            }}
          >
            — waiting for response —
          </span>
        ) : (
          <>
            {lines.map((line, i) => (
              <span
                key={i}
                style={{
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: tokens.colors.textPrimary,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {line}
                {isStreaming && i === lines.length - 1 ? (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '0.55em',
                      marginLeft: 1,
                      background: tokens.colors.amber,
                      color: 'transparent',
                      opacity: 0.85
                    }}
                  >
                    █
                  </span>
                ) : null}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
