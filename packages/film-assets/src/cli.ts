#!/usr/bin/env node
import { Command } from 'commander'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { renderVoiceover } from './elevenlabs.js'
import { extractRepoMetadata } from './repo-metadata.js'
import { TtsConfigSchema } from './types.js'
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

program.parseAsync().catch((err) => {
  console.error(`[film-assets] error: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
