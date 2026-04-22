import type React from 'react'
import { Composition, registerRoot } from 'remotion'
import { Dashboard, type DashboardProps } from './Dashboard.js'
import mockTimeline from './fixtures/mock-timeline.json'
import { SessionTimelineSchema } from '@silent-build/shared'
import { loadFonts } from './theme/fonts.js'

// Kick off font loading as soon as the composition bundle is evaluated.
loadFonts()

const parsed = SessionTimelineSchema.parse(mockTimeline)
const durationMs = parsed.project.endTs - parsed.project.startTs
const FPS = 60
const durationFrames = Math.max(60, Math.ceil((durationMs / 1000) * FPS))

// Cast needed because Remotion requires Props extends Record<string, unknown>
const DashboardComp = Dashboard as unknown as React.ComponentType<Record<string, unknown>>

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Dashboard"
    component={DashboardComp}
    durationInFrames={durationFrames}
    fps={FPS}
    width={576}
    height={1080}
    defaultProps={{ timeline: parsed } as unknown as Record<string, unknown>}
  />
)

// Re-export the props type to keep the DashboardProps import used
export type { DashboardProps }

registerRoot(RemotionRoot)
