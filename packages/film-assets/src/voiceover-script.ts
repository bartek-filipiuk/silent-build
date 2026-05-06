import {
  VoiceoverLinesSchema,
  type RepoMetadata,
  type VoiceoverLines
} from './types.js'

export const buildVoiceoverPrompt = (
  metadata: RepoMetadata,
  nextProject?: string
): string => {
  const cliffhanger = nextProject
    ? `Next film: silent build #N — ${nextProject}.`
    : `Next film teased generically — "subscribe so you don't miss the next one".`

  return `You are writing voiceover lines for a 7-minute YouTube "silent build" film about a software project. Two talking-head moments need scripts.

PROJECT METADATA:
- Project name: ${metadata.projectName}
- Punchline: ${metadata.punchline}
- Subtitle: ${metadata.subtitle}
- Tech stack: ${metadata.techStack.join(', ')}
- Built between: ${metadata.startTs} → ${metadata.endTs}

WRITE TWO LINES (English, casual, confident, technical-but-accessible):

1. HOOK (5 seconds, ~12 words): The opening line. Must contain a punchy number or fact from the metadata. Patterns that work:
   - "I gave Claude Code [N] days. Here's what it built."
   - "Nine days. One [thing]. Built by AI."
   - "[Number] prompts. [Number] tool calls. One live app."

2. OUTRO (10 seconds, ~28 words): CTA at the end. Must include:
   - The live URL or "GitHub link below"
   - Cliffhanger: ${cliffhanger}
   - "Subscribe so you don't miss it" (or equivalent)

Output STRICTLY this JSON shape (no prose before/after):
{
  "hook": "...",
  "outro": "..."
}

Optionally also include "context" (one mid-film line, 5s) if it adds value, but skip if redundant with hook.
`
}

export const validateVoiceoverScript = (raw: unknown): VoiceoverLines => {
  let parsed: unknown
  if (typeof raw === 'string') {
    parsed = JSON.parse(raw)
  } else {
    parsed = raw
  }
  return VoiceoverLinesSchema.parse(parsed)
}
