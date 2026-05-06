import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runDoctor } from '../src/doctor.js'

const TMP = '/tmp/doctor-music-test'
const seedMusic = (files: string[]) => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  for (const f of files) writeFileSync(join(TMP, f), '')
}

describe('runDoctor', () => {
  it('reports each check with name and status', () => {
    const result = runDoctor({
      musicDir: '/nonexistent',
      voiceFile: '/nonexistent',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: undefined }
    })
    expect(result.checks.length).toBeGreaterThan(0)
    for (const c of result.checks) {
      expect(c.name.length).toBeGreaterThan(0)
      expect(['ok', 'warn', 'fail']).toContain(c.status)
    }
  })

  it('flags missing music files as warn (not fail)', () => {
    const result = runDoctor({
      musicDir: '/tmp/definitely-not-here-' + Date.now(),
      voiceFile: '/tmp/x',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: undefined }
    })
    const music = result.checks.find((c) => c.name.includes('music'))
    expect(music?.status).toBe('warn')
  })

  it('passes ELEVENLABS_API_KEY check when set', () => {
    const result = runDoctor({
      musicDir: '/tmp/x',
      voiceFile: '/tmp/x',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: 'sk_test' }
    })
    const apiKey = result.checks.find((c) =>
      c.name.includes('ELEVENLABS_API_KEY')
    )
    expect(apiKey?.status).toBe('ok')
  })

  it('overall=fail when any check is fail', () => {
    const result = runDoctor({
      musicDir: '/tmp/x',
      voiceFile: '/tmp/x',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: undefined }
    })
    if (result.checks.some((c) => c.status === 'fail')) {
      expect(result.overall).toBe('fail')
    }
  })

  describe('music file extension flexibility', () => {
    afterEach(() => {
      rmSync(TMP, { recursive: true, force: true })
    })

    it('accepts all 4 files as .mp3', () => {
      seedMusic([
        'intro-chill-60s.mp3',
        'build-hustle-90s.mp3',
        'climax-drop-30s.mp3',
        'outro-celebratory-45s.mp3'
      ])
      const r = runDoctor({
        musicDir: TMP,
        voiceFile: '/tmp/x',
        requireFfmpeg: false,
        env: { ELEVENLABS_API_KEY: 'sk_test' }
      })
      const music = r.checks.find((c) => c.name.includes('music'))
      expect(music?.status).toBe('ok')
    })

    it('accepts mixed .wav and .mp3', () => {
      seedMusic([
        'intro-chill-60s.wav',
        'build-hustle-90s.mp3',
        'climax-drop-30s.wav',
        'outro-celebratory-45s.mp3'
      ])
      const r = runDoctor({
        musicDir: TMP,
        voiceFile: '/tmp/x',
        requireFfmpeg: false,
        env: { ELEVENLABS_API_KEY: 'sk_test' }
      })
      const music = r.checks.find((c) => c.name.includes('music'))
      expect(music?.status).toBe('ok')
    })

    it('warns when only 3 of 4 present (any extension)', () => {
      seedMusic([
        'intro-chill-60s.mp3',
        'build-hustle-90s.wav',
        'outro-celebratory-45s.mp3'
        // climax-drop-30s missing in any extension
      ])
      const r = runDoctor({
        musicDir: TMP,
        voiceFile: '/tmp/x',
        requireFfmpeg: false,
        env: { ELEVENLABS_API_KEY: 'sk_test' }
      })
      const music = r.checks.find((c) => c.name.includes('music'))
      expect(music?.status).toBe('warn')
      expect(music?.message).toContain('climax-drop-30s')
    })
  })
})
