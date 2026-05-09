#!/usr/bin/env node
import { Command } from 'commander'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { isAbsolute, join, resolve, dirname } from 'node:path'
import { buildTimeline } from '@silent-build/harvester/builder'
import {
  NarrativeSchema,
  type Narrative,
  type NarrativeClip,
  type NarrativeScene
} from '@silent-build/curator/narrative-schema'
import type {
  SessionTimeline,
  TimelineEvent,
  Phase
} from '@silent-build/shared'

const USER_CWD = process.env['INIT_CWD'] ?? process.cwd()
const FPS = 60

const buildClipTimeline = (
  clip: NarrativeClip,
  projectName: string
): SessionTimeline => {
  const full = buildTimeline({
    sessionJsonlPath: clip.sourceJsonl,
    subagentsDir: null,
    markers: null,
    projectName
  })

  const fromMs = Date.parse(clip.from)
  const toMs = Date.parse(clip.to)
  const realtimeMs = Math.max(1, toMs - fromMs)
  const targetMs = clip.durationSec * 1000
  const ratio = targetMs / realtimeMs

  const scaleTs = (ts: number): number =>
    Math.round(fromMs + (ts - fromMs) * ratio)

  // System / skill-loader prompts that the dashboard shouldn't surface as
  // "current prompt" — these are synthetic Claude Code injections, not user
  // intent. Mirrors the curator's isSyntheticPrompt allowlist.
  const isSyntheticPromptText = (text: string): boolean => {
    const t = text.trimStart()
    return (
      t.startsWith('Base directory for this skill:') ||
      t.startsWith('<command-name>') ||
      t.startsWith('<task-notification>') ||
      t.startsWith('<system-reminder>') ||
      t.startsWith('<local-command-caveat>') ||
      t.startsWith('<bash-input>') ||
      t.startsWith('<task>')
    )
  }

  // Aggregate cumulative state from events BEFORE clip start. Without this,
  // every clip dashboard ticks from TOKENS=0 / "awaiting first prompt", which
  // looks like a fresh session even when this is e.g. the audit clip 5h in.
  const preClipFiles = new Set<string>()
  let preClipTokens = 0
  let preClipCacheRead = 0
  let preClipCacheWrite = 0
  let preClipPrompts = 0
  let preClipToolCalls = 0
  let lastPromptText: string | null = null
  for (const ev of full.events) {
    if (ev.ts >= fromMs) break
    if (ev.type === 'prompt') {
      preClipPrompts++
      if (!isSyntheticPromptText(ev.data.text)) {
        lastPromptText = ev.data.text
      }
    }
    if (ev.type === 'tool_call') preClipToolCalls++
    if (ev.type === 'tokens_delta') {
      preClipTokens += ev.data.input + ev.data.output
      preClipCacheRead += ev.data.cacheRead ?? 0
      preClipCacheWrite += ev.data.cacheWrite ?? 0
    }
    if (ev.type === 'file_write') preClipFiles.add(ev.data.path)
    if (ev.type === 'file_edit') preClipFiles.add(ev.data.path)
  }

  // Synthetic baseline events injected just before fromMs so widgets that
  // sum events up to currentMs (TokenCounter, ActivityLog, FileActivity,
  // CurrentPrompt) see the cumulative pre-clip state.
  const baselineTs = fromMs - 1
  const baselineEvents: TimelineEvent[] = []
  if (preClipTokens > 0 || preClipCacheRead > 0 || preClipCacheWrite > 0) {
    baselineEvents.push({
      ts: baselineTs,
      type: 'tokens_delta',
      data: {
        input: preClipTokens,
        output: 0,
        ...(preClipCacheRead > 0 ? { cacheRead: preClipCacheRead } : {}),
        ...(preClipCacheWrite > 0 ? { cacheWrite: preClipCacheWrite } : {})
      }
    })
  }
  if (lastPromptText) {
    baselineEvents.push({
      ts: baselineTs,
      type: 'prompt',
      data: { text: lastPromptText, tokensIn: 0 }
    })
  }
  for (const f of preClipFiles) {
    baselineEvents.push({
      ts: baselineTs,
      type: 'file_write',
      data: { path: f, linesAdded: 0 }
    })
  }

  const intraClipEvents: TimelineEvent[] = full.events
    .filter((e) => e.ts >= fromMs && e.ts <= toMs)
    .filter(
      (e) => e.type !== 'prompt' || !isSyntheticPromptText(e.data.text)
    )
    .map((e) => ({ ...e, ts: scaleTs(e.ts) }))

  const slicedEvents: TimelineEvent[] = [...baselineEvents, ...intraClipEvents]

  const segMs = Math.round(targetMs / 4)
  const phases: Phase[] = ([1, 2, 3, 4] as const).map((i) => ({
    index: i,
    label: clip.label,
    startTs: fromMs + (i - 1) * segMs,
    endTs: i === 4 ? fromMs + targetMs : fromMs + i * segMs,
    source: 'heuristic'
  }))

  // Cumulative metrics = pre-clip baseline + intra-clip delta.
  const intraFiles = new Set<string>()
  let intraTokens = 0
  let intraPrompts = 0
  let intraToolCalls = 0
  for (const ev of intraClipEvents) {
    if (ev.type === 'prompt') intraPrompts++
    if (ev.type === 'tool_call') intraToolCalls++
    if (ev.type === 'tokens_delta') {
      intraTokens +=
        ev.data.input +
        ev.data.output +
        (ev.data.cacheRead ?? 0) +
        (ev.data.cacheWrite ?? 0)
    }
    if (ev.type === 'file_write') intraFiles.add(ev.data.path)
    if (ev.type === 'file_edit') intraFiles.add(ev.data.path)
  }
  const allFiles = new Set<string>([...preClipFiles, ...intraFiles])

  return {
    project: { name: projectName, startTs: fromMs, endTs: fromMs + targetMs },
    phases,
    events: slicedEvents,
    metrics: {
      totalTokens: preClipTokens + preClipCacheRead + preClipCacheWrite + intraTokens,
      filesTouched: allFiles.size,
      promptsCount: preClipPrompts + intraPrompts,
      toolCallsCount: preClipToolCalls + intraToolCalls
    }
  }
}

