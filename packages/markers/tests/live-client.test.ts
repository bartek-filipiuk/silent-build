import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notifyLive } from '../src/live-client.js'

const originalFetch = globalThis.fetch

describe('notifyLive', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('posts /api/trigger/intro for project-start', async () => {
    await notifyLive('project-start', { url: 'http://x' })
    expect(globalThis.fetch).toHaveBeenCalledWith('http://x/api/trigger/intro', { method: 'POST' })
  })

  it('posts /api/trigger/phase?n=2 for backend-start', async () => {
    await notifyLive('backend-start', { url: 'http://x' })
    expect(globalThis.fetch).toHaveBeenCalledWith('http://x/api/trigger/phase?n=2', { method: 'POST' })
  })

  it('posts /api/trigger/phase?n=3 for frontend-start', async () => {
    await notifyLive('frontend-start', { url: 'http://x' })
    expect(globalThis.fetch).toHaveBeenCalledWith('http://x/api/trigger/phase?n=3', { method: 'POST' })
  })

  it('posts /api/trigger/phase?n=4 for security-start', async () => {
    await notifyLive('security-start', { url: 'http://x' })
    expect(globalThis.fetch).toHaveBeenCalledWith('http://x/api/trigger/phase?n=4', { method: 'POST' })
  })

  it('returns false for polish-start (no trigger mapping)', async () => {
    const ok = await notifyLive('polish-start', { url: 'http://x' })
    expect(ok).toBe(false)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('handles server error gracefully', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 500 })) as typeof fetch
    const ok = await notifyLive('backend-start', { url: 'http://x' })
    expect(ok).toBe(false)
  })

  it('handles network error gracefully', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('ECONNREFUSED') }) as typeof fetch
    const ok = await notifyLive('backend-start', { url: 'http://x' })
    expect(ok).toBe(false)
  })
})
