import { describe, it, expect } from 'vitest'
import {
  buildVoiceoverPrompt,
  validateVoiceoverScript
} from '../src/voiceover-script.js'
import type { RepoMetadata } from '../src/types.js'

const meta: RepoMetadata = {
  projectName: 'duels',
  punchline: '9 days · 1 multiplayer game · 1v1',
  subtitle: 'fastduels.com',
  techStack: ['SvelteKit', 'Cloudflare', 'PartyKit'],
  startTs: '2026-04-26T11:37:23.634Z',
  endTs: '2026-05-05T20:13:46.492Z'
}

describe('buildVoiceoverPrompt', () => {
  it('embeds project name, punchline, subtitle', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toContain('duels')
    expect(prompt).toContain('9 days')
    expect(prompt).toContain('fastduels.com')
  })

  it('mentions hook + outro structure (5s + 10s)', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toMatch(/hook/i)
    expect(prompt).toMatch(/outro/i)
  })

  it('includes nextProject in cliffhanger when provided', () => {
    const prompt = buildVoiceoverPrompt(meta, 'next-project')
    expect(prompt).toContain('next-project')
  })

  it('omits cliffhanger placeholder when nextProject undefined', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toMatch(/cliffhanger/i)
    expect(prompt).not.toContain('${nextProject}')
  })

  it('asks for JSON output', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toMatch(/json/i)
  })
})

describe('validateVoiceoverScript', () => {
  it('parses valid JSON object', () => {
    const lines = validateVoiceoverScript({
      hook: 'I gave Claude 9 days.',
      outro: 'fastduels.com is live now. Subscribe for #2.'
    })
    expect(lines.hook).toBe('I gave Claude 9 days.')
    expect(lines.outro).toContain('Subscribe')
    expect(lines.context).toBeUndefined()
  })

  it('parses valid JSON string input', () => {
    const lines = validateVoiceoverScript(
      JSON.stringify({
        hook: 'a',
        outro: 'b'
      })
    )
    expect(lines.hook).toBe('a')
  })

  it('throws on missing hook', () => {
    expect(() =>
      validateVoiceoverScript({ outro: 'b' })
    ).toThrow()
  })

  it('throws on empty outro', () => {
    expect(() =>
      validateVoiceoverScript({ hook: 'a', outro: '' })
    ).toThrow()
  })
})
