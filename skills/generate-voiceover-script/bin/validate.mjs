#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..', '..')

const target = process.argv[2]
if (!target) {
  console.error('usage: validate.mjs <voiceover-script.json>')
  process.exit(1)
}
if (!existsSync(target)) {
  console.error(`not found: ${target}`)
  process.exit(1)
}

const candidates = [
  resolve(REPO_ROOT, 'node_modules/.bin/tsx'),
  resolve(REPO_ROOT, 'packages/film-assets/node_modules/.bin/tsx'),
  resolve(REPO_ROOT, 'packages/curator/node_modules/.bin/tsx')
]
const tsx = candidates.find((p) => existsSync(p)) ?? 'tsx'

const inline = `
import { readFileSync } from 'node:fs'
import { VoiceoverLinesSchema } from '${REPO_ROOT}/packages/film-assets/src/types.ts'
const data = JSON.parse(readFileSync(process.argv[1], 'utf8'))
const r = VoiceoverLinesSchema.safeParse(data)
if (!r.success) {
  console.error('Schema validation failed:')
  for (const i of r.error.issues) console.error('  ' + i.path.join('.') + ': ' + i.message)
  process.exit(1)
}
const wc = (s) => s.split(/\\s+/).filter(Boolean).length
console.log('✓ valid voiceover-script.json')
console.log('  hook:    ' + wc(r.data.hook) + ' words')
if (r.data.context) console.log('  context: ' + wc(r.data.context) + ' words')
console.log('  outro:   ' + wc(r.data.outro) + ' words')
`

const r = spawnSync(tsx, ['-e', inline, target], {
  stdio: 'inherit',
  cwd: REPO_ROOT
})
process.exit(r.status ?? 1)
