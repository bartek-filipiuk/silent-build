import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeMarker, readMarkersFile } from '../src/writer.js'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('writer', () => {
  let tmp: string

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'markers-test-'))
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  it('creates manual_markers.json with project-start marker', () => {
    writeMarker({
      outputDir: tmp,
      phase: 'project-start',
      projectName: 'focusfeed',
      timestamp: 1700000000000
    })

    const file = join(tmp, 'manual_markers.json')
    expect(existsSync(file)).toBe(true)

    const parsed = JSON.parse(readFileSync(file, 'utf-8'))
    expect(parsed.project).toBe('focusfeed')
    expect(parsed.markers).toHaveLength(1)
    expect(parsed.markers[0].phase).toBe('project-start')
    expect(parsed.markers[0].timestamp).toBe(1700000000000)
  })

  it('appends marker to existing file', () => {
    writeMarker({ outputDir: tmp, phase: 'project-start', projectName: 'focusfeed', timestamp: 1000 })
    writeMarker({ outputDir: tmp, phase: 'backend-start', timestamp: 2000 })

    const parsed = readMarkersFile(tmp)
    expect(parsed.markers).toHaveLength(2)
    expect(parsed.markers[1].phase).toBe('backend-start')
  })

  it('throws if appending without prior project-start', () => {
    expect(() => writeMarker({
      outputDir: tmp,
      phase: 'backend-start',
      timestamp: 1000
    })).toThrow(/project-start/)
  })

  it('readMarkersFile throws if file missing', () => {
    expect(() => readMarkersFile(tmp)).toThrow(/not found/i)
  })
})
