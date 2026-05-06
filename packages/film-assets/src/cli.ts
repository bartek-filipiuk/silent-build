#!/usr/bin/env node
import { Command } from 'commander'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { runDoctor } from './doctor.js'
import { renderVoiceover } from './elevenlabs.js'
import { extractRepoMetadata } from './repo-metadata.js'
import { generateShotList } from './shot-list.js'
import { TtsConfigSchema } from './types.js'
import type { ShotListContext } from './types.js'
import { validateVoiceoverScript } from './voiceover-script.js'

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

program
  .command('tts')
  .description('Synthesize voiceover MP3s via ElevenLabs')
  .requiredOption('-s, --script <path>', 'voiceover-script.json path')
  .requiredOption('-o, --out <dir>', 'output directory for mp3 files')
  .option(
    '-v, --voice <id>',
    'ElevenLabs voice id (overrides assets/voices/bartek-clone-id.txt)'
  )
  .option('-m, --model <id>', 'ElevenLabs model id', 'eleven_multilingual_v2')
  .action(
    async (opts: {
      script: string
      out: string
      voice?: string
      model: string
    }) => {
      const apiKey = process.env['ELEVENLABS_API_KEY']
      if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set')

      const scriptPath = isAbsolute(opts.script)
        ? opts.script
        : resolve(USER_CWD, opts.script)
      const lines = validateVoiceoverScript(
        JSON.parse(readFileSync(scriptPath, 'utf8'))
      )

      let voiceId = opts.voice
      if (!voiceId) {
        const voiceFile = resolve(
          USER_CWD,
          'assets/voices/bartek-clone-id.txt'
        )
        if (existsSync(voiceFile)) {
          voiceId = readFileSync(voiceFile, 'utf8').trim()
        }
      }
      if (!voiceId) {
        throw new Error(
          'no voice id (use --voice or set assets/voices/bartek-clone-id.txt)'
        )
      }

      const config = TtsConfigSchema.parse({
        voiceId,
        modelId: opts.model,
        apiKey
      })

      const outDir = isAbsolute(opts.out)
        ? opts.out
        : resolve(USER_CWD, opts.out)

      const paths = await renderVoiceover(lines, config, outDir)
      console.error(`[film-assets] tts → ${JSON.stringify(paths, null, 2)}`)
    }
  )

program
  .command('shotlist')
  .description('Generate per-project shot-list.md from metadata + narrative')
  .requiredOption('-m, --metadata <path>', 'metadata.json path')
  .option('-n, --narrative <path>', 'narrative.json path (for top files/commits)')
  .requiredOption('-o, --out <path>', 'shot-list.md output path')
  .action(
    (opts: { metadata: string; narrative?: string; out: string }) => {
      const metaPath = isAbsolute(opts.metadata)
        ? opts.metadata
        : resolve(USER_CWD, opts.metadata)
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'))

      let topFiles: string[] = []
      let topCommits: { sha: string; message: string }[] = []
      if (opts.narrative) {
        const narrativePath = isAbsolute(opts.narrative)
          ? opts.narrative
          : resolve(USER_CWD, opts.narrative)
        const narrative = JSON.parse(readFileSync(narrativePath, 'utf8'))
        topFiles = (narrative.topFiles ?? []).slice(0, 3)
        topCommits = (narrative.topCommits ?? []).slice(0, 3)
      }

      const ctx: ShotListContext = {
        projectName: meta.projectName,
        punchline: meta.punchline,
        liveUrl: meta.subtitle,
        topFiles,
        topCommits
      }
      const md = generateShotList(ctx)

      const outPath = isAbsolute(opts.out)
        ? opts.out
        : resolve(USER_CWD, opts.out)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, md, 'utf8')
      console.error(`[film-assets] shot list → ${outPath}`)
    }
  )

program
  .command('generate')
  .description('Run full per-project asset pipeline (metadata → shotlist; tts skipped if no API key)')
  .requiredOption('-r, --repo <path>', 'project repo root')
  .requiredOption('-j, --jsonl-dir <path>', 'session jsonl directory')
  .requiredOption('-o, --out <dir>', 'output assets directory')
  .option('-n, --next <project>', 'next project name for cliffhanger')
  .action(
    async (opts: {
      repo: string
      jsonlDir: string
      out: string
      next?: string
    }) => {
      const repoAbs = isAbsolute(opts.repo) ? opts.repo : resolve(USER_CWD, opts.repo)
      const jsonlDir = resolveJsonlDir(opts.jsonlDir)
      const outDir = isAbsolute(opts.out) ? opts.out : resolve(USER_CWD, opts.out)
      mkdirSync(outDir, { recursive: true })

      const meta = extractRepoMetadata(repoAbs, jsonlDir)
      const metaPath = join(outDir, 'metadata.json')
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n')
      console.error(`[generate] metadata → ${metaPath}`)

      const ctx: ShotListContext = {
        projectName: meta.projectName,
        punchline: meta.punchline,
        liveUrl: meta.subtitle,
        topFiles: [],
        topCommits: []
      }
      const shotPath = join(outDir, 'shot-list.md')
      writeFileSync(shotPath, generateShotList(ctx), 'utf8')
      console.error(`[generate] shot list → ${shotPath}`)

      console.error(
        '[generate] next steps:\n' +
        '  1. Use /generate-voiceover-script in CC with metadata.json → write voiceover-script.json next to it\n' +
        '  2. ELEVENLABS_API_KEY=... pnpm assets:tts --script <out>/voiceover-script.json --out <out>/voiceover\n' +
        '  3. pnpm render:projectintro --project <out> (and stats/commitcard/codezoom)'
      )
    }
  )

program
  .command('doctor')
  .description('Verify dependencies, music files, env vars')
  .action(() => {
    const result = runDoctor({
      musicDir: resolve(USER_CWD, 'assets/music'),
      voiceFile: resolve(USER_CWD, 'assets/voices/bartek-clone-id.txt'),
      requireFfmpeg: true,
      env: { ELEVENLABS_API_KEY: process.env['ELEVENLABS_API_KEY'] }
    })
    for (const check of result.checks) {
      const icon =
        check.status === 'ok' ? '✓' : check.status === 'warn' ? '⚠' : '✗'
      console.log(`${icon} ${check.name} — ${check.message}`)
    }
    console.log(`\noverall: ${result.overall.toUpperCase()}`)
    if (result.overall === 'fail') process.exit(1)
  })

program.parseAsync().catch((err) => {
  console.error(`[film-assets] error: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
