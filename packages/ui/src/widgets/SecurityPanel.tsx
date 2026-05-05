import type React from 'react'
import type { SessionTimeline } from '@silent-build/shared'
import { tokens } from '@silent-build/theme'
import { useAnimation, pulseOpacity as computePulse } from '../context.js'

export interface SecurityPanelProps {
  timeline: SessionTimeline
  currentMs: number
}

type Severity = 'low' | 'medium' | 'high' | 'critical'

const sevLabel = (s: Severity): string => {
  switch (s) {
    case 'low':      return 'LOW'
    case 'medium':   return 'MED'
    case 'high':     return 'HIGH'
    case 'critical': return 'CRIT'
  }
}

const sevColor = (s: Severity): string => {
  switch (s) {
    case 'low':      return tokens.colors.greenOk
    case 'medium':   return tokens.colors.amber
    case 'high':     return tokens.colors.amberBright
    case 'critical': return tokens.colors.redAlert
  }
}

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M2.5 6.5l2.2 2.2L9.5 3.5"
      stroke={tokens.colors.greenOk}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const SecurityPanel: React.FC<SecurityPanelProps> = ({
  timeline,
  currentMs
}) => {
  const { pulse15s } = useAnimation()
  const pulseOpacity = computePulse(pulse15s, 0.55, 1)

  const absTs = timeline.project.startTs + currentMs
  const findings = timeline.events
    .filter((e) => e.ts <= absTs && e.type === 'security_finding')
    .map((e) => e as Extract<typeof e, { type: 'security_finding' }>)

  const hasFindings = findings.length > 0
  const displayed = findings.slice(-3) // fit within 92px

  const header = (
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
        alignItems: 'center'
      }}
    >
      <span>Security</span>
      <span
        style={{
          color: hasFindings ? tokens.colors.redAlert : tokens.colors.textMuted
        }}
      >
        {hasFindings ? `${findings.length} FINDING${findings.length === 1 ? '' : 'S'}` : 'IDLE'}
      </span>
    </div>
  )

  return (
    <div
      style={{
        height: 92,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.xl}px`,
        borderBottom: tokens.borders.hairline,
        borderTop: tokens.borders.hairline,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.xs,
        overflow: 'hidden'
      }}
    >
      {header}

      {!hasFindings ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            height: '100%'
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: tokens.colors.amberDim,
              display: 'inline-block',
              boxShadow: `0 0 8px ${tokens.colors.amberGlow}`
            }}
          />
          <span
            style={{
              fontFamily: tokens.typography.fontMono,
              fontSize: 13,
              color: tokens.colors.textDim,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            Idle — No findings
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayed.map((f, i) => {
            const color = sevColor(f.data.severity as Severity)
            const fixed = f.data.fixed
            const borderStyle: React.CSSProperties = !fixed
              ? {
                  borderLeft: `2px solid ${tokens.colors.redAlert}`,
                  opacity: pulseOpacity
                }
              : { borderLeft: `2px solid ${tokens.colors.greenDim}` }
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.xs,
                  paddingLeft: tokens.spacing.xs,
                  opacity: fixed ? 0.5 : 1,
                  ...borderStyle
                }}
              >
                <span
                  style={{
                    fontFamily: tokens.typography.fontMono,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: tokens.colors.bg,
                    background: color,
                    padding: '1px 5px',
                    borderRadius: 2,
                    flexShrink: 0
                  }}
                >
                  {sevLabel(f.data.severity as Severity)}
                </span>
                <span
                  style={{
                    fontFamily: tokens.typography.fontMono,
                    fontSize: 12,
                    color: fixed ? tokens.colors.textDim : tokens.colors.redAlert,
                    textDecoration: fixed ? 'line-through' : 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                  }}
                >
                  {f.data.title}
                </span>
                {fixed && <CheckIcon />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
