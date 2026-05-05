import { describe, it, expect } from 'vitest'
import {
  RepoMetadataSchema,
  VoiceoverLinesSchema,
  TtsConfigSchema
} from '../src/types.js'

describe('RepoMetadataSchema', () => {
  const valid = {
    projectName: 'duels',
    punchline: '9 days · 1 multiplayer game · 1v1',
    subtitle: 'fastduels.com',
    techStack: ['SvelteKit', 'Cloudflare', 'PartyKit'],
    startTs: '2026-04-26T11:37:23.634Z',
    endTs: '2026-05-05T20:13:46.492Z'
  }

  it('accepts a valid metadata', () => {
    expect(() => RepoMetadataSchema.parse(valid)).not.toThrow()
  })

  it('rejects empty projectName', () => {
    expect(() =>
      RepoMetadataSchema.parse({ ...valid, projectName: '' })
    ).toThrow()
  })

  it('rejects punchline >120 chars', () => {
    expect(() =>
      RepoMetadataSchema.parse({ ...valid, punchline: 'x'.repeat(121) })
    ).toThrow()
  })

  it('rejects techStack longer than 7', () => {
    expect(() =>
      RepoMetadataSchema.parse({
        ...valid,
        techStack: Array(8).fill('X')
      })
    ).toThrow()
  })
})

describe('VoiceoverLinesSchema', () => {
  it('accepts hook + outro without context', () => {
    expect(() =>
      VoiceoverLinesSchema.parse({
        hook: 'I gave Claude 9 days.',
        outro: 'fastduels.com is live. Subscribe.'
      })
    ).not.toThrow()
  })

  it('accepts all three lines', () => {
    expect(() =>
      VoiceoverLinesSchema.parse({
        hook: 'a',
        context: 'b',
        outro: 'c'
      })
    ).not.toThrow()
  })

  it('rejects when hook is empty', () => {
    expect(() =>
      VoiceoverLinesSchema.parse({ hook: '', outro: 'x' })
    ).toThrow()
  })
})

describe('TtsConfigSchema', () => {
  it('accepts a valid config', () => {
    expect(() =>
      TtsConfigSchema.parse({
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        modelId: 'eleven_multilingual_v2',
        apiKey: 'sk_xyz'
      })
    ).not.toThrow()
  })
})
