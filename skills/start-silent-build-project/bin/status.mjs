#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const conceptNextStep = (projectRoot) => {
  if (!existsSync(join(projectRoot, 'concept.md'))) {
    return {
      label: 'Write concept.md — 1-page product brief (what + why + tech stack)',
      command: 'echo "# concept" > concept.md && $EDITOR concept.md'
    }
  }
  if (!existsSync(join(projectRoot, 'README.md'))) {
    return {
      label: 'Write README.md — project name, status, eventual live URL',
      command: '$EDITOR README.md'
    }
  }
  if (!hasGlob(join(projectRoot, 'docs/superpowers/specs'), '.md')) {
    return {
      label:
        'Open Claude Code and invoke `superpowers:brainstorming` on concept.md → produces design spec in docs/superpowers/specs/',
      command: 'claude  # then: read concept.md and brainstorm the design'
    }
  }
  return {
    label: 'Concept complete — proceed to Build stage',
    command: ''
  }
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
      nextStep: conceptNextStep(projectRoot)
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

// Detect direct invocation. Resolve symlinks on argv[1] so this works when the
// script is launched through ~/.claude/skills/<name>/bin/status.mjs (a symlink
// into the repo) — Node sets import.meta.url to the real path after resolution,
// while argv[1] keeps the symlink path, so a string compare fails.
const isInvokedDirectly = () => {
  if (!process.argv[1]) return false
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
}

if (isInvokedDirectly()) {
  main()
}
