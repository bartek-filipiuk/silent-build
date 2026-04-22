// packages/overlay/src/compositions/Thumbnail.tsx
import type React from 'react'
import { useCurrentFrame } from 'remotion'
import { tokens } from '../theme/tokens.js'
import { Logo } from '../brand/Logo.js'
import { Wordmark } from '../brand/Wordmark.js'

export interface ThumbnailProps {
  title: string
  projectName: string
  episode?: number
}

/**
 * Splits `title` into tokens and marks ~1/3 of them as "highlight" words for
 * amber emphasis. Deterministic: always the same words for the same input,
 * no randomness between renders. Highlights prefer longer tokens (>4 chars),
 * skipping stopwords.
 */
const STOPWORDS = new Set([
  'a','an','the','and','or','of','to','for','in','on','with','is','are','be',
  'we','i','you','your','our','this','that','it','at','by','from','as','but'
])

const pickHighlights = (title: string): Set<number> => {
  const words = title.split(/\s+/)
  const scored = words
    .map((w, i) => ({ i, w, len: w.replace(/[^a-zA-Z0-9]/g, '').length }))
    .filter(x => !STOPWORDS.has(x.w.toLowerCase().replace(/[^a-z0-9]/g, '')))
  scored.sort((a, b) => b.len - a.len)
  const target = Math.max(1, Math.ceil(words.length / 3))
  return new Set(scored.slice(0, target).map(x => x.i))
}

// ---------- mini dashboard (static) ----------

const CornerBracket: React.FC<{
  corner: 'tl' | 'tr' | 'bl' | 'br'
  inset: number
  size: number
  color: string
}> = ({ corner, inset, size, color }) => {
  const pos: React.CSSProperties =
    corner === 'tl' ? { top: inset, left: inset } :
    corner === 'tr' ? { top: inset, right: inset } :
    corner === 'bl' ? { bottom: inset, left: inset } :
                      { bottom: inset, right: inset }
  const d =
    corner === 'tl' ? `M 0 ${size} L 0 0 L ${size} 0` :
    corner === 'tr' ? `M 0 0 L ${size} 0 L ${size} ${size}` :
    corner === 'bl' ? `M 0 0 L 0 ${size} L ${size} ${size}` :
                      `M 0 ${size} L ${size} ${size} L ${size} 0`
  return (
    <svg
      style={{ position: 'absolute', width: size, height: size, ...pos }}
      viewBox={`0 0 ${size} ${size}`}
    >
      <path d={d} stroke={color} strokeWidth={2} fill="none" />
    </svg>
  )
}

