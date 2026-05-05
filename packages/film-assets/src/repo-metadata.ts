import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findJsonlsIn, readMergedJsonls } from '@silent-build/curator/jsonl-reader'
import { RepoMetadataSchema, type RepoMetadata } from './types.js'

const VIRAL_FRAMEWORK_KEYWORDS: Record<string, string> = {
  svelte: 'SvelteKit',
  '@sveltejs/kit': 'SvelteKit',
  next: 'Next.js',
  react: 'React',
  vue: 'Vue',
  remix: '@remix-run',
  '@remix-run/dev': 'Remix',
  cloudflare: 'Cloudflare',
  '@cloudflare/workers-types': 'Cloudflare',
  partykit: 'PartyKit',
  partysocket: 'PartyKit',
  vite: 'Vite',
  remotion: 'Remotion',
  prisma: 'Prisma',
  drizzle: 'Drizzle',
  'better-auth': 'Better Auth',
  vercel: 'Vercel',
  supabase: 'Supabase',
  fastify: 'Fastify',
  hono: 'Hono',
  trpc: 'tRPC'
}

const URL_RX = /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?/i

const readJson = (path: string): Record<string, unknown> | null => {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

const extractTechStack = (pkg: Record<string, unknown>): string[] => {
  const deps = {
    ...((pkg['dependencies'] ?? {}) as Record<string, string>),
    ...((pkg['devDependencies'] ?? {}) as Record<string, string>)
  }
  const matched = new Set<string>()
  for (const dep of Object.keys(deps)) {
    const lower = dep.toLowerCase()
    for (const [keyword, label] of Object.entries(VIRAL_FRAMEWORK_KEYWORDS)) {
      if (lower.includes(keyword)) {
        matched.add(label)
        break
      }
    }
  }
  return Array.from(matched).slice(0, 7)
}

const extractSubtitle = (
  readme: string | null,
  pkgName: string,
  repoPath: string
): string => {
  if (readme) {
    const match = readme.match(URL_RX)
    if (match) return match[0]
    const firstLine = readme.split('\n').find(
      (l) => l.trim().length > 0 && !l.startsWith('#')
    )
    if (firstLine) return firstLine.trim().slice(0, 80)
  }
  return `github.com/.../${pkgName || repoPath.split('/').pop() || 'project'}`
}

const derivePunchlineHeuristic = (
  pkgName: string,
  techStack: string[],
  startTs: string,
  endTs: string
): string => {
  const days = Math.max(
    1,
    Math.ceil((Date.parse(endTs) - Date.parse(startTs)) / (24 * 3600 * 1000))
  )
  const stack = techStack[0] ?? 'TypeScript'
  return `${days} days · ${pkgName} · ${stack}`
}

export const extractRepoMetadata = (
  repoPath: string,
  jsonlDir: string
): RepoMetadata => {
  const pkg = readJson(join(repoPath, 'package.json')) ?? {}
  const projectName =
    (typeof pkg['name'] === 'string' ? pkg['name'] : '') ||
    repoPath.split('/').pop() ||
    'project'

  const readmePath = join(repoPath, 'README.md')
  const readme = existsSync(readmePath)
    ? readFileSync(readmePath, 'utf8')
    : null

  const techStack = extractTechStack(pkg)
  const subtitle = extractSubtitle(readme, projectName, repoPath)

  const sources = findJsonlsIn(jsonlDir)
  const events = readMergedJsonls(sources)
  const startTs = events[0]?.isoTs ?? new Date().toISOString()
  const endTs = events[events.length - 1]?.isoTs ?? startTs

  const punchline = derivePunchlineHeuristic(
    projectName,
    techStack,
    startTs,
    endTs
  )

  return RepoMetadataSchema.parse({
    projectName,
    punchline,
    subtitle,
    techStack: techStack.length > 0 ? techStack : ['TypeScript'],
    startTs,
    endTs
  })
}
