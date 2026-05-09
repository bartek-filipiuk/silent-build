import type React from 'react'
import { tokens } from '@silent-build/theme'

export interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  color?: string
  glow?: boolean
  fill?: boolean
}

/**
 * Tiny line chart for inline data viz (e.g. "tokens this phase" trend).
 * Designed for 60-180 px wide cells. SVG, scales clean.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 60,
  height = 14,
  color = tokens.colors.amber,
  glow = true,
  fill = true
}) => {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)
  const pts = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 2) - 1}`)
    .join(' ')
  const areaPath = `M0,${height} L${pts.replace(/ /g, ' L')} L${width},${height} Z`
  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {fill ? <path d={areaPath} fill={color} opacity="0.12" /> : null}
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="1.25"
        fill="none"
        style={{
          filter: glow ? `drop-shadow(0 0 4px ${tokens.colors.amberGlow})` : 'none'
        }}
      />
    </svg>
  )
}
