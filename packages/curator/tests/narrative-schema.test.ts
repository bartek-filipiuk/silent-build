import { describe, it, expect } from 'vitest'
import {
  NarrativeSchema,
  NarrativeClipSchema,
  CandidatesFileSchema,
  CandidateSchema
} from '../src/narrative-schema.js'

const validClip = {
  from: '2026-04-26T11:37:23.634Z',
  to: '2026-04-26T12:05:30.000Z',
  sourceJsonl: '/abs/path/session.jsonl',
  label: 'Reading concept doc',
  score: 9,
  rationale: 'Opening prompt clearly sets project goal',
  durationSec: 30,
  compressionRatio: 56
}

const validScene = {
  id: 'start' as const,
  title: 'Concept',
  durationSec: 120,
  overlay: { kind: 'Intro' as const },
  clips: [validClip]
}

const buildNarrative = () => ({
  project: 'duels',
  targetMinutes: 12,
  generatedAt: '2026-05-05T10:00:00.000Z',
  scenes: [
    { ...validScene, id: 'start' as const, title: 'Concept' },
    {
      ...validScene,
      id: 'plan' as const,
      title: 'Plan',
      overlay: {
        kind: 'PhaseTransition' as const,
        props: { phaseNumber: 2 }
      }
    },
    {
      ...validScene,
      id: 'build' as const,
      title: 'Build',
      overlay: {
        kind: 'PhaseTransition' as const,
        props: { phaseNumber: 3 }
      }
    },
    {
      ...validScene,
      id: 'design' as const,
      title: 'Design',
      overlay: {
        kind: 'PhaseTransition' as const,
        props: { phaseNumber: 4 }
      }
    },
    {
      ...validScene,
      id: 'audit' as const,
      title: 'Audit',
      overlay: {
        kind: 'PhaseTransition' as const,
        props: { phaseNumber: 5 }
      }
    },
    {
      ...validScene,
      id: 'end' as const,
      title: 'Ship',
      overlay: { kind: 'Outro' as const }
    }
  ]
})

describe('NarrativeClipSchema', () => {
  it('accepts a valid clip', () => {
    expect(() => NarrativeClipSchema.parse(validClip)).not.toThrow()
  })

  it('rejects when from >= to', () => {
    const bad = { ...validClip, from: validClip.to, to: validClip.from }
    expect(() => NarrativeClipSchema.parse(bad)).toThrow()
  })

  it('rejects score above 10', () => {
    expect(() =>
      NarrativeClipSchema.parse({ ...validClip, score: 11 })
    ).toThrow()
  })

  it('rejects compressionRatio below 1', () => {
    expect(() =>
      NarrativeClipSchema.parse({ ...validClip, compressionRatio: 0.5 })
    ).toThrow()
  })

  it('rejects empty label', () => {
    expect(() =>
      NarrativeClipSchema.parse({ ...validClip, label: '' })
    ).toThrow()
  })
})

describe('NarrativeSchema', () => {
  it('accepts a valid 6-scene narrative', () => {
    expect(() => NarrativeSchema.parse(buildNarrative())).not.toThrow()
  })

  it('accepts narrative with 3-5 scenes (single-session variant)', () => {
    for (let n = 5; n >= 3; n--) {
      const nar = buildNarrative()
      nar.scenes.length = n
      expect(() => NarrativeSchema.parse(nar), `${n} scenes`).not.toThrow()
    }
  })

  it('rejects narrative with 2 scenes (below minimum)', () => {
    const n = buildNarrative()
    n.scenes.length = 2
    expect(() => NarrativeSchema.parse(n)).toThrow()
  })

  it('rejects narrative with 7 scenes (above maximum)', () => {
    const n = buildNarrative()
    n.scenes.push(n.scenes[0]!)
    expect(() => NarrativeSchema.parse(n)).toThrow()
  })

  it('rejects scene with empty clips', () => {
    const n = buildNarrative()
    n.scenes[0]!.clips = []
    expect(() => NarrativeSchema.parse(n)).toThrow()
  })

  it('rejects scene with invalid id', () => {
    const n = buildNarrative()
    // @ts-expect-error testing invalid enum
    n.scenes[0]!.id = 'invalid'
    expect(() => NarrativeSchema.parse(n)).toThrow()
  })

  it('rejects PhaseTransition overlay missing phaseNumber', () => {
    const n = buildNarrative()
    // @ts-expect-error testing missing prop
    n.scenes[1]!.overlay = { kind: 'PhaseTransition' }
    expect(() => NarrativeSchema.parse(n)).toThrow()
  })
})

describe('CandidatesFileSchema', () => {
  const validCandidate = {
    id: 'cand-001',
    from: '2026-04-26T11:37:23.634Z',
    to: '2026-04-26T12:05:30.000Z',
    sourceJsonl: '/abs/path/session.jsonl',
    tag: 'start' as const,
    reason: 'first prompts of session',
    metricsSummary: '5 prompts, 12 tool calls',
    firstPromptText: 'zobacz Koncepcja Produktowa.md'
  }

  it('accepts valid file with candidates', () => {
    const f = {
      project: 'duels',
      sources: ['/abs/path/a.jsonl', '/abs/path/b.jsonl'],
      totalEvents: 17669,
      generatedAt: '2026-05-05T09:00:00.000Z',
      candidates: [validCandidate]
    }
    expect(() => CandidatesFileSchema.parse(f)).not.toThrow()
  })

  it('rejects when candidates exceed 50', () => {
    const f = {
      project: 'duels',
      sources: ['/abs/path/a.jsonl'],
      totalEvents: 100,
      generatedAt: '2026-05-05T09:00:00.000Z',
      candidates: Array(51).fill(validCandidate)
    }
    expect(() => CandidatesFileSchema.parse(f)).toThrow()
  })

  it('rejects candidate with bad tag', () => {
    expect(() =>
      // @ts-expect-error testing invalid tag
      CandidateSchema.parse({ ...validCandidate, tag: 'foo' })
    ).toThrow()
  })
})
