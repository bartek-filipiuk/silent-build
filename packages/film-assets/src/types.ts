import { z } from 'zod'

export const RepoMetadataSchema = z.object({
  projectName: z.string().min(1).max(40),
  punchline: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(80),
  techStack: z.array(z.string().min(1).max(20)).min(1).max(7),
  startTs: z.string().datetime(),
  endTs: z.string().datetime()
})
export type RepoMetadata = z.infer<typeof RepoMetadataSchema>

export const VoiceoverLinesSchema = z.object({
  hook: z.string().min(1).max(280),
  context: z.string().min(1).max(280).optional(),
  outro: z.string().min(1).max(400)
})
export type VoiceoverLines = z.infer<typeof VoiceoverLinesSchema>

export const TtsConfigSchema = z.object({
  voiceId: z.string().min(1),
  modelId: z.string().min(1).default('eleven_multilingual_v2'),
  apiKey: z.string().min(1)
})
export type TtsConfig = z.infer<typeof TtsConfigSchema>

export const ShotListContextSchema = z.object({
  projectName: z.string().min(1),
  punchline: z.string().min(1),
  liveUrl: z.string().min(1).optional(),
  topFiles: z.array(z.string()).max(5).default([]),
  topCommits: z
    .array(
      z.object({ sha: z.string(), message: z.string() })
    )
    .max(5)
    .default([])
})
export type ShotListContext = z.infer<typeof ShotListContextSchema>