const MiniDashboard: React.FC<{ projectName: string }> = ({ projectName }) => {
  // Frame width 440, height 540. Positioned by parent.
  const W = 440, H = 540
  const inset = 14
  const bracket = 20

  return (
    <div style={{
      position: 'relative', width: W, height: H,
      background: tokens.colors.panel,
      border: `1px solid ${tokens.colors.grid}`,
      overflow: 'hidden'
    }}>
      {/* inner scan frame */}
      <div style={{
        position: 'absolute', top: inset, left: inset, right: inset, bottom: inset,
        border: `1px solid ${tokens.colors.grid}`, pointerEvents: 'none'
      }} />
      <CornerBracket corner="tl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="tr" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="bl" inset={inset} size={bracket} color={tokens.colors.amberDim} />
      <CornerBracket corner="br" inset={inset} size={bracket} color={tokens.colors.amberDim} />

      {/* header strip */}
      <div style={{
        position: 'absolute', top: inset + 8, left: inset + 14, right: inset + 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: tokens.typography.fontMono, fontSize: 10,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: tokens.colors.textDim
      }}>
        <span>{projectName}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: tokens.colors.greenOk,
            boxShadow: `0 0 6px ${tokens.colors.greenOk}`
          }}/>
          LIVE
        </span>
      </div>

      {/* big timer */}
      <div style={{
        position: 'absolute', top: 70, left: 0, right: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8
      }}>
        <div style={{
          fontFamily: tokens.typography.fontMono, fontSize: 11,
          letterSpacing: '0.24em', textTransform: 'uppercase',
          color: tokens.colors.textDim
        }}>Session Time</div>
        <div style={{
          fontFamily: tokens.typography.fontHeading, fontSize: 72, fontWeight: 700,
          color: tokens.colors.textPrimary, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', letterSpacing: 0
        }}>01:47:22</div>
      </div>

      {/* divider */}
      <div style={{
        position: 'absolute', top: 200, left: inset + 14, right: inset + 14,
        height: 1, background: tokens.colors.grid
      }} />

      {/* token row */}
      <div style={{
        position: 'absolute', top: 220, left: inset + 14, right: inset + 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'
      }}>
        <span style={{
          fontFamily: tokens.typography.fontMono, fontSize: 10,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: tokens.colors.textDim
        }}>Tokens</span>
        <span style={{
          fontFamily: tokens.typography.fontHeading, fontSize: 22, fontWeight: 600,
          color: tokens.colors.amber, fontVariantNumeric: 'tabular-nums'
        }}>84.2k</span>
      </div>
      <div style={{
        position: 'absolute', top: 258, left: inset + 14, right: inset + 14,
        height: 3, background: tokens.colors.grid
      }}>
        <div style={{ width: '42%', height: '100%', background: tokens.colors.amber }}/>
      </div>

      {/* files row */}
      <div style={{
        position: 'absolute', top: 290, left: inset + 14, right: inset + 14,
        display: 'flex', gap: 24, alignItems: 'baseline'
      }}>
        <div>
          <div style={{
            fontFamily: tokens.typography.fontHeading, fontSize: 22, fontWeight: 600,
            color: tokens.colors.textPrimary, lineHeight: 1
          }}>23</div>
          <div style={{
            fontFamily: tokens.typography.fontMono, fontSize: 9,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: tokens.colors.textDim, marginTop: 4
          }}>Written</div>
        </div>
        <div style={{ width: 1, height: 32, background: tokens.colors.grid }} />
        <div>
          <div style={{
            fontFamily: tokens.typography.fontHeading, fontSize: 22, fontWeight: 600,
            color: tokens.colors.textPrimary, lineHeight: 1
          }}>41</div>
          <div style={{
            fontFamily: tokens.typography.fontMono, fontSize: 9,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: tokens.colors.textDim, marginTop: 4
          }}>Edited</div>
        </div>
      </div>

      {/* activity silhouette (fake log bars) */}
      <div style={{
        position: 'absolute', top: 360, left: inset + 14, right: inset + 14,
        display: 'flex', flexDirection: 'column', gap: 6
      }}>
        {[
          { w: 80, color: tokens.colors.amber },
          { w: 60, color: tokens.colors.amber },
          { w: 72, color: tokens.colors.cyanData, subagent: true },
          { w: 55, color: tokens.colors.amber },
          { w: 68, color: tokens.colors.amber }
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 30, height: 6, background: tokens.colors.grid
            }} />
            <span style={{
              width: 6, height: 6, background: row.color, opacity: 0.9
            }} />
            <span style={{
              width: `${row.w}%`, height: 4,
              background: row.color, opacity: row.subagent ? 0.6 : 0.85
            }} />
          </div>
        ))}
      </div>

      {/* phase bar */}
      <div style={{
        position: 'absolute', bottom: inset + 14, left: inset + 14, right: inset + 14,
        display: 'flex', flexDirection: 'column', gap: 6
      }}>
        <div style={{ display: 'flex', gap: 3, height: 12 }}>
          {[
            { done: true },
            { done: false, active: true, fill: 0.65 },
            { done: false },
            { done: false }
          ].map((p, i) => (
            <div key={i} style={{
              flex: 1, height: '100%',
              background: p.done ? tokens.colors.amberDim : tokens.colors.panel,
              border: `1px solid ${p.active ? tokens.colors.amberBright : tokens.colors.grid}`,
              position: 'relative', overflow: 'hidden'
            }}>
              {p.active && (
                <div style={{
                  width: `${(p.fill ?? 0) * 100}%`, height: '100%',
                  background: `linear-gradient(90deg, ${tokens.colors.amberDim}, ${tokens.colors.amberBright})`
                }}/>
              )}
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 10,
          fontFamily: tokens.typography.fontMono, fontSize: 10
        }}>
          <span style={{
            color: tokens.colors.textDim, letterSpacing: '0.2em', textTransform: 'uppercase'
          }}>Phase 2 / 4</span>
          <span style={{ color: tokens.colors.textMuted }}>·</span>
          <span style={{
            color: tokens.colors.amberBright, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase'
          }}>Backend</span>
        </div>
      </div>
    </div>
  )
}

