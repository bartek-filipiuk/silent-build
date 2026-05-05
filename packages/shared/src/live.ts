import { z } from 'zod'
import { SessionTimelineSchema, TimelineEventSchema } from './types.js'

export const SnapshotMessageSchema = z.object({
  kind: z.literal('snapshot'),
  timeline: SessionTimelineSchema
})
export type SnapshotMessage = z.infer<typeof SnapshotMessageSchema>

export const DeltaMessageSchema = z.object({
  kind: z.literal('delta'),
  events: z.array(TimelineEventSchema)
})
export type DeltaMessage = z.infer<typeof DeltaMessageSchema>

export const TriggerSceneSchema = z.enum(['Intro', 'Outro', 'PhaseTransition', 'Clear'])
export type TriggerScene = z.infer<typeof TriggerSceneSchema>

export const TriggerMessageSchema = z.object({
  kind: z.literal('trigger'),
  scene: TriggerSceneSchema,
  props: z.unknown().optional()
})
export type TriggerMessage = z.infer<typeof TriggerMessageSchema>

export const PingMessageSchema = z.object({
  kind: z.literal('ping'),
  ts: z.number().nonnegative()
})
export type PingMessage = z.infer<typeof PingMessageSchema>

export const LiveServerMessageSchema = z.discriminatedUnion('kind', [
  SnapshotMessageSchema,
  DeltaMessageSchema,
  TriggerMessageSchema,
  PingMessageSchema
])
export type LiveServerMessage = z.infer<typeof LiveServerMessageSchema>
