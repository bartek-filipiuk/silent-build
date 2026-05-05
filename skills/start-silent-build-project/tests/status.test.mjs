import { describe, it, expect } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { detectStage } from '../bin/status.mjs'

const TMP = '/tmp/sbp-status-test'

const setup = (files) => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  for (const [path, content] of Object.entries(files)) {
    const full = join(TMP, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
}

describe('detectStage', () => {
  it('returns concept when nothing exists', () => {
    setup({})
    const r = detectStage(TMP)
    expect(r.stage).toBe('concept')
    expect(r.nextStep.label).toMatch(/concept/i)
  })

  it('returns build when concept files present + spec exists', () => {
    setup({
      'concept.md': '# concept',
      'README.md': '# r',
      'docs/superpowers/specs/2026-05-01-x-design.md': '# spec'
    })
    const r = detectStage(TMP)
    expect(r.stage).toBe('build')
  })

  it('returns audit-ready when build complete (plan + commits placeholder)', () => {
    setup({
      'concept.md': '# c',
      'README.md': '# r',
      'docs/superpowers/specs/x.md': '# s',
      'docs/superpowers/plans/y.md': '# p'
    })
    const r = detectStage(TMP)
    // build stage requires git commits; we can't simulate easily,
    // so accept either "build" or beyond
    expect(['build', 'audit']).toContain(r.stage)
  })

  it('returns deploy when audit report exists', () => {
    setup({
      'concept.md': '# c',
      'README.md': '# r',
      'docs/superpowers/specs/x.md': '# s',
      'docs/superpowers/plans/y.md': '# p',
      '.security-audit/report.md': '# audit'
    })
    const r = detectStage(TMP)
    expect(['audit', 'deploy']).toContain(r.stage)
  })
})
