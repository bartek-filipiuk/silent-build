#!/usr/bin/env node
// Helper for the curate-narrative skill.
// Subcommands:
//   validate <path>   — parse narrative.json against the Zod schema, exit 0/1.
//   schema            — print the schema TS as text.
//
// Lives at skills/curate-narrative/bin/preprocess.mjs and shells out to the
// silent-build monorepo's @silent-build/curator package via tsx.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..', '..')

const cmd = process.argv[2]
const arg = process.argv[3]

const die = (msg, code = 1) => {
  console.error(msg)
  process.exit(code)
}

if (!cmd) {
  die('usage: preprocess.mjs <validate|schema> [args]')
}

if (cmd === 'validate') {
  if (!arg) die('usage: preprocess.mjs validate <narrative.json>')
  const target = resolve(process.cwd(), arg)
  if (!existsSync(target)) die(`not found: ${target}`)

  const tsxName = process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  const candidates = [
    resolve(REPO_ROOT, 'node_modules', '.bin', tsxName),
    resolve(REPO_ROOT, 'packages', 'curator', 'node_modules', '.bin', tsxName),
    resolve(REPO_ROOT, 'packages', 'harvester', 'node_modules', '.bin', tsxName)
  ]
  const tsxBin = candidates.find((p) => existsSync(p)) ?? tsxName
  if (!candidates.some((p) => existsSync(p)) && tsxBin === tsxName) {
    // fall through to PATH lookup
  }

  const validatorScript = resolve(HERE, 'validator.ts')
  if (!existsSync(validatorScript)) die(`validator.ts not found at ${validatorScript}`)

  const result = spawnSync(tsxBin, [validatorScript, target], {
    stdio: 'inherit',
    cwd: REPO_ROOT
  })
  process.exit(result.status ?? 1)
}

if (cmd === 'schema') {
  const schemaPath = resolve(
    REPO_ROOT,
    'packages',
    'curator',
    'src',
    'narrative-schema.ts'
  )
  if (!existsSync(schemaPath)) die(`schema not found: ${schemaPath}`)
  console.log(readFileSync(schemaPath, 'utf8'))
  process.exit(0)
}

die(`unknown subcommand: ${cmd}`)
