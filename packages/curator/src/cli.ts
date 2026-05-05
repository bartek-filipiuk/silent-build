#!/usr/bin/env node
import { Command } from 'commander'
import {
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
  readdirSync
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { readMergedJsonls, findJsonlsIn } from './jsonl-reader.js'
import { preprocess } from './preprocess.js'
import { CandidatesFileSchema } from './narrative-schema.js'

const USER_CWD = process.env['INIT_CWD'] ?? process.cwd()

const slugifyProjectPath = (p: string): string =>
  p.replace(/\//g, '-').replace(/^-/, '-')

const resolveJsonlDir = (input: string): string => {
  const expanded = isAbsolute(input) ? input : resolve(USER_CWD, input)
  if (existsSync(expanded) && statSync(expanded).isDirectory()) {
    if (readdirSync(expanded).some((f) => f.endsWith('.jsonl'))) {
      return expanded
    }
    throw new Error(`No .jsonl files in ${expanded}`)
  }

  const slug = slugifyProjectPath(input)
  const candidate = join(homedir(), '.claude', 'projects', slug)
  if (existsSync(candidate)) return candidate

  throw new Error(
    `Cannot resolve jsonl dir for "${input}". Tried:\n  - ${expanded}\n  - ${candidate}`
  )
}

const program = new Command()

program
  .name('curate')
  .description(
    'Scan Claude Code jsonl session files for "best-of" narrative candidates'
  )

program
  .command('scan')
  .description('Run heuristics over jsonl(s) and write candidates.json')
  .requiredOption(
    '-p, --project <path>',
    'directory of jsonl files OR a project path that maps to ~/.claude/projects/<slug>'
  )
  .option('-o, --out <path>', 'output file', 'output/candidates.json')
  .option('--name <name>', 'project label written into candidates.json')
  .option('--cap <n>', 'max candidates', '50')
  .action(
    (opts: {
      project: string
      out: string
      name?: string
      cap: string
    }) => {
      const jsonlDir = resolveJsonlDir(opts.project)
      const sources = findJsonlsIn(jsonlDir)
      if (sources.length === 0) {
        throw new Error(`No jsonl files found in ${jsonlDir}`)
      }

      console.error(
        `[curator] scanning ${sources.length} jsonl file${sources.length === 1 ? '' : 's'} from ${jsonlDir}`
      )
      const events = readMergedJsonls(sources)
      const cap = Number.parseInt(opts.cap, 10) || 50
      const { candidates, totalEvents } = preprocess(events, cap)

      const projectName =
        opts.name ?? jsonlDir.split('/').pop() ?? 'project'

      const file = CandidatesFileSchema.parse({
        project: projectName,
        sources,
        totalEvents,
        generatedAt: new Date().toISOString(),
        candidates
      })

      const outPath = isAbsolute(opts.out)
        ? opts.out
        : resolve(USER_CWD, opts.out)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, JSON.stringify(file, null, 2) + '\n', 'utf8')

      console.error(
        `[curator] ${candidates.length} candidates from ${totalEvents} events → ${outPath}`
      )
      const tagCounts = candidates.reduce<Record<string, number>>(
        (acc, c) => {
          acc[c.tag] = (acc[c.tag] ?? 0) + 1
          return acc
        },
        {}
      )
      const summary = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t}:${n}`)
        .join(' · ')
      console.error(`[curator] tags: ${summary}`)
    }
  )

program.parseAsync().catch((err) => {
  console.error(`[curator] error: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
