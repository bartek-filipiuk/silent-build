import type React from 'react'
import { Composition, registerRoot } from 'remotion'
import {
  CodeZoom, type CodeZoomProps,
  CommitCard, type CommitCardProps,
  Dashboard, type DashboardProps,
  IntroCard, type IntroCardProps,
  OutroCard, type OutroCardProps,
  PhaseTransition, type PhaseTransitionProps,
  ProjectIntro, type ProjectIntroProps,
  StatsCard, type StatsCardProps,
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
    <Composition
      id="ProjectIntro"
      component={wrap<ProjectIntroProps>(ProjectIntro)}
      durationInFrames={10 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        projectName: parsed.project.name,
        punchline: '7 days · 1 multiplayer game · 1v1',
        subtitle: 'fastduels.com',
        techStack: ['SvelteKit', 'Cloudflare', 'PartyKit', 'D1']
      } as unknown as Record<string, unknown>}
    />
    <Composition
      id="StatsCard"
      component={wrap<StatsCardProps>(StatsCard)}
      durationInFrames={5 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        projectName: parsed.project.name,
        totalPrompts: parsed.metrics.promptsCount,
        totalToolCalls: parsed.metrics.toolCallsCount,
        totalDays: 9,
        totalTokens: parsed.metrics.totalTokens,
        filesTouched: parsed.metrics.filesTouched,
        liveUrl: 'fastduels.com'
      } as unknown as Record<string, unknown>}
    />
    <Composition
      id="CommitCard"
      component={wrap<CommitCardProps>(CommitCard)}
      durationInFrames={2 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        shortSha: '1647088',
        message: 'feat(markers): --live flag POSTs to live-server',
        filesChanged: 5,
        insertions: 87,
        deletions: 3
      } as unknown as Record<string, unknown>}
    />
    <Composition
      id="CodeZoom"
      component={wrap<CodeZoomProps>(CodeZoom)}
      durationInFrames={3 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        filePath: 'packages/partykit-server/src/match/match-room.ts',
        language: 'typescript',
        excerpt: 'export class MatchRoom {\n  onConnect(...) { }\n  onMessage(...) { }\n}\n',
        highlightLine: 2
      } as unknown as Record<string, unknown>}
    />
  </>
)

export type { CodeZoomProps, CommitCardProps, DashboardProps, IntroCardProps, OutroCardProps, PhaseTransitionProps, ProjectIntroProps, StatsCardProps, ThumbnailProps }

registerRoot(RemotionRoot)
