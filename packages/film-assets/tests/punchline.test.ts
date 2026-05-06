import { describe, it, expect } from 'vitest'
import { derivePunchline } from '../src/punchline.js'

describe('derivePunchline', () => {
  it('produces "X days · project · stack" for small projects', () => {
    const out = derivePunchline({
      projectName: 'tiny',
      techStack: ['SvelteKit', 'Cloudflare'],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-04T10:00:00.000Z'
    })
    expect(out).toContain('3 days')
    expect(out).toContain('tiny')
    expect(out).toContain('SvelteKit')
  })

  it('rounds up partial days', () => {
    const out = derivePunchline({
      projectName: 'p',
      techStack: ['React'],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-02T22:00:00.000Z'
    })
    expect(out).toContain('2 days')
  })

  it('falls back when techStack empty', () => {
    const out = derivePunchline({
      projectName: 'p',
      techStack: [],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-02T10:00:00.000Z'
    })
    expect(out).toContain('TypeScript')
  })

  it('caps output at 120 chars', () => {
    const out = derivePunchline({
      projectName: 'x'.repeat(40),
      techStack: ['SvelteKit', 'Cloudflare', 'PartyKit'],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-09T10:00:00.000Z'
    })
    expect(out.length).toBeLessThanOrEqual(120)
  })
})
