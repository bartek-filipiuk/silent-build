import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  TtsConfigSchema,
  type TtsConfig,
  type VoiceoverLines
} from './types.js'

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1/text-to-speech'

export interface RenderedVoiceoverPaths {
  hookPath: string
  contextPath?: string
  outroPath: string
}

const synthesizeOne = async (
  text: string,
  config: TtsConfig
): Promise<Uint8Array> => {
  const url = `${ELEVEN_BASE}/${config.voiceId}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': config.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: config.modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ElevenLabs ${res.status}: ${body || res.statusText}`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

export const renderVoiceover = async (
  lines: VoiceoverLines,
  config: TtsConfig,
  outDir: string
): Promise<RenderedVoiceoverPaths> => {
  const validated = TtsConfigSchema.parse(config)
  mkdirSync(outDir, { recursive: true })

  const hookBytes = await synthesizeOne(lines.hook, validated)
  const hookPath = join(outDir, 'hook.mp3')
  writeFileSync(hookPath, hookBytes)

  let contextPath: string | undefined
  if (lines.context) {
    const bytes = await synthesizeOne(lines.context, validated)
    contextPath = join(outDir, 'context.mp3')
    writeFileSync(contextPath, bytes)
  }

  const outroBytes = await synthesizeOne(lines.outro, validated)
  const outroPath = join(outDir, 'outro.mp3')
  writeFileSync(outroPath, outroBytes)

  return contextPath
    ? { hookPath, contextPath, outroPath }
    : { hookPath, outroPath }
}
