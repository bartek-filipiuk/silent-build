import type React from 'react'
import { Composition, registerRoot } from 'remotion'
import { Dashboard, type DashboardProps } from './Dashboard.js'
import { IntroCard, type IntroCardProps } from './compositions/IntroCard.js'
import { OutroCard, type OutroCardProps } from './compositions/OutroCard.js'
import { PhaseTransition, type PhaseTransitionProps } from './compositions/PhaseTransition.js'
import mockTimeline from './fixtures/mock-timeline.json'
import { SessionTimelineSchema } from '@silent-build/shared'
import { loadFonts } from './theme/fonts.js'

// Kick off font loading as soon as the composition bundle is evaluated.
loadFonts()

const parsed = SessionTimelineSchema.parse(mockTimeline)
const durationMs = parsed.project.endTs - parsed.project.startTs
const FPS = 60
const dashboardFrames = Math.max(60, Math.ceil((durationMs / 1000) * FPS))

// Remotion requires Props extends Record<string, unknown> — cast-through.
const cast = <T,>(c: React.ComponentType<T>) =>
  c as unknown as React.ComponentType<Record<string, unknown>>

const mockPhase2 = parsed.phases[1]!

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Dashboard"
      component={cast<DashboardProps>(Dashboard)}
      durationInFrames={dashboardFrames}
      fps={FPS}
      width={576}
      height={1080}
      defaultProps={{ timeline: parsed } as unknown as Record<string, unknown>}
    />
    <Composition
      id="Intro"
      component={cast<IntroCardProps>(IntroCard)}
      durationInFrames={4 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        projectName: parsed.project.name,
        targetDescription: 'Anti-doomscroll PWA with AI micro-lessons',
        startingAt: new Date(parsed.project.startTs)
      } as unknown as Record<string, unknown>}
    />
    <Composition
      id="Outro"
      component={cast<OutroCardProps>(OutroCard)}
      durationInFrames={7 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        projectName: parsed.project.name,
        metrics: parsed.metrics,
        durationMs,
        repoUrl: 'github.com/bartek-filipiuk/silent-build'
      } as unknown as Record<string, unknown>}
    />
    <Composition
      id="PhaseTransition"
      component={cast<PhaseTransitionProps>(PhaseTransition)}
      durationInFrames={Math.round(2.5 * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        phase: mockPhase2,
        phaseNumber: 2
      } as unknown as Record<string, unknown>}
    />
  </>
)

// Re-export prop types for downstream tooling (render-cli uses them).
export type { DashboardProps, IntroCardProps, OutroCardProps, PhaseTransitionProps }

registerRoot(RemotionRoot)
