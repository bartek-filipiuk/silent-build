import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ManualMarkersFileSchema, type ManualMarker } from '@silent-build/shared'

export interface WriteMarkerArgs {
  outputDir: string
  phase: ManualMarker['phase']
  projectName?: string
  timestamp: number
}

const MARKERS_FILENAME = 'manual_markers.json'

export function readMarkersFile(outputDir: string) {
  const path = join(outputDir, MARKERS_FILENAME)
  if (!existsSync(path)) {
    throw new Error(`manual_markers.json not found in ${outputDir}`)
  }
  const raw = JSON.parse(readFileSync(path, 'utf-8'))
  return ManualMarkersFileSchema.parse(raw)
}

export function writeMarker(args: WriteMarkerArgs): void {
  const { outputDir, phase, timestamp, projectName } = args
  mkdirSync(outputDir, { recursive: true })
  const path = join(outputDir, MARKERS_FILENAME)
  const isProjectStart = phase === 'project-start'

  if (isProjectStart) {
    if (!projectName) {
      throw new Error('project-start marker requires projectName')
    }
    const payload = {
      project: projectName,
      markers: [{ phase, timestamp, projectName }]
    }
    ManualMarkersFileSchema.parse(payload)
    writeFileSync(path, JSON.stringify(payload, null, 2))
    return
  }

  if (!existsSync(path)) {
    throw new Error(
      `Cannot write ${phase} marker — no project-start marker found in ${outputDir}. ` +
      `Run \`pnpm mark project-start --name <project>\` first.`
    )
  }

  const existing = readMarkersFile(outputDir)
  existing.markers.push({ phase, timestamp })
  writeFileSync(path, JSON.stringify(existing, null, 2))
}
