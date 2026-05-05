import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

export interface DoctorCheck {
  name: string
  status: 'ok' | 'warn' | 'fail'
  message: string
}

export interface DoctorResult {
  overall: 'ok' | 'warn' | 'fail'
  checks: DoctorCheck[]
}

export interface DoctorOptions {
  musicDir: string
  voiceFile: string
  requireFfmpeg: boolean
  env: { ELEVENLABS_API_KEY: string | undefined }
}

const REQUIRED_MUSIC_FILES = [
  'intro-chill-60s.wav',
  'build-hustle-90s.wav',
  'climax-drop-30s.wav',
  'outro-celebratory-45s.wav'
]

const checkMusic = (musicDir: string): DoctorCheck => {
  if (!existsSync(musicDir)) {
    return {
      name: 'music files',
      status: 'warn',
      message: `directory ${musicDir} not found — generate via Suno per assets/music/README.md`
    }
  }
  const present = new Set(readdirSync(musicDir))
  const missing = REQUIRED_MUSIC_FILES.filter((f) => !present.has(f))
  if (missing.length === 0) {
    return {
      name: 'music files',
      status: 'ok',
      message: `all 4 expected files present`
    }
  }
  return {
    name: 'music files',
    status: 'warn',
    message: `${missing.length} missing: ${missing.join(', ')}`
  }
}

const checkVoiceId = (voiceFile: string): DoctorCheck => {
  if (!existsSync(voiceFile)) {
    return {
      name: 'voice id file',
      status: 'warn',
      message: `${voiceFile} not found — using ElevenLabs Rachel preset`
    }
  }
  const id = readFileSync(voiceFile, 'utf8').trim()
  if (!id) {
    return {
      name: 'voice id file',
      status: 'warn',
      message: 'voice id file empty — using default'
    }
  }
  return {
    name: 'voice id file',
    status: 'ok',
    message: `voice id: ${id.slice(0, 8)}…`
  }
}

const checkApiKey = (key: string | undefined): DoctorCheck => {
  if (!key) {
    return {
      name: 'ELEVENLABS_API_KEY env',
      status: 'fail',
      message: 'not set; assets:tts will fail'
    }
  }
  return {
    name: 'ELEVENLABS_API_KEY env',
    status: 'ok',
    message: 'set'
  }
}

const checkFfmpeg = (): DoctorCheck => {
  const r = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe' })
  if (r.status === 0) {
    return { name: 'ffmpeg', status: 'ok', message: 'in PATH' }
  }
  return {
    name: 'ffmpeg',
    status: 'fail',
    message: 'not in PATH; install via apt/brew'
  }
}

export const runDoctor = (opts: DoctorOptions): DoctorResult => {
  const checks: DoctorCheck[] = [
    checkMusic(opts.musicDir),
    checkVoiceId(opts.voiceFile),
    checkApiKey(opts.env.ELEVENLABS_API_KEY)
  ]
  if (opts.requireFfmpeg) checks.push(checkFfmpeg())

  const hasFail = checks.some((c) => c.status === 'fail')
  const hasWarn = checks.some((c) => c.status === 'warn')
  const overall: DoctorResult['overall'] = hasFail
    ? 'fail'
    : hasWarn
      ? 'warn'
      : 'ok'

  return { overall, checks }
}
