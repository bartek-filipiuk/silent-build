import { z } from 'zod'

export const PhaseSourceSchema = z.enum(['manual-marker', 'heuristic'])

export const PhaseSchema = z.object({
  index: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  label: z.string().min(1),
  startTs: z.number().int().nonnegative(),
  endTs: z.number().int().nonnegative(),
  source: PhaseSourceSchema
})
export type Phase = z.infer<typeof PhaseSchema>

const PromptEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('prompt'),
  data: z.object({ text: z.string(), tokensIn: z.number().int().nonnegative() })
})

const ToolCallEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('tool_call'),
  data: z.object({
    name: z.string(),
    args: z.unknown(),
    subagentId: z.string().optional()
  })
})

const FileWriteEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('file_write'),
  data: z.object({ path: z.string(), linesAdded: z.number().int().nonnegative() })
})

const FileEditEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('file_edit'),
  data: z.object({ path: z.string(), linesChanged: z.number().int().nonnegative() })
})

const TokensDeltaEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('tokens_delta'),
  data: z.object({
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative()
  })
})

const SecurityFindingEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('security_finding'),
  data: z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string(),
    fixed: z.boolean()
  })
})

export const TimelineEventSchema = z.discriminatedUnion('type', [
  PromptEventSchema,
  ToolCallEventSchema,
  FileWriteEventSchema,
  FileEditEventSchema,
  TokensDeltaEventSchema,
  SecurityFindingEventSchema
])
export type TimelineEvent = z.infer<typeof TimelineEventSchema>

export const SessionTimelineSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    startTs: z.number().int().nonnegative(),
    endTs: z.number().int().nonnegative()
  }),
  phases: z.array(PhaseSchema).length(4),
  events: z.array(TimelineEventSchema),
  metrics: z.object({
    totalTokens: z.number().int().nonnegative(),
    filesTouched: z.number().int().nonnegative(),
    promptsCount: z.number().int().nonnegative(),
    toolCallsCount: z.number().int().nonnegative()
  })
})
export type SessionTimeline = z.infer<typeof SessionTimelineSchema>

export const ManualMarkerSchema = z.object({
  phase: z.enum(['project-start', 'backend-start', 'frontend-start', 'security-start', 'polish-start']),
  timestamp: z.number().int().nonnegative(),
  projectName: z.string().optional()
})
export type ManualMarker = z.infer<typeof ManualMarkerSchema>

export const ManualMarkersFileSchema = z.object({
  project: z.string().min(1),
  markers: z.array(ManualMarkerSchema)
})
export type ManualMarkersFile = z.infer<typeof ManualMarkersFileSchema>
