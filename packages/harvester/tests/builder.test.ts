import { describe, it, expect } from 'vitest'
import { buildTimeline } from '../src/builder.js'
import { SessionTimelineSchema, type ManualMarkersFile } from '@silent-build/shared'

const FIXTURE = new URL('../fixtures/sample-session.jsonl', import.meta.url).pathname

describe('buildTimeline', () => {
  it('returns valid SessionTimeline from real fixture without markers', () => {
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers: null,
      projectName: 'test-project'
    })
    expect(() => SessionTimelineSchema.parse(timeline)).not.toThrow()
    expect(timeline.project.name).toBe('test-project')
    expect(timeline.phases).toHaveLength(4)
    expect(timeline.events.length).toBeGreaterThan(0)
    expect(timeline.metrics.promptsCount).toBeGreaterThan(0)
  })

  it('events are sorted by ts ascending', () => {
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers: null,
      projectName: 'test-project'
    })
    for (let i = 1; i < timeline.events.length; i++) {
      expect(timeline.events[i]!.ts).toBeGreaterThanOrEqual(timeline.events[i - 1]!.ts)
    }
  })

  it('phases come from markers when provided', () => {
    const firstTs = 1745253913012
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: firstTs, projectName: 'test' },
        { phase: 'backend-start', timestamp: firstTs + 1000 },
        { phase: 'frontend-start', timestamp: firstTs + 2000 },
        { phase: 'security-start', timestamp: firstTs + 3000 }
      ]
    }
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers,
      projectName: 'test'
    })
    expect(timeline.phases[1]!.source).toBe('manual-marker')
  })

  it('metrics match extracted events', () => {
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers: null,
      projectName: 'test'
    })
    const promptsInEvents = timeline.events.filter(e => e.type === 'prompt').length
    expect(timeline.metrics.promptsCount).toBe(promptsInEvents)
    const filesInEvents = new Set(
      timeline.events
        .filter(e => e.type === 'file_write' || e.type === 'file_edit')
        .map(e => (e as { data: { path: string } }).data.path)
    )
    expect(timeline.metrics.filesTouched).toBe(filesInEvents.size)
  })
})
