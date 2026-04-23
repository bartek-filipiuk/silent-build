import { useEffect, useMemo } from 'react'
import {
  IntroCard, OutroCard, PhaseTransition
} from '@silent-build/ui'
import type { Phase, SessionTimeline } from '@silent-build/shared'
import { store, useOverlay, useTimeline } from '../lib/store.js'

const DURATIONS_MS: Record<string, number> = {
  Intro: 4000,
  Outro: 7000,
  PhaseTransition: 2500
}

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
      <IntroCard
        projectName={timeline?.project.name ?? 'Session'}
        targetDescription={derivedObjective(timeline)}
        startingAt={startingAt}
      />
    )
  }

  if (overlay.scene === 'Outro') {
    const metrics = timeline?.metrics ?? { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
    const durationMs = timeline ? timeline.project.endTs - timeline.project.startTs : 0
    return (
      <OutroCard
        projectName={timeline?.project.name ?? 'Session'}
        metrics={metrics}
        durationMs={durationMs}
      />
    )
  }

  if (overlay.scene === 'PhaseTransition') {
    const props = (overlay.props ?? {}) as { phase?: Phase; phaseNumber?: 1 | 2 | 3 | 4 }
    const n = props.phaseNumber ?? 2
    const phase = props.phase ?? timeline?.phases[n - 1]
    if (!phase) return null
    return <PhaseTransition phase={phase} phaseNumber={n} />
  }

  return null
}

function derivedObjective(t: SessionTimeline | null): string {
  if (!t) return 'Building live with Claude Code.'
  const p = t.metrics.promptsCount
  const f = t.metrics.filesTouched
  return `Live session · ${p} prompt${p === 1 ? '' : 's'} · ${f} file${f === 1 ? '' : 's'}`
}
