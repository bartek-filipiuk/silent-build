#!/usr/bin/env node
import { Command } from 'commander'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { extractRepoMetadata } from './repo-metadata.js'

const USER_CWD = process.env['INIT_CWD'] ?? process.cwd()

const slugifyProjectPath = (p: string): string =>
  p.replace(/\//g, '-').replace(/^-/, '-')

const resolveJsonlDir = (input: string): string => {
  const expanded = isAbsolute(input) ? input : resolve(USER_CWD, input)
  if (existsSync(expanded)) return expanded
  const slug = slugifyProjectPath(input)
  const candidate = join(homedir(), '.claude', 'projects', slug)
  if (existsSync(candidate)) return candidate
  throw new Error(
    `Cannot resolve jsonl dir for "${input}". Tried:\n  - ${expanded}\n  - ${candidate}`
  )
}

const program = new Command()
program.name('film-assets').description('Generate per-film assets')

program
  .command('metadata')
  .description('Extract repo metadata (project name, punchline, tech stack, ts bounds)')
  .requiredOption('-r, --repo <path>', 'repo root (with package.json + README.md)')
  .requiredOption('-j, --jsonl-dir <path>', 'directory of session jsonl files')
  .option('-o, --out <path>', 'output JSON path (default: stdout)')
  .action((opts: { repo: string; jsonlDir: string; out?: string }) => {
    const repo = isAbsolute(opts.repo) ? opts.repo : resolve(USER_CWD, opts.repo)
    const jsonlDir = resolveJsonlDir(opts.jsonlDir)
    const meta = extractRepoMetadata(repo, jsonlDir)
    const json = JSON.stringify(meta, null, 2) + '\n'
    if (opts.out) {
      const outPath = isAbsolute(opts.out) ? opts.out : resolve(USER_CWD, opts.out)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, json, 'utf8')
      console.error(`[film-assets] metadata → ${outPath}`)
    } else {
      process.stdout.write(json)
    }
  })

program.parseAsync().catch((err) => {
  console.error(`[film-assets] error: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
