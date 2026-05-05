#!/usr/bin/env node
import { Command } from 'commander'
import { resolve, isAbsolute, join } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.js'
import { createRedactor } from './redactor.js'
import { JsonlWatcher, resolveJsonlPath } from './watcher.js'
import { TimelineStore } from './store.js'
import { createServer } from './server.js'

const USER_CWD = process.env['INIT_CWD'] ?? process.cwd()

const program = new Command()
program
  .name('silent-build-live')
  .description('Live SSE server for silent-build dashboard + overlay')
  .option('-p, --port <n>', 'port')
  .option('-h, --host <addr>', 'host')
  .option('-r, --project-root <path>', 'CC project root (for slug resolution)')
  .option('-s, --session <uuid>', 'session uuid (or "auto" for latest)')
  .option('-j, --jsonl <path>', 'explicit jsonl path (overrides project-root + session)')
  .option('-c, --config <path>', 'path to silent-build.live.json')
  .option('-n, --project-name <name>', 'display project name', 'Session')
  .option('--no-redactor', 'disable redactor (dangerous)')
  .option('--static <path>', 'absolute path to dashboard static build dir')
  .action(async (opts: {
    port?: string
    host?: string
    projectRoot?: string
    session?: string
    jsonl?: string
    config?: string
    projectName: string
    redactor: boolean
    static?: string
  }) => {
    const config = loadConfig(opts.config)
    if (opts.port) config.server.port = parseInt(opts.port, 10)
    if (opts.host) config.server.host = opts.host
    if (opts.projectRoot) {
      config.watcher.projectRoot = isAbsolute(opts.projectRoot)
        ? opts.projectRoot
        : resolve(USER_CWD, opts.projectRoot)
    }
    if (opts.session) config.watcher.sessionUuid = opts.session
    if (opts.jsonl) {
      config.watcher.jsonlPath = isAbsolute(opts.jsonl) ? opts.jsonl : resolve(USER_CWD, opts.jsonl)
    }
    if (!opts.redactor) config.redactor.enabled = false

    const jsonlPath = config.watcher.jsonlPath === 'auto'
      ? resolveJsonlPath(config.watcher.projectRoot, config.watcher.sessionUuid)
      : config.watcher.jsonlPath

    // Resolve static root: explicit --static OR infer from sibling live-dashboard/dist
    let staticRoot: string | undefined
    if (opts.static) {
      staticRoot = isAbsolute(opts.static) ? opts.static : resolve(USER_CWD, opts.static)
    } else {
      const pkgDir = fileURLToPath(new URL('..', import.meta.url))
      const candidate = join(pkgDir, '..', 'live-dashboard', 'dist')
      if (existsSync(candidate)) staticRoot = candidate
    }

    const redactor = createRedactor(config.redactor)
    const store = new TimelineStore({
      projectName: opts.projectName,
      ringBufferSize: config.ui.ringBufferSize
    })

    const watcher = new JsonlWatcher({ jsonlPath })
    watcher.on('events', (events) => store.applyParsed(events))
    watcher.on('error', (err) => console.error('[watcher]', err))
    await watcher.start()

    const server = createServer({
      store,
      redactor,
      staticRoot,
      pingIntervalMs: config.ui.pingIntervalMs
    })

    server.http.listen(config.server.port, config.server.host, () => {
      const url = `http://${config.server.host}:${config.server.port}`
      console.log(`[live-server] listening on ${url}`)
      console.log(`  jsonl: ${jsonlPath}`)
      console.log(`  static: ${staticRoot ?? '(not built — run `pnpm live:build`)'}`)
      console.log(`  redactor: ${config.redactor.enabled ? 'enabled' : 'DISABLED'}`)
      console.log(`\n  Dashboard: ${url}/dashboard/`)
      console.log(`  Overlay:   ${url}/overlay/`)
      console.log(`  Control:   ${url}/control/`)
      console.log(`  SSE:       ${url}/events`)
    })

    const shutdown = async (): Promise<void> => {
      console.log('\n[live-server] shutting down…')
      await watcher.stop()
      await server.close()
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  })

program.parseAsync().catch((err) => {
  console.error(err)
  process.exit(1)
})
