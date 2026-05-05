import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import type {
  LiveServerMessage,
  TriggerScene
} from '@silent-build/shared'
import type { TimelineStore } from './store.js'
import type { Redactor } from './redactor.js'

export interface CreateServerDeps {
  store: TimelineStore
  redactor: Redactor
  /** Absolute path to Vite build dir. Optional — if absent, /dashboard returns 503. */
  staticRoot?: string | undefined
  pingIntervalMs: number
}

export interface LiveServer {
  http: Server
  /** Emit a trigger to all SSE clients. */
  trigger(scene: TriggerScene, props?: unknown): void
  /** Close HTTP + all SSE clients. */
  close(): Promise<void>
}

interface SseClient {
  res: ServerResponse
  lastEventId: number
  pingHandle: NodeJS.Timeout
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ico':  'image/x-icon'
}

export function createServer(deps: CreateServerDeps): LiveServer {
  const clients = new Set<SseClient>()
  let eventCounter = deps.store.tailId()

  const writeSse = (client: SseClient, msg: LiveServerMessage, eventName?: string): void => {
    eventCounter += 1
    client.lastEventId = eventCounter
    try {
      client.res.write(`id: ${eventCounter}\n`)
      if (eventName) client.res.write(`event: ${eventName}\n`)
      client.res.write(`data: ${JSON.stringify(msg)}\n\n`)
    } catch {
      // client likely disconnected; cleanup happens in 'close' handler
    }
  }

  const broadcast = (msg: LiveServerMessage, eventName?: string): void => {
    for (const c of clients) writeSse(c, msg, eventName)
  }

  deps.store.on('delta', (events) => {
    const redacted = events.map(deps.redactor.scanEvent)
    broadcast({ kind: 'delta', events: redacted }, 'delta')
  })

  const sseHandler = (req: IncomingMessage, res: ServerResponse): void => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })
    const client: SseClient = {
      res,
      lastEventId: 0,
      pingHandle: setInterval(() => {
        writeSse(client, { kind: 'ping', ts: Date.now() }, 'ping')
      }, deps.pingIntervalMs)
    }
    clients.add(client)
    res.on('close', () => {
      clearInterval(client.pingHandle)
      clients.delete(client)
    })

    // Send initial snapshot (with redacted events).
    const snap = deps.store.snapshot()
    const redactedSnap = {
      ...snap,
      events: snap.events.map(deps.redactor.scanEvent)
    }
    writeSse(client, { kind: 'snapshot', timeline: redactedSnap }, 'snapshot')

    // Optional backfill if client sent Last-Event-ID.
    const lastId = parseInt(String(req.headers['last-event-id'] ?? ''), 10)
    if (!Number.isNaN(lastId) && lastId > 0) {
      const back = deps.store.since(lastId).map(deps.redactor.scanEvent)
      if (back.length) writeSse(client, { kind: 'delta', events: back }, 'delta')
    }
  }

  const jsonResponse = (res: ServerResponse, status: number, body: unknown): void => {
    const json = JSON.stringify(body)
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(json)
    })
    res.end(json)
  }

  const serveStatic = (req: IncomingMessage, res: ServerResponse, relPath: string): void => {
    if (!deps.staticRoot) {
      jsonResponse(res, 503, { error: 'Dashboard bundle not built. Run `pnpm live:build` first.' })
      return
    }
    // Friendly route aliases for Vite multi-entry build output (html files at root).
    const bare = relPath.split('?')[0]!.replace(/\/$/, '')
    const ALIASES: Record<string, string> = {
      '/dashboard': '/dashboard.html',
      '/overlay':   '/overlay.html',
      '/control':   '/control.html',
      '/':          '/dashboard.html'
    }
    const mapped = ALIASES[bare] ?? bare
    const safe = normalize(mapped).replace(/^(\.\.[\/\\])+/, '')
    const filePath = join(deps.staticRoot, safe)
    if (!filePath.startsWith(deps.staticRoot + sep) && filePath !== deps.staticRoot) {
      res.writeHead(403).end('forbidden')
      return
    }
    if (!existsSync(filePath)) {
      res.writeHead(404).end('not found')
      return
    }
    const ct = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': ct })
    res.end(readFileSync(filePath))
  }

  const http = createHttpServer((req, res) => {
    const url = req.url ?? '/'
    if (url === '/events' && req.method === 'GET') return sseHandler(req, res)
    if (url === '/api/health' && req.method === 'GET') {
      return jsonResponse(res, 200, { ok: true, uptimeMs: process.uptime() * 1000, clients: clients.size })
    }
    if (url === '/api/timeline' && req.method === 'GET') {
      const snap = deps.store.snapshot()
      return jsonResponse(res, 200, {
        ...snap,
        events: snap.events.map(deps.redactor.scanEvent)
      })
    }
    // POST /api/trigger/:scene  (optional ?n=1-4 for PhaseTransition)
    if (url.startsWith('/api/trigger/') && req.method === 'POST') {
      const [scenePath] = url.slice('/api/trigger/'.length).split('?')
      const params = new URLSearchParams(url.split('?')[1] ?? '')
      const scene = (scenePath ?? '').toLowerCase()
      let triggerScene: TriggerScene | null = null
      let props: unknown = undefined
      if (scene === 'intro') triggerScene = 'Intro'
      else if (scene === 'outro') triggerScene = 'Outro'
      else if (scene === 'clear') triggerScene = 'Clear'
      else if (scene === 'phase') {
        triggerScene = 'PhaseTransition'
        const n = parseInt(params.get('n') ?? '2', 10)
        const snap = deps.store.snapshot()
        const phase = snap.phases[Math.max(0, Math.min(3, n - 1))]!
        props = { phase, phaseNumber: n as 1 | 2 | 3 | 4 }
      }
      if (!triggerScene) {
        return jsonResponse(res, 400, { error: `Unknown scene: ${scenePath}` })
      }
      broadcast({ kind: 'trigger', scene: triggerScene, props }, 'trigger')
      res.writeHead(204).end()
      return
    }
    // Static (also respond to HEAD for probes)
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url)
    res.writeHead(404).end('not found')
  })

  const trigger = (scene: TriggerScene, props?: unknown): void => {
    broadcast({ kind: 'trigger', scene, props }, 'trigger')
  }

  const close = async (): Promise<void> => {
    for (const c of clients) {
      clearInterval(c.pingHandle)
      try { c.res.end() } catch { /* ignore */ }
    }
    clients.clear()
    await new Promise<void>((resolve) => http.close(() => resolve()))
  }

  return { http, trigger, close }
}
