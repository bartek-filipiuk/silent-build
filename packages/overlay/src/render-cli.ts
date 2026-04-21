#!/usr/bin/env node
import { Command } from 'commander'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition, renderFrames } from '@remotion/renderer'
import { join, resolve } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { loadTimeline } from './lib/timeline-loader.js'

const program = new Command()

program
  .name('render')
  .description('Render silent-build overlay from timeline.json')
  .requiredOption('-p, --project <dir>', 'project output dir (contains timeline.json)')
  .option('--format <format>', 'mov | png | both', 'both')
  .option('--fps <n>', 'frames per second', '60')
  .action(async (opts: { project: string; format: 'mov' | 'png' | 'both'; fps: string }) => {
    const projectDir = resolve(opts.project)
    const timelinePath = join(projectDir, 'timeline.json')
    if (!existsSync(timelinePath)) {
      throw new Error(`timeline.json not found in ${projectDir}`)
    }

    const timeline = loadTimeline(timelinePath)
    const fps = parseInt(opts.fps, 10)
    const durationSec = Math.ceil((timeline.project.endTs - timeline.project.startTs) / 1000)
    const durationFrames = Math.max(fps, durationSec * fps)

    const entry = join(import.meta.dirname, 'Root.tsx')
    console.log(`Bundling Remotion project from ${entry}`)
    const bundleLocation = await bundle({ entryPoint: entry })

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'Dashboard',
      inputProps: { timeline }
    })

    composition.durationInFrames = durationFrames
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
        frameRange: [0, durationFrames - 1],
        onStart: () => undefined,
        onFrameUpdate: (done, _frameIndex, _timeMs) => {
          if (done % 60 === 0) console.log(`  ${done}/${durationFrames} frames`)
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
