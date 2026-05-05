import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ShotListContext } from './types.js'

const HERE = dirname(fileURLToPath(import.meta.url))

const findTemplatePath = (): string => {
  // Walk up from packages/film-assets/src to repo root → docs/films
  let dir = HERE
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, 'docs/films/shot-list-template.md')
    try {
      readFileSync(candidate, 'utf8')
      return candidate
    } catch {
      dir = resolve(dir, '..')
    }
  }
  throw new Error('shot-list-template.md not found in repo')
}

const formatTopFiles = (files: string[]): string => {
  if (files.length === 0) return '_No top files detected — narrative may be too short._'
  return files.map((f) => `- \`${f}\``).join('\n')
}

const formatTopCommits = (
  commits: { sha: string; message: string }[]
): string => {
  if (commits.length === 0) return '_No top commits detected._'
  return commits
    .map((c) => `- \`${c.sha}\` — ${c.message}`)
    .join('\n')
}

export const generateShotList = (ctx: ShotListContext): string => {
  const template = readFileSync(findTemplatePath(), 'utf8')
  return template
    .replaceAll('{{projectName}}', ctx.projectName)
    .replaceAll('{{punchline}}', ctx.punchline)
    .replaceAll('{{liveUrl}}', ctx.liveUrl ?? 'your project')
    .replace('{{topFiles}}', formatTopFiles(ctx.topFiles))
    .replace('{{topCommits}}', formatTopCommits(ctx.topCommits))
}
