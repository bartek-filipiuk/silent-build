#!/usr/bin/env node
/**
 * Auto-detect Claude Code jsonl directory for the current working directory.
 *
 * Claude Code stores per-project session jsonls in:
 *   ~/.claude/projects/-<absolute-cwd-with-slashes-replaced-by-dashes>/
 *
 * For example, CWD `/home/bartek/video-projects/test-video-project` maps to:
 *   ~/.claude/projects/-home-bartek-video-projects-test-video-project/
 *
 * This helper returns the encoded path + a slug + basic stats so the
 * silent-build skill can offer "I found X session in Y, go?" without
 * asking the user for an explicit path.
 *
 * Usage:
 *   node skills/silent-build/bin/auto-detect.mjs [cwd]
 *
 * Output (stdout, JSON):
 *   {
 *     jsonlDir: "/home/bartek/.claude/projects/-home-bartek-...",
 *     slug: "outdoorthings",
 *     sessionsCount: 1,
 *     eventCount: 1195,
 *     startTs: "2026-05-10T13:07:35.655Z" | null,
 *     endTs:   "2026-05-11T14:49:51.227Z" | null,
 *     repoPath: "/home/bartek/experiment-projects/outdoorthings" | null
 *   }
 * or:
 *   { error: "..." }
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, basename, resolve, dirname } from 'node:path'
import { homedir } from 'node:os'

const HOME = homedir()
const CLAUDE_PROJECTS_DIR = join(HOME, '.claude', 'projects')

const encodeCwdToProjectKey = (cwd) =>
  '-' + resolve(cwd).replace(/^\//, '').replace(/\//g, '-')

const looksLikeRepoOrProjectDir = (path) => {
  if (!existsSync(path)) return false
  try {
    const s = statSync(path)
    if (!s.isDirectory()) return false
    return existsSync(join(path, '.git')) || existsSync(join(path, 'package.json'))
  } catch {
    return false
  }
}

/** Find a likely repo path matching the slug. Tries common locations. */
const findRepoForSlug = (slug) => {
  const candidates = [
    join(HOME, 'video-projects', slug),
    join(HOME, 'projects', slug),
    join(HOME, 'experiment-projects', slug),
    join(HOME, slug)
  ]
  for (const p of candidates) {
    if (looksLikeRepoOrProjectDir(p)) return p
  }
  return null
}

const peekTimestamps = (jsonlPath) => {
  try {
    const content = readFileSync(jsonlPath, 'utf8')
    const lines = content.split('\n').filter((l) => l.trim())
    let startTs = null
    let endTs = null
    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        const ts = obj.timestamp
        if (typeof ts === 'string') {
          if (!startTs) startTs = ts
          endTs = ts
        }
      } catch {}
    }
    return { startTs, endTs, eventCount: lines.length }
  } catch {
    return { startTs: null, endTs: null, eventCount: 0 }
  }
}

const main = () => {
  const cwd = process.argv[2] ?? process.cwd()
  const projectKey = encodeCwdToProjectKey(cwd)
  const jsonlDir = join(CLAUDE_PROJECTS_DIR, projectKey)

  if (!existsSync(jsonlDir)) {
    console.log(
      JSON.stringify({
        error: `No Claude Code project dir for CWD: ${cwd} (expected ${jsonlDir})`,
        cwd,
        expectedJsonlDir: jsonlDir
      })
    )
    process.exit(0)
  }

  let entries
  try {
    entries = readdirSync(jsonlDir)
  } catch (e) {
    console.log(JSON.stringify({ error: `cannot read ${jsonlDir}: ${e?.message ?? e}` }))
    process.exit(0)
  }

  const jsonls = entries.filter((f) => f.endsWith('.jsonl'))
  if (jsonls.length === 0) {
    console.log(
      JSON.stringify({
        error: `Found project dir ${jsonlDir} but no .jsonl files inside`,
        jsonlDir,
        contents: entries.slice(0, 10)
      })
    )
    process.exit(0)
  }

  // Aggregate timestamps + event count across all jsonls.
  let earliest = null
  let latest = null
  let totalEvents = 0
  for (const f of jsonls) {
    const { startTs, endTs, eventCount } = peekTimestamps(join(jsonlDir, f))
    totalEvents += eventCount
    if (startTs && (!earliest || startTs < earliest)) earliest = startTs
    if (endTs && (!latest || endTs > latest)) latest = endTs
  }

  // Slug derived from the CWD basename (most natural).
  const slug = basename(cwd)
  const repoPath = findRepoForSlug(slug)

  console.log(
    JSON.stringify(
      {
        jsonlDir,
        slug,
        sessionsCount: jsonls.length,
        eventCount: totalEvents,
        startTs: earliest,
        endTs: latest,
        repoPath
      },
      null,
      2
    )
  )
}

main()
