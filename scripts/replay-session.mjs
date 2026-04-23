#!/usr/bin/env node
/**
 * Replay a recorded .jsonl into a fresh target, rewriting every event
 * timestamp to the current wall clock so live-server behaves as if the
 * session is happening right now. Each event is spaced by configurable
 * delay to produce smooth SSE deltas.
 *
 * Usage:
 *   node scripts/replay-session.mjs <source.jsonl> <target.jsonl> [eps=15]
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'

const [, , src, dst, epsArg] = process.argv
if (!src || !dst) {
  console.error('usage: replay-session.mjs <src> <dst> [eps=15]')
  process.exit(1)
}
const eps = Number(epsArg ?? 15)
const sleepMs = Math.max(10, Math.round(1000 / eps))

const raw = readFileSync(src, 'utf-8')
const lines = raw.split('\n').filter((l) => l.trim() !== '')
console.log(`[replay] ${lines.length} lines @ ${eps} eps (~${Math.round(lines.length / eps)}s)`)

// Reset target
writeFileSync(dst, '')

const baseNow = Date.now()

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  let out = line
  try {
    const obj = JSON.parse(line)
    // Only rewrite top-level event timestamp if present (keep internal
    // message.usage etc intact).
    if (typeof obj === 'object' && obj && 'timestamp' in obj) {
      obj.timestamp = new Date(baseNow + i * sleepMs).toISOString()
    }
    out = JSON.stringify(obj)
  } catch {
    // non-JSON line — pass through
  }
  appendFileSync(dst, out + '\n')
  if ((i + 1) % 20 === 0) {
    console.log(`[replay] ${i + 1}/${lines.length}`)
  }
  await delay(sleepMs)
}
console.log(`[replay] done → ${dst}`)
