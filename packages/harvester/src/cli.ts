#!/usr/bin/env node
import { Command } from 'commander'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { buildTimeline } from './builder.js'
import { ManualMarkersFileSchema } from '@silent-build/shared'

const program = new Command()

program
  .name('harvest')
  .description('Parse Claude Code session jsonl into SessionTimeline')
  .requiredOption('-p, --project <dir>', 'output project dir (e.g. output/focusfeed-2026-04-21)')
  .option('-s, --session <uuid>', 'session UUID (auto-detects latest if omitted)')
  .option('-r, --project-root <path>', 'project path to resolve CC slug', process.cwd())
  .action((opts: { project: string; session?: string; projectRoot: string }) => {
    const slug = slugify(opts.projectRoot)
    const ccProjectDir = join(homedir(), '.claude', 'projects', slug)

    if (!existsSync(ccProjectDir)) {
      throw new Error(`CC project dir not found: ${ccProjectDir}`)
    }

    const sessionUuid = opts.session ?? findLatestSession(ccProjectDir)
    const sessionJsonl = join(ccProjectDir, `${sessionUuid}.jsonl`)
    if (!existsSync(sessionJsonl)) {
      throw new Error(`Session jsonl not found: ${sessionJsonl}`)
    }

    const subagentsDir = join(ccProjectDir, sessionUuid, 'subagents')
    const markersPath = join(opts.project, 'manual_markers.json')
    const markers = existsSync(markersPath)
      ? ManualMarkersFileSchema.parse(JSON.parse(readFileSync(markersPath, 'utf-8')))
      : null

    const projectName = markers?.project ?? 'Unknown'
    const timeline = buildTimeline({
      sessionJsonlPath: sessionJsonl,
      subagentsDir: existsSync(subagentsDir) ? subagentsDir : null,
      markers,
      projectName
    })

    const outPath = join(opts.project, 'timeline.json')
    writeFileSync(outPath, JSON.stringify(timeline, null, 2))
    console.log(`Wrote timeline: ${outPath}`)
    console.log(`  events: ${timeline.events.length}`)
    console.log(`  phases: ${timeline.phases.map(p => `${p.index}/${p.label}`).join(', ')}`)
    console.log(`  duration: ${formatDuration(timeline.project.endTs - timeline.project.startTs)}`)
    console.log(`  tokens: ${timeline.metrics.totalTokens.toLocaleString()}`)
    console.log(`  files touched: ${timeline.metrics.filesTouched}`)
  })

function slugify(absPath: string): string {
  return absPath.replace(/\//g, '-')
}

function findLatestSession(ccProjectDir: string): string {
  const files = readdirSync(ccProjectDir).filter(f => f.endsWith('.jsonl'))
  if (files.length === 0) throw new Error(`No jsonl sessions in ${ccProjectDir}`)
  const latest = files
    .map(f => ({ f, mtime: statSync(join(ccProjectDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]!
  return latest.f.replace('.jsonl', '')
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

program.parse()
