import { describe, it, expect } from 'vitest'
import { runDoctor } from '../src/doctor.js'

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
})
