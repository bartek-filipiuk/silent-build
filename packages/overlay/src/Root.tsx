import type React from 'react'
import { Composition, registerRoot } from 'remotion'
import {
  Dashboard, type DashboardProps,
  IntroCard, type IntroCardProps,
  OutroCard, type OutroCardProps,
  PhaseTransition, type PhaseTransitionProps,
  Thumbnail, type ThumbnailProps
} from '@silent-build/ui'
import mockTimeline from './fixtures/mock-timeline.json'
import { SessionTimelineSchema } from '@silent-build/shared'
import { loadFonts } from '@silent-build/theme'
import { withRemotionAnimation } from './RemotionAnimationProvider.js'

loadFonts()

const parsed = SessionTimelineSchema.parse(mockTimeline)
const durationMs = parsed.project.endTs - parsed.project.startTs
const FPS = 60
const dashboardFrames = Math.max(60, Math.ceil((durationMs / 1000) * FPS))

// Remotion requires Props extends Record<string, unknown>; we also wrap each
// composition in the RemotionAnimationProvider so @silent-build/ui widgets
// receive currentMs + pulse phases derived from useCurrentFrame/useVideoConfig.
const wrap = <T extends object>(c: React.ComponentType<T>) =>
  withRemotionAnimation(c) as unknown as React.ComponentType<Record<string, unknown>>

const mockPhase2 = parsed.phases[1]!

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Dashboard"
      component={wrap<DashboardProps>(Dashboard)}
      durationInFrames={dashboardFrames}
      fps={FPS}
      width={576}
      height={1080}
      defaultProps={{ timeline: parsed } as unknown as Record<string, unknown>}
    />
    <Composition
      id="Intro"
      component={wrap<IntroCardProps>(IntroCard)}
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
      component={wrap<OutroCardProps>(OutroCard)}
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
      component={wrap<PhaseTransitionProps>(PhaseTransition)}
      durationInFrames={Math.round(2.5 * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        phase: mockPhase2,
        phaseNumber: 2
      } as unknown as Record<string, unknown>}
    />
    <Composition
      id="Thumbnail"
      component={wrap<ThumbnailProps>(Thumbnail)}
      durationInFrames={1}
      fps={FPS}
      width={1280}
      height={720}
      defaultProps={{
        title: 'I built an AI to replace my TikTok in 3 hours',
        projectName: parsed.project.name,
        episode: 1
      } as unknown as Record<string, unknown>}
    />
  </>
)

export type { DashboardProps, IntroCardProps, OutroCardProps, PhaseTransitionProps, ThumbnailProps }

registerRoot(RemotionRoot)
