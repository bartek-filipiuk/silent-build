#!/usr/bin/env node
import { Command } from 'commander'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition, renderFrames } from '@remotion/renderer'
import { join, resolve, isAbsolute } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { loadTimeline } from './lib/timeline-loader.js'

const program = new Command()

const USER_CWD = process.env['INIT_CWD'] ?? process.cwd()

program
  .name('render')
  .description('Render silent-build overlay from timeline.json')
  .requiredOption('-p, --project <dir>', 'project output dir (contains timeline.json)')
  .option('--format <format>', 'mov | png | both', 'both')
  .option('--fps <n>', 'frames per second', '60')
  .option('--max-frames <n>', 'cap render to at most N frames (useful for smoke tests)')
  .option('--start-frame <n>', 'start rendering from frame N (useful to preview later parts of session)', '0')
  .action(async (opts: { project: string; format: 'mov' | 'png' | 'both'; fps: string; maxFrames?: string; startFrame: string }) => {
    const projectDir = isAbsolute(opts.project) ? opts.project : resolve(USER_CWD, opts.project)
    const timelinePath = join(projectDir, 'timeline.json')
    if (!existsSync(timelinePath)) {
      throw new Error(`timeline.json not found in ${projectDir}`)
    }

    const timeline = loadTimeline(timelinePath)
    const fps = parseInt(opts.fps, 10)
    const durationSec = Math.ceil((timeline.project.endTs - timeline.project.startTs) / 1000)
    const durationFrames = Math.max(fps, durationSec * fps)
    const startFrame = parseInt(opts.startFrame, 10)
    const maxFrames = opts.maxFrames ? parseInt(opts.maxFrames, 10) : durationFrames
    const lastFrame = Math.min(durationFrames - 1, startFrame + maxFrames - 1)
    const effectiveFrames = durationFrames

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
      id: 'Dashboard',
      inputProps: { timeline }
    })

    composition.durationInFrames = effectiveFrames
    composition.fps = fps

    if (opts.format === 'mov' || opts.format === 'both') {
      const movPath = join(projectDir, 'dashboard.mov')
      console.log(`Rendering ${movPath}`)
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'prores',
        proResProfile: '4444',
        outputLocation: movPath,
        inputProps: { timeline },
        pixelFormat: 'yuva444p10le'
      })
      console.log(`Done: ${movPath}`)
    }

    if (opts.format === 'png' || opts.format === 'both') {
      const pngDir = join(projectDir, 'dashboard_frames')
      mkdirSync(pngDir, { recursive: true })
      console.log(`Rendering PNG sequence to ${pngDir}`)
      await renderFrames({
        composition,
        serveUrl: bundleLocation,
        inputProps: { timeline },
        imageFormat: 'png',
        outputDir: pngDir,
        frameRange: [startFrame, lastFrame],
        onStart: () => undefined,
        onFrameUpdate: (done, _frameIndex, _timeMs) => {
          const total = lastFrame - startFrame + 1
          if (done % 20 === 0) console.log(`  ${done}/${total} frames (frame ${startFrame + done}/${durationFrames})`)
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