interface SegmentManifest {
  scene: number
  sceneId: string
  kind: 'overlay' | 'dashboard'
  path: string
  durationFrames: number
  durationSec: number
  width: number
  height: number
  clipIndex?: number
  realtimeFromIso?: string
  realtimeToIso?: string
  compressionRatio?: number
}

const renderOverlayForScene = async (
  scene: NarrativeScene,
  sceneIndex: number,
  bundleLocation: string,
  outDir: string,
  fullTimeline: SessionTimeline | null,
  narrative: Narrative
): Promise<SegmentManifest> => {
  const stem = `scene-${String(sceneIndex + 1).padStart(2, '0')}-${scene.id}-overlay`
  const outPath = join(outDir, `${stem}.mov`)

  let inputProps: Record<string, unknown>
  if (scene.overlay.kind === 'Intro') {
    inputProps = {
      projectName: narrative.project,
      targetDescription: `Best-of · ${narrative.targetMinutes} min · 6 scenes`,
      startingAt: fullTimeline
        ? new Date(fullTimeline.project.startTs)
        : new Date()
    }
  } else if (scene.overlay.kind === 'Outro') {
    inputProps = {
      projectName: narrative.project,
      metrics: fullTimeline?.metrics ?? {
        totalTokens: 0,
        filesTouched: 0,
        promptsCount: 0,
        toolCallsCount: 0
      },
      durationMs: narrative.targetMinutes * 60 * 1000,
      repoUrl: 'github.com/bartek-filipiuk'
    }
  } else {
    const props = scene.overlay.props
    const fakePhase: Phase = {
      index: Math.min(4, props.phaseNumber) as 1 | 2 | 3 | 4, // Phase.index is 1-4 in shared schema; leave clamped here
      label: scene.title,
      startTs: 0,
      endTs: scene.durationSec * 1000,
      source: 'heuristic'
    }
    inputProps = {
      phase: fakePhase,
      phaseNumber: props.phaseNumber as 1 | 2 | 3 | 4 | 5 | 6,
      totalPhases: narrative.scenes.length
    }
  }

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: scene.overlay.kind,
    inputProps
  })
  composition.fps = FPS

  console.log(`  [overlay] ${scene.overlay.kind} → ${outPath}`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'prores',
    proResProfile: '4444',
    outputLocation: outPath,
    inputProps,
    pixelFormat: 'yuva444p10le',
    imageFormat: 'png'
  })

  return {
    scene: sceneIndex + 1,
    sceneId: scene.id,
    kind: 'overlay',
    path: outPath,
    durationFrames: composition.durationInFrames,
    durationSec: composition.durationInFrames / FPS,
    width: composition.width,
    height: composition.height
  }
}

