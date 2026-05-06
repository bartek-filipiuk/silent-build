#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const STAGES = [
  'concept',
  'build',
  'audit',
  'deploy',
  'demo',
  'pipeline'
]

const hasGlob = (dir, ext) => {
  if (!existsSync(dir)) return false
  try {
    return readdirSync(dir).some((f) => f.endsWith(ext))
  } catch {
    return false
  }
}

const conceptDone = (root) =>
  existsSync(join(root, 'concept.md')) &&
  existsSync(join(root, 'README.md')) &&
  hasGlob(join(root, 'docs/superpowers/specs'), '.md')

const buildDone = (root) =>
  conceptDone(root) &&
  hasGlob(join(root, 'docs/superpowers/plans'), '.md')

const auditDone = (root) =>
  buildDone(root) && existsSync(join(root, '.security-audit/report.md'))

const deployDone = (root) => {
  if (!auditDone(root)) return false
  const readme = existsSync(join(root, 'README.md'))
    ? readFileSync(join(root, 'README.md'), 'utf8')
    : ''
  return /https?:\/\//.test(readme)
}

const demoDone = (silentBuildRoot, projectName) => {
  if (!silentBuildRoot) return false
  const out = join(silentBuildRoot, 'output')
  if (!existsSync(out)) return false
  const files = readdirSync(out)
  return (
    files.some(
      (f) => f.startsWith(`${projectName}-demo.`)
    ) &&
    files.some((f) => f.startsWith(`${projectName}-face.`))
  )
}

const pipelineDone = (silentBuildRoot, projectName) => {
  if (!silentBuildRoot || !demoDone(silentBuildRoot, projectName)) return false
  const out = join(silentBuildRoot, 'output')
  return (
    existsSync(join(out, `${projectName}-narrative.json`)) &&
    existsSync(join(out, `${projectName}-segments/manifest.json`))
  )
}

export const detectStage = (
  projectRoot,
  silentBuildRoot = null,
  projectName = ''
) => {
  if (!conceptDone(projectRoot)) {
    return {
      stage: 'concept',
      completedSteps: [],
      nextStep: {
        label: 'Write concept.md and start a brainstorming CC session',
        command: 'echo "# concept" > concept.md && claude'
      }
    }
  }
  if (!buildDone(projectRoot)) {
    return {
      stage: 'build',
      completedSteps: ['concept'],
      nextStep: {
        label:
          'Invoke superpowers:writing-plans on your design spec to produce a plan',
        command: 'claude'
      }
    }
  }
  if (!auditDone(projectRoot)) {
    return {
      stage: 'audit',
      completedSteps: ['concept', 'build'],
      nextStep: {
        label: 'Run a security audit in a NEW CC session',
        command: 'claude  # then: do a security audit on this codebase'
      }
    }
  }
  if (!deployDone(projectRoot)) {
    return {
      stage: 'deploy',
      completedSteps: ['concept', 'build', 'audit'],
      nextStep: {
        label: 'Deploy and add live URL to README.md',
        command: 'wrangler deploy  # or vercel/fly/etc'
      }
    }
  }
  if (!demoDone(silentBuildRoot, projectName)) {
    return {
      stage: 'demo',
      completedSteps: ['concept', 'build', 'audit', 'deploy'],
      nextStep: {
        label: 'Record OBS demo + face takes per shot-list',
        command: 'pnpm assets:shotlist --metadata <m> --out docs/films/<x>-shot-list.md'
      }
    }
  }
  if (!pipelineDone(silentBuildRoot, projectName)) {
    return {
      stage: 'pipeline',
      completedSteps: ['concept', 'build', 'audit', 'deploy', 'demo'],
      nextStep: {
        label: 'Run silent-build pipeline (curator → render → assets)',
        command: 'pnpm curate:scan ...; /curate-narrative; pnpm render:narrative ...'
      }
    }
  }
  return {
    stage: 'done',
    completedSteps: STAGES,
    nextStep: {
      label: 'All stages complete. Publish to YT.',
      command: ''
    }
  }
}

const main = () => {
  const projectRoot = process.argv[2] ?? process.cwd()
  const silentBuildRoot = process.argv[3] ?? null
  const projectName = process.argv[4] ?? ''
  const r = detectStage(projectRoot, silentBuildRoot, projectName)
  console.log(JSON.stringify(r, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
