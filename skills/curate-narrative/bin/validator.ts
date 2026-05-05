import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = resolve(HERE, '..', '..', '..', 'packages', 'curator', 'src', 'narrative-schema.ts')

const target = process.argv[2]
if (!target) {
  console.error('usage: validator.ts <narrative.json>')
  process.exit(1)
}

const schemaModule = await import(SCHEMA_PATH)
const NarrativeSchema = schemaModule.NarrativeSchema

const text = readFileSync(target, 'utf8')
const data = JSON.parse(text)
const result = NarrativeSchema.safeParse(data)

if (!result.success) {
  console.error('Schema validation failed:')
  for (const issue of result.error.issues) {
    console.error('  ' + issue.path.join('.') + ': ' + issue.message)
  }
  process.exit(1)
}

const sceneCount = result.data.scenes.length
const clipCount = result.data.scenes.reduce((s: number, sc: { clips: unknown[] }) => s + sc.clips.length, 0)
console.log(`✓ valid narrative.json: ${sceneCount} scenes, ${clipCount} clips`)
