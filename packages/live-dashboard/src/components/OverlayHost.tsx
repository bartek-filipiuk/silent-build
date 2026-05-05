import { useEffect, useMemo, type ReactNode } from 'react'
import {
  IntroCard, OutroCard, PhaseTransition
} from '@silent-build/ui'
import type { Phase, SessionTimeline } from '@silent-build/shared'
import { store, useOverlay, useTimeline } from '../lib/store.js'
import { LiveAnimationProvider } from '../lib/animation.js'

const DURATIONS_MS: Record<string, number> = {
  Intro: 4000,
  Outro: 7000,
  PhaseTransition: 2500
}

/**
 * Each overlay scene gets its own LiveAnimationProvider anchored at the
 * moment the trigger fired (overlay.startedAt). That way frame=0 aligns with
 * the fade-in regardless of how long the underlying session has been running.
 */
const SceneAnimationWrap = ({ startedAt, children }: { startedAt: number; children: ReactNode }) => (
  <LiveAnimationProvider sessionStartTs={startedAt} pulseFps={60}>
    {children}
  </LiveAnimationProvider>
)

export const OverlayHost = () => {
  const overlay = useOverlay()
  const timeline = useTimeline()

  useEffect(() => {
    if (!overlay) return
    const dur = DURATIONS_MS[overlay.scene] ?? 3000
    const id = window.setTimeout(() => store.clearOverlay(), dur)
    return () => window.clearTimeout(id)
  }, [overlay])

  const startingAt = useMemo(
    () => timeline ? new Date(timeline.project.startTs) : new Date(),
    [timeline?.project.startTs]
  )

  if (!overlay) return null

  if (overlay.scene === 'Intro') {
    return (
      <SceneAnimationWrap startedAt={overlay.startedAt}>
        <IntroCard
          projectName={timeline?.project.name ?? 'Session'}
          targetDescription={derivedObjective(timeline)}
          startingAt={startingAt}
          durationInFrames={Math.round((DURATIONS_MS.Intro! / 1000) * 60)}
        />
      </SceneAnimationWrap>
    )
  }

  if (overlay.scene === 'Outro') {
    const metrics = timeline?.metrics ?? { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
    const durationMs = timeline
      ? Math.max(0, timeline.project.endTs - timeline.project.startTs)
      : 0
    return (
      <SceneAnimationWrap startedAt={overlay.startedAt}>
        <OutroCard
          projectName={timeline?.project.name ?? 'Session'}
          metrics={metrics}
          durationMs={durationMs}
          durationInFrames={Math.round((DURATIONS_MS.Outro! / 1000) * 60)}
        />
      </SceneAnimationWrap>
    )
  }

  if (overlay.scene === 'PhaseTransition') {
    const props = (overlay.props ?? {}) as { phase?: Phase; phaseNumber?: 1 | 2 | 3 | 4 }
    const n = props.phaseNumber ?? 2
    const phase = props.phase ?? timeline?.phases[n - 1]
    if (!phase) return null
    return (
      <SceneAnimationWrap startedAt={overlay.startedAt}>
        <PhaseTransition
          phase={phase}
          phaseNumber={n}
          durationInFrames={Math.round((DURATIONS_MS.PhaseTransition! / 1000) * 60)}
        />
      </SceneAnimationWrap>
    )
  }

  return null
}

function derivedObjective(t: SessionTimeline | null): string {
  if (!t) return 'Building live with Claude Code.'
  const p = t.metrics.promptsCount
  const f = t.metrics.filesTouched
  return `Live session · ${p} prompt${p === 1 ? '' : 's'} · ${f} file${f === 1 ? '' : 's'}`
}
