import type { ManualMarkersFile, Phase } from '@silent-build/shared'

const PHASE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Architecture',
  2: 'Backend',
  3: 'Frontend',
  4: 'Security'
}

interface DetectArgs {
  markers: ManualMarkersFile | null
  startTs: number
  endTs: number
}

export function detectPhases({ markers, startTs, endTs }: DetectArgs): Phase[] {
  const duration = endTs - startTs
  const fallbackBoundaries = [
    startTs + Math.floor(duration * 0.3),
    startTs + Math.floor(duration * 0.6),
    startTs + Math.floor(duration * 0.9)
  ]

  if (!markers || markers.markers.length === 0) {
    return buildPhases(
      [startTs, fallbackBoundaries[0]!, fallbackBoundaries[1]!, fallbackBoundaries[2]!, endTs],
      ['heuristic', 'heuristic', 'heuristic', 'heuristic']
    )
  }

  const markerByPhase = new Map(markers.markers.map(m => [m.phase, m.timestamp]))
  const phase2Start = markerByPhase.get('backend-start')
  const phase3Start = markerByPhase.get('frontend-start')
  const phase4Start = markerByPhase.get('security-start')

  const boundaries: number[] = [startTs]
  const sources: Array<Phase['source']> = []

  if (phase2Start !== undefined) {
    boundaries.push(phase2Start)
    sources.push('manual-marker')
  } else {
    boundaries.push(fallbackBoundaries[0]!)
    sources.push('heuristic')
  }

  if (phase3Start !== undefined) {
    boundaries.push(phase3Start)
    sources.push(phase2Start !== undefined ? 'manual-marker' : 'heuristic')
  } else {
    boundaries.push(fallbackBoundaries[1]!)
    sources.push('heuristic')
  }

  if (phase4Start !== undefined) {
    boundaries.push(phase4Start)
    sources.push(phase3Start !== undefined ? 'manual-marker' : 'heuristic')
  } else {
    boundaries.push(fallbackBoundaries[2]!)
    sources.push('heuristic')
  }

  boundaries.push(endTs)
  sources.push(phase4Start !== undefined ? 'manual-marker' : 'heuristic')

  return buildPhases(boundaries, sources)
}

function buildPhases(boundaries: number[], sources: Array<Phase['source']>): Phase[] {
  return [1, 2, 3, 4].map((index) => ({
    index: index as 1 | 2 | 3 | 4,
    label: PHASE_LABELS[index as 1 | 2 | 3 | 4],
    startTs: boundaries[index - 1]!,
    endTs: boundaries[index]!,
    source: sources[index - 1]!
  }))
}
