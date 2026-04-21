import { describe, it, expect } from 'vitest'
import { detectPhases } from '../src/phase-detector.js'
import type { ManualMarkersFile } from '@silent-build/shared'

describe('detectPhases — with manual markers', () => {
  it('returns 4 phases with manual-marker source', () => {
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: 1000, projectName: 'test' },
        { phase: 'backend-start', timestamp: 2000 },
        { phase: 'frontend-start', timestamp: 3000 },
        { phase: 'security-start', timestamp: 4000 },
        { phase: 'polish-start', timestamp: 4500 }
      ]
    }
    const phases = detectPhases({ markers, startTs: 1000, endTs: 5000 })
    expect(phases).toHaveLength(4)
    expect(phases[0]).toEqual({
      index: 1, label: 'Architecture', startTs: 1000, endTs: 2000, source: 'manual-marker'
    })
    expect(phases[1]!.label).toBe('Backend')
    expect(phases[2]!.label).toBe('Frontend')
    expect(phases[3]!.label).toBe('Security')
    expect(phases[3]!.endTs).toBe(5000)
  })

  it('handles missing polish-start by ending phase 4 at endTs', () => {
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: 1000, projectName: 'test' },
        { phase: 'backend-start', timestamp: 2000 },
        { phase: 'frontend-start', timestamp: 3000 },
        { phase: 'security-start', timestamp: 4000 }
      ]
    }
    const phases = detectPhases({ markers, startTs: 1000, endTs: 5000 })
    expect(phases[3]!.endTs).toBe(5000)
  })
})

describe('detectPhases — fallback heuristic', () => {
  it('splits session 30/30/30/10 when no markers', () => {
    const phases = detectPhases({ markers: null, startTs: 0, endTs: 10000 })
    expect(phases).toHaveLength(4)
    expect(phases.every(p => p.source === 'heuristic')).toBe(true)
    expect(phases[0]!.startTs).toBe(0)
    expect(phases[0]!.endTs).toBe(3000)
    expect(phases[1]!.endTs).toBe(6000)
    expect(phases[2]!.endTs).toBe(9000)
    expect(phases[3]!.endTs).toBe(10000)
  })

  it('fallback uses default labels', () => {
    const phases = detectPhases({ markers: null, startTs: 0, endTs: 100 })
    expect(phases.map(p => p.label)).toEqual(['Architecture', 'Backend', 'Frontend', 'Security'])
  })
})

describe('detectPhases — missing intermediate markers', () => {
  it('interpolates missing backend-start as start+30% of session', () => {
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: 0, projectName: 'test' },
        { phase: 'frontend-start', timestamp: 6000 },
        { phase: 'security-start', timestamp: 9000 }
      ]
    }
    const phases = detectPhases({ markers, startTs: 0, endTs: 10000 })
    expect(phases[0]!.endTs).toBe(3000)
    expect(phases[0]!.source).toBe('heuristic')
    expect(phases[1]!.source).toBe('heuristic')
    expect(phases[2]!.source).toBe('manual-marker')
    expect(phases[3]!.source).toBe('manual-marker')
  })
})