const renderDashboardForClip = async (
  clip: NarrativeClip,
  scene: NarrativeScene,
  sceneIndex: number,
  clipIndex: number,
  bundleLocation: string,
  outDir: string,
  projectName: string
): Promise<SegmentManifest> => {
  const stem = `scene-${String(sceneIndex + 1).padStart(2, '0')}-${scene.id}-clip-${String(clipIndex + 1).padStart(2, '0')}`
  const outPath = join(outDir, `${stem}.mov`)
  const timelinePath = join(outDir, `${stem}.timeline.json`)

  const timeline = buildClipTimeline(clip, projectName)
  writeFileSync(timelinePath, JSON.stringify(timeline, null, 2))

  const totalFrames = Math.max(FPS, clip.durationSec * FPS)
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'Dashboard',
    inputProps: { timeline }
  })
  composition.fps = FPS
  composition.durationInFrames = totalFrames

  const realtimeMs =
    Date.parse(clip.to) - Date.parse(clip.from)
  const compressionRatio =
    clip.durationSec > 0 ? realtimeMs / (clip.durationSec * 1000) : 1

  console.log(
    `  [clip] ${clip.label} · ${clip.durationSec}s · compress ${compressionRatio.toFixed(1)}× → ${outPath}`
  )
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'prores',
    proResProfile: '4444',
    outputLocation: outPath,
    inputProps: { timeline },
    pixelFormat: 'yuva444p10le',
    imageFormat: 'png'
  })

  return {
    scene: sceneIndex + 1,
    sceneId: scene.id,
    kind: 'dashboard',
    path: outPath,
    durationFrames: totalFrames,
    durationSec: clip.durationSec,
    width: composition.width,
    height: composition.height,
    clipIndex: clipIndex + 1,
    realtimeFromIso: clip.from,
    realtimeToIso: clip.to,
    compressionRatio: Number(compressionRatio.toFixed(2))
  }
}

const program = new Command()

