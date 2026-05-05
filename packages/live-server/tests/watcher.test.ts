import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JsonlWatcher } from '../src/watcher.js'
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ParsedEvent } from '@silent-build/harvester/parser'

const USER_EVENT = (text: string, ts = '2026-04-23T10:00:00.000Z') =>
  JSON.stringify({
    type: 'user',
    uuid: 'u-' + Math.random(),
    parentUuid: null,
    timestamp: ts,
    message: { role: 'user', content: text }
  })

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

describe('JsonlWatcher', () => {
  let dir: string
  let file: string
  let watcher: JsonlWatcher

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'live-watcher-'))
    file = join(dir, 'session.jsonl')
  })

  afterEach(async () => {
    if (watcher) await watcher.stop()
    rmSync(dir, { recursive: true, force: true })
  })

  it('emits events when file appended', async () => {
    writeFileSync(file, '')
    watcher = new JsonlWatcher({ jsonlPath: file })
    const received: ParsedEvent[][] = []
    watcher.on('events', (e) => received.push(e))
    await watcher.start()
    appendFileSync(file, USER_EVENT('first') + '\n')
    // chokidar + fs.watch need a tick to flush
    await sleep(200)
    appendFileSync(file, USER_EVENT('second') + '\n')
    await sleep(200)
    const flat = received.flat()
    expect(flat.length).toBeGreaterThanOrEqual(2)
  })

  it('buffers partial lines until newline arrives', async () => {
    writeFileSync(file, '')
    watcher = new JsonlWatcher({ jsonlPath: file })
    const received: ParsedEvent[][] = []
    watcher.on('events', (e) => received.push(e))
    await watcher.start()

    const half = USER_EVENT('partial')
    const mid = Math.floor(half.length / 2)
    appendFileSync(file, half.slice(0, mid))
    await sleep(120)
    // No events yet — no newline
    expect(received.flat().length).toBe(0)
    appendFileSync(file, half.slice(mid) + '\n')
    await sleep(200)
    expect(received.flat().length).toBeGreaterThanOrEqual(1)
  })

  it('skips malformed jsonl line with warning but keeps going', async () => {
    writeFileSync(file, '')
    watcher = new JsonlWatcher({ jsonlPath: file })
    const received: ParsedEvent[][] = []
    watcher.on('events', (e) => received.push(e))
    await watcher.start()
    // Write two separate appends so chokidar gets a second 'change' signal
    // and the filesystem has distinct mtime nanosecond resolution.
    appendFileSync(file, '{not json\n')
    await sleep(250)
    appendFileSync(file, USER_EVENT('good') + '\n')
    await sleep(400)
    expect(received.flat().length).toBeGreaterThanOrEqual(1)
  })
})
