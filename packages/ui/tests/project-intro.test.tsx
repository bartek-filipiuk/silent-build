import { describe, it, expect } from 'vitest'
import { ProjectIntro } from '../src/compositions/ProjectIntro.js'

describe('ProjectIntro', () => {
  it('is exported and is a function component', () => {
    expect(typeof ProjectIntro).toBe('function')
    expect(ProjectIntro.name).toBe('ProjectIntro')
  })

  it('typeof default props matches expected shape', () => {
    const sample = {
      projectName: 'duels',
      punchline: '9 days',
      subtitle: 'fastduels.com',
      techStack: ['SvelteKit'],
      startTs: '2026-04-01T00:00:00.000Z'
    } satisfies Parameters<typeof ProjectIntro>[0]
    expect(sample.projectName).toBe('duels')
  })
})
