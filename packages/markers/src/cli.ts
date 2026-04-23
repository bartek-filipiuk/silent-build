#!/usr/bin/env node
import { Command } from 'commander'
import { join } from 'node:path'
import { writeMarker } from './writer.js'
import { notifyLive } from './live-client.js'
import type { ManualMarker } from '@silent-build/shared'

const program = new Command()

program
  .name('mark')
  .description('Write manual phase markers for silent-build pipeline')

const phases: Array<ManualMarker['phase']> = [
  'project-start',
  'backend-start',
  'frontend-start',
  'security-start',
  'polish-start'
]

for (const phase of phases) {
  const cmd = program
    .command(phase)
    .description(`Write ${phase} marker`)

  if (phase === 'project-start') {
    cmd.requiredOption('-n, --name <project>', 'project name (slugified for folder)')
  }

  cmd.option('-o, --output-root <dir>', 'root folder for output/', 'output')
  cmd.option('--live [url]', 'also POST trigger to live-server (default http://127.0.0.1:3333)')

  cmd.action(async (opts: { name?: string; outputRoot: string; live?: string | boolean }) => {
    const timestamp = Date.now()
    const liveUrl = typeof opts.live === 'string'
      ? opts.live
      : opts.live === true
        ? 'http://127.0.0.1:3333'
        : null

    if (phase === 'project-start') {
      const name = opts.name!
      const date = new Date().toISOString().slice(0, 10)
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const dir = join(opts.outputRoot, `${slug}-${date}`)
      writeMarker({ outputDir: dir, phase, projectName: name, timestamp })
      console.log(`Created ${dir}/manual_markers.json`)
      console.log(`\nExport for subsequent markers in this session:`)
      console.log(`  export SILENT_BUILD_DIR=${dir}`)
      if (liveUrl) {
        const ok = await notifyLive(phase, { url: liveUrl })
        if (ok) console.log(`[live] intro overlay fired at ${liveUrl}`)
      }
      return
    }

    const dir = process.env['SILENT_BUILD_DIR']
    if (!dir) {
      throw new Error(
        'SILENT_BUILD_DIR env var not set. Run `pnpm mark project-start` first and export the path.'
      )
    }
    writeMarker({ outputDir: dir, phase, timestamp })
    console.log(`Added ${phase} marker to ${dir}/manual_markers.json at ${new Date(timestamp).toISOString()}`)
    if (liveUrl) {
      const ok = await notifyLive(phase, { url: liveUrl })
      if (ok) console.log(`[live] phase trigger fired at ${liveUrl}`)
    }
  })
}

program.parseAsync().catch((err) => {
  console.error(err)
  process.exit(1)
})
