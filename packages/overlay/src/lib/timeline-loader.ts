import { readFileSync } from 'node:fs'
import { SessionTimelineSchema, type SessionTimeline } from '@silent-build/shared'

export function loadTimeline(path: string): SessionTimeline {
  const raw = readFileSync(path, 'utf-8')
  return SessionTimelineSchema.parse(JSON.parse(raw))
}
