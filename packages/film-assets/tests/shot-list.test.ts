import { describe, it, expect } from 'vitest'
import { generateShotList } from '../src/shot-list.js'
import type { ShotListContext } from '../src/types.js'

const ctx: ShotListContext = {
  projectName: 'duels',
  punchline: '9 days · 1 multiplayer game · 1v1',
  liveUrl: 'fastduels.com',
  topFiles: [
    'apps/web/src/routes/play/+page.svelte',
    'apps/web/messages/pl.json'
  ],
  topCommits: [
    { sha: '1647088', message: 'feat(multiplayer): enable categories' },
    { sha: 'f65a9f5', message: 'feat(domain): fastduels.com PRIMARY' }
  ]
}

describe('generateShotList', () => {
  it('substitutes projectName and punchline', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('duels — film shot list')
    expect(out).toContain('9 days · 1 multiplayer game · 1v1')
  })

  it('substitutes liveUrl in CTA shot', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('fastduels.com')
  })

  it('lists topFiles in B-roll section', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('apps/web/src/routes/play/+page.svelte')
    expect(out).toContain('apps/web/messages/pl.json')
  })

  it('lists topCommits with sha + message', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('1647088')
    expect(out).toContain('feat(domain): fastduels.com PRIMARY')
  })

  it('handles missing liveUrl gracefully', () => {
    const ctx2 = { ...ctx, liveUrl: undefined }
    const out = generateShotList(ctx2)
    expect(out).not.toContain('{{liveUrl}}')
    expect(out).toContain('your project')
  })

  it('handles empty topFiles', () => {
    const ctx2 = { ...ctx, topFiles: [] }
    const out = generateShotList(ctx2)
    expect(out).not.toContain('{{topFiles}}')
    expect(out).toContain('No top files detected')
  })
})
