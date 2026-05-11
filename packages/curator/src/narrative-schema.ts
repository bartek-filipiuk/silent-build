import { z } from 'zod'

const SceneIdSchema = z.enum([
  'start',
  'plan',
  'build',
  'design',
  'audit',
  'end'
])

export const NarrativeClipSchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    sourceJsonl: z.string().min(1),
    label: z.string().min(1).max(120),
    score: z.number().min(0).max(10),
    rationale: z.string().min(1).max(280),
    durationSec: z.number().int().positive(),
    compressionRatio: z.number().min(1)
  })
  .refine((c) => new Date(c.from).getTime() < new Date(c.to).getTime(), {
    message: 'clip.from must be earlier than clip.to'
  })

const OverlaySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('Intro'),
    props: z.record(z.unknown()).optional()
  }),
  z.object({
    kind: z.literal('PhaseTransition'),
    props: z.object({
      phaseNumber: z.number().int().min(1).max(6)
    })
  }),
  z.object({
    kind: z.literal('Outro'),
    props: z.record(z.unknown()).optional()
  })
])

export const NarrativeSceneSchema = z.object({
  id: SceneIdSchema,
  title: z.string().min(1).max(40),
  durationSec: z.number().int().positive(),
  overlay: OverlaySchema,
  clips: z.array(NarrativeClipSchema).min(1).max(5)
})

export const NarrativeSchema = z.object({
  project: z.string().min(1),
  targetMinutes: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  // 3-6 scenes. 6 is the full silent-build convention (concept → plan →
  // build → design → audit → release). Single-session projects (e.g. quick
  // tools, no audit/release phase) can ship a 3-4 scene narrative.
  scenes: z.array(NarrativeSceneSchema).min(3).max(6)
})

export type NarrativeClip = z.infer<typeof NarrativeClipSchema>
export type NarrativeScene = z.infer<typeof NarrativeSceneSchema>
export type Narrative = z.infer<typeof NarrativeSchema>
export type SceneId = z.infer<typeof SceneIdSchema>

const CandidateTagSchema = z.enum([
  'start',
  'plan',
  'build',
  'design',
  'audit',
  'end',
  'unknown'
])

export const CandidateSchema = z.object({
  id: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
  sourceJsonl: z.string().min(1),
  tag: CandidateTagSchema,
  reason: z.string().min(1).max(120),
  metricsSummary: z.string().max(200),
  firstPromptText: z.string().max(280)
})

export const CandidatesFileSchema = z.object({
  project: z.string().min(1),
  sources: z.array(z.string()).min(1),
  totalEvents: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
  candidates: z.array(CandidateSchema).max(50)
})

export type Candidate = z.infer<typeof CandidateSchema>
export type CandidatesFile = z.infer<typeof CandidatesFileSchema>
export type CandidateTag = z.infer<typeof CandidateTagSchema>