program
  .name('render-narrative')
  .description(
    'Render a multi-scene best-of narrative from narrative.json into per-segment ProRes .mov files + manifest'
  )
  .requiredOption('-i, --input <path>', 'narrative.json path')
  .option('-o, --out <dir>', 'output directory', 'output/narrative')
  .option(
    '--scenes <range>',
    'subset of scenes to render, e.g. "1-3" or "2,4,6" (default: all)'
  )
  .option(
    '--skip-overlays',
    'skip overlay (Intro/PhaseTransition/Outro) renders, dashboards only',
    false
  )
  .action(
    async (opts: {
      input: string
      out: string
      scenes?: string
      skipOverlays: boolean
    }) => {
      const inputPath = isAbsolute(opts.input)
        ? opts.input
        : resolve(USER_CWD, opts.input)
      if (!existsSync(inputPath)) {
        throw new Error(`narrative.json not found: ${inputPath}`)
      }
      const narrative: Narrative = NarrativeSchema.parse(
        JSON.parse(readFileSync(inputPath, 'utf8'))
      )

      const outDir = isAbsolute(opts.out)
        ? opts.out
        : resolve(USER_CWD, opts.out)
      mkdirSync(outDir, { recursive: true })

      const sceneIndices = parseSceneRange(opts.scenes, narrative.scenes.length)

      const entry = join(import.meta.dirname, 'Root.tsx')
      console.log(`Bundling Remotion from ${entry}`)
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

      let aggregateTimeline: SessionTimeline | null = null
      try {
        const firstClip = narrative.scenes[0]?.clips[0]
        if (firstClip) {
          aggregateTimeline = buildTimeline({
            sessionJsonlPath: firstClip.sourceJsonl,
            subagentsDir: null,
            markers: null,
            projectName: narrative.project
          })
        }
      } catch (e) {
        console.warn(
          `[warn] couldn't pre-build aggregate timeline (${e instanceof Error ? e.message : e}); intro/outro will use empty metrics`
        )
      }

      const segments: SegmentManifest[] = []

      for (const sIdx of sceneIndices) {
        const scene = narrative.scenes[sIdx]!
        console.log(
          `\nScene ${sIdx + 1}/${narrative.scenes.length} · ${scene.id} · "${scene.title}"`
        )

        if (!opts.skipOverlays) {
          const ov = await renderOverlayForScene(
            scene,
            sIdx,
            bundleLocation,
            outDir,
            aggregateTimeline,
            narrative
          )
          segments.push(ov)
        }

        for (let cIdx = 0; cIdx < scene.clips.length; cIdx++) {
          const clip = scene.clips[cIdx]!
          const seg = await renderDashboardForClip(
            clip,
            scene,
            sIdx,
            cIdx,
            bundleLocation,
            outDir,
            narrative.project
          )
          segments.push(seg)
        }
      }

      const manifestPath = join(outDir, 'manifest.json')
      writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            project: narrative.project,
            generatedAt: new Date().toISOString(),
            targetMinutes: narrative.targetMinutes,
            segments
          },
          null,
          2
        )
      )

      writeFfmpegConcatLists(outDir, segments)

      console.log(`\n✓ rendered ${segments.length} segments to ${outDir}`)
      console.log(`  manifest:           ${manifestPath}`)
      console.log(`  ffmpeg concat list: ${join(outDir, 'concat-dashboards.txt')}`)
      console.log(`  ffmpeg concat list: ${join(outDir, 'concat-overlays.txt')}`)
      console.log('')
      console.log(
        '  Quick concat (dashboards 576×1080):'
      )
      console.log(
        `    ffmpeg -f concat -safe 0 -i ${join(outDir, 'concat-dashboards.txt')} -c copy ${join(outDir, 'dashboards.mov')}`
      )
      console.log(
        '  Quick concat (overlays 1920×1080):'
      )
      console.log(
        `    ffmpeg -f concat -safe 0 -i ${join(outDir, 'concat-overlays.txt')} -c copy ${join(outDir, 'overlays.mov')}`
      )
    }
  )

const parseSceneRange = (
  spec: string | undefined,
  total: number
): number[] => {
  if (!spec) return Array.from({ length: total }, (_, i) => i)
  if (spec.includes('-')) {
    const [a, b] = spec.split('-').map((s) => parseInt(s, 10))
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error(`invalid --scenes range: ${spec}`)
    }
    return Array.from(
      { length: Math.min(b!, total) - a! + 1 },
      (_, i) => a! - 1 + i
    )
  }
  return spec
    .split(',')
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < total)
}

const writeFfmpegConcatLists = (
  outDir: string,
  segments: SegmentManifest[]
): void => {
  const dashboards = segments.filter((s) => s.kind === 'dashboard')
  const overlays = segments.filter((s) => s.kind === 'overlay')

  const dashList = dashboards.map((s) => `file '${s.path}'`).join('\n') + '\n'
  const overlayList =
    overlays.map((s) => `file '${s.path}'`).join('\n') + '\n'
  writeFileSync(join(outDir, 'concat-dashboards.txt'), dashList)
  writeFileSync(join(outDir, 'concat-overlays.txt'), overlayList)
}

program.parseAsync().catch((err) => {
  console.error(
    `[render-narrative] error: ${err instanceof Error ? err.message : err}`
  )
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