// ---------- main ----------

export const Thumbnail: React.FC<ThumbnailProps> = ({
  title, projectName, episode
}) => {
  // Read frame 0 only — no animation. This keeps the component Remotion-
  // compatible while emitting a static single frame.
  useCurrentFrame()

  const highlights = pickHighlights(title)
  const words = title.split(/\s+/)

  return (
    <div style={{
      position: 'relative',
      width: 1280, height: 720,
      background: tokens.colors.bg,
      color: tokens.colors.textPrimary,
      fontFamily: tokens.typography.fontHeading,
      overflow: 'hidden'
    }}>
      {/* ambient amber wash behind the right side — depth cue */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 720, height: 720,
        background: `radial-gradient(450px 450px at 70% 50%, ${tokens.colors.amberGlow}, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      {/* subtle grid frame — echoes card language */}
      <div style={{
        position: 'absolute', inset: 20,
        border: `1px solid ${tokens.colors.grid}`,
        pointerEvents: 'none'
      }} />
      <CornerBracket corner="tl" inset={20} size={28} color={tokens.colors.amberDim} />
      <CornerBracket corner="tr" inset={20} size={28} color={tokens.colors.amberDim} />
      <CornerBracket corner="bl" inset={20} size={28} color={tokens.colors.amberDim} />
      <CornerBracket corner="br" inset={20} size={28} color={tokens.colors.amberDim} />

      {/* LEFT 55% — title */}
      <div style={{
        position: 'absolute', top: 72, left: 72,
        width: 640,
        display: 'flex', flexDirection: 'column',
        gap: 24
      }}>
        {/* pre-title eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          fontFamily: tokens.typography.fontMono, fontSize: 14,
          letterSpacing: '0.28em', textTransform: 'uppercase',
          color: tokens.colors.amber
        }}>
          <Logo size={22} variant="amber" />
          <span>Silent Build</span>
          <span style={{ color: tokens.colors.textMuted }}>//</span>
          <span style={{ color: tokens.colors.textDim }}>{projectName}</span>
        </div>

        {/* headline */}
        <div style={{
          fontFamily: tokens.typography.fontHeading,
          fontSize: 84, fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: '-0.01em',
          color: tokens.colors.textPrimary,
          textWrap: 'balance'
        }}>
          {words.map((w, i) => (
            <span key={i} style={{
              color: highlights.has(i) ? tokens.colors.amber : tokens.colors.textPrimary
            }}>
              {w}{i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </div>

        {/* underline accent */}
        <div style={{
          width: 120, height: 4,
          background: tokens.colors.amber,
          boxShadow: `0 0 14px ${tokens.colors.amberGlow}`
        }} />
      </div>

      {/* RIGHT 45% — mini dashboard */}
      <div style={{
        position: 'absolute', top: 90, right: 72,
        width: 440, height: 540
      }}>
        <MiniDashboard projectName={projectName} />
      </div>

      {/* episode badge */}
      {typeof episode === 'number' && (
        <div style={{
          position: 'absolute', top: 48, right: 72,
          fontFamily: tokens.typography.fontMono,
          fontSize: 13, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: tokens.colors.bg,
          background: tokens.colors.amber,
          padding: '5px 12px',
          borderRadius: 2
        }}>
          EP. {episode.toString().padStart(2, '0')}
        </div>
      )}

      {/* wordmark + logo bottom right */}
      <div style={{
        position: 'absolute', bottom: 40, right: 72,
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <Logo size={22} variant="amber" />
        <Wordmark size={20} color={tokens.colors.textPrimary} />
      </div>

      {/* bottom-left contextual label */}
      <div style={{
        position: 'absolute', bottom: 48, left: 72,
        fontFamily: tokens.typography.fontMono,
        fontSize: 13,
        letterSpacing: '0.24em', textTransform: 'uppercase',
        color: tokens.colors.textDim
      }}>
        Claude Code · Live Telemetry
      </div>
    </div>
  )
}
