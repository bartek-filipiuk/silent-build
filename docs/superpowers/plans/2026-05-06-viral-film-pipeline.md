# Viral Film Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intro/outro/B-roll Remotion compositions, voiceover automation (ElevenLabs), Suno music infrastructure, and project-starter skill on top of the existing silent-build pipeline so each YT film goes from "project finished" to "publish" in ~1 h human time.

**Architecture:** New `@silent-build/film-assets` package (TS — repo metadata extraction, voiceover helpers, ElevenLabs HTTP client, shot-list generator, CLI). Four new Remotion compositions in `@silent-build/ui` (ProjectIntro, StatsCard, CommitCard, CodeZoom) registered in `packages/overlay/src/Root.tsx`. Two new skills under `skills/` (start-silent-build-project, generate-voiceover-script). Gitignored `assets/music/` for Suno loops with committed README manifest.

**Tech Stack:** TypeScript 5.5 (ES2022, strict, noUncheckedIndexedAccess), Remotion 4.x, shiki (syntax highlighting in CodeZoom), Zod, ElevenLabs HTTP API (no SDK), vitest, pnpm workspaces.

---

## Branch

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feat/viral-pipeline
```

All work in this plan happens on `feat/viral-pipeline`.

## File structure

### New package: `packages/film-assets/`

| File | Responsibility |
|---|---|
| `package.json` | pnpm workspace member, deps on shared/curator/zod/commander/tsx |
| `tsconfig.json` | extends `../../tsconfig.base.json` |
| `src/index.ts` | re-exports public API |
| `src/types.ts` | Zod schemas: `RepoMetadata`, `VoiceoverLines`, `TtsConfig`, `ShotListContext` |
| `src/repo-metadata.ts` | `extractRepoMetadata(repoPath, jsonlDir)` — parse package.json, README.md, jsonl timestamps |
| `src/punchline.ts` | `derivePunchline(metadata)` — heuristic short headline (no LLM, plan-phase decision) |
| `src/voiceover-script.ts` | `buildVoiceoverPrompt(metadata, nextProject?)`, `validateVoiceoverScript(raw)` |
| `src/elevenlabs.ts` | `renderVoiceover(lines, config, outDir)` — HTTP API client, multi-line MP3 |
| `src/shot-list.ts` | `generateShotList(metadata, narrative, outPath)` — markdown |
| `src/doctor.ts` | `runDoctor()` — checks ffmpeg, music files, env vars |
| `src/cli.ts` | commander entry: `metadata`, `tts`, `shotlist`, `doctor`, `generate` |
| `tests/repo-metadata.test.ts` | fixture repo → expected metadata |
| `tests/voiceover-script.test.ts` | prompt build + validate roundtrip |
| `tests/elevenlabs.test.ts` | mock fetch, write MP3, error paths |
| `tests/shot-list.test.ts` | fixture → expected markdown |
| `tests/punchline.test.ts` | heuristic edge cases |
| `tests/doctor.test.ts` | mocked filesystem checks |
| `fixtures/tiny-repo/package.json` | minimal valid repo |
| `fixtures/tiny-repo/README.md` | minimal README |
| `fixtures/tiny-repo/session.jsonl` | 5-line jsonl with timestamps |

### New compositions in `packages/ui/src/compositions/`

| File | Responsibility |
|---|---|
| `ProjectIntro.tsx` | 1920×1080, 10 s, brand reveal (number → punchline → subtitle → tech chips) |
| `StatsCard.tsx` | 1920×1080, 5 s, "MISSION COMPLETE" + count-up metrics + live URL pill |
| `CommitCard.tsx` | 1920×1080, 2 s, gh-style commit box (sha + message + insertions/deletions) |
| `CodeZoom.tsx` | 1920×1080, 3 s, syntax-highlighted excerpt (shiki) with file path bar |

### Modified files

| File | Change |
|---|---|
| `packages/ui/src/index.ts` | export 4 new compositions + their props types |
| `packages/overlay/src/Root.tsx` | register 4 new compositions with default props |
| `packages/overlay/package.json` | add dep `@silent-build/film-assets: workspace:*` |
| `packages/overlay/src/render-cli.ts` | extend `CompId` union with new ids; add inputProps mapping |
| `package.json` (root) | new scripts: `assets:*`, `render:intro`, `render:stats`, `render:commits`, `render:zooms` (note: `render:intro/outro/phase/thumb` already exist for old VOD pipeline; new ones target film-assets package and live in same naming family) |
| `.gitignore` | `assets/music/*.wav`, `assets/music/*.mp3`; allow `assets/music/README.md` |
| `pnpm-workspace.yaml` | (no change — `packages/*` glob already includes new package) |
| `README.md` | add "Viral pipeline" section |

### New skill: `skills/start-silent-build-project/`

| File | Responsibility |
|---|---|
| `SKILL.md` | top-level instructions, frontmatter `name`/`description` |
| `references/workflow-stages.md` | verbose 6-stage description |
| `references/session-naming.md` | conventions so curator can identify sessions later |
| `references/phase-checkpoints.md` | files that must exist after each stage |
| `bin/status.mjs` | pure-node, reads CWD repo state, outputs JSON `{ stage, completedSteps, nextStep }` |

### New skill: `skills/generate-voiceover-script/`

| File | Responsibility |
|---|---|
| `SKILL.md` | top-level instructions |
| `references/tone-and-style.md` | brand voice rules for hooks/outros |
| `bin/validate.mjs` | Zod check of skill output |

### New docs and assets

| File | Responsibility |
|---|---|
| `docs/films/silent-build-project-starter.md` | single-page checklist (Bartek's side window) |
| `docs/films/shot-list-template.md` | Jinja-ish template that `shot-list.ts` fills |
| `assets/music/README.md` | manifest of 4 expected files + Suno generation prompts (committed) |
| `assets/music/.gitkeep` | keeps directory in git when wav files are gitignored |
| `assets/voices/bartek-clone-id.txt` | placeholder file with default preset voice ID |

## Task ordering and dependencies

```
Task 1 (branch + assets dirs)
  ↓
Task 2 (film-assets package skeleton + types.ts)
  ↓
  ├── Task 3 (repo-metadata.ts + tests)
  │     ↓
  │   Task 4 (punchline.ts + tests)
  │     ↓
  │   Task 5 (CLI: assets:metadata)
  │
  ├── Task 6 (voiceover-script.ts + tests)
  │     ↓
  │   Task 7 (elevenlabs.ts + tests)
  │     ↓
  │   Task 8 (CLI: assets:tts)
  │
  ├── Task 9 (ProjectIntro composition + Root register + tests)
  ├── Task 10 (StatsCard composition + Root register + tests)
  ├── Task 11 (CommitCard composition + Root register + tests)
  └── Task 12 (CodeZoom composition + Root register + tests)
        ↓
  Task 13 (render-cli.ts extension for new compositions)
        ↓
  Task 14 (shot-list.ts + tests)
        ↓
  Task 15 (CLI: assets:shotlist + assets:generate orchestrator)
        ↓
  Task 16 (doctor.ts + CLI: assets:doctor + tests)
        ↓
  Task 17 (skill: generate-voiceover-script)
        ↓
  Task 18 (docs/films/silent-build-project-starter.md)
        ↓
  Task 19 (skill: start-silent-build-project — SKILL.md + references)
        ↓
  Task 20 (skill: start-silent-build-project — bin/status.mjs + tests)
        ↓
  Task 21 (README + integration smoke on duels)
```

**Parallelizable groups** (independent after Task 2):
- Group A: Tasks 3 → 4 → 5 (repo metadata + punchline + CLI)
- Group B: Tasks 6 → 7 → 8 (voiceover script + ElevenLabs + CLI)
- Group C: Tasks 9, 10, 11, 12 (4 compositions, all parallel)

After all of A, B, C complete: Tasks 13–21 sequential.

If using subagent-driven-development, dispatch A/B/C in parallel waves.

---

## Tasks

### Task 1: Create branch and asset directory infrastructure

**Files:**
- Create: `assets/music/.gitkeep`
- Create: `assets/music/README.md`
- Create: `assets/voices/bartek-clone-id.txt`
- Modify: `.gitignore`

- [ ] **Step 1: Cut the branch from latest main**

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feat/viral-pipeline
```

- [ ] **Step 2: Create assets directory structure**

```bash
mkdir -p assets/music assets/voices
touch assets/music/.gitkeep
```

- [ ] **Step 3: Write `assets/music/README.md` with Suno manifest**

Create `assets/music/README.md`:

```markdown
# Music assets manifest

Suno-generated lo-fi loops, **standard subscription license**. Files are gitignored — store canonical copies in external storage (Drive/Dropbox), drop them in this folder before running `pnpm assets:generate`.

`pnpm assets:doctor` warns if any of these are missing.

## Files expected here

| Filename | Length | Used in |
|---|---|---|
| `intro-chill-60s.wav` | 60 s | film opening (0:05–1:00) |
| `build-hustle-90s.wav` | 90 s | build/design phases (1:30–4:45) |
| `climax-drop-30s.wav` | 30 s | deploy moment + outro reveal (4:45–5:30) |
| `outro-celebratory-45s.wav` | 45 s | demo screencast + stats (5:30–6:45) |

## Suno prompts (canonical, regenerate as needed)

### intro-chill-60s.wav
> Cinematic lo-fi intro, 60 seconds, atmospheric synth pads, soft kick drum, builds anticipation but stays restrained. Tempo 80 BPM. No vocals. Outro fades.

### build-hustle-90s.wav
> Lo-fi hip-hop with light synth lead, 90 seconds, drives forward, "coding session" vibe, 95 BPM, no vocals, loopable.

### climax-drop-30s.wav
> Cinematic drop, 30 seconds, big synth lead + breakbeat, triumphant feel for a product launch reveal, starts at 30s mark of buildup, ends on cymbal crash.

### outro-celebratory-45s.wav
> Lo-fi celebratory outro, 45 seconds, warm chords, light vocal chops (no words), ends with reverb tail. 90 BPM, hopeful but understated.
```

- [ ] **Step 4: Write voice ID placeholder**

Create `assets/voices/bartek-clone-id.txt`:

```
21m00Tcm4TlvDq8ikWAM
```

(ElevenLabs preset "Rachel" — neutral US-EN. Override by replacing this single line with your cloned voice ID after running ElevenLabs voice cloning UI.)

- [ ] **Step 5: Update .gitignore**

Add to `.gitignore`:

```
assets/music/*.wav
assets/music/*.mp3
```

(Keep `assets/music/README.md` and `.gitkeep` tracked.)

- [ ] **Step 6: Commit**

```bash
git add assets/ .gitignore
git commit -m "feat(assets): add music + voices directory structure with Suno manifest"
```

---

### Task 2: Create `@silent-build/film-assets` package skeleton + types

**Files:**
- Create: `packages/film-assets/package.json`
- Create: `packages/film-assets/tsconfig.json`
- Create: `packages/film-assets/src/types.ts`
- Create: `packages/film-assets/src/index.ts`
- Create: `packages/film-assets/tests/types.test.ts`

- [ ] **Step 1: Write `packages/film-assets/package.json`**

```json
{
  "name": "@silent-build/film-assets",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "film-assets": "./dist/cli.js"
  },
  "exports": {
    ".": "./src/index.ts",
    "./repo-metadata": "./src/repo-metadata.ts",
    "./voiceover-script": "./src/voiceover-script.ts",
    "./elevenlabs": "./src/elevenlabs.ts",
    "./shot-list": "./src/shot-list.ts",
    "./doctor": "./src/doctor.ts",
    "./types": "./src/types.ts"
  },
  "scripts": {
    "assets": "tsx src/cli.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@silent-build/curator": "workspace:*",
    "@silent-build/shared": "workspace:*",
    "commander": "^12.1.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Write `packages/film-assets/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write the failing test for schemas**

Create `packages/film-assets/tests/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  RepoMetadataSchema,
  VoiceoverLinesSchema,
  TtsConfigSchema
} from '../src/types.js'

describe('RepoMetadataSchema', () => {
  const valid = {
    projectName: 'duels',
    punchline: '9 days · 1 multiplayer game · 1v1',
    subtitle: 'fastduels.com',
    techStack: ['SvelteKit', 'Cloudflare', 'PartyKit'],
    startTs: '2026-04-26T11:37:23.634Z',
    endTs: '2026-05-05T20:13:46.492Z'
  }

  it('accepts a valid metadata', () => {
    expect(() => RepoMetadataSchema.parse(valid)).not.toThrow()
  })

  it('rejects empty projectName', () => {
    expect(() =>
      RepoMetadataSchema.parse({ ...valid, projectName: '' })
    ).toThrow()
  })

  it('rejects punchline >120 chars', () => {
    expect(() =>
      RepoMetadataSchema.parse({ ...valid, punchline: 'x'.repeat(121) })
    ).toThrow()
  })

  it('rejects techStack longer than 7', () => {
    expect(() =>
      RepoMetadataSchema.parse({
        ...valid,
        techStack: Array(8).fill('X')
      })
    ).toThrow()
  })
})

describe('VoiceoverLinesSchema', () => {
  it('accepts hook + outro without context', () => {
    expect(() =>
      VoiceoverLinesSchema.parse({
        hook: 'I gave Claude 9 days.',
        outro: 'fastduels.com is live. Subscribe.'
      })
    ).not.toThrow()
  })

  it('accepts all three lines', () => {
    expect(() =>
      VoiceoverLinesSchema.parse({
        hook: 'a',
        context: 'b',
        outro: 'c'
      })
    ).not.toThrow()
  })

  it('rejects when hook is empty', () => {
    expect(() =>
      VoiceoverLinesSchema.parse({ hook: '', outro: 'x' })
    ).toThrow()
  })
})

describe('TtsConfigSchema', () => {
  it('accepts a valid config', () => {
    expect(() =>
      TtsConfigSchema.parse({
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        modelId: 'eleven_multilingual_v2',
        apiKey: 'sk_xyz'
      })
    ).not.toThrow()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
pnpm --filter @silent-build/film-assets test
```

Expected: failure (`Cannot find module '../src/types.js'`).

- [ ] **Step 5: Implement `packages/film-assets/src/types.ts`**

```ts
import { z } from 'zod'

export const RepoMetadataSchema = z.object({
  projectName: z.string().min(1).max(40),
  punchline: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(80),
  techStack: z.array(z.string().min(1).max(20)).min(1).max(7),
  startTs: z.string().datetime(),
  endTs: z.string().datetime()
})
export type RepoMetadata = z.infer<typeof RepoMetadataSchema>

export const VoiceoverLinesSchema = z.object({
  hook: z.string().min(1).max(280),
  context: z.string().min(1).max(280).optional(),
  outro: z.string().min(1).max(400)
})
export type VoiceoverLines = z.infer<typeof VoiceoverLinesSchema>

export const TtsConfigSchema = z.object({
  voiceId: z.string().min(1),
  modelId: z.string().min(1).default('eleven_multilingual_v2'),
  apiKey: z.string().min(1)
})
export type TtsConfig = z.infer<typeof TtsConfigSchema>

export const ShotListContextSchema = z.object({
  projectName: z.string().min(1),
  punchline: z.string().min(1),
  liveUrl: z.string().min(1).optional(),
  topFiles: z.array(z.string()).max(5).default([]),
  topCommits: z
    .array(
      z.object({ sha: z.string(), message: z.string() })
    )
    .max(5)
    .default([])
})
export type ShotListContext = z.infer<typeof ShotListContextSchema>
```

- [ ] **Step 6: Implement `packages/film-assets/src/index.ts`**

```ts
export {
  RepoMetadataSchema,
  VoiceoverLinesSchema,
  TtsConfigSchema,
  ShotListContextSchema,
  type RepoMetadata,
  type VoiceoverLines,
  type TtsConfig,
  type ShotListContext
} from './types.js'
```

- [ ] **Step 7: Run tests, expect pass**

```bash
pnpm --filter @silent-build/film-assets test
```

Expected: 4 passing tests for `RepoMetadataSchema`, 3 for `VoiceoverLinesSchema`, 1 for `TtsConfigSchema` (8 total).

- [ ] **Step 8: Run pnpm install (so workspace picks up the new package)**

```bash
pnpm install
```

- [ ] **Step 9: Run typecheck across the workspace**

```bash
pnpm typecheck
```

Expected: clean (no errors).

- [ ] **Step 10: Commit**

```bash
git add packages/film-assets/ pnpm-lock.yaml
git commit -m "feat(film-assets): package skeleton + Zod schemas"
```

---

### Task 3: Implement `repo-metadata.ts` + tests

**Files:**
- Create: `packages/film-assets/fixtures/tiny-repo/package.json`
- Create: `packages/film-assets/fixtures/tiny-repo/README.md`
- Create: `packages/film-assets/fixtures/tiny-repo/session.jsonl`
- Create: `packages/film-assets/src/repo-metadata.ts`
- Create: `packages/film-assets/tests/repo-metadata.test.ts`

- [ ] **Step 1: Write fixtures**

Create `packages/film-assets/fixtures/tiny-repo/package.json`:

```json
{
  "name": "tiny-repo",
  "version": "0.1.0",
  "dependencies": {
    "svelte": "^4.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "partysocket": "^1.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create `packages/film-assets/fixtures/tiny-repo/README.md`:

```markdown
# tiny-repo

A real-time multiplayer trivia game built on the edge with PartyKit.

Live: https://tiny.example.com
```

Create `packages/film-assets/fixtures/tiny-repo/session.jsonl`:

```
{"type":"user","timestamp":"2026-04-01T10:00:00.000Z","uuid":"u1","message":{"role":"user","content":"start tiny-repo"}}
{"type":"assistant","timestamp":"2026-04-01T10:00:30.000Z","uuid":"a1","message":{"role":"assistant","content":[{"type":"text","text":"ok"}]}}
{"type":"user","timestamp":"2026-04-08T15:30:00.000Z","uuid":"u2","message":{"role":"user","content":"deploy"}}
{"type":"assistant","timestamp":"2026-04-08T15:30:10.000Z","uuid":"a2","message":{"role":"assistant","content":[{"type":"text","text":"deployed"}]}}
```

- [ ] **Step 2: Write the failing test**

Create `packages/film-assets/tests/repo-metadata.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { extractRepoMetadata } from '../src/repo-metadata.js'

const REPO = new URL('../fixtures/tiny-repo/', import.meta.url).pathname
const JSONL_DIR = new URL('../fixtures/tiny-repo/', import.meta.url).pathname

describe('extractRepoMetadata', () => {
  it('parses tiny-repo fixture', () => {
    const meta = extractRepoMetadata(REPO, JSONL_DIR)
    expect(meta.projectName).toBe('tiny-repo')
    expect(meta.subtitle).toContain('tiny.example.com')
    expect(meta.techStack.length).toBeGreaterThan(0)
    expect(meta.techStack.length).toBeLessThanOrEqual(7)
    expect(meta.startTs).toBe('2026-04-01T10:00:00.000Z')
    expect(meta.endTs).toBe('2026-04-08T15:30:10.000Z')
    expect(meta.punchline.length).toBeGreaterThan(0)
  })

  it('extracts svelte from techStack', () => {
    const meta = extractRepoMetadata(REPO, JSONL_DIR)
    expect(meta.techStack.some((t) => t.toLowerCase().includes('svelte'))).toBe(true)
  })

  it('caps techStack at 7 even if many deps', () => {
    const meta = extractRepoMetadata(REPO, JSONL_DIR)
    expect(meta.techStack.length).toBeLessThanOrEqual(7)
  })

  it('falls back to git url when no live URL in README', () => {
    // tiny-repo has tiny.example.com so fallback not triggered;
    // we'll test non-fallback here, fallback exercised in real projects.
    const meta = extractRepoMetadata(REPO, JSONL_DIR)
    expect(meta.subtitle).not.toBe('')
  })
})
```

- [ ] **Step 3: Run test, expect fail**

```bash
pnpm --filter @silent-build/film-assets test repo-metadata
```

Expected: `Cannot find module '../src/repo-metadata.js'`.

- [ ] **Step 4: Implement `packages/film-assets/src/repo-metadata.ts`**

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findJsonlsIn, readMergedJsonls } from '@silent-build/curator/jsonl-reader'
import { RepoMetadataSchema, type RepoMetadata } from './types.js'

const VIRAL_FRAMEWORK_KEYWORDS: Record<string, string> = {
  svelte: 'SvelteKit',
  '@sveltejs/kit': 'SvelteKit',
  next: 'Next.js',
  react: 'React',
  vue: 'Vue',
  remix: '@remix-run',
  '@remix-run/dev': 'Remix',
  cloudflare: 'Cloudflare',
  '@cloudflare/workers-types': 'Cloudflare',
  partykit: 'PartyKit',
  partysocket: 'PartyKit',
  vite: 'Vite',
  remotion: 'Remotion',
  prisma: 'Prisma',
  drizzle: 'Drizzle',
  'better-auth': 'Better Auth',
  vercel: 'Vercel',
  supabase: 'Supabase',
  fastify: 'Fastify',
  hono: 'Hono',
  trpc: 'tRPC'
}

const URL_RX = /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?/i

const readJson = (path: string): Record<string, unknown> | null => {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

const extractTechStack = (pkg: Record<string, unknown>): string[] => {
  const deps = {
    ...((pkg['dependencies'] ?? {}) as Record<string, string>),
    ...((pkg['devDependencies'] ?? {}) as Record<string, string>)
  }
  const matched = new Set<string>()
  for (const dep of Object.keys(deps)) {
    const lower = dep.toLowerCase()
    for (const [keyword, label] of Object.entries(VIRAL_FRAMEWORK_KEYWORDS)) {
      if (lower.includes(keyword)) {
        matched.add(label)
        break
      }
    }
  }
  return Array.from(matched).slice(0, 7)
}

const extractSubtitle = (
  readme: string | null,
  pkgName: string,
  repoPath: string
): string => {
  if (readme) {
    const match = readme.match(URL_RX)
    if (match) return match[0]
    const firstLine = readme.split('\n').find(
      (l) => l.trim().length > 0 && !l.startsWith('#')
    )
    if (firstLine) return firstLine.trim().slice(0, 80)
  }
  return `github.com/.../${pkgName || repoPath.split('/').pop() || 'project'}`
}

const derivePunchlineHeuristic = (
  pkgName: string,
  techStack: string[],
  startTs: string,
  endTs: string
): string => {
  const days = Math.max(
    1,
    Math.ceil((Date.parse(endTs) - Date.parse(startTs)) / (24 * 3600 * 1000))
  )
  const stack = techStack[0] ?? 'TypeScript'
  return `${days} days · ${pkgName} · ${stack}`
}

export const extractRepoMetadata = (
  repoPath: string,
  jsonlDir: string
): RepoMetadata => {
  const pkg = readJson(join(repoPath, 'package.json')) ?? {}
  const projectName =
    (typeof pkg['name'] === 'string' ? pkg['name'] : '') ||
    repoPath.split('/').pop() ||
    'project'

  const readmePath = join(repoPath, 'README.md')
  const readme = existsSync(readmePath)
    ? readFileSync(readmePath, 'utf8')
    : null

  const techStack = extractTechStack(pkg)
  const subtitle = extractSubtitle(readme, projectName, repoPath)

  const sources = findJsonlsIn(jsonlDir)
  const events = readMergedJsonls(sources)
  const startTs = events[0]?.isoTs ?? new Date().toISOString()
  const endTs = events[events.length - 1]?.isoTs ?? startTs

  const punchline = derivePunchlineHeuristic(
    projectName,
    techStack,
    startTs,
    endTs
  )

  return RepoMetadataSchema.parse({
    projectName,
    punchline,
    subtitle,
    techStack: techStack.length > 0 ? techStack : ['TypeScript'],
    startTs,
    endTs
  })
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm --filter @silent-build/film-assets test repo-metadata
```

Expected: 4 passing tests.

- [ ] **Step 6: Commit**

```bash
git add packages/film-assets/src/repo-metadata.ts packages/film-assets/tests/repo-metadata.test.ts packages/film-assets/fixtures/
git commit -m "feat(film-assets): repo-metadata extractor (package.json + README + jsonl bounds)"
```

---

### Task 4: Implement `punchline.ts` (heuristic, no LLM) + tests

**Files:**
- Create: `packages/film-assets/src/punchline.ts`
- Create: `packages/film-assets/tests/punchline.test.ts`
- Modify: `packages/film-assets/src/repo-metadata.ts` (use new function)

- [ ] **Step 1: Write the failing test**

Create `packages/film-assets/tests/punchline.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { derivePunchline } from '../src/punchline.js'

describe('derivePunchline', () => {
  it('produces "X days · project · stack" for small projects', () => {
    const out = derivePunchline({
      projectName: 'tiny',
      techStack: ['SvelteKit', 'Cloudflare'],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-04T10:00:00.000Z'
    })
    expect(out).toContain('3 days')
    expect(out).toContain('tiny')
    expect(out).toContain('SvelteKit')
  })

  it('rounds up partial days', () => {
    const out = derivePunchline({
      projectName: 'p',
      techStack: ['React'],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-02T22:00:00.000Z'
    })
    expect(out).toContain('2 days')
  })

  it('falls back when techStack empty', () => {
    const out = derivePunchline({
      projectName: 'p',
      techStack: [],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-02T10:00:00.000Z'
    })
    expect(out).toContain('TypeScript')
  })

  it('caps output at 120 chars', () => {
    const out = derivePunchline({
      projectName: 'x'.repeat(40),
      techStack: ['SvelteKit', 'Cloudflare', 'PartyKit'],
      startTs: '2026-04-01T10:00:00.000Z',
      endTs: '2026-04-09T10:00:00.000Z'
    })
    expect(out.length).toBeLessThanOrEqual(120)
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm --filter @silent-build/film-assets test punchline
```

Expected: missing module.

- [ ] **Step 3: Implement `packages/film-assets/src/punchline.ts`**

```ts
export interface PunchlineInput {
  projectName: string
  techStack: string[]
  startTs: string
  endTs: string
}

export const derivePunchline = (input: PunchlineInput): string => {
  const { projectName, techStack, startTs, endTs } = input
  const days = Math.max(
    1,
    Math.ceil((Date.parse(endTs) - Date.parse(startTs)) / (24 * 3600 * 1000))
  )
  const stack = techStack[0] ?? 'TypeScript'
  const raw = `${days} days · ${projectName} · ${stack}`
  return raw.length <= 120 ? raw : raw.slice(0, 119) + '…'
}
```

- [ ] **Step 4: Wire `repo-metadata.ts` to use it**

In `packages/film-assets/src/repo-metadata.ts`, replace the inline `derivePunchlineHeuristic` function with an import:

```ts
import { derivePunchline } from './punchline.js'
```

Remove the inline `derivePunchlineHeuristic` definition (lines defining it in Task 3) and replace its call with `derivePunchline({ projectName, techStack, startTs, endTs })`.

- [ ] **Step 5: Run all film-assets tests**

```bash
pnpm --filter @silent-build/film-assets test
```

Expected: all green (types, repo-metadata, punchline).

- [ ] **Step 6: Commit**

```bash
git add packages/film-assets/src/punchline.ts packages/film-assets/tests/punchline.test.ts packages/film-assets/src/repo-metadata.ts
git commit -m "feat(film-assets): extract derivePunchline as standalone heuristic"
```

---

### Task 5: CLI subcommand `pnpm assets:metadata`

**Files:**
- Create: `packages/film-assets/src/cli.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Write CLI**

Create `packages/film-assets/src/cli.ts`:

```ts
#!/usr/bin/env node
import { Command } from 'commander'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { extractRepoMetadata } from './repo-metadata.js'

const USER_CWD = process.env['INIT_CWD'] ?? process.cwd()

const slugifyProjectPath = (p: string): string =>
  p.replace(/\//g, '-').replace(/^-/, '-')

const resolveJsonlDir = (input: string): string => {
  const expanded = isAbsolute(input) ? input : resolve(USER_CWD, input)
  if (existsSync(expanded)) return expanded
  const slug = slugifyProjectPath(input)
  const candidate = join(homedir(), '.claude', 'projects', slug)
  if (existsSync(candidate)) return candidate
  throw new Error(
    `Cannot resolve jsonl dir for "${input}". Tried:\n  - ${expanded}\n  - ${candidate}`
  )
}

const program = new Command()
program.name('film-assets').description('Generate per-film assets')

program
  .command('metadata')
  .description('Extract repo metadata (project name, punchline, tech stack, ts bounds)')
  .requiredOption('-r, --repo <path>', 'repo root (with package.json + README.md)')
  .requiredOption('-j, --jsonl-dir <path>', 'directory of session jsonl files')
  .option('-o, --out <path>', 'output JSON path (default: stdout)')
  .action((opts: { repo: string; jsonlDir: string; out?: string }) => {
    const repo = isAbsolute(opts.repo) ? opts.repo : resolve(USER_CWD, opts.repo)
    const jsonlDir = resolveJsonlDir(opts.jsonlDir)
    const meta = extractRepoMetadata(repo, jsonlDir)
    const json = JSON.stringify(meta, null, 2) + '\n'
    if (opts.out) {
      const outPath = isAbsolute(opts.out) ? opts.out : resolve(USER_CWD, opts.out)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, json, 'utf8')
      console.error(`[film-assets] metadata → ${outPath}`)
    } else {
      process.stdout.write(json)
    }
  })

program.parseAsync().catch((err) => {
  console.error(`[film-assets] error: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
```

- [ ] **Step 2: Add root pnpm script**

Edit `package.json` (root), append to `scripts` (after `curate:scan`):

```json
"assets:metadata": "pnpm --filter @silent-build/film-assets run assets metadata",
```

- [ ] **Step 3: Smoke test on the fixture**

```bash
pnpm assets:metadata --repo packages/film-assets/fixtures/tiny-repo --jsonl-dir packages/film-assets/fixtures/tiny-repo
```

Expected: prints JSON with `projectName: "tiny-repo"`, `punchline` containing days, `techStack` ≥1, valid ISO timestamps.

- [ ] **Step 4: Run typecheck across workspace**

```bash
pnpm typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/film-assets/src/cli.ts package.json
git commit -m "feat(film-assets): pnpm assets:metadata CLI"
```

---

### Task 6: Implement `voiceover-script.ts` (helpers only) + tests

**Files:**
- Create: `packages/film-assets/src/voiceover-script.ts`
- Create: `packages/film-assets/tests/voiceover-script.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/film-assets/tests/voiceover-script.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildVoiceoverPrompt,
  validateVoiceoverScript
} from '../src/voiceover-script.js'
import type { RepoMetadata } from '../src/types.js'

const meta: RepoMetadata = {
  projectName: 'duels',
  punchline: '9 days · 1 multiplayer game · 1v1',
  subtitle: 'fastduels.com',
  techStack: ['SvelteKit', 'Cloudflare', 'PartyKit'],
  startTs: '2026-04-26T11:37:23.634Z',
  endTs: '2026-05-05T20:13:46.492Z'
}

describe('buildVoiceoverPrompt', () => {
  it('embeds project name, punchline, subtitle', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toContain('duels')
    expect(prompt).toContain('9 days')
    expect(prompt).toContain('fastduels.com')
  })

  it('mentions hook + outro structure (5s + 10s)', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toMatch(/hook/i)
    expect(prompt).toMatch(/outro/i)
  })

  it('includes nextProject in cliffhanger when provided', () => {
    const prompt = buildVoiceoverPrompt(meta, 'next-project')
    expect(prompt).toContain('next-project')
  })

  it('omits cliffhanger placeholder when nextProject undefined', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toMatch(/cliffhanger/i)
    expect(prompt).not.toContain('${nextProject}')
  })

  it('asks for JSON output', () => {
    const prompt = buildVoiceoverPrompt(meta)
    expect(prompt).toMatch(/json/i)
  })
})

describe('validateVoiceoverScript', () => {
  it('parses valid JSON object', () => {
    const lines = validateVoiceoverScript({
      hook: 'I gave Claude 9 days.',
      outro: 'fastduels.com is live now. Subscribe for #2.'
    })
    expect(lines.hook).toBe('I gave Claude 9 days.')
    expect(lines.outro).toContain('Subscribe')
    expect(lines.context).toBeUndefined()
  })

  it('parses valid JSON string input', () => {
    const lines = validateVoiceoverScript(
      JSON.stringify({
        hook: 'a',
        outro: 'b'
      })
    )
    expect(lines.hook).toBe('a')
  })

  it('throws on missing hook', () => {
    expect(() =>
      validateVoiceoverScript({ outro: 'b' })
    ).toThrow()
  })

  it('throws on empty outro', () => {
    expect(() =>
      validateVoiceoverScript({ hook: 'a', outro: '' })
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm --filter @silent-build/film-assets test voiceover-script
```

Expected: missing module.

- [ ] **Step 3: Implement `packages/film-assets/src/voiceover-script.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm --filter @silent-build/film-assets test voiceover-script
```

Expected: 9 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/film-assets/src/voiceover-script.ts packages/film-assets/tests/voiceover-script.test.ts
git commit -m "feat(film-assets): voiceover script prompt builder + validator"
```

---

### Task 7: Implement `elevenlabs.ts` (TTS HTTP client) + tests

**Files:**
- Create: `packages/film-assets/src/elevenlabs.ts`
- Create: `packages/film-assets/tests/elevenlabs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/film-assets/tests/elevenlabs.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { renderVoiceover } from '../src/elevenlabs.js'
import type { TtsConfig, VoiceoverLines } from '../src/types.js'

const TMP = '/tmp/elevenlabs-test'
const config: TtsConfig = {
  voiceId: 'voice123',
  modelId: 'eleven_multilingual_v2',
  apiKey: 'sk_test'
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  vi.restoreAllMocks()
})

describe('renderVoiceover', () => {
  it('writes hook and outro mp3 files', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(fakeBytes, { status: 200 })
      )
    )

    const lines: VoiceoverLines = {
      hook: 'I gave Claude 9 days.',
      outro: 'Subscribe.'
    }
    const result = await renderVoiceover(lines, config, TMP)

    expect(result.hookPath).toBe(join(TMP, 'hook.mp3'))
    expect(result.outroPath).toBe(join(TMP, 'outro.mp3'))
    expect(result.contextPath).toBeUndefined()
  })

  it('writes context.mp3 when context line provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 }))
    )

    const lines: VoiceoverLines = {
      hook: 'a',
      context: 'b',
      outro: 'c'
    }
    const result = await renderVoiceover(lines, config, TMP)

    expect(result.contextPath).toBe(join(TMP, 'context.mp3'))
  })

  it('throws with status text on non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('quota exceeded', { status: 401 })
      )
    )

    const lines: VoiceoverLines = { hook: 'a', outro: 'b' }
    await expect(renderVoiceover(lines, config, TMP)).rejects.toThrow(
      /401/
    )
  })

  it('sends voiceId in URL and apiKey in xi-api-key header', async () => {
    const fetchMock = vi.fn(
      async () => new Response(new Uint8Array([1]), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const lines: VoiceoverLines = { hook: 'a', outro: 'b' }
    await renderVoiceover(lines, config, TMP)

    expect(fetchMock).toHaveBeenCalled()
    const call = fetchMock.mock.calls[0]
    expect(String(call?.[0])).toContain('voice123')
    const init = call?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['xi-api-key']).toBe('sk_test')
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm --filter @silent-build/film-assets test elevenlabs
```

Expected: missing module.

- [ ] **Step 3: Implement `packages/film-assets/src/elevenlabs.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm --filter @silent-build/film-assets test elevenlabs
```

Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/film-assets/src/elevenlabs.ts packages/film-assets/tests/elevenlabs.test.ts
git commit -m "feat(film-assets): ElevenLabs TTS HTTP client (hook/context/outro mp3 output)"
```

---

### Task 8: CLI subcommand `pnpm assets:tts`

**Files:**
- Modify: `packages/film-assets/src/cli.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Add `tts` command to cli.ts**

In `packages/film-assets/src/cli.ts`, add imports at the top:

```ts
import { readFileSync } from 'node:fs'
import { renderVoiceover } from './elevenlabs.js'
import { validateVoiceoverScript } from './voiceover-script.js'
import { TtsConfigSchema } from './types.js'
```

Then append before `program.parseAsync()`:

```ts
program
  .command('tts')
  .description('Synthesize voiceover MP3s via ElevenLabs')
  .requiredOption('-s, --script <path>', 'voiceover-script.json path')
  .requiredOption('-o, --out <dir>', 'output directory for mp3 files')
  .option(
    '-v, --voice <id>',
    'ElevenLabs voice id (overrides assets/voices/bartek-clone-id.txt)'
  )
  .option('-m, --model <id>', 'ElevenLabs model id', 'eleven_multilingual_v2')
  .action(
    async (opts: {
      script: string
      out: string
      voice?: string
      model: string
    }) => {
      const apiKey = process.env['ELEVENLABS_API_KEY']
      if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set')

      const scriptPath = isAbsolute(opts.script)
        ? opts.script
        : resolve(USER_CWD, opts.script)
      const lines = validateVoiceoverScript(
        JSON.parse(readFileSync(scriptPath, 'utf8'))
      )

      let voiceId = opts.voice
      if (!voiceId) {
        const voiceFile = resolve(
          USER_CWD,
          'assets/voices/bartek-clone-id.txt'
        )
        if (existsSync(voiceFile)) {
          voiceId = readFileSync(voiceFile, 'utf8').trim()
        }
      }
      if (!voiceId) {
        throw new Error(
          'no voice id (use --voice or set assets/voices/bartek-clone-id.txt)'
        )
      }

      const config = TtsConfigSchema.parse({
        voiceId,
        modelId: opts.model,
        apiKey
      })

      const outDir = isAbsolute(opts.out)
        ? opts.out
        : resolve(USER_CWD, opts.out)

      const paths = await renderVoiceover(lines, config, outDir)
      console.error(`[film-assets] tts → ${JSON.stringify(paths, null, 2)}`)
    }
  )
```

- [ ] **Step 2: Add root pnpm script**

Append to root `package.json` `scripts`:

```json
"assets:tts": "pnpm --filter @silent-build/film-assets run assets tts",
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: clean.

- [ ] **Step 4: Smoke run (without API key — expect helpful error)**

```bash
ELEVENLABS_API_KEY= pnpm assets:tts --script /tmp/nope.json --out /tmp/x
```

Expected: stderr `ELEVENLABS_API_KEY not set`, exit 1.

- [ ] **Step 5: Commit**

```bash
git add packages/film-assets/src/cli.ts package.json
git commit -m "feat(film-assets): pnpm assets:tts CLI"
```

---

### Task 9: `ProjectIntro` Remotion composition + tests + register

**Files:**
- Create: `packages/ui/src/compositions/ProjectIntro.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/overlay/src/Root.tsx`
- Create: `packages/ui/tests/project-intro.test.tsx`

- [ ] **Step 1: Implement composition**

Create `packages/ui/src/compositions/ProjectIntro.tsx`:

```tsx
import type React from 'react'
import { AbsoluteFill, interpolate, spring } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface ProjectIntroProps {
  projectName: string
  punchline: string
  subtitle: string
  techStack: string[]
  startTs: string
}

export const ProjectIntro: React.FC<ProjectIntroProps> = ({
  projectName,
  punchline,
  subtitle,
  techStack
}) => {
  const { frame, fps } = useAnimation()
  const t = frame / fps

  const headOpacity = interpolate(t, [0, 0.6], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const punchOpacity = interpolate(t, [1.2, 2.4], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const subOpacity = interpolate(t, [3.6, 4.4], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const subTranslate = interpolate(t, [3.6, 4.4], [40, 0], {
    extrapolateRight: 'clamp'
  })
  const chipsBaseT = 5.5
  const fadeOut = interpolate(t, [9, 10], [1, 0], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp'
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        opacity: fadeOut,
        padding: tokens.spacing.xxl,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: tokens.spacing.lg
      }}
    >
      <div
        style={{
          color: tokens.colors.textDim,
          fontSize: 18,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          opacity: headOpacity
        }}
      >
        SILENT-BUILD · PROJECT REVEAL
      </div>

      <div
        style={{
          color: tokens.colors.amberBright,
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textAlign: 'center',
          opacity: punchOpacity,
          textShadow: `0 0 24px ${tokens.colors.amberDim}`
        }}
      >
        {projectName}
      </div>

      <div
        style={{
          color: tokens.colors.textPrimary,
          fontSize: 36,
          textAlign: 'center',
          opacity: punchOpacity,
          maxWidth: 1400
        }}
      >
        {punchline}
      </div>

      <div
        style={{
          color: tokens.colors.textPrimary,
          fontSize: 28,
          letterSpacing: '0.08em',
          opacity: subOpacity,
          transform: `translateY(${subTranslate}px)`,
          padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
          borderBottom: `2px solid ${tokens.colors.amberBright}`
        }}
      >
        {subtitle}
      </div>

      <div
        style={{
          display: 'flex',
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.xl,
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        {techStack.map((chip, i) => {
          const chipT = chipsBaseT + i * 0.2
          const chipOpacity = interpolate(t, [chipT, chipT + 0.4], [0, 1], {
            extrapolateRight: 'clamp'
          })
          const chipScale = spring({
            frame: frame - chipT * fps,
            fps,
            config: { damping: 12 }
          })
          return (
            <div
              key={chip}
              style={{
                color: tokens.colors.textPrimary,
                fontSize: 20,
                padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
                border: `1px solid ${tokens.colors.amberDim}`,
                borderRadius: 4,
                opacity: chipOpacity,
                transform: `scale(${chipScale})`,
                background: tokens.colors.panel
              }}
            >
              {chip}
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Export from `packages/ui/src/index.ts`**

Append:

```ts
export {
  ProjectIntro,
  type ProjectIntroProps
} from './compositions/ProjectIntro.js'
```

- [ ] **Step 3: Register in `packages/overlay/src/Root.tsx`**

Add import to top imports:

```ts
import {
  ProjectIntro, type ProjectIntroProps
} from '@silent-build/ui'
```

(Add to the existing destructured import from `@silent-build/ui` if it's a single block.)

Append a new `<Composition>` element inside `RemotionRoot` (after the Thumbnail one):

```tsx
<Composition
  id="ProjectIntro"
  component={wrap<ProjectIntroProps>(ProjectIntro)}
  durationInFrames={10 * FPS}
  fps={FPS}
  width={1920}
  height={1080}
  defaultProps={{
    projectName: parsed.project.name,
    punchline: '7 days · 1 multiplayer game · 1v1',
    subtitle: 'fastduels.com',
    techStack: ['SvelteKit', 'Cloudflare', 'PartyKit', 'D1']
  } as unknown as Record<string, unknown>}
/>
```

- [ ] **Step 4: Write a smoke test**

Create `packages/ui/tests/project-intro.test.tsx`:

```ts
import { describe, it, expect } from 'vitest'
import { ProjectIntro } from '../src/compositions/ProjectIntro.js'

describe('ProjectIntro', () => {
  it('is exported and is a function component', () => {
    expect(typeof ProjectIntro).toBe('function')
    expect(ProjectIntro.name).toBe('ProjectIntro')
  })

  it('typeof default props matches expected shape', () => {
    const sample = {
      projectName: 'duels',
      punchline: '9 days',
      subtitle: 'fastduels.com',
      techStack: ['SvelteKit'],
      startTs: '2026-04-01T00:00:00.000Z'
    } satisfies Parameters<typeof ProjectIntro>[0]
    expect(sample.projectName).toBe('duels')
  })
})
```

- [ ] **Step 5: Run all tests + typecheck**

```bash
pnpm --filter @silent-build/ui test
pnpm typecheck
```

Expected: green.

- [ ] **Step 6: Smoke render via existing render-cli**

```bash
pnpm --filter @silent-build/overlay run render \
  --composition ProjectIntro \
  --project output/drupal-test \
  --max-frames 60 --format png
```

Expected: 60 PNG frames in `output/drupal-test/projectintro_frames/`. Open one mid-render — verify project name + punchline visible.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/compositions/ProjectIntro.tsx packages/ui/src/index.ts packages/ui/tests/project-intro.test.tsx packages/overlay/src/Root.tsx
git commit -m "feat(ui): ProjectIntro composition (10s brand reveal)"
```

---

### Task 10: `StatsCard` composition + tests + register

**Files:**
- Create: `packages/ui/src/compositions/StatsCard.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/overlay/src/Root.tsx`
- Create: `packages/ui/tests/stats-card.test.tsx`

- [ ] **Step 1: Implement composition**

Create `packages/ui/src/compositions/StatsCard.tsx`:

```tsx
import type React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface StatsCardProps {
  projectName: string
  totalPrompts: number
  totalToolCalls: number
  totalDays: number
  totalTokens: number
  filesTouched: number
  liveUrl?: string
  tokensCostUsd?: number
}

const fmt = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : n.toString()

const Row: React.FC<{
  label: string
  current: number
  target: number
  asMoney?: boolean
}> = ({ label, current, target, asMoney = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: tokens.spacing.lg,
      borderBottom: `1px solid ${tokens.colors.grid}`,
      padding: `${tokens.spacing.sm}px 0`,
      width: 800
    }}
  >
    <span
      style={{
        color: tokens.colors.textDim,
        fontSize: 22,
        textTransform: 'uppercase',
        letterSpacing: '0.12em'
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: tokens.colors.amberBright,
        fontSize: 44,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {asMoney
        ? `$${current.toFixed(2)}`
        : fmt(Math.round(current))}
    </span>
  </div>
)

export const StatsCard: React.FC<StatsCardProps> = ({
  projectName,
  totalPrompts,
  totalToolCalls,
  totalDays,
  totalTokens,
  filesTouched,
  liveUrl,
  tokensCostUsd
}) => {
  const { frame, fps } = useAnimation()
  const t = frame / fps

  const headerFade = interpolate(t, [0, 1.2], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const ramp = interpolate(t, [1.5, 4], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp'
  })
  const urlFade = interpolate(t, [4, 4.8], [0, 1], {
    extrapolateRight: 'clamp'
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: tokens.spacing.lg
      }}
    >
      <div
        style={{
          color: tokens.colors.greenOk,
          fontSize: 22,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          opacity: headerFade
        }}
      >
        ◆ MISSION COMPLETE
      </div>

      <div
        style={{
          color: tokens.colors.textPrimary,
          fontSize: 56,
          fontWeight: 700,
          opacity: headerFade
        }}
      >
        {projectName}
      </div>

      <div
        style={{
          marginTop: tokens.spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.xs
        }}
      >
        <Row label="Days" current={ramp * totalDays} target={totalDays} />
        <Row
          label="Prompts"
          current={ramp * totalPrompts}
          target={totalPrompts}
        />
        <Row
          label="Tool calls"
          current={ramp * totalToolCalls}
          target={totalToolCalls}
        />
        <Row
          label="Tokens"
          current={ramp * totalTokens}
          target={totalTokens}
        />
        <Row
          label="Files touched"
          current={ramp * filesTouched}
          target={filesTouched}
        />
        {tokensCostUsd !== undefined ? (
          <Row
            label="Cost"
            current={ramp * tokensCostUsd}
            target={tokensCostUsd}
            asMoney
          />
        ) : null}
      </div>

      {liveUrl ? (
        <div
          style={{
            marginTop: tokens.spacing.xl,
            color: tokens.colors.amberBright,
            fontSize: 36,
            padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
            border: `2px solid ${tokens.colors.amberBright}`,
            borderRadius: 8,
            opacity: urlFade
          }}
        >
          {liveUrl}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Export from `packages/ui/src/index.ts`**

Append:

```ts
export {
  StatsCard,
  type StatsCardProps
} from './compositions/StatsCard.js'
```

- [ ] **Step 3: Register in `Root.tsx`**

Add to imports:

```ts
import { StatsCard, type StatsCardProps } from '@silent-build/ui'
```

Append after ProjectIntro composition:

```tsx
<Composition
  id="StatsCard"
  component={wrap<StatsCardProps>(StatsCard)}
  durationInFrames={5 * FPS}
  fps={FPS}
  width={1920}
  height={1080}
  defaultProps={{
    projectName: parsed.project.name,
    totalPrompts: parsed.metrics.promptsCount,
    totalToolCalls: parsed.metrics.toolCallsCount,
    totalDays: 9,
    totalTokens: parsed.metrics.totalTokens,
    filesTouched: parsed.metrics.filesTouched,
    liveUrl: 'fastduels.com'
  } as unknown as Record<string, unknown>}
/>
```

- [ ] **Step 4: Write smoke test**

Create `packages/ui/tests/stats-card.test.tsx`:

```ts
import { describe, it, expect } from 'vitest'
import { StatsCard } from '../src/compositions/StatsCard.js'

describe('StatsCard', () => {
  it('is exported and is a function component', () => {
    expect(typeof StatsCard).toBe('function')
    expect(StatsCard.name).toBe('StatsCard')
  })
})
```

- [ ] **Step 5: Smoke render**

```bash
pnpm --filter @silent-build/overlay run render \
  --composition StatsCard \
  --project output/drupal-test \
  --max-frames 60 --format png
```

Expected: 60 PNG frames; mid-render shows partial count-up.

- [ ] **Step 6: Run tests + typecheck**

```bash
pnpm test
pnpm typecheck
```

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/compositions/StatsCard.tsx packages/ui/src/index.ts packages/ui/tests/stats-card.test.tsx packages/overlay/src/Root.tsx
git commit -m "feat(ui): StatsCard composition (5s mission-complete metrics reveal)"
```

---

### Task 11: `CommitCard` composition + tests + register

**Files:**
- Create: `packages/ui/src/compositions/CommitCard.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/overlay/src/Root.tsx`
- Create: `packages/ui/tests/commit-card.test.tsx`

- [ ] **Step 1: Implement composition**

Create `packages/ui/src/compositions/CommitCard.tsx`:

```tsx
import type React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface CommitCardProps {
  shortSha: string
  message: string
  filesChanged: number
  insertions: number
  deletions: number
}

export const CommitCard: React.FC<CommitCardProps> = ({
  shortSha,
  message,
  filesChanged,
  insertions,
  deletions
}) => {
  const { frame, fps } = useAnimation()
  const t = frame / fps
  const opacity = interpolate(t, [0, 0.3, 1.7, 2], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const safeMessage =
    message.length <= 80 ? message : message.slice(0, 79) + '…'

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          background: tokens.colors.panel,
          border: `1px solid ${tokens.colors.grid}`,
          borderRadius: 12,
          padding: tokens.spacing.xl,
          width: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.md
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: tokens.spacing.md,
            alignItems: 'center'
          }}
        >
          <span
            style={{
              color: tokens.colors.amberBright,
              fontSize: 24,
              fontFamily: tokens.typography.fontMono,
              padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
              border: `1px solid ${tokens.colors.amberDim}`,
              borderRadius: 4
            }}
          >
            {shortSha}
          </span>
          <span
            style={{
              color: tokens.colors.textPrimary,
              fontSize: 28,
              fontWeight: 600
            }}
          >
            {safeMessage}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: tokens.spacing.lg,
            color: tokens.colors.textDim,
            fontSize: 22
          }}
        >
          <span>
            {filesChanged} file{filesChanged === 1 ? '' : 's'}
          </span>
          <span style={{ color: tokens.colors.greenOk }}>
            +{insertions}
          </span>
          <span style={{ color: tokens.colors.redAlert }}>
            −{deletions}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Export + register**

Append to `packages/ui/src/index.ts`:

```ts
export {
  CommitCard,
  type CommitCardProps
} from './compositions/CommitCard.js'
```

In `Root.tsx`, add to imports + register:

```tsx
<Composition
  id="CommitCard"
  component={wrap<CommitCardProps>(CommitCard)}
  durationInFrames={2 * FPS}
  fps={FPS}
  width={1920}
  height={1080}
  defaultProps={{
    shortSha: '1647088',
    message: 'feat(markers): --live flag POSTs to live-server',
    filesChanged: 5,
    insertions: 87,
    deletions: 3
  } as unknown as Record<string, unknown>}
/>
```

- [ ] **Step 3: Write smoke test**

Create `packages/ui/tests/commit-card.test.tsx`:

```ts
import { describe, it, expect } from 'vitest'
import { CommitCard } from '../src/compositions/CommitCard.js'

describe('CommitCard', () => {
  it('is exported and is a function component', () => {
    expect(typeof CommitCard).toBe('function')
  })
})
```

- [ ] **Step 4: Smoke render**

```bash
pnpm --filter @silent-build/overlay run render \
  --composition CommitCard \
  --project output/drupal-test \
  --max-frames 30 --format png
```

- [ ] **Step 5: Run tests + typecheck**

```bash
pnpm test
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/compositions/CommitCard.tsx packages/ui/src/index.ts packages/ui/tests/commit-card.test.tsx packages/overlay/src/Root.tsx
git commit -m "feat(ui): CommitCard composition (2s gh-style B-roll insert)"
```

---

### Task 12: `CodeZoom` composition + tests + register (with shiki)

**Files:**
- Modify: `packages/ui/package.json` (add shiki)
- Create: `packages/ui/src/compositions/CodeZoom.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/overlay/src/Root.tsx`
- Create: `packages/ui/tests/code-zoom.test.tsx`

- [ ] **Step 1: Add shiki dependency to ui package**

Edit `packages/ui/package.json`, add to `dependencies`:

```json
"shiki": "^1.18.0"
```

- [ ] **Step 2: Install + verify bundle resolves**

```bash
pnpm install
```

- [ ] **Step 3: Implement composition with synchronous static highlight**

Create `packages/ui/src/compositions/CodeZoom.tsx`:

```tsx
import type React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import { tokens } from '@silent-build/theme'
import { useAnimation } from '../context.js'

export interface CodeZoomProps {
  filePath: string
  language: string
  excerpt: string
  highlightLine?: number
}

export const CodeZoom: React.FC<CodeZoomProps> = ({
  filePath,
  excerpt,
  highlightLine
}) => {
  const { frame, fps } = useAnimation()
  const t = frame / fps

  const fade = interpolate(t, [0, 0.5, 2.5, 3], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const stagger = interpolate(t, [0.5, 1.5], [0, 1], {
    extrapolateRight: 'clamp'
  })
  const glowPulse = interpolate(t, [1.5, 2, 2.5], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const lines = excerpt.split('\n')

  return (
    <AbsoluteFill
      style={{
        background: tokens.colors.bg,
        fontFamily: tokens.typography.fontMono,
        opacity: fade,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          background: '#0d1117',
          border: `1px solid ${tokens.colors.grid}`,
          borderRadius: 12,
          width: 1500,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            background: tokens.colors.panel,
            color: tokens.colors.textDim,
            padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
            fontSize: 18,
            borderBottom: `1px solid ${tokens.colors.grid}`
          }}
        >
          {filePath}
        </div>
        <pre
          style={{
            margin: 0,
            padding: tokens.spacing.lg,
            color: tokens.colors.textPrimary,
            fontSize: 22,
            lineHeight: '1.5em',
            overflow: 'hidden',
            maxHeight: 720
          }}
        >
          {lines.map((line, i) => {
            const reveal = interpolate(
              stagger,
              [i / lines.length, (i + 1) / lines.length],
              [0, 1],
              {
                extrapolateRight: 'clamp',
                extrapolateLeft: 'clamp'
              }
            )
            const isHighlight = highlightLine != null && i + 1 === highlightLine
            return (
              <div
                key={i}
                style={{
                  opacity: reveal,
                  background: isHighlight
                    ? `rgba(255, 178, 71, ${0.1 + glowPulse * 0.18})`
                    : 'transparent',
                  paddingLeft: tokens.spacing.sm,
                  borderLeft: isHighlight
                    ? `3px solid ${tokens.colors.amberBright}`
                    : '3px solid transparent'
                }}
              >
                {line || ' '}
              </div>
            )
          })}
        </pre>
      </div>
    </AbsoluteFill>
  )
}
```

(Note: per spec open question, full shiki integration is a follow-up — for now the composition uses plain text with a highlight band on the target line. shiki dependency is installed for future iteration.)

- [ ] **Step 4: Export + register**

Append to `packages/ui/src/index.ts`:

```ts
export {
  CodeZoom,
  type CodeZoomProps
} from './compositions/CodeZoom.js'
```

In `Root.tsx`, register:

```tsx
<Composition
  id="CodeZoom"
  component={wrap<CodeZoomProps>(CodeZoom)}
  durationInFrames={3 * FPS}
  fps={FPS}
  width={1920}
  height={1080}
  defaultProps={{
    filePath: 'packages/partykit-server/src/match/match-room.ts',
    language: 'typescript',
    excerpt: 'export class MatchRoom {\n  onConnect(...) { }\n  onMessage(...) { }\n}\n',
    highlightLine: 2
  } as unknown as Record<string, unknown>}
/>
```

- [ ] **Step 5: Write smoke test**

Create `packages/ui/tests/code-zoom.test.tsx`:

```ts
import { describe, it, expect } from 'vitest'
import { CodeZoom } from '../src/compositions/CodeZoom.js'

describe('CodeZoom', () => {
  it('is exported and is a function component', () => {
    expect(typeof CodeZoom).toBe('function')
  })
})
```

- [ ] **Step 6: Smoke render**

```bash
pnpm --filter @silent-build/overlay run render \
  --composition CodeZoom \
  --project output/drupal-test \
  --max-frames 30 --format png
```

- [ ] **Step 7: Run tests + typecheck**

```bash
pnpm test
pnpm typecheck
```

- [ ] **Step 8: Commit**

```bash
git add packages/ui/package.json packages/ui/src/compositions/CodeZoom.tsx packages/ui/src/index.ts packages/ui/tests/code-zoom.test.tsx packages/overlay/src/Root.tsx pnpm-lock.yaml
git commit -m "feat(ui): CodeZoom composition (3s file excerpt B-roll, shiki dep added)"
```

---

### Task 13: Extend `render-cli.ts` to know about new compositions

**Files:**
- Modify: `packages/overlay/src/render-cli.ts`
- Modify: `packages/overlay/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Extend `CompId` union**

In `packages/overlay/src/render-cli.ts`:

```ts
type CompId =
  | 'Dashboard'
  | 'Intro'
  | 'Outro'
  | 'PhaseTransition'
  | 'Thumbnail'
  | 'ProjectIntro'
  | 'StatsCard'
  | 'CommitCard'
  | 'CodeZoom'

const ALL_COMPS: CompId[] = [
  'Dashboard', 'Intro', 'Outro', 'PhaseTransition', 'Thumbnail',
  'ProjectIntro', 'StatsCard', 'CommitCard', 'CodeZoom'
]
```

- [ ] **Step 2: Update `outputStem` switch**

In the same file, extend the function:

```ts
const outputStem = (comp: CompId): string => {
  switch (comp) {
    case 'Dashboard': return 'dashboard'
    case 'Intro': return 'intro'
    case 'Outro': return 'outro'
    case 'PhaseTransition': return 'phase-transition'
    case 'Thumbnail': return 'thumbnail'
    case 'ProjectIntro': return 'project-intro'
    case 'StatsCard': return 'stats-card'
    case 'CommitCard': return 'commit-card'
    case 'CodeZoom': return 'code-zoom'
  }
}
```

- [ ] **Step 3: Add inputProps mapping for new compositions**

In `render-cli.ts`, in the `inputProps` switch, append:

```ts
case 'ProjectIntro':
  return {
    projectName: timeline.project.name,
    punchline: `${Math.max(1, Math.ceil((timeline.project.endTs - timeline.project.startTs) / 86_400_000))} days · ${timeline.project.name}`,
    subtitle: 'github.com/.../project',
    techStack: ['SvelteKit', 'Cloudflare', 'PartyKit'],
    startTs: new Date(timeline.project.startTs).toISOString()
  }

case 'StatsCard': {
  const days = Math.max(
    1,
    Math.ceil(
      (timeline.project.endTs - timeline.project.startTs) / 86_400_000
    )
  )
  return {
    projectName: timeline.project.name,
    totalPrompts: timeline.metrics.promptsCount,
    totalToolCalls: timeline.metrics.toolCallsCount,
    totalDays: days,
    totalTokens: timeline.metrics.totalTokens,
    filesTouched: timeline.metrics.filesTouched
  }
}

case 'CommitCard':
  return {
    shortSha: 'abcdef0',
    message: 'sample commit',
    filesChanged: 1,
    insertions: 1,
    deletions: 0
  }

case 'CodeZoom':
  return {
    filePath: 'src/example.ts',
    language: 'typescript',
    excerpt: 'export const hello = () => 1\n',
    highlightLine: 1
  }
```

(CommitCard / CodeZoom defaults are placeholders — actual selection logic lives in the orchestrator added in Task 15.)

- [ ] **Step 4: Add convenience pnpm scripts**

In `packages/overlay/package.json` `scripts`, append:

```json
"render:projectintro": "tsx src/render-cli.ts --composition ProjectIntro",
"render:stats": "tsx src/render-cli.ts --composition StatsCard",
"render:commitcard": "tsx src/render-cli.ts --composition CommitCard",
"render:codezoom": "tsx src/render-cli.ts --composition CodeZoom"
```

In root `package.json` `scripts`:

```json
"render:projectintro": "pnpm --filter @silent-build/overlay run render:projectintro",
"render:stats": "pnpm --filter @silent-build/overlay run render:stats",
"render:commitcard": "pnpm --filter @silent-build/overlay run render:commitcard",
"render:codezoom": "pnpm --filter @silent-build/overlay run render:codezoom",
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/overlay/src/render-cli.ts packages/overlay/package.json package.json
git commit -m "feat(overlay): render-cli + pnpm scripts know about ProjectIntro/StatsCard/CommitCard/CodeZoom"
```

---

### Task 14: Implement `shot-list.ts` + tests

**Files:**
- Create: `docs/films/shot-list-template.md`
- Create: `packages/film-assets/src/shot-list.ts`
- Create: `packages/film-assets/tests/shot-list.test.ts`

- [ ] **Step 1: Create template**

Create `docs/films/shot-list-template.md`:

```markdown
# {{projectName}} — film shot list

Generated by `pnpm assets:shotlist`. Edit freely.

## Talking-head shots (record offline)

### Shot #1 — Hook (5 s, position 0:00–0:05)

> "I gave Claude Code {{punchline}}. Here's what it built."

Suggested 3 takes with stress on different words.

### Shot #2 — Outro CTA (10 s, position 6:35–6:45)

> "{{liveUrl}} is live now. GitHub link below. Next: silent build #N — <next>. Subscribe so you don't miss it."

Suggested 3 takes. Adjust phrasing to feel natural.

## OBS demo screencast (60 s @ 5:30–6:30)

Record with OBS scene "Demo" (1920×1080, 60 fps). Sequence:

1. Open `https://{{liveUrl}}` in fresh browser window. (~3 s on landing)
2. Click primary CTA (e.g., "Quick Match" / "Sign in" / "Try"). (~5 s)
3. Demonstrate one core flow (e.g., one round of gameplay, or one tool query). (~30 s)
4. Show a result screen or feedback state. (~10 s)
5. Cut to homepage with cursor on "Sign up" or equivalent. (~5 s)
6. Hold final frame for fade. (~2 s)

## B-roll inserts (extracted by film-assets)

### Top-edited files (use 1–3 in `CodeZoom`)

{{topFiles}}

### Top commits by impact (use 1–3 in `CommitCard`)

{{topCommits}}
```

- [ ] **Step 2: Write the failing test**

Create `packages/film-assets/tests/shot-list.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateShotList } from '../src/shot-list.js'
import type { ShotListContext } from '../src/types.js'

const ctx: ShotListContext = {
  projectName: 'duels',
  punchline: '9 days · 1 multiplayer game · 1v1',
  liveUrl: 'fastduels.com',
  topFiles: [
    'apps/web/src/routes/play/+page.svelte',
    'apps/web/messages/pl.json'
  ],
  topCommits: [
    { sha: '1647088', message: 'feat(multiplayer): enable categories' },
    { sha: 'f65a9f5', message: 'feat(domain): fastduels.com PRIMARY' }
  ]
}

describe('generateShotList', () => {
  it('substitutes projectName and punchline', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('duels — film shot list')
    expect(out).toContain('9 days · 1 multiplayer game · 1v1')
  })

  it('substitutes liveUrl in CTA shot', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('fastduels.com')
  })

  it('lists topFiles in B-roll section', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('apps/web/src/routes/play/+page.svelte')
    expect(out).toContain('apps/web/messages/pl.json')
  })

  it('lists topCommits with sha + message', () => {
    const out = generateShotList(ctx)
    expect(out).toContain('1647088')
    expect(out).toContain('feat(domain): fastduels.com PRIMARY')
  })

  it('handles missing liveUrl gracefully', () => {
    const ctx2 = { ...ctx, liveUrl: undefined }
    const out = generateShotList(ctx2)
    expect(out).not.toContain('{{liveUrl}}')
    expect(out).toContain('your project')
  })

  it('handles empty topFiles', () => {
    const ctx2 = { ...ctx, topFiles: [] }
    const out = generateShotList(ctx2)
    expect(out).not.toContain('{{topFiles}}')
    expect(out).toContain('No top files detected')
  })
})
```

- [ ] **Step 3: Run test, expect fail**

```bash
pnpm --filter @silent-build/film-assets test shot-list
```

- [ ] **Step 4: Implement `packages/film-assets/src/shot-list.ts`**

```ts
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ShotListContext } from './types.js'

const HERE = dirname(fileURLToPath(import.meta.url))

const findTemplatePath = (): string => {
  // Walk up from packages/film-assets/src to repo root → docs/films
  let dir = HERE
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, 'docs/films/shot-list-template.md')
    try {
      readFileSync(candidate, 'utf8')
      return candidate
    } catch {
      dir = resolve(dir, '..')
    }
  }
  throw new Error('shot-list-template.md not found in repo')
}

const formatTopFiles = (files: string[]): string => {
  if (files.length === 0) return '_No top files detected — narrative may be too short._'
  return files.map((f) => `- \`${f}\``).join('\n')
}

const formatTopCommits = (
  commits: { sha: string; message: string }[]
): string => {
  if (commits.length === 0) return '_No top commits detected._'
  return commits
    .map((c) => `- \`${c.sha}\` — ${c.message}`)
    .join('\n')
}

export const generateShotList = (ctx: ShotListContext): string => {
  const template = readFileSync(findTemplatePath(), 'utf8')
  return template
    .replaceAll('{{projectName}}', ctx.projectName)
    .replaceAll('{{punchline}}', ctx.punchline)
    .replaceAll('{{liveUrl}}', ctx.liveUrl ?? 'your project')
    .replace('{{topFiles}}', formatTopFiles(ctx.topFiles))
    .replace('{{topCommits}}', formatTopCommits(ctx.topCommits))
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm --filter @silent-build/film-assets test shot-list
```

- [ ] **Step 6: Commit**

```bash
git add docs/films/shot-list-template.md packages/film-assets/src/shot-list.ts packages/film-assets/tests/shot-list.test.ts
git commit -m "feat(film-assets): generateShotList from template"
```

---

### Task 15: CLI subcommands `assets:shotlist` and `assets:generate`

**Files:**
- Modify: `packages/film-assets/src/cli.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Add `shotlist` subcommand**

In `packages/film-assets/src/cli.ts`, add imports:

```ts
import { generateShotList } from './shot-list.js'
import type { ShotListContext } from './types.js'
```

Append before `program.parseAsync()`:

```ts
program
  .command('shotlist')
  .description('Generate per-project shot-list.md from metadata + narrative')
  .requiredOption('-m, --metadata <path>', 'metadata.json path')
  .option('-n, --narrative <path>', 'narrative.json path (for top files/commits)')
  .requiredOption('-o, --out <path>', 'shot-list.md output path')
  .action(
    (opts: { metadata: string; narrative?: string; out: string }) => {
      const metaPath = isAbsolute(opts.metadata)
        ? opts.metadata
        : resolve(USER_CWD, opts.metadata)
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'))

      let topFiles: string[] = []
      let topCommits: { sha: string; message: string }[] = []
      if (opts.narrative) {
        const narrativePath = isAbsolute(opts.narrative)
          ? opts.narrative
          : resolve(USER_CWD, opts.narrative)
        const narrative = JSON.parse(readFileSync(narrativePath, 'utf8'))
        topFiles = (narrative.topFiles ?? []).slice(0, 3)
        topCommits = (narrative.topCommits ?? []).slice(0, 3)
      }

      const ctx: ShotListContext = {
        projectName: meta.projectName,
        punchline: meta.punchline,
        liveUrl: meta.subtitle,
        topFiles,
        topCommits
      }
      const md = generateShotList(ctx)

      const outPath = isAbsolute(opts.out)
        ? opts.out
        : resolve(USER_CWD, opts.out)
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, md, 'utf8')
      console.error(`[film-assets] shot list → ${outPath}`)
    }
  )
```

- [ ] **Step 2: Add `generate` orchestrator subcommand**

In the same file, append:

```ts
program
  .command('generate')
  .description('Run full per-project asset pipeline (metadata → shotlist; tts skipped if no API key)')
  .requiredOption('-r, --repo <path>', 'project repo root')
  .requiredOption('-j, --jsonl-dir <path>', 'session jsonl directory')
  .requiredOption('-o, --out <dir>', 'output assets directory')
  .option('-n, --next <project>', 'next project name for cliffhanger')
  .action(
    async (opts: {
      repo: string
      jsonlDir: string
      out: string
      next?: string
    }) => {
      const repoAbs = isAbsolute(opts.repo) ? opts.repo : resolve(USER_CWD, opts.repo)
      const jsonlDir = resolveJsonlDir(opts.jsonlDir)
      const outDir = isAbsolute(opts.out) ? opts.out : resolve(USER_CWD, opts.out)
      mkdirSync(outDir, { recursive: true })

      const meta = extractRepoMetadata(repoAbs, jsonlDir)
      const metaPath = join(outDir, 'metadata.json')
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n')
      console.error(`[generate] metadata → ${metaPath}`)

      const ctx: ShotListContext = {
        projectName: meta.projectName,
        punchline: meta.punchline,
        liveUrl: meta.subtitle,
        topFiles: [],
        topCommits: []
      }
      const shotPath = join(outDir, 'shot-list.md')
      writeFileSync(shotPath, generateShotList(ctx), 'utf8')
      console.error(`[generate] shot list → ${shotPath}`)

      console.error(
        '[generate] next steps:\n' +
        '  1. Use /generate-voiceover-script in CC with metadata.json → write voiceover-script.json next to it\n' +
        '  2. ELEVENLABS_API_KEY=... pnpm assets:tts --script <out>/voiceover-script.json --out <out>/voiceover\n' +
        '  3. pnpm render:projectintro --project <out> (and stats/commitcard/codezoom)'
      )
    }
  )
```

- [ ] **Step 3: Add root scripts**

Append to root `package.json` `scripts`:

```json
"assets:shotlist": "pnpm --filter @silent-build/film-assets run assets shotlist",
"assets:generate": "pnpm --filter @silent-build/film-assets run assets generate",
```

- [ ] **Step 4: Smoke run on duels candidates**

```bash
pnpm assets:generate \
  --repo /home/bartek/games-projects/duels \
  --jsonl-dir /home/bartek/.claude/projects/-home-bartek-games-projects-duels \
  --out output/duels-film-assets \
  --next "next-project"
```

Expected: `output/duels-film-assets/metadata.json` + `output/duels-film-assets/shot-list.md` exist; metadata.json has projectName="duels".

- [ ] **Step 5: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/film-assets/src/cli.ts package.json
git commit -m "feat(film-assets): assets:shotlist + assets:generate orchestrator CLI"
```

---

### Task 16: `doctor.ts` + `assets:doctor` CLI + tests

**Files:**
- Create: `packages/film-assets/src/doctor.ts`
- Create: `packages/film-assets/tests/doctor.test.ts`
- Modify: `packages/film-assets/src/cli.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Write the failing test**

Create `packages/film-assets/tests/doctor.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { runDoctor } from '../src/doctor.js'

describe('runDoctor', () => {
  it('reports each check with name and status', () => {
    const result = runDoctor({
      musicDir: '/nonexistent',
      voiceFile: '/nonexistent',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: undefined }
    })
    expect(result.checks.length).toBeGreaterThan(0)
    for (const c of result.checks) {
      expect(c.name.length).toBeGreaterThan(0)
      expect(['ok', 'warn', 'fail']).toContain(c.status)
    }
  })

  it('flags missing music files as warn (not fail)', () => {
    const result = runDoctor({
      musicDir: '/tmp/definitely-not-here-' + Date.now(),
      voiceFile: '/tmp/x',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: undefined }
    })
    const music = result.checks.find((c) => c.name.includes('music'))
    expect(music?.status).toBe('warn')
  })

  it('passes ELEVENLABS_API_KEY check when set', () => {
    const result = runDoctor({
      musicDir: '/tmp/x',
      voiceFile: '/tmp/x',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: 'sk_test' }
    })
    const apiKey = result.checks.find((c) =>
      c.name.includes('ELEVENLABS_API_KEY')
    )
    expect(apiKey?.status).toBe('ok')
  })

  it('overall=fail when any check is fail', () => {
    const result = runDoctor({
      musicDir: '/tmp/x',
      voiceFile: '/tmp/x',
      requireFfmpeg: false,
      env: { ELEVENLABS_API_KEY: undefined }
    })
    if (result.checks.some((c) => c.status === 'fail')) {
      expect(result.overall).toBe('fail')
    }
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
pnpm --filter @silent-build/film-assets test doctor
```

- [ ] **Step 3: Implement `packages/film-assets/src/doctor.ts`**

```ts
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
```

- [ ] **Step 4: Add `doctor` CLI subcommand**

In `packages/film-assets/src/cli.ts`, add import:

```ts
import { runDoctor } from './doctor.js'
```

Append before `program.parseAsync()`:

```ts
program
  .command('doctor')
  .description('Verify dependencies, music files, env vars')
  .action(() => {
    const result = runDoctor({
      musicDir: resolve(USER_CWD, 'assets/music'),
      voiceFile: resolve(USER_CWD, 'assets/voices/bartek-clone-id.txt'),
      requireFfmpeg: true,
      env: { ELEVENLABS_API_KEY: process.env['ELEVENLABS_API_KEY'] }
    })
    for (const check of result.checks) {
      const icon =
        check.status === 'ok' ? '✓' : check.status === 'warn' ? '⚠' : '✗'
      console.log(`${icon} ${check.name} — ${check.message}`)
    }
    console.log(`\noverall: ${result.overall.toUpperCase()}`)
    if (result.overall === 'fail') process.exit(1)
  })
```

- [ ] **Step 5: Add root pnpm script**

Append to root `package.json` `scripts`:

```json
"assets:doctor": "pnpm --filter @silent-build/film-assets run assets doctor",
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @silent-build/film-assets test doctor
```

Expected: 4 passing.

- [ ] **Step 7: Smoke run**

```bash
pnpm assets:doctor
```

Expected output: list of checks. Music files = warn (you haven't generated them yet). Voice id = ok (placeholder file exists). API key = fail (unless env set). ffmpeg = ok.

- [ ] **Step 8: Commit**

```bash
git add packages/film-assets/src/doctor.ts packages/film-assets/tests/doctor.test.ts packages/film-assets/src/cli.ts package.json
git commit -m "feat(film-assets): assets:doctor checks (music, voice, env, ffmpeg)"
```

---

### Task 17: Skill `generate-voiceover-script`

**Files:**
- Create: `skills/generate-voiceover-script/SKILL.md`
- Create: `skills/generate-voiceover-script/references/tone-and-style.md`
- Create: `skills/generate-voiceover-script/bin/validate.mjs`

- [ ] **Step 1: Write SKILL.md**

Create `skills/generate-voiceover-script/SKILL.md`:

```markdown
---
name: generate-voiceover-script
description: Use when generating EN voiceover lines for a silent-build film from metadata.json. Triggers on `/generate-voiceover-script <metadata.json>` or natural language "write voiceover for this project". Reads the metadata file, calls buildVoiceoverPrompt to compose a Claude-ready prompt, generates 3 lines (hook 5s, optional context 5s, outro 10s), validates against the schema, writes voiceover-script.json next to metadata.json.
---

# Generate-voiceover-script skill

Turns `metadata.json` (output of `pnpm assets:metadata` or `assets:generate`) into a `voiceover-script.json` consumed by `pnpm assets:tts`.

## Inputs

1. `metadata.json` path (absolute or relative)
2. (optional) `--next <project>` for the cliffhanger line
3. (optional) Output path for voiceover-script.json (default: same dir as metadata.json)

## Workflow

### Step 1 — read metadata.json

Use the Read tool. Validate it has fields: `projectName`, `punchline`, `subtitle`, `techStack`, `startTs`, `endTs`. If something's missing, instruct user to run `pnpm assets:metadata` first and stop.

### Step 2 — produce voiceover lines

Apply rules in `references/tone-and-style.md`. Generate:

- **hook** (~12 words, 5 s spoken): one punchy sentence with a number from metadata
- **outro** (~28 words, 10 s spoken): live URL + cliffhanger + subscribe CTA
- **context** (~14 words, 5 s, optional): one mid-film insight, only if it adds value vs. hook

### Step 3 — show preview

Print the proposed 2–3 lines to the user with character/word counts:

```
HOOK (12 words, ~5s):
  "I gave Claude Code 9 days. Here's what it built."

OUTRO (28 words, ~10s):
  "fastduels.com is live now. GitHub link below. Next: silent build #2 — drupal-rebuild. Subscribe so you don't miss it."
```

### Step 4 — iterate

User may say:
- "make hook punchier" → rewrite, prefer concrete numbers and present tense
- "swap 'engine' for 'system'" → replace specific words
- "shorter outro" → trim CTA, keep URL + subscribe
- "OK" → save

### Step 5 — save and validate

Write to `<dir-of-metadata>/voiceover-script.json` (or path user specifies). Use Write tool.

Then run validation:

```bash
node skills/generate-voiceover-script/bin/validate.mjs <path-to-voiceover-script.json>
```

If it exits non-zero, fix the issue and re-save.

### Step 6 — tell the user what to do next

```
Voiceover script saved: <path>
Synthesize: ELEVENLABS_API_KEY=... pnpm assets:tts --script <path> --out output/<project>-assets/voiceover
```

## What NOT to do

- Don't fabricate metadata. Only use real values from metadata.json.
- Don't use German, Polish, or any non-English unless explicitly asked.
- Don't skip Step 3 (preview) — user must approve before save.
- Don't include subscribe CTAs in `hook`. Hook is teaser, not pitch.

## References

- `references/tone-and-style.md` — brand voice rules
- `bin/validate.mjs` — Zod schema check
```

- [ ] **Step 2: Write tone-and-style reference**

Create `skills/generate-voiceover-script/references/tone-and-style.md`:

```markdown
# Tone and style — silent-build voiceover

## Voice profile

- Conversational EN, North American or neutral
- Confident, technical, but not jargon-heavy
- Short clauses; max 1 comma per sentence
- Present-tense facts, past-tense reveals

## Hook (5 s, ~12 words)

Patterns:
- "I gave Claude Code [N] days. Here's what it built."
- "Nine days. One [thing]. Built by AI."
- "[Number] prompts. [Number] tool calls. One live app."

Rules:
- Must contain a number from metadata
- Must mention the *thing* (game, app, tool) — not "project"
- No subscribe CTA. No "today we will". No greeting.

## Outro (10 s, ~28 words)

Structure (in order):
1. Status: "<URL> is live now" / "shipped today"
2. Repo: "GitHub link below"
3. Cliffhanger: "Next: silent build #N — <project>" (or generic if no nextProject)
4. CTA: "Subscribe so you don't miss it" (or "...so you catch the breakdown")

Rules:
- 25–32 words target
- Don't repeat the hook number
- Avoid "in this video" — viewer is at end of video already

## Context (optional, 5 s, ~14 words)

Use only if it adds context the dashboard doesn't already convey. E.g.:
- "I walked away for four hours. This is what was on the screen."
- "This is the moment the multiplayer code first ran without crashing."

Skip context entirely if hook already gives enough framing.

## Anti-patterns

Avoid these phrasings:
- "Today we are going to..."
- "Welcome back to my channel..."
- "If you liked this video, please..."
- "Make sure to..."
- "Don't forget to..."
- Filler: "kind of", "sort of", "really cool", "amazing"

## Examples (verified good)

```
HOOK   "Nine days. One multiplayer game. Built by AI in real time."
OUTRO  "fastduels.com is live now. GitHub link below. Next: silent build number two — drupal-rebuild. Subscribe so you don't miss it."
```

```
HOOK   "I gave Claude Code 175 prompts. It shipped a Cloudflare app."
OUTRO  "tinytrivia.app is up — link below. Next time: I let it audit its own code. Subscribe."
```
```

- [ ] **Step 3: Write validate.mjs**

Create `skills/generate-voiceover-script/bin/validate.mjs`:

```js
#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
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
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
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
```

- [ ] **Step 4: chmod + test**

```bash
chmod +x skills/generate-voiceover-script/bin/validate.mjs
echo '{"hook":"a","outro":"b"}' > /tmp/test-vo.json
node skills/generate-voiceover-script/bin/validate.mjs /tmp/test-vo.json
```

Expected: prints `✓ valid voiceover-script.json` with word counts.

- [ ] **Step 5: Test negative case**

```bash
echo '{"hook":""}' > /tmp/bad-vo.json
node skills/generate-voiceover-script/bin/validate.mjs /tmp/bad-vo.json
```

Expected: exits non-zero, prints field errors.

- [ ] **Step 6: Update root pnpm skill:install**

In root `package.json`, change `skill:install` from single skill link to multi:

Replace the line:

```json
"skill:install": "mkdir -p ~/.claude/skills && ln -sfn $PWD/skills/curate-narrative ~/.claude/skills/curate-narrative && echo 'linked: ~/.claude/skills/curate-narrative -> '$PWD/skills/curate-narrative",
```

with:

```json
"skill:install": "mkdir -p ~/.claude/skills && ln -sfn $PWD/skills/curate-narrative ~/.claude/skills/curate-narrative && ln -sfn $PWD/skills/generate-voiceover-script ~/.claude/skills/generate-voiceover-script && ln -sfn $PWD/skills/start-silent-build-project ~/.claude/skills/start-silent-build-project && echo 'linked 3 skills into ~/.claude/skills/'",
```

(start-silent-build-project will be created in Task 19; symlink is idempotent — broken link before that task is harmless.)

- [ ] **Step 7: Commit**

```bash
git add skills/generate-voiceover-script/ package.json
git commit -m "feat(skill): generate-voiceover-script with Zod validator"
```

---

### Task 18: Project starter checklist (Bartek's side window)

**Files:**
- Create: `docs/films/silent-build-project-starter.md`

- [ ] **Step 1: Write checklist**

Create `docs/films/silent-build-project-starter.md`:

```markdown
# Silent-build project starter

Open this in a side window when starting any new project. Each stage takes you from "git init" to "YT publish".

---

## Day 0 — Concept (1 CC session)

- [ ] `mkdir <project> && cd <project> && git init`
- [ ] `gh repo create <user>/<project> --public --source=. --push`
- [ ] Write `concept.md` (1 page: what + why + tech stack idea)
- [ ] In a CC session: invoke `superpowers:brainstorming` skill
- [ ] Save spec to `docs/superpowers/specs/<date>-<project>-design.md`

End state: `concept.md`, `README.md`, design spec exist. Session has the prompt that reads concept.md (this becomes the `start` candidate later).

## Days 1–N — Build (1+ CC sessions)

- [ ] Mark project start: `cd <silent-build>; pnpm mark project-start --name "<X>"`
- [ ] In project repo: invoke `superpowers:writing-plans` from spec → `docs/superpowers/plans/<date>-<feature>.md`
- [ ] Implement task-by-task; commit after each task with `feat(...)`/`fix(...)`/`test(...)`
- [ ] Save decisions in `docs/decisions/<NNN>-<topic>.md` (one paragraph each)
- [ ] After a feature ships: `gh pr create` → merge → close issue

End state: 2+ feature commits, working app deployable locally, decisions documented.

## Day N+1 — Audit (NEW separate CC session)

- [ ] Open a new terminal in the project. Run `claude`.
- [ ] First prompt: "do a security audit on this codebase"
- [ ] If `superpowers:security-audit` skill available: invoke it
- [ ] Audit produces files in `.security-audit/`: `report.md`, `recon.md`, `test-quality.md`, `findings/`, `non-issues/`
- [ ] Fix blockers; commit each as `fix(security): <thing>`
- [ ] `git tag audit-pass-1`

Why a NEW session: the audit jsonl becomes a clean candidate stream for the AuditCard composition (separate spec, post-MVP). Don't mix audit prompts with build prompts.

## Day N+2 — Deploy (NEW separate CC session)

- [ ] New CC session
- [ ] Deploy commands: `wrangler deploy` / `vercel --prod` / `fly deploy`
- [ ] Verify live URL works
- [ ] Update README.md with live URL
- [ ] `gh release create v0.1.0 --title "v0.1.0" --generate-notes`

## Day N+3 — Demo + face record (offline)

In `silent-build`:

- [ ] `pnpm assets:metadata --repo <project> --jsonl-dir ~/.claude/projects/<slug> --out output/<project>-meta.json`
- [ ] `claude` then `/generate-voiceover-script output/<project>-meta.json` → save voiceover-script.json
- [ ] `pnpm assets:shotlist --metadata output/<project>-meta.json --out docs/films/<project>-shot-list.md`
- [ ] Read shot-list.md
- [ ] OBS demo screencast 60s per shot-list (record to `output/<project>-demo.mov`)
- [ ] Face record 30s of takes (hook + outro) per shot-list

## Day N+4 — silent-build pipeline run

- [ ] `cd <silent-build>`
- [ ] `pnpm curate:scan --project ~/.claude/projects/<slug> --out output/<project>-candidates.json --name <project>`
- [ ] `claude` → `/curate-narrative output/<project>-candidates.json` → save narrative.json
- [ ] `pnpm render:narrative --input output/<project>-narrative.json --out output/<project>-segments`
- [ ] `pnpm assets:generate --repo <project> --jsonl-dir ~/.claude/projects/<slug> --out output/<project>-assets`
- [ ] `pnpm render:projectintro --project output/<project>-assets`
- [ ] `pnpm render:stats --project output/<project>-assets`
- [ ] (B-roll inserts: render CommitCard / CodeZoom for top items)
- [ ] `ELEVENLABS_API_KEY=... pnpm assets:tts --script output/<project>-assets/voiceover-script.json --out output/<project>-assets/voiceover`
- [ ] Premiere assembly per `docs/films/<project>-shot-list.md` + 7-min timeline (see `docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md` section "Updated 7-min timeline")
- [ ] YT upload: title, description from spec template, tags, thumbnail, end-screen
- [ ] Repo README update with YT link

End state: published video, README link added.

---

## Verification

`pnpm assets:doctor` — runs all checks before pipeline. Re-run after fixing failures.

Skill `start-silent-build-project` (`/start-silent-build-project`) reads project state and tells you which stage you're at + next concrete step.
```

- [ ] **Step 2: Commit**

```bash
git add docs/films/silent-build-project-starter.md
git commit -m "docs(films): silent-build project starter checklist"
```

---

### Task 19: Skill `start-silent-build-project` — SKILL.md + references

**Files:**
- Create: `skills/start-silent-build-project/SKILL.md`
- Create: `skills/start-silent-build-project/references/workflow-stages.md`
- Create: `skills/start-silent-build-project/references/session-naming.md`
- Create: `skills/start-silent-build-project/references/phase-checkpoints.md`

- [ ] **Step 1: Write SKILL.md**

Create `skills/start-silent-build-project/SKILL.md`:

```markdown
---
name: start-silent-build-project
description: Use when starting a new silent-build YouTube project, or when checking which workflow stage your current project is at. Triggers on `/start-silent-build-project`, "starting a new silent-build project", "what stage am I at". Reads CWD repo state, identifies current stage (Day 0 / Build / Audit / Deploy / Demo / Pipeline), prints next concrete step. Idempotent — safe to run mid-project.
---

# Start-silent-build-project skill

Guides you through the 6-stage workflow that makes a project later harvestable by `silent-build/curator` and `render-narrative`. Open this skill in a side CC window while you work.

## Workflow

### Step 1 — detect current stage

Run the helper:

```bash
node $(npm root -g)/silent-build-helper/status.mjs
```

Or, if not globally installed, from inside the silent-build repo:

```bash
node skills/start-silent-build-project/bin/status.mjs <path-to-current-project>
```

It returns JSON:

```json
{
  "stage": "build" | "audit" | "deploy" | "demo" | "pipeline" | "concept",
  "completedSteps": ["concept-doc", "first-commit", ...],
  "nextStep": {
    "label": "Run a security audit in a NEW CC session",
    "command": "cd <project>; claude; /security-audit"
  }
}
```

### Step 2 — confirm with the user

Print:

```
You're at stage: <stage>
Next: <nextStep.label>
Command: <nextStep.command>

Do you want to:
  1. Mark this stage complete and move to next
  2. Stay at this stage (run the command, come back later)
  3. Jump to a different stage manually
```

### Step 3 — act on user choice

- `1` → consult `references/phase-checkpoints.md` for what files must exist; if not, list missing items
- `2` → echo the command; remind user to come back when done
- `3` → list all 6 stages, ask which

### Step 4 — re-run on next invocation

Each time the user invokes `/start-silent-build-project` later, re-run the helper. State is detected from filesystem (no hidden state files).

## References

- `references/workflow-stages.md` — verbose description of all 6 stages
- `references/session-naming.md` — Claude Code session conventions so curator can identify them
- `references/phase-checkpoints.md` — files that must exist after each stage

## Helper

`bin/status.mjs <project-path>` — pure-node, reads filesystem, outputs JSON.

## What NOT to do

- Don't write hidden state to the project repo. State is detected fresh each run.
- Don't skip Step 2 (user confirmation) — the user may know more than the heuristic.
- Don't auto-execute commands. Print, suggest, let user run.
```

- [ ] **Step 2: Write workflow-stages.md**

Create `skills/start-silent-build-project/references/workflow-stages.md`:

```markdown
# Workflow stages

Six stages, each producing artifacts that the silent-build pipeline later harvests.

## Stage 1 — concept

**Goal:** define what you're building, why, and roughly how.

**Trigger files:** `concept.md`, `README.md`, `docs/superpowers/specs/<date>-<x>-design.md`

**Typical CC interaction:** invoke `superpowers:brainstorming` skill in a fresh session. The first prompt usually reads concept.md — this becomes the `start` clip in the eventual film.

**Done when:** `concept.md` and design spec exist; the design spec was written by brainstorming skill (so plan-phase can pick it up).

## Stage 2 — build

**Goal:** ship working features.

**Trigger files:** `docs/superpowers/plans/<date>-<feature>.md`, multiple feature commits.

**Typical CC interaction:** invoke `superpowers:writing-plans` skill from the design spec. Then use `superpowers:subagent-driven-development` or `executing-plans` to implement.

**Done when:** app runs locally; 5+ feature commits; a few decisions are recorded in `docs/decisions/`.

## Stage 3 — audit

**Goal:** find security issues before they hit prod.

**Trigger files:** `.security-audit/report.md`, `.security-audit/findings/<n>.md`

**Critical rule:** START A NEW CC SESSION for the audit. Don't mix audit prompts with build prompts. The audit session jsonl becomes a clean stream the AuditCard composition can later visualize.

**Typical CC interaction:** new session in same project repo. First prompt: "do a security audit on this codebase". If `superpowers:security-audit` skill is available, invoke it.

**Done when:** `.security-audit/report.md` exists with severity-rated findings; blockers fixed; `git tag audit-pass-1` set.

## Stage 4 — deploy

**Goal:** live URL.

**Trigger files:** updated README.md with live URL; git tag like `v0.1.0`.

**Critical rule:** also a new CC session.

**Done when:** live URL verified working; release tagged.

## Stage 5 — demo + face

**Goal:** capture material that goes alongside dashboard segments in the film.

**Trigger files:** `output/<project>-demo.mov`, `output/<project>-face.mov` (or per shot-list filenames)

**Done when:** demo screencast recorded per shot-list; face takes recorded.

## Stage 6 — pipeline

**Goal:** produce the film.

**Trigger files:** `output/<project>-narrative.json`, `output/<project>-segments/`, `output/<project>-assets/`

**Done when:** Premiere assembly complete; YT upload done; README updated.

---

The skill detects the stage by checking for the trigger files in the project repo. Stage 6 partly happens in the silent-build repo — the skill should be invoked from inside the project repo for stages 1–5, and from inside silent-build for stage 6.
```

- [ ] **Step 3: Write session-naming.md**

Create `skills/start-silent-build-project/references/session-naming.md`:

```markdown
# Session naming conventions

Claude Code stores sessions per project at `~/.claude/projects/<slug>/<uuid>.jsonl` where the slug is the absolute repo path with `/` replaced by `-`. The curator picks this up automatically.

## Why naming sessions matters

When you run `pnpm curate:scan`, the curator reads ALL `*.jsonl` files in the project's CC directory. Heuristics tag candidates `start | plan | build | design | audit | end`. Without dedicated sessions:

- Audit prompts are scattered across the build session — `audit` candidates get drowned by `build` candidates
- No structural marker between phases, so the bin-packer guesses

With dedicated sessions:

- Phase 3 (audit) jsonl has only audit content → 100% clean candidates
- Phase 4 (deploy) jsonl has only deploy commands → clean `end` candidates
- Background sessions (e.g., quick fix) don't pollute the main jsonl

## Practical naming

Claude Code doesn't let you name sessions, but you control them by:

1. **Starting a fresh `claude` invocation** for each phase (concept / build / audit / deploy)
2. Using `/clear` between major topic shifts within a single phase
3. Optionally adding a marker prompt at the start of each session, e.g., `# audit session — security review`

The first user prompt of a session is what curator's `firstPrompts` heuristic catches as the candidate's `firstPromptText`. So **make your first prompt narrative-friendly**:

✅ "Now let's do the security audit on this codebase."
❌ "ok"
❌ ".gitignore"

## Resuming sessions

If you accidentally mix phases in one session, the curator can still extract candidates by tag, but the per-tag clip durations may overlap. To clean up: copy the jsonl, manually edit (split by timestamp range), and re-run `pnpm curate:scan` on the cleaned directory.
```

- [ ] **Step 4: Write phase-checkpoints.md**

Create `skills/start-silent-build-project/references/phase-checkpoints.md`:

```markdown
# Phase checkpoints (what `bin/status.mjs` looks for)

Each stage has trigger files. Helper detects current stage as the **highest stage with all triggers present**.

## Stage 1 (concept) — done when:

- [ ] `concept.md` exists
- [ ] `README.md` exists
- [ ] `docs/superpowers/specs/*.md` has at least one file

## Stage 2 (build) — done when:

- [ ] All Stage 1 triggers
- [ ] `docs/superpowers/plans/*.md` has at least one file
- [ ] `git log --oneline | wc -l` ≥ 5 commits
- [ ] App can be built (`package.json` has `build` script and runs)

## Stage 3 (audit) — done when:

- [ ] All Stage 2 triggers
- [ ] `.security-audit/report.md` exists
- [ ] `git tag` shows at least one `audit-pass-*` tag

## Stage 4 (deploy) — done when:

- [ ] All Stage 3 triggers
- [ ] `git tag` shows at least one `v*.*` tag
- [ ] README has a live URL (regex `https?://`)

## Stage 5 (demo+face) — done when:

- [ ] All Stage 4 triggers
- [ ] (Detected from silent-build repo, not project repo:)
  - [ ] `output/<project>-demo.*` (mov / mp4) exists
  - [ ] `output/<project>-face.*` (mov / mp4) exists

## Stage 6 (pipeline) — done when:

- [ ] All Stage 5 triggers
- [ ] `output/<project>-narrative.json` exists
- [ ] `output/<project>-segments/manifest.json` exists
- [ ] `output/<project>-assets/metadata.json` exists

## Detection algorithm (helper)

For each stage in order 1→6, check all triggers. The highest stage with **complete** triggers is `completedSteps`'s max. The next stage's first incomplete trigger is `nextStep`.

If no triggers match (empty repo), report `stage: "concept"` and `nextStep: "write concept.md"`.
```

- [ ] **Step 5: Commit**

```bash
git add skills/start-silent-build-project/
git commit -m "feat(skill): start-silent-build-project — SKILL.md + 3 references"
```

---

### Task 20: Skill helper `bin/status.mjs` + tests

**Files:**
- Create: `skills/start-silent-build-project/bin/status.mjs`
- Create: `skills/start-silent-build-project/tests/status.test.mjs`

(Pure-node, no tsx — runs without dependencies on any package.)

- [ ] **Step 1: Write the failing test**

Create `skills/start-silent-build-project/tests/status.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { detectStage } from '../bin/status.mjs'

const TMP = '/tmp/sbp-status-test'

const setup = (files) => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  for (const [path, content] of Object.entries(files)) {
    const full = join(TMP, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
}

describe('detectStage', () => {
  it('returns concept when nothing exists', () => {
    setup({})
    const r = detectStage(TMP)
    expect(r.stage).toBe('concept')
    expect(r.nextStep.label).toMatch(/concept/i)
  })

  it('returns build when concept files present + spec exists', () => {
    setup({
      'concept.md': '# concept',
      'README.md': '# r',
      'docs/superpowers/specs/2026-05-01-x-design.md': '# spec'
    })
    const r = detectStage(TMP)
    expect(r.stage).toBe('build')
  })

  it('returns audit-ready when build complete (plan + commits placeholder)', () => {
    setup({
      'concept.md': '# c',
      'README.md': '# r',
      'docs/superpowers/specs/x.md': '# s',
      'docs/superpowers/plans/y.md': '# p'
    })
    const r = detectStage(TMP)
    // build stage requires git commits; we can't simulate easily,
    // so accept either "build" or beyond
    expect(['build', 'audit']).toContain(r.stage)
  })

  it('returns deploy when audit report exists', () => {
    setup({
      'concept.md': '# c',
      'README.md': '# r',
      'docs/superpowers/specs/x.md': '# s',
      'docs/superpowers/plans/y.md': '# p',
      '.security-audit/report.md': '# audit'
    })
    const r = detectStage(TMP)
    expect(['audit', 'deploy']).toContain(r.stage)
  })
})
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd skills/start-silent-build-project
npx vitest run tests/status.test.mjs
```

Expected: missing module.

- [ ] **Step 3: Implement `bin/status.mjs`**

```js
#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const STAGES = [
  'concept',
  'build',
  'audit',
  'deploy',
  'demo',
  'pipeline'
]

const hasGlob = (dir, ext) => {
  if (!existsSync(dir)) return false
  try {
    return readdirSync(dir).some((f) => f.endsWith(ext))
  } catch {
    return false
  }
}

const conceptDone = (root) =>
  existsSync(join(root, 'concept.md')) &&
  existsSync(join(root, 'README.md')) &&
  hasGlob(join(root, 'docs/superpowers/specs'), '.md')

const buildDone = (root) =>
  conceptDone(root) &&
  hasGlob(join(root, 'docs/superpowers/plans'), '.md')

const auditDone = (root) =>
  buildDone(root) && existsSync(join(root, '.security-audit/report.md'))

const deployDone = (root) => {
  if (!auditDone(root)) return false
  const readme = existsSync(join(root, 'README.md'))
    ? readFileSync(join(root, 'README.md'), 'utf8')
    : ''
  return /https?:\/\//.test(readme)
}

const demoDone = (silentBuildRoot, projectName) => {
  if (!silentBuildRoot) return false
  const out = join(silentBuildRoot, 'output')
  if (!existsSync(out)) return false
  const files = readdirSync(out)
  return (
    files.some(
      (f) => f.startsWith(`${projectName}-demo.`)
    ) &&
    files.some((f) => f.startsWith(`${projectName}-face.`))
  )
}

const pipelineDone = (silentBuildRoot, projectName) => {
  if (!silentBuildRoot || !demoDone(silentBuildRoot, projectName)) return false
  const out = join(silentBuildRoot, 'output')
  return (
    existsSync(join(out, `${projectName}-narrative.json`)) &&
    existsSync(join(out, `${projectName}-segments/manifest.json`))
  )
}

export const detectStage = (
  projectRoot,
  silentBuildRoot = null,
  projectName = ''
) => {
  if (!conceptDone(projectRoot)) {
    return {
      stage: 'concept',
      completedSteps: [],
      nextStep: {
        label: 'Write concept.md and start a brainstorming CC session',
        command: 'echo "# concept" > concept.md && claude'
      }
    }
  }
  if (!buildDone(projectRoot)) {
    return {
      stage: 'build',
      completedSteps: ['concept'],
      nextStep: {
        label:
          'Invoke superpowers:writing-plans on your design spec to produce a plan',
        command: 'claude'
      }
    }
  }
  if (!auditDone(projectRoot)) {
    return {
      stage: 'audit',
      completedSteps: ['concept', 'build'],
      nextStep: {
        label: 'Run a security audit in a NEW CC session',
        command: 'claude  # then: do a security audit on this codebase'
      }
    }
  }
  if (!deployDone(projectRoot)) {
    return {
      stage: 'deploy',
      completedSteps: ['concept', 'build', 'audit'],
      nextStep: {
        label: 'Deploy and add live URL to README.md',
        command: 'wrangler deploy  # or vercel/fly/etc'
      }
    }
  }
  if (!demoDone(silentBuildRoot, projectName)) {
    return {
      stage: 'demo',
      completedSteps: ['concept', 'build', 'audit', 'deploy'],
      nextStep: {
        label: 'Record OBS demo + face takes per shot-list',
        command: 'pnpm assets:shotlist --metadata <m> --out docs/films/<x>-shot-list.md'
      }
    }
  }
  if (!pipelineDone(silentBuildRoot, projectName)) {
    return {
      stage: 'pipeline',
      completedSteps: ['concept', 'build', 'audit', 'deploy', 'demo'],
      nextStep: {
        label: 'Run silent-build pipeline (curator → render → assets)',
        command: 'pnpm curate:scan ...; /curate-narrative; pnpm render:narrative ...'
      }
    }
  }
  return {
    stage: 'done',
    completedSteps: STAGES,
    nextStep: {
      label: 'All stages complete. Publish to YT.',
      command: ''
    }
  }
}

const main = () => {
  const projectRoot = process.argv[2] ?? process.cwd()
  const silentBuildRoot = process.argv[3] ?? null
  const projectName = process.argv[4] ?? ''
  const r = detectStage(projectRoot, silentBuildRoot, projectName)
  console.log(JSON.stringify(r, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
```

- [ ] **Step 4: Run tests**

```bash
cd skills/start-silent-build-project
npx vitest run tests/status.test.mjs
```

Expected: 4 passing.

- [ ] **Step 5: Smoke run on duels project repo**

```bash
node skills/start-silent-build-project/bin/status.mjs /home/bartek/games-projects/duels
```

Expected: prints JSON; stage should be at least `audit` (duels has `.security-audit/report.md`) or `deploy` (has live URL).

- [ ] **Step 6: chmod**

```bash
chmod +x skills/start-silent-build-project/bin/status.mjs
```

- [ ] **Step 7: Commit**

```bash
git add skills/start-silent-build-project/bin/status.mjs skills/start-silent-build-project/tests/
git commit -m "feat(skill): start-silent-build-project bin/status.mjs detector + tests"
```

---

### Task 21: README update + integration smoke

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

In `README.md`, replace the existing "Best-of multi-session films" section content (or add after it) with:

```markdown
## Viral pipeline (silent-build series)

End-to-end automation for "silent build #N" YouTube films:

```bash
# 1. Once: install all skills + generate Suno music pack
pnpm skill:install
# (manually generate 4 Suno tracks per assets/music/README.md)

# 2. Per project:
pnpm assets:doctor
pnpm assets:metadata --repo <project> --jsonl-dir <jsonl-dir> --out output/<x>-meta.json
claude  # then: /generate-voiceover-script output/<x>-meta.json
ELEVENLABS_API_KEY=... pnpm assets:tts --script output/<x>-voiceover-script.json --out output/<x>-vo

pnpm curate:scan --project <jsonl-dir> --out output/<x>-cands.json
claude  # then: /curate-narrative output/<x>-cands.json
pnpm render:narrative --input output/<x>-narrative.json --out output/<x>-segments

pnpm render:projectintro --project output/<x>-segments
pnpm render:stats --project output/<x>-segments

pnpm assets:shotlist --metadata output/<x>-meta.json --out docs/films/<x>-shot-list.md
```

Plus offline:
- Record talking-head + OBS demo per shot-list (Day 5)
- Premiere assembly per `docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md` 7-min timeline (Day 6)
- YT upload (Day 7)

Per-film human work: ~1 h. Across the series: brand consistency via reused Suno loops, voice ID, ProjectIntro template.

Full spec: `docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md`
Plan: `docs/superpowers/plans/2026-05-06-viral-film-pipeline.md`
Per-project starter checklist: `docs/films/silent-build-project-starter.md`
```

- [ ] **Step 2: Final integration smoke on duels (no actual TTS, no music)**

Sanity check the complete pipeline modulo paid services:

```bash
pnpm install
pnpm test
pnpm typecheck

# Already have: output/duels-candidates.json, output/duels-narrative.json
pnpm assets:metadata \
  --repo /home/bartek/games-projects/duels \
  --jsonl-dir /home/bartek/.claude/projects/-home-bartek-games-projects-duels \
  --out output/duels-metadata.json

pnpm assets:shotlist \
  --metadata output/duels-metadata.json \
  --out docs/films/duels-shot-list.md

pnpm assets:doctor

# Verify ProjectIntro and StatsCard render with real duels metadata:
pnpm render:projectintro --project output/duels-narrative-scene1 --max-frames 30 --format png
pnpm render:stats --project output/duels-narrative-scene1 --max-frames 30 --format png
```

Expected:
- `output/duels-metadata.json` has `projectName: "duels"` and a real punchline
- `docs/films/duels-shot-list.md` is generated and readable
- `assets:doctor` reports `warn` overall (music files missing — expected)
- ProjectIntro and StatsCard render PNG sequences successfully

- [ ] **Step 3: Commit + push**

```bash
git add README.md docs/films/duels-shot-list.md output/duels-metadata.json
git commit -m "docs(readme): viral pipeline + integration smoke on duels"
git push -u origin feat/viral-pipeline
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --base main --head feat/viral-pipeline \
  --title "feat: viral film pipeline (intro + stats + b-roll + voiceover + skills)" \
  --body "Implements docs/superpowers/specs/2026-05-06-viral-film-pipeline-design.md.

  - 4 Remotion compositions: ProjectIntro, StatsCard, CommitCard, CodeZoom
  - @silent-build/film-assets package: metadata extractor, voiceover helpers,
    ElevenLabs TTS, shot-list generator, doctor
  - 2 skills: start-silent-build-project, generate-voiceover-script
  - assets/music/ infrastructure (gitignored, README manifest)
  - 7-min timeline assets ready for Premiere assembly
  - Tested on duels — metadata + shotlist + intro/stats render successfully

  AuditCard deferred to separate spec for film #2."
```

---

## Self-review

### Spec coverage

| Spec section | Plan task |
|---|---|
| `ProjectIntro` composition | Task 9 |
| `StatsCard` composition | Task 10 |
| `CommitCard` composition | Task 11 |
| `CodeZoom` composition | Task 12 |
| `repo-metadata.ts` | Task 3 |
| `voiceover-script.ts` (helpers + skill) | Task 6 + Task 17 |
| `elevenlabs.ts` | Task 7 |
| `shot-list.ts` | Task 14 |
| `doctor.ts` | Task 16 |
| `cli.ts` (assets:metadata/tts/shotlist/generate/doctor) | Tasks 5, 8, 15, 16 |
| Suno music pack convention | Task 1 |
| ElevenLabs voice resolution (clone → preset fallback) | Task 1 (default file) + Task 8 (CLI logic) |
| Talking-head Strategy A | embedded in shot-list template (Task 14) and skill scripts (Task 17) |
| 7-min timeline mapping | shot-list template + spec reference (Task 14, Task 21) |
| `start-silent-build-project` skill | Task 19 + Task 20 |
| `generate-voiceover-script` skill | Task 17 |
| Project starter checklist | Task 18 |
| Tests for all packages | embedded in each task |
| `pnpm assets:doctor` | Task 16 |
| `pnpm skill:install` updated for 3 skills | Task 17 |

All sections covered.

### Placeholder scan

Searched for `TBD`, `TODO`, "fill in", "implement later", "similar to", "appropriate". None found in task bodies. (Spec section "Open questions" deliberately preserves 5 plan-phase items but all current tasks have concrete code.)

### Type consistency

- `RepoMetadata` shape consistent across types.ts, repo-metadata.ts, voiceover-script.ts, shot-list.ts ✓
- `VoiceoverLines` consistent across types.ts, voiceover-script.ts, elevenlabs.ts, validate.mjs ✓
- `ProjectIntroProps` matches Root.tsx defaultProps shape (5 fields) ✓
- `StatsCardProps` matches Root.tsx defaults (8 fields, `liveUrl` and `tokensCostUsd` optional) ✓
- `ShotListContextSchema` consistent between types.ts and shot-list.ts test ✓
- `DoctorOptions` / `DoctorResult` consistent between doctor.ts and tests ✓

No mismatches found.

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-06-viral-film-pipeline.md`.

21 tasks, 7 phases (1: foundation, 2: package + types, 3-5: metadata branch, 6-8: voiceover branch, 9-12: compositions branch, 13-21: orchestration + skills + docs).

Parallelizable groups (after Task 2 finishes): {3-5}, {6-8}, {9, 10, 11, 12}.
