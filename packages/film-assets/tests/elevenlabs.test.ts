import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { renderVoiceover } from '../src/elevenlabs.js'
import type { TtsConfig, VoiceoverLines } from '../src/types.js'

const TMP = '/tmp/elevenlabs-test'
const config: TtsConfig = {
  voiceId: 'voice123',
  modelId: 'eleven_multilingual_v2',
  apiKey: 'sk_test'
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  vi.restoreAllMocks()
})

describe('renderVoiceover', () => {
  it('writes hook and outro mp3 files', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(fakeBytes, { status: 200 })
      )
    )

    const lines: VoiceoverLines = {
      hook: 'I gave Claude 9 days.',
      outro: 'Subscribe.'
    }
    const result = await renderVoiceover(lines, config, TMP)

    expect(result.hookPath).toBe(join(TMP, 'hook.mp3'))
    expect(result.outroPath).toBe(join(TMP, 'outro.mp3'))
    expect(result.contextPath).toBeUndefined()
  })

  it('writes context.mp3 when context line provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 }))
    )

    const lines: VoiceoverLines = {
      hook: 'a',
      context: 'b',
      outro: 'c'
    }
    const result = await renderVoiceover(lines, config, TMP)

    expect(result.contextPath).toBe(join(TMP, 'context.mp3'))
  })

  it('throws with status text on non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('quota exceeded', { status: 401 })
      )
    )

    const lines: VoiceoverLines = { hook: 'a', outro: 'b' }
    await expect(renderVoiceover(lines, config, TMP)).rejects.toThrow(
      /401/
    )
  })

  it('sends voiceId in URL and apiKey in xi-api-key header', async () => {
    const fetchMock = vi.fn(
      async () => new Response(new Uint8Array([1]), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const lines: VoiceoverLines = { hook: 'a', outro: 'b' }
    await renderVoiceover(lines, config, TMP)

    expect(fetchMock).toHaveBeenCalled()
    const call = fetchMock.mock.calls[0]
    expect(String(call?.[0])).toContain('voice123')
    const init = call?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['xi-api-key']).toBe('sk_test')
  })
})
