#!/usr/bin/env node
import { Command } from 'commander'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition, renderFrames } from '@remotion/renderer'
import { join, resolve, isAbsolute } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { loadTimeline } from './lib/timeline-loader.js'

const program = new Command()

const USER_CWD = process.env['INIT_CWD'] ?? process.cwd()

type CompId = 'Dashboard' | 'Intro' | 'Outro' | 'PhaseTransition' | 'Thumbnail'
const ALL_COMPS: CompId[] = ['Dashboard', 'Intro', 'Outro', 'PhaseTransition', 'Thumbnail']

const outputStem = (comp: CompId): string => {
  switch (comp) {
    case 'Dashboard': return 'dashboard'
    case 'Intro': return 'intro'
    case 'Outro': return 'outro'
    case 'PhaseTransition': return 'phase-transition'
    case 'Thumbnail': return 'thumbnail'
  }
}

program
  .name('render')
  .description('Render silent-build overlay compositions from timeline.json')
  .requiredOption('-p, --project <dir>', 'project output dir (contains timeline.json)')
  .option('-c, --composition <id>', `composition id: ${ALL_COMPS.join(' | ')}`, 'Dashboard')
  .option('--format <format>', 'mov | png | both', 'both')
  .option('--fps <n>', 'frames per second', '60')
  .option('--max-frames <n>', 'cap render to at most N frames (useful for smoke tests)')
  .option('--start-frame <n>', 'start rendering from frame N', '0')
  .option('--phase <n>', 'phase number 1-4 (for PhaseTransition)', '2')
  .option('--title <text>', 'title (for Thumbnail)', 'I built it in silence')
  .option('--episode <n>', 'episode number (for Thumbnail)')
  .action(async (opts: {
    project: string
    composition: string
    format: 'mov' | 'png' | 'both'
    fps: string
    maxFrames?: string
    startFrame: string
    phase: string
    title: string
    episode?: string
  }) => {
    const compId = opts.composition as CompId
    if (!ALL_COMPS.includes(compId)) {
      throw new Error(`Unknown composition "${opts.composition}". Valid: ${ALL_COMPS.join(', ')}`)
    }

    const projectDir = isAbsolute(opts.project) ? opts.project : resolve(USER_CWD, opts.project)
    const timelinePath = join(projectDir, 'timeline.json')
    if (!existsSync(timelinePath)) {
      throw new Error(`timeline.json not found in ${projectDir}`)
    }

    const timeline = loadTimeline(timelinePath)
    const fps = parseInt(opts.fps, 10)

    // Build inputProps per composition.
    const inputProps: Record<string, unknown> = (() => {
      switch (compId) {
        case 'Dashboard':
          return { timeline }
        case 'Intro':
          return {
            projectName: timeline.project.name,
            targetDescription: `Real session · ${timeline.metrics.promptsCount} prompts · ${timeline.metrics.filesTouched} files`,
            startingAt: new Date(timeline.project.startTs)
          }
        case 'Outro': {
          const durationMs = timeline.project.endTs - timeline.project.startTs
          return {
            projectName: timeline.project.name,
            metrics: timeline.metrics,
            durationMs,
            repoUrl: 'github.com/bartek-filipiuk/silent-build'
          }
        }
        case 'PhaseTransition': {
          const n = parseInt(opts.phase, 10) as 1 | 2 | 3 | 4
          if (![1, 2, 3, 4].includes(n)) throw new Error(`--phase must be 1-4`)
          const phase = timeline.phases[n - 1]
          if (!phase) throw new Error(`phase ${n} not found in timeline`)
          return { phase, phaseNumber: n }
        }
        case 'Thumbnail': {
          const props: Record<string, unknown> = {
            title: opts.title,
            projectName: timeline.project.name
          }
          if (opts.episode) props['episode'] = parseInt(opts.episode, 10)
          return props
        }
      }
    })()

    const entry = join(import.meta.dirname, 'Root.tsx')
    console.log(`Bundling Remotion project from ${entry}`)
    const bundleLocation = await bundle({
      entryPoint: entry,
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          extensionAlias: {
            '.js': ['.tsx', '.ts', '.js']
          }
        }
      })
    })

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compId,
      inputProps
    })

    // Duration: Dashboard pins to session length; other comps keep Root.tsx default.
    let totalFrames = composition.durationInFrames
    if (compId === 'Dashboard') {
      const durationSec = Math.ceil((timeline.project.endTs - timeline.project.startTs) / 1000)
      totalFrames = Math.max(fps, durationSec * fps)
    }

    const startFrame = parseInt(opts.startFrame, 10)
    const maxFrames = opts.maxFrames ? parseInt(opts.maxFrames, 10) : totalFrames
    const lastFrame = Math.min(totalFrames - 1, startFrame + maxFrames - 1)

    composition.durationInFrames = totalFrames
    composition.fps = fps

    const stem = outputStem(compId)

    if (opts.format === 'mov' || opts.format === 'both') {
      const movPath = join(projectDir, `${stem}.mov`)
      console.log(`Rendering ${movPath}`)
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'prores',
        proResProfile: '4444',
        outputLocation: movPath,
        inputProps,
        pixelFormat: 'yuva444p10le',
        imageFormat: 'png'
      })
      console.log(`Done: ${movPath}`)
    }

    if (opts.format === 'png' || opts.format === 'both') {
      const pngDir = join(projectDir, `${stem}_frames`)
      mkdirSync(pngDir, { recursive: true })
      console.log(`Rendering PNG sequence to ${pngDir}`)
      await renderFrames({
        composition,
        serveUrl: bundleLocation,
        inputProps,
        imageFormat: 'png',
        outputDir: pngDir,
        frameRange: [startFrame, lastFrame],
        onStart: () => undefined,
        onFrameUpdate: (done, _frameIndex, _timeMs) => {
          const total = lastFrame - startFrame + 1
          if (done % 20 === 0) console.log(`  ${done}/${total} frames (frame ${startFrame + done}/${totalFrames})`)
        },
        concurrency: 4
      })
      console.log(`Done: ${pngDir}`)
    }
  })

program.parseAsync().catch(err => {
  console.error(err)
  process.exit(1)
})
