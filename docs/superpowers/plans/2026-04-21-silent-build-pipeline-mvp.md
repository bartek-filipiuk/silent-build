# Silent Build Pipeline MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować post-processing pipeline (harvester + overlay renderer + markers CLI), który przetwarza sesję Claude Code (`.jsonl`) w PNG sequence + MOV dashboardu gotowego do montażu w CapCut. MVP musi być w stanie wygenerować overlay dla pilot filmu "FocusFeed".

**Architecture:** Monorepo pnpm workspaces z 3 paczkami: `harvester` (TS CLI, parsuje `.jsonl` → `timeline.json`), `overlay` (Remotion, renderuje dashboard → PNG/MOV), `markers` (TS CLI, zapisuje manual phase markers). Komunikacja między paczkami wyłącznie przez pliki JSON (kontrakt `SessionTimeline`).

**Tech Stack:** TypeScript 5.5+, Node 22, pnpm 9, Vitest (testy), Remotion 4.x (renderer), Commander (CLI args), Zod (runtime validation timeline schema).

**Spec:** `docs/superpowers/specs/2026-04-21-silent-build-design.md`

---

## File Structure

```
silent-build/
  package.json                      # root, workspaces, scripts
  pnpm-workspace.yaml
  tsconfig.base.json                # shared compiler config
  vitest.workspace.ts
  .gitignore                        # (istnieje, dopisujemy)

  packages/
    shared/
      package.json
      tsconfig.json
      src/
        types.ts                    # SessionTimeline, Phase, TimelineEvent (Zod schemas)
        index.ts                    # barrel export

    markers/
      package.json
      tsconfig.json
      src/
        cli.ts                      # `pnpm mark <phase> --project <name>`
        writer.ts                   # zapis do manual_markers.json
      tests/
        writer.test.ts

    harvester/
      package.json
      tsconfig.json
      docs/
        jsonl-format.md             # odkryty shape jsonl (Task 2)
      src/
        parser.ts                   # czyta jsonl linia po linii, tolerant
        extractor.ts                # prompts, tokens, files, tools, timer
        phase-detector.ts           # markers + heuristic
        subagent-merger.ts          # merge subagent jsonls into main timeline
        builder.ts                  # composes SessionTimeline z powyzszych
        cli.ts                      # `pnpm harvest <session-uuid> --project <name>`
      fixtures/
        sample-session.jsonl        # kopia bieżącej sesji brainstormingu
        sample-markers.json
      tests/
        parser.test.ts
        extractor.test.ts
        phase-detector.test.ts
        subagent-merger.test.ts
        builder.test.ts

    overlay/
      package.json
      tsconfig.json
      remotion.config.ts
      src/
        Root.tsx                    # Remotion composition root
        Dashboard.tsx               # glowny layout prawego panelu
        widgets/
          Timer.tsx
          CurrentPrompt.tsx
          TokenCounter.tsx
          FileActivity.tsx
          ActivityLog.tsx
          PhaseBar.tsx
          SecurityPanel.tsx         # dummy w MVP
        lib/
          format-duration.ts        # ms -> HH:MM:SS
          format-number.ts          # 127321 -> "127k"
          timeline-loader.ts        # JSON -> SessionTimeline (Zod parse)
        render-cli.ts               # `pnpm render --project <name>`
        fixtures/
          mock-timeline.json        # dla Remotion Studio dev
      tests/
        format-duration.test.ts
        format-number.test.ts
        timeline-loader.test.ts

  output/                           # gitignored (oprocz README)
    README.md                       # opisuje konwencje folderu
```

---

## Task 1: Monorepo scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `output/README.md`
- Modify: `.gitignore` (dopisujemy `pnpm-lock.yaml.backup`, `coverage/`, `*.tsbuildinfo`)

- [ ] **Step 1: Create root `package.json`**

Create `/home/bartek/video-projects/silent-build/package.json`:

```json
{
  "name": "silent-build",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@10.24.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "pnpm -r typecheck",
    "mark": "pnpm --filter @silent-build/markers run mark",
    "harvest": "pnpm --filter @silent-build/harvester run harvest",
    "render": "pnpm --filter @silent-build/overlay run render",
    "studio": "pnpm --filter @silent-build/overlay run studio"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.1.1",
    "@types/node": "^22.5.0"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 4: Create `vitest.workspace.ts`**

```typescript
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*'
])
```

- [ ] **Step 5: Create `output/README.md`**

```markdown
# output/

Per-project output folders. Created automatically by `pnpm mark project-start --name <project>`.

Struktura:
- `<project-name>-<YYYY-MM-DD>/manual_markers.json` — manual phase markers
- `<project-name>-<YYYY-MM-DD>/timeline.json` — wygenerowany przez harvester
- `<project-name>-<YYYY-MM-DD>/screen.mp4` — nagranie OBS (gitignored)
- `<project-name>-<YYYY-MM-DD>/dashboard.mov` — wyrenderowany overlay (gitignored)
- `<project-name>-<YYYY-MM-DD>/dashboard_frames/` — PNG sequence (gitignored)

Gitignore wyklucza media, ale zostawia `timeline.json` i `manual_markers.json` jeśli chcesz je commitować.
```

- [ ] **Step 6: Extend `.gitignore`**

Dopisz do istniejącego `.gitignore`:

```
pnpm-lock.yaml.backup
coverage/
*.tsbuildinfo
```

- [ ] **Step 7: Install root deps**

Run: `pnpm install`
Expected: success, `node_modules/` + `pnpm-lock.yaml` created

- [ ] **Step 8: Verify typecheck runs (expect empty pass)**

Run: `pnpm typecheck`
Expected: no errors (no packages yet to check — exits 0)

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts output/README.md .gitignore pnpm-lock.yaml
git commit -m "feat: bootstrap monorepo with pnpm workspaces, typescript, vitest"
```

---

## Task 2: Jsonl format research + documentation

Zanim zaczniemy kodować parser, udokumentujemy realny shape `.jsonl` Claude Code — harvester musi wiedzieć dokładnie co parsować.

**Files:**
- Create: `packages/harvester/docs/jsonl-format.md`
- Create: `packages/harvester/fixtures/sample-session.jsonl`

- [ ] **Step 1: Copy live session as fixture**

Run:
```bash
mkdir -p packages/harvester/fixtures
cp /home/bartek/.claude/projects/-home-bartek-video-projects-silent-build/83e8ccb3-4290-4017-acb2-ba76dafd0fac.jsonl packages/harvester/fixtures/sample-session.jsonl
```

Expected: file created, ~313 lines.

- [ ] **Step 2: Write `packages/harvester/docs/jsonl-format.md`**

Create file z następującą treścią (obserwacje z realnego pliku):

````markdown
# Claude Code .jsonl — Format Reference

Obserwacje ze zbadania fixture `fixtures/sample-session.jsonl`. Format nieudokumentowany oficjalnie, bazujemy na reverse-engineering.

## Plik

- **Lokalizacja:** `~/.claude/projects/<slug>/<session-uuid>.jsonl`
- **Slug:** absolutna ścieżka projektu z `/` zamienionymi na `-` (np. `/home/bartek/video-projects/silent-build` → `-home-bartek-video-projects-silent-build`)
- **Encoding:** UTF-8, każda linia = jeden JSON obiekt (JSONL)
- **Subagent jsonls:** podkatalog `<session-uuid>/subagents/agent-*.jsonl`

## Top-level event types (pole `type`)

| type | Opis | Czestotliwosc | Interesuje nas? |
|---|---|---|---|
| `user` | Wiadomosc uzytkownika (prompt) | wysoka | TAK |
| `assistant` | Wiadomosc Claude (moze zawierac tool_use, thinking, text) | wysoka | TAK |
| `system` | Wewnetrzne system reminders | srednia | NIE |
| `permission-mode` | Zmiana trybu permission (auto/plan/ask) | niska | NIE |
| `attachment` | Dodatkowe rzeczy (hook outputs, command permissions) | wysoka | NIE (na start) |
| `file-history-snapshot` | Snapshot stanu plikow | niska | OPCJONALNIE P2 |

W MVP parsujemy tylko `user` i `assistant`.

## Wspolne pola

Kazdy wpis ma zawsze:
- `uuid`: string — ID tego wpisu
- `parentUuid`: string | null — ID poprzedniego wpisu w lancuchu
- `sessionId`: string — ID sesji
- `timestamp`: ISO 8601 string (np. `"2026-04-21T17:45:13.012Z"`)
- `type`: string — event type
- `cwd`: string — katalog roboczy w momencie eventu
- `isSidechain`: boolean — czy to subagent chain
- `userType`: string (zwykle `"external"`)
- `entrypoint`: string (zwykle `"cli"`)
- `version`: string — wersja CC
- `gitBranch`: string | null

## Event: `user`

```json
{
  "type": "user",
  "uuid": "...",
  "parentUuid": "...",
  "promptId": "...",
  "timestamp": "2026-04-21T17:45:13.012Z",
  "sessionId": "...",
  "message": {
    "role": "user",
    "content": "elo"
  },
  "permissionMode": "auto"
}
```

Kluczowe:
- `message.content` moze byc **string** (prosty prompt) LUB **array** of content parts (jesli np. user attach pliki). Obsluguj oba.
- `promptId` dostepne tylko dla user eventow

## Event: `assistant`

```json
{
  "type": "assistant",
  "uuid": "...",
  "parentUuid": "...",
  "timestamp": "2026-04-21T17:45:15.798Z",
  "requestId": "req_...",
  "message": {
    "id": "msg_...",
    "model": "claude-opus-4-7",
    "role": "assistant",
    "type": "message",
    "content": [
      { "type": "text", "text": "Czesc! Co robimy?" }
    ],
    "stop_reason": "end_turn",
    "usage": {
      "input_tokens": 6,
      "output_tokens": 15,
      "cache_creation_input_tokens": 34913,
      "cache_read_input_tokens": 0
    }
  }
}
```

Kluczowe:
- `message.content` to **zawsze array**. Elementy:
  - `{ type: "text", text: string }` — zwykly tekst
  - `{ type: "thinking", thinking: string }` — extended thinking (gdy wlaczone)
  - `{ type: "tool_use", id: string, name: string, input: object }` — wywolanie narzedzia
- `message.usage` zawsze obecne, podsumowuje tokeny tej odpowiedzi
- `message.model` pokazuje model uzyty (np. `claude-opus-4-7`)

## Tool use (inside assistant content)

```json
{ "type": "tool_use", "id": "toolu_...", "name": "Bash", "input": { "command": "ls", "description": "..." } }
```

Nazwy narzedzi interesujace dla nas:
- `Write`, `Edit` — operacje na plikach (wyciagaj `file_path` z `input`)
- `Read`, `Glob`, `Grep` — operacje readonly (dobre dla Activity Log)
- `Bash` — shell commands
- `Task` — subagent dispatches (parent sesji ma `isSidechain: false`, subagent w osobnym pliku ma `true`)
- `TodoWrite` — task tracking
- Mcp tools: `mcp__*`

## Tool result (inside user content array)

Gdy assistant wywolal tool_use, nastepny wpis typu `user` zawiera wynik:

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      { "type": "tool_result", "tool_use_id": "toolu_...", "content": "...", "is_error": false }
    ]
  }
}
```

`tool_use_id` linkuje z powrotem do `tool_use.id`.

## Subagent jsonls

Gdy assistant wywoluje tool `Task`, Claude Code tworzy **osobny plik jsonl** dla subagenta:
- Sciezka: `<main-session-dir>/<session-uuid>/subagents/agent-<short-id>.jsonl`
- Format identyczny jak main, ale `isSidechain: true` dla wszystkich wpisow
- Parent-child relacja: brak bezposredniej w jsonl, trzeba laczyc po `toolUseID` (z hook attachment lub tool_use id)

Harvester w MVP **laczy** subagent events do main timeline, tag `source: 'subagent'`.

## Timestamps

- Format: ISO 8601 z milisekundami i `Z` suffix
- Parse: `new Date(timestamp).getTime()` → ms since epoch
- Calculated: `startTs = min(timestamp)`, `endTs = max(timestamp)` ze wszystkich wpisow

## Edge cases do obslugi

1. Malformed lines (niekompletny JSON na ostatniej linii jesli sesja crashed) — skip, warn
2. Brak `message` pola dla niektorych typow — skip event silently
3. `content` jako string zamiast array (user simple prompts) — normalize do array `[{type: "text", text: content}]`
4. Thinking blocks bardzo dlugie (10k+ znakow) — nie trzymaj pelnej tresci w timeline.json, tylko liczba znakow + pierwsze 200
5. Tool_use bez odpowiadajacego tool_result (session interrupted) — akceptowalne, tool call jeszcze widoczny w timeline
````

- [ ] **Step 3: Commit**

```bash
git add packages/harvester/docs/jsonl-format.md packages/harvester/fixtures/sample-session.jsonl
git commit -m "docs: document Claude Code .jsonl format from live session fixture"
```

---

## Task 3: Shared types package (Zod schemas)

Typy `SessionTimeline`, `Phase`, `TimelineEvent` są używane przez `harvester` (produkuje) i `overlay` (konsumuje). Wydzielamy do `packages/shared` z Zod schemas (runtime validation + TS types z inferencji).

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/types.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/tests/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { SessionTimelineSchema, PhaseSchema, TimelineEventSchema } from '../src/types.js'

describe('SessionTimelineSchema', () => {
  it('accepts minimal valid timeline', () => {
    const parsed = SessionTimelineSchema.parse({
      project: { name: 'test', startTs: 1000, endTs: 2000 },
      phases: [
        { index: 1, label: 'Architecture', startTs: 1000, endTs: 1250, source: 'heuristic' },
        { index: 2, label: 'Backend', startTs: 1250, endTs: 1500, source: 'heuristic' },
        { index: 3, label: 'Frontend', startTs: 1500, endTs: 1750, source: 'heuristic' },
        { index: 4, label: 'Security', startTs: 1750, endTs: 2000, source: 'heuristic' }
      ],
      events: [],
      metrics: { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
    })
    expect(parsed.project.name).toBe('test')
    expect(parsed.phases).toHaveLength(4)
  })

  it('rejects phase count != 4', () => {
    expect(() => SessionTimelineSchema.parse({
      project: { name: 't', startTs: 0, endTs: 1 },
      phases: [],
      events: [],
      metrics: { totalTokens: 0, filesTouched: 0, promptsCount: 0, toolCallsCount: 0 }
    })).toThrow()
  })
})

describe('TimelineEventSchema', () => {
  it('accepts prompt event', () => {
    const parsed = TimelineEventSchema.parse({
      ts: 1000,
      type: 'prompt',
      data: { text: 'hello', tokensIn: 6 }
    })
    expect(parsed.type).toBe('prompt')
  })

  it('accepts tool_call event with optional subagentId', () => {
    const parsed = TimelineEventSchema.parse({
      ts: 1000,
      type: 'tool_call',
      data: { name: 'Bash', args: { command: 'ls' }, subagentId: 'agent-abc' }
    })
    expect(parsed.type).toBe('tool_call')
  })

  it('rejects unknown event type', () => {
    expect(() => TimelineEventSchema.parse({
      ts: 1000,
      type: 'unknown',
      data: {}
    })).toThrow()
  })
})

describe('PhaseSchema', () => {
  it('accepts valid phase', () => {
    const parsed = PhaseSchema.parse({
      index: 2,
      label: 'Backend',
      startTs: 100,
      endTs: 200,
      source: 'manual-marker'
    })
    expect(parsed.source).toBe('manual-marker')
  })

  it('rejects index outside 1-4', () => {
    expect(() => PhaseSchema.parse({
      index: 5, label: 'x', startTs: 0, endTs: 1, source: 'heuristic'
    })).toThrow()
  })
})
```

- [ ] **Step 2: Create `packages/shared/package.json`**

```json
{
  "name": "@silent-build/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

- [ ] **Step 3: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: Create `packages/shared/src/types.ts`**

```typescript
import { z } from 'zod'

export const PhaseSourceSchema = z.enum(['manual-marker', 'heuristic'])

export const PhaseSchema = z.object({
  index: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  label: z.string().min(1),
  startTs: z.number().int().nonnegative(),
  endTs: z.number().int().nonnegative(),
  source: PhaseSourceSchema
})
export type Phase = z.infer<typeof PhaseSchema>

const PromptEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('prompt'),
  data: z.object({ text: z.string(), tokensIn: z.number().int().nonnegative() })
})

const ToolCallEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('tool_call'),
  data: z.object({
    name: z.string(),
    args: z.unknown(),
    subagentId: z.string().optional()
  })
})

const FileWriteEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('file_write'),
  data: z.object({ path: z.string(), linesAdded: z.number().int().nonnegative() })
})

const FileEditEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('file_edit'),
  data: z.object({ path: z.string(), linesChanged: z.number().int().nonnegative() })
})

const TokensDeltaEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('tokens_delta'),
  data: z.object({
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative()
  })
})

const SecurityFindingEventSchema = z.object({
  ts: z.number().int().nonnegative(),
  type: z.literal('security_finding'),
  data: z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string(),
    fixed: z.boolean()
  })
})

export const TimelineEventSchema = z.discriminatedUnion('type', [
  PromptEventSchema,
  ToolCallEventSchema,
  FileWriteEventSchema,
  FileEditEventSchema,
  TokensDeltaEventSchema,
  SecurityFindingEventSchema
])
export type TimelineEvent = z.infer<typeof TimelineEventSchema>

export const SessionTimelineSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    startTs: z.number().int().nonnegative(),
    endTs: z.number().int().nonnegative()
  }),
  phases: z.array(PhaseSchema).length(4),
  events: z.array(TimelineEventSchema),
  metrics: z.object({
    totalTokens: z.number().int().nonnegative(),
    filesTouched: z.number().int().nonnegative(),
    promptsCount: z.number().int().nonnegative(),
    toolCallsCount: z.number().int().nonnegative()
  })
})
export type SessionTimeline = z.infer<typeof SessionTimelineSchema>

export const ManualMarkerSchema = z.object({
  phase: z.enum(['project-start', 'backend-start', 'frontend-start', 'security-start', 'polish-start']),
  timestamp: z.number().int().nonnegative(),
  projectName: z.string().optional()
})
export type ManualMarker = z.infer<typeof ManualMarkerSchema>

export const ManualMarkersFileSchema = z.object({
  project: z.string().min(1),
  markers: z.array(ManualMarkerSchema)
})
export type ManualMarkersFile = z.infer<typeof ManualMarkersFileSchema>
```

- [ ] **Step 5: Create `packages/shared/src/index.ts`**

```typescript
export * from './types.js'
```

- [ ] **Step 6: Install deps and run tests**

Run:
```bash
pnpm install
pnpm --filter @silent-build/shared test
```

Expected: tests PASS (6 tests, all green)

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter @silent-build/shared typecheck`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add packages/shared pnpm-lock.yaml
git commit -m "feat(shared): add Zod schemas for SessionTimeline, Phase, TimelineEvent, ManualMarker"
```

---

## Task 4: Markers CLI

Najprostsza paczka — zapisuje manual phase markers do JSON. Niezależna od reszty.

**Files:**
- Create: `packages/markers/package.json`
- Create: `packages/markers/tsconfig.json`
- Create: `packages/markers/src/writer.ts`
- Create: `packages/markers/src/cli.ts`
- Create: `packages/markers/tests/writer.test.ts`

- [ ] **Step 1: Write failing tests for writer**

Create `packages/markers/tests/writer.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeMarker, readMarkersFile } from '../src/writer.js'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('writer', () => {
  let tmp: string

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'markers-test-'))
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  it('creates manual_markers.json with project-start marker', () => {
    writeMarker({
      outputDir: tmp,
      phase: 'project-start',
      projectName: 'focusfeed',
      timestamp: 1700000000000
    })

    const file = join(tmp, 'manual_markers.json')
    expect(existsSync(file)).toBe(true)

    const parsed = JSON.parse(readFileSync(file, 'utf-8'))
    expect(parsed.project).toBe('focusfeed')
    expect(parsed.markers).toHaveLength(1)
    expect(parsed.markers[0].phase).toBe('project-start')
    expect(parsed.markers[0].timestamp).toBe(1700000000000)
  })

  it('appends marker to existing file', () => {
    writeMarker({ outputDir: tmp, phase: 'project-start', projectName: 'focusfeed', timestamp: 1000 })
    writeMarker({ outputDir: tmp, phase: 'backend-start', timestamp: 2000 })

    const parsed = readMarkersFile(tmp)
    expect(parsed.markers).toHaveLength(2)
    expect(parsed.markers[1].phase).toBe('backend-start')
  })

  it('throws if appending without prior project-start', () => {
    expect(() => writeMarker({
      outputDir: tmp,
      phase: 'backend-start',
      timestamp: 1000
    })).toThrow(/project-start/)
  })

  it('readMarkersFile throws if file missing', () => {
    expect(() => readMarkersFile(tmp)).toThrow(/not found/i)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm --filter @silent-build/markers test`
Expected: FAIL (module `../src/writer.js` not found)

- [ ] **Step 3: Create `packages/markers/package.json`**

```json
{
  "name": "@silent-build/markers",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "mark": "./dist/cli.js"
  },
  "scripts": {
    "mark": "tsx src/cli.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@silent-build/shared": "workspace:*",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 4: Create `packages/markers/tsconfig.json`**

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

- [ ] **Step 5: Implement `packages/markers/src/writer.ts`**

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ManualMarkersFileSchema, type ManualMarker } from '@silent-build/shared'

export interface WriteMarkerArgs {
  outputDir: string
  phase: ManualMarker['phase']
  projectName?: string
  timestamp: number
}

const MARKERS_FILENAME = 'manual_markers.json'

export function readMarkersFile(outputDir: string) {
  const path = join(outputDir, MARKERS_FILENAME)
  if (!existsSync(path)) {
    throw new Error(`manual_markers.json not found in ${outputDir}`)
  }
  const raw = JSON.parse(readFileSync(path, 'utf-8'))
  return ManualMarkersFileSchema.parse(raw)
}

export function writeMarker(args: WriteMarkerArgs): void {
  const { outputDir, phase, timestamp, projectName } = args
  mkdirSync(outputDir, { recursive: true })
  const path = join(outputDir, MARKERS_FILENAME)
  const isProjectStart = phase === 'project-start'

  if (isProjectStart) {
    if (!projectName) {
      throw new Error('project-start marker requires projectName')
    }
    const payload = {
      project: projectName,
      markers: [{ phase, timestamp, projectName }]
    }
    ManualMarkersFileSchema.parse(payload)
    writeFileSync(path, JSON.stringify(payload, null, 2))
    return
  }

  if (!existsSync(path)) {
    throw new Error(
      `Cannot write ${phase} marker — no project-start marker found in ${outputDir}. ` +
      `Run \`pnpm mark project-start --name <project>\` first.`
    )
  }

  const existing = readMarkersFile(outputDir)
  existing.markers.push({ phase, timestamp })
  writeFileSync(path, JSON.stringify(existing, null, 2))
}
```

- [ ] **Step 6: Install deps and run test**

Run:
```bash
pnpm install
pnpm --filter @silent-build/markers test
```

Expected: 4 tests PASS

- [ ] **Step 7: Implement CLI `packages/markers/src/cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { join } from 'node:path'
import { writeMarker } from './writer.js'
import type { ManualMarker } from '@silent-build/shared'

const program = new Command()

program
  .name('mark')
  .description('Write manual phase markers for silent-build pipeline')

const phases: Array<ManualMarker['phase']> = [
  'project-start',
  'backend-start',
  'frontend-start',
  'security-start',
  'polish-start'
]

for (const phase of phases) {
  const cmd = program
    .command(phase)
    .description(`Write ${phase} marker`)

  if (phase === 'project-start') {
    cmd.requiredOption('-n, --name <project>', 'project name (slugified for folder)')
  }

  cmd.option('-o, --output-root <dir>', 'root folder for output/', 'output')

  cmd.action((opts: { name?: string; outputRoot: string }) => {
    const timestamp = Date.now()

    if (phase === 'project-start') {
      const name = opts.name!
      const date = new Date().toISOString().slice(0, 10)
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const dir = join(opts.outputRoot, `${slug}-${date}`)
      writeMarker({ outputDir: dir, phase, projectName: name, timestamp })
      console.log(`Created ${dir}/manual_markers.json`)
      console.log(`\nExport for subsequent markers in this session:`)
      console.log(`  export SILENT_BUILD_DIR=${dir}`)
      return
    }

    const dir = process.env.SILENT_BUILD_DIR
    if (!dir) {
      throw new Error(
        'SILENT_BUILD_DIR env var not set. Run `pnpm mark project-start` first and export the path.'
      )
    }
    writeMarker({ outputDir: dir, phase, timestamp })
    console.log(`Added ${phase} marker to ${dir}/manual_markers.json at ${new Date(timestamp).toISOString()}`)
  })
}

program.parse()
```

- [ ] **Step 8: Verify CLI works manually**

Run:
```bash
pnpm mark project-start --name TestProject --output-root /tmp/sb-test
```
Expected output:
```
Created /tmp/sb-test/testproject-YYYY-MM-DD/manual_markers.json

Export for subsequent markers in this session:
  export SILENT_BUILD_DIR=/tmp/sb-test/testproject-YYYY-MM-DD
```

Then:
```bash
export SILENT_BUILD_DIR=/tmp/sb-test/testproject-$(date +%Y-%m-%d)
pnpm mark backend-start
cat $SILENT_BUILD_DIR/manual_markers.json
```
Expected: JSON contains 2 markers.

Cleanup: `rm -rf /tmp/sb-test`

- [ ] **Step 9: Commit**

```bash
git add packages/markers pnpm-lock.yaml
git commit -m "feat(markers): implement manual phase markers CLI (pnpm mark <phase>)"
```

---

## Task 5: Harvester — Jsonl parser (fault-tolerant)

Parser czyta `.jsonl` linia po linii, zwraca raw events dla `user` i `assistant`, pomija malformed linie z warningiem.

**Files:**
- Create: `packages/harvester/package.json`
- Create: `packages/harvester/tsconfig.json`
- Create: `packages/harvester/src/parser.ts`
- Create: `packages/harvester/tests/parser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/harvester/tests/parser.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseJsonl, type ParsedEvent } from '../src/parser.js'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function makeTempFile(lines: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'parser-test-'))
  const file = join(dir, 'test.jsonl')
  writeFileSync(file, lines.join('\n'))
  return file
}

afterEach(() => vi.restoreAllMocks())

describe('parseJsonl', () => {
  it('returns only user and assistant events by default', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"hi"}}',
      '{"type":"system","uuid":"s1","timestamp":"2026-04-21T10:00:01.000Z"}',
      '{"type":"assistant","uuid":"a1","timestamp":"2026-04-21T10:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"hello"}],"usage":{"input_tokens":1,"output_tokens":2}}}'
    ])
    const events = parseJsonl(file)
    expect(events).toHaveLength(2)
    expect(events[0]!.type).toBe('user')
    expect(events[1]!.type).toBe('assistant')
  })

  it('skips malformed lines with warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"hi"}}',
      '{not json at all',
      '{"type":"user","uuid":"u2","timestamp":"2026-04-21T10:00:01.000Z","message":{"role":"user","content":"ok"}}'
    ])
    const events = parseJsonl(file)
    expect(events).toHaveLength(2)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('malformed jsonl line 2'))
  })

  it('skips empty lines silently', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"hi"}}',
      '',
      '   ',
      '{"type":"user","uuid":"u2","timestamp":"2026-04-21T10:00:01.000Z","message":{"role":"user","content":"ok"}}'
    ])
    const events = parseJsonl(file)
    expect(events).toHaveLength(2)
  })

  it('normalizes user content (string) to array form', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":"elo"}}'
    ])
    const events = parseJsonl(file)
    const user = events[0] as ParsedEvent & { type: 'user' }
    expect(user.message.content).toEqual([{ type: 'text', text: 'elo' }])
  })

  it('keeps user content array form unchanged', () => {
    const file = makeTempFile([
      '{"type":"user","uuid":"u1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"ok"}]}}'
    ])
    const events = parseJsonl(file)
    const user = events[0] as ParsedEvent & { type: 'user' }
    expect(user.message.content[0]!.type).toBe('tool_result')
  })

  it('throws if file does not exist', () => {
    expect(() => parseJsonl('/nonexistent/path.jsonl')).toThrow(/ENOENT|not found/i)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Create the package skeleton first so vitest can discover tests:

Create `packages/harvester/package.json`:

```json
{
  "name": "@silent-build/harvester",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "harvest": "./dist/cli.js"
  },
  "scripts": {
    "harvest": "tsx src/cli.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@silent-build/shared": "workspace:*",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

Create `packages/harvester/tsconfig.json`:

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

Run: `pnpm install && pnpm --filter @silent-build/harvester test`
Expected: FAIL with "Cannot find module '../src/parser.js'"

- [ ] **Step 3: Implement `packages/harvester/src/parser.ts`**

```typescript
import { readFileSync } from 'node:fs'

export interface ContentPart {
  type: string
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
}

export interface UserEvent {
  type: 'user'
  uuid: string
  parentUuid: string | null
  timestamp: string
  sessionId?: string
  message: {
    role: 'user'
    content: ContentPart[]
  }
}

export interface AssistantEvent {
  type: 'assistant'
  uuid: string
  parentUuid: string | null
  timestamp: string
  sessionId?: string
  message: {
    role: 'assistant'
    id?: string
    model?: string
    content: ContentPart[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
}

export type ParsedEvent = UserEvent | AssistantEvent

export function parseJsonl(path: string): ParsedEvent[] {
  const raw = readFileSync(path, 'utf-8')
  const lines = raw.split('\n')
  const events: ParsedEvent[] = []

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed === '') return

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      console.warn(`[parser] malformed jsonl line ${idx + 1}, skipped`)
      return
    }

    if (typeof parsed !== 'object' || parsed === null) return
    const obj = parsed as Record<string, unknown>
    const type = obj.type
    if (type !== 'user' && type !== 'assistant') return
    if (typeof obj.message !== 'object' || obj.message === null) return

    const msg = obj.message as Record<string, unknown>
    const normalized = normalizeContent(msg.content)
    if (!normalized) return

    events.push({
      ...obj,
      message: { ...msg, content: normalized }
    } as ParsedEvent)
  })

  return events
}

function normalizeContent(content: unknown): ContentPart[] | null {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (Array.isArray(content)) {
    return content.filter((c): c is ContentPart => typeof c === 'object' && c !== null && typeof (c as any).type === 'string')
  }
  return null
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm --filter @silent-build/harvester test`
Expected: 6 tests PASS

- [ ] **Step 5: Smoke test against real fixture**

Add quick smoke test to `tests/parser.test.ts`:

```typescript
describe('parseJsonl — real fixture', () => {
  it('parses sample-session.jsonl without throwing', () => {
    const path = new URL('../fixtures/sample-session.jsonl', import.meta.url).pathname
    const events = parseJsonl(path)
    expect(events.length).toBeGreaterThan(50)
    expect(events.every(e => e.type === 'user' || e.type === 'assistant')).toBe(true)
  })
})
```

Run: `pnpm --filter @silent-build/harvester test`
Expected: 7 tests PASS (including real fixture)

- [ ] **Step 6: Commit**

```bash
git add packages/harvester pnpm-lock.yaml
git commit -m "feat(harvester): implement fault-tolerant jsonl parser for CC session logs"
```

---

## Task 6: Harvester — Extractor (prompts, tokens, timer)

Ze sparsowanych eventów buduje listę `TimelineEvent` dla prompt/tokens + oblicza `startTs`/`endTs`.

**Files:**
- Create: `packages/harvester/src/extractor.ts`
- Create: `packages/harvester/tests/extractor.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/harvester/tests/extractor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractPrompts, extractTokens, computeTimerBounds } from '../src/extractor.js'
import type { ParsedEvent } from '../src/parser.js'

const userPrompt = (uuid: string, ts: string, text: string): ParsedEvent => ({
  type: 'user',
  uuid,
  parentUuid: null,
  timestamp: ts,
  message: { role: 'user', content: [{ type: 'text', text }] }
})

const assistantWithText = (uuid: string, ts: string, text: string, usage = { input_tokens: 10, output_tokens: 20 }): ParsedEvent => ({
  type: 'assistant',
  uuid,
  parentUuid: null,
  timestamp: ts,
  message: {
    role: 'assistant',
    content: [{ type: 'text', text }],
    usage
  }
})

describe('extractPrompts', () => {
  it('returns prompt event for each user message with text content', () => {
    const events = [
      userPrompt('u1', '2026-04-21T10:00:00.000Z', 'first prompt'),
      assistantWithText('a1', '2026-04-21T10:00:01.000Z', 'reply'),
      userPrompt('u2', '2026-04-21T10:00:05.000Z', 'second prompt')
    ]
    const prompts = extractPrompts(events)
    expect(prompts).toHaveLength(2)
    expect(prompts[0]).toEqual({
      ts: new Date('2026-04-21T10:00:00.000Z').getTime(),
      type: 'prompt',
      data: { text: 'first prompt', tokensIn: 0 }
    })
    expect(prompts[1]!.data.text).toBe('second prompt')
  })

  it('skips user messages that are only tool_result (not real prompts)', () => {
    const events: ParsedEvent[] = [
      {
        type: 'user',
        uuid: 'u1',
        parentUuid: null,
        timestamp: '2026-04-21T10:00:00.000Z',
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] }
      }
    ]
    expect(extractPrompts(events)).toHaveLength(0)
  })

  it('truncates very long prompts to 500 chars', () => {
    const longText = 'a'.repeat(1200)
    const events = [userPrompt('u1', '2026-04-21T10:00:00.000Z', longText)]
    const [prompt] = extractPrompts(events)
    expect(prompt!.data.text.length).toBeLessThanOrEqual(500 + 3) // +3 for ellipsis
    expect(prompt!.data.text.endsWith('...')).toBe(true)
  })
})

describe('extractTokens', () => {
  it('emits tokens_delta event per assistant message with usage', () => {
    const events = [
      assistantWithText('a1', '2026-04-21T10:00:01.000Z', 'r1', { input_tokens: 100, output_tokens: 50 }),
      assistantWithText('a2', '2026-04-21T10:00:02.000Z', 'r2', { input_tokens: 200, output_tokens: 75 })
    ]
    const tokens = extractTokens(events)
    expect(tokens).toHaveLength(2)
    expect(tokens[0]!.data).toEqual({ input: 100, output: 50 })
    expect(tokens[1]!.data).toEqual({ input: 200, output: 75 })
  })

  it('skips assistant events without usage', () => {
    const events: ParsedEvent[] = [
      {
        type: 'assistant',
        uuid: 'a1',
        parentUuid: null,
        timestamp: '2026-04-21T10:00:01.000Z',
        message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] }
      }
    ]
    expect(extractTokens(events)).toHaveLength(0)
  })
})

describe('computeTimerBounds', () => {
  it('returns min and max timestamps', () => {
    const events = [
      userPrompt('u1', '2026-04-21T10:00:00.000Z', 'a'),
      userPrompt('u2', '2026-04-21T10:05:00.000Z', 'b'),
      userPrompt('u3', '2026-04-21T10:02:00.000Z', 'c')
    ]
    const bounds = computeTimerBounds(events)
    expect(bounds.startTs).toBe(new Date('2026-04-21T10:00:00.000Z').getTime())
    expect(bounds.endTs).toBe(new Date('2026-04-21T10:05:00.000Z').getTime())
  })

  it('throws on empty events', () => {
    expect(() => computeTimerBounds([])).toThrow(/no events/i)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @silent-build/harvester test`
Expected: extractor tests FAIL (module not found)

- [ ] **Step 3: Implement `packages/harvester/src/extractor.ts`**

```typescript
import type { ParsedEvent } from './parser.js'
import type { TimelineEvent } from '@silent-build/shared'

const PROMPT_MAX_LEN = 500

export function extractPrompts(events: ParsedEvent[]): Extract<TimelineEvent, { type: 'prompt' }>[] {
  const prompts: Extract<TimelineEvent, { type: 'prompt' }>[] = []
  for (const ev of events) {
    if (ev.type !== 'user') continue
    const textPart = ev.message.content.find(p => p.type === 'text')
    if (!textPart?.text) continue
    prompts.push({
      ts: new Date(ev.timestamp).getTime(),
      type: 'prompt',
      data: {
        text: truncate(textPart.text, PROMPT_MAX_LEN),
        tokensIn: 0 // filled in later by builder if needed
      }
    })
  }
  return prompts
}

export function extractTokens(events: ParsedEvent[]): Extract<TimelineEvent, { type: 'tokens_delta' }>[] {
  const out: Extract<TimelineEvent, { type: 'tokens_delta' }>[] = []
  for (const ev of events) {
    if (ev.type !== 'assistant') continue
    const usage = ev.message.usage
    if (!usage) continue
    out.push({
      ts: new Date(ev.timestamp).getTime(),
      type: 'tokens_delta',
      data: { input: usage.input_tokens, output: usage.output_tokens }
    })
  }
  return out
}

export function computeTimerBounds(events: ParsedEvent[]): { startTs: number; endTs: number } {
  if (events.length === 0) {
    throw new Error('computeTimerBounds: no events')
  }
  let min = Infinity
  let max = -Infinity
  for (const ev of events) {
    const t = new Date(ev.timestamp).getTime()
    if (t < min) min = t
    if (t > max) max = t
  }
  return { startTs: min, endTs: max }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '...'
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm --filter @silent-build/harvester test`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/harvester/src/extractor.ts packages/harvester/tests/extractor.test.ts
git commit -m "feat(harvester): extract prompts, tokens, and timer bounds from parsed events"
```

---

## Task 7: Harvester — Extractor (files, tool calls)

Dla każdego tool_use w assistant message → albo `file_write`/`file_edit` (gdy tool to `Write`/`Edit`), albo `tool_call`.

**Files:**
- Modify: `packages/harvester/src/extractor.ts` (add `extractToolCalls`, `extractFileOps`)
- Modify: `packages/harvester/tests/extractor.test.ts` (add tests)

- [ ] **Step 1: Add failing tests to `tests/extractor.test.ts`**

Append to `packages/harvester/tests/extractor.test.ts`:

```typescript
import { extractToolCalls, extractFileOps } from '../src/extractor.js'

const assistantWithToolUse = (
  uuid: string,
  ts: string,
  toolName: string,
  input: unknown
): ParsedEvent => ({
  type: 'assistant',
  uuid,
  parentUuid: null,
  timestamp: ts,
  message: {
    role: 'assistant',
    content: [{ type: 'tool_use', id: `t_${uuid}`, name: toolName, input }]
  }
})

describe('extractToolCalls', () => {
  it('emits tool_call per tool_use in assistant content', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Bash', { command: 'ls' }),
      assistantWithToolUse('a2', '2026-04-21T10:00:05.000Z', 'Grep', { pattern: 'foo' })
    ]
    const calls = extractToolCalls(events)
    expect(calls).toHaveLength(2)
    expect(calls[0]!.data.name).toBe('Bash')
    expect(calls[1]!.data.name).toBe('Grep')
  })

  it('excludes Write and Edit (handled by extractFileOps)', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Write', { file_path: '/tmp/x', content: 'hi' }),
      assistantWithToolUse('a2', '2026-04-21T10:00:01.000Z', 'Bash', { command: 'ls' })
    ]
    const calls = extractToolCalls(events)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.data.name).toBe('Bash')
  })
})

describe('extractFileOps', () => {
  it('emits file_write for Write tool_use', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Write', {
        file_path: '/home/u/app.ts',
        content: 'line1\nline2\nline3'
      })
    ]
    const ops = extractFileOps(events)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toEqual({
      ts: new Date('2026-04-21T10:00:00.000Z').getTime(),
      type: 'file_write',
      data: { path: '/home/u/app.ts', linesAdded: 3 }
    })
  })

  it('emits file_edit for Edit tool_use', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Edit', {
        file_path: '/home/u/app.ts',
        old_string: 'a\nb',
        new_string: 'a\nb\nc\nd'
      })
    ]
    const ops = extractFileOps(events)
    expect(ops).toHaveLength(1)
    expect(ops[0]!.type).toBe('file_edit')
    if (ops[0]!.type === 'file_edit') {
      expect(ops[0]!.data.path).toBe('/home/u/app.ts')
      expect(ops[0]!.data.linesChanged).toBe(4) // max(old_lines, new_lines)
    }
  })

  it('ignores tool_use without file_path', () => {
    const events = [
      assistantWithToolUse('a1', '2026-04-21T10:00:00.000Z', 'Write', { content: 'no path' })
    ]
    expect(extractFileOps(events)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @silent-build/harvester test`
Expected: new tests FAIL (extractToolCalls / extractFileOps not exported)

- [ ] **Step 3: Extend `packages/harvester/src/extractor.ts`**

Append to `packages/harvester/src/extractor.ts`:

```typescript
const FILE_TOOLS = new Set(['Write', 'Edit'])

export function extractToolCalls(events: ParsedEvent[]): Extract<TimelineEvent, { type: 'tool_call' }>[] {
  const out: Extract<TimelineEvent, { type: 'tool_call' }>[] = []
  for (const ev of events) {
    if (ev.type !== 'assistant') continue
    for (const part of ev.message.content) {
      if (part.type !== 'tool_use') continue
      if (!part.name) continue
      if (FILE_TOOLS.has(part.name)) continue
      out.push({
        ts: new Date(ev.timestamp).getTime(),
        type: 'tool_call',
        data: { name: part.name, args: part.input }
      })
    }
  }
  return out
}

export function extractFileOps(
  events: ParsedEvent[]
): Array<Extract<TimelineEvent, { type: 'file_write' }> | Extract<TimelineEvent, { type: 'file_edit' }>> {
  const out: Array<Extract<TimelineEvent, { type: 'file_write' }> | Extract<TimelineEvent, { type: 'file_edit' }>> = []
  for (const ev of events) {
    if (ev.type !== 'assistant') continue
    for (const part of ev.message.content) {
      if (part.type !== 'tool_use' || !part.name) continue
      if (!FILE_TOOLS.has(part.name)) continue
      const input = (part.input ?? {}) as Record<string, unknown>
      const path = typeof input.file_path === 'string' ? input.file_path : undefined
      if (!path) continue
      const ts = new Date(ev.timestamp).getTime()

      if (part.name === 'Write') {
        const content = typeof input.content === 'string' ? input.content : ''
        const linesAdded = content === '' ? 0 : content.split('\n').length
        out.push({ ts, type: 'file_write', data: { path, linesAdded } })
      } else {
        const oldLines = typeof input.old_string === 'string' ? input.old_string.split('\n').length : 0
        const newLines = typeof input.new_string === 'string' ? input.new_string.split('\n').length : 0
        out.push({
          ts,
          type: 'file_edit',
          data: { path, linesChanged: Math.max(oldLines, newLines) }
        })
      }
    }
  }
  return out
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm --filter @silent-build/harvester test`
Expected: all tests PASS (3 new + existing)

- [ ] **Step 5: Commit**

```bash
git add packages/harvester/src/extractor.ts packages/harvester/tests/extractor.test.ts
git commit -m "feat(harvester): extract file_write, file_edit, and tool_call events"
```

---

## Task 8: Harvester — PhaseDetector (markers + heuristic fallback)

Z `manual_markers.json` → fazy z `source: 'manual-marker'`. Jeśli brak markerów, heuristic fallback = równe proporcje 30/30/30/10% sesji.

**Files:**
- Create: `packages/harvester/src/phase-detector.ts`
- Create: `packages/harvester/tests/phase-detector.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/harvester/tests/phase-detector.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { detectPhases } from '../src/phase-detector.js'
import type { ManualMarkersFile } from '@silent-build/shared'

describe('detectPhases — with manual markers', () => {
  it('returns 4 phases with manual-marker source', () => {
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: 1000, projectName: 'test' },
        { phase: 'backend-start', timestamp: 2000 },
        { phase: 'frontend-start', timestamp: 3000 },
        { phase: 'security-start', timestamp: 4000 },
        { phase: 'polish-start', timestamp: 4500 }
      ]
    }
    const phases = detectPhases({ markers, startTs: 1000, endTs: 5000 })
    expect(phases).toHaveLength(4)
    expect(phases[0]).toEqual({
      index: 1, label: 'Architecture', startTs: 1000, endTs: 2000, source: 'manual-marker'
    })
    expect(phases[1]!.label).toBe('Backend')
    expect(phases[2]!.label).toBe('Frontend')
    expect(phases[3]!.label).toBe('Security')
    expect(phases[3]!.endTs).toBe(5000)
  })

  it('handles missing polish-start by ending phase 4 at endTs', () => {
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: 1000, projectName: 'test' },
        { phase: 'backend-start', timestamp: 2000 },
        { phase: 'frontend-start', timestamp: 3000 },
        { phase: 'security-start', timestamp: 4000 }
      ]
    }
    const phases = detectPhases({ markers, startTs: 1000, endTs: 5000 })
    expect(phases[3]!.endTs).toBe(5000)
  })
})

describe('detectPhases — fallback heuristic', () => {
  it('splits session 30/30/30/10 when no markers', () => {
    const phases = detectPhases({ markers: null, startTs: 0, endTs: 10000 })
    expect(phases).toHaveLength(4)
    expect(phases.every(p => p.source === 'heuristic')).toBe(true)
    expect(phases[0]!.startTs).toBe(0)
    expect(phases[0]!.endTs).toBe(3000)
    expect(phases[1]!.endTs).toBe(6000)
    expect(phases[2]!.endTs).toBe(9000)
    expect(phases[3]!.endTs).toBe(10000)
  })

  it('fallback uses default labels', () => {
    const phases = detectPhases({ markers: null, startTs: 0, endTs: 100 })
    expect(phases.map(p => p.label)).toEqual(['Architecture', 'Backend', 'Frontend', 'Security'])
  })
})

describe('detectPhases — missing intermediate markers', () => {
  it('interpolates missing backend-start as start+30% of session', () => {
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: 0, projectName: 'test' },
        { phase: 'frontend-start', timestamp: 6000 },
        { phase: 'security-start', timestamp: 9000 }
      ]
    }
    const phases = detectPhases({ markers, startTs: 0, endTs: 10000 })
    expect(phases[0]!.endTs).toBe(3000) // interpolated 30% of 10000
    expect(phases[0]!.source).toBe('heuristic')
    expect(phases[1]!.source).toBe('heuristic')
    expect(phases[2]!.source).toBe('manual-marker')
    expect(phases[3]!.source).toBe('manual-marker')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @silent-build/harvester test`
Expected: FAIL (phase-detector.js not found)

- [ ] **Step 3: Implement `packages/harvester/src/phase-detector.ts`**

```typescript
import type { ManualMarkersFile, Phase } from '@silent-build/shared'

const PHASE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Architecture',
  2: 'Backend',
  3: 'Frontend',
  4: 'Security'
}

interface DetectArgs {
  markers: ManualMarkersFile | null
  startTs: number
  endTs: number
}

export function detectPhases({ markers, startTs, endTs }: DetectArgs): Phase[] {
  const duration = endTs - startTs
  const fallbackBoundaries = [
    startTs + Math.floor(duration * 0.3),
    startTs + Math.floor(duration * 0.6),
    startTs + Math.floor(duration * 0.9)
  ]

  if (!markers || markers.markers.length === 0) {
    return buildPhases(
      [startTs, fallbackBoundaries[0]!, fallbackBoundaries[1]!, fallbackBoundaries[2]!, endTs],
      ['heuristic', 'heuristic', 'heuristic', 'heuristic']
    )
  }

  const markerByPhase = new Map(markers.markers.map(m => [m.phase, m.timestamp]))
  const phase2Start = markerByPhase.get('backend-start')
  const phase3Start = markerByPhase.get('frontend-start')
  const phase4Start = markerByPhase.get('security-start')

  const boundaries: number[] = [startTs]
  const sources: Array<Phase['source']> = []

  if (phase2Start !== undefined) {
    boundaries.push(phase2Start)
    sources.push('manual-marker')
  } else {
    boundaries.push(fallbackBoundaries[0]!)
    sources.push('heuristic')
  }

  if (phase3Start !== undefined) {
    boundaries.push(phase3Start)
    sources.push(phase2Start !== undefined ? 'manual-marker' : 'heuristic')
  } else {
    boundaries.push(fallbackBoundaries[1]!)
    sources.push('heuristic')
  }

  if (phase4Start !== undefined) {
    boundaries.push(phase4Start)
    sources.push(phase3Start !== undefined ? 'manual-marker' : 'heuristic')
  } else {
    boundaries.push(fallbackBoundaries[2]!)
    sources.push('heuristic')
  }

  boundaries.push(endTs)
  sources.push(phase4Start !== undefined ? 'manual-marker' : 'heuristic')

  return buildPhases(boundaries, sources)
}

function buildPhases(boundaries: number[], sources: Array<Phase['source']>): Phase[] {
  return [1, 2, 3, 4].map((index) => ({
    index: index as 1 | 2 | 3 | 4,
    label: PHASE_LABELS[index as 1 | 2 | 3 | 4],
    startTs: boundaries[index - 1]!,
    endTs: boundaries[index]!,
    source: sources[index - 1]!
  }))
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm --filter @silent-build/harvester test`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/harvester/src/phase-detector.ts packages/harvester/tests/phase-detector.test.ts
git commit -m "feat(harvester): detect 4 phases from manual markers with heuristic fallback"
```

---

## Task 9: Harvester — Subagent merger

Skanuje katalog `subagents/` obok głównej sesji, parsuje każdy subagent jsonl i zwraca ich eventy otagowane `subagentId`.

**Files:**
- Create: `packages/harvester/src/subagent-merger.ts`
- Create: `packages/harvester/tests/subagent-merger.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/harvester/tests/subagent-merger.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mergeSubagents } from '../src/subagent-merger.js'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('mergeSubagents', () => {
  let tmp: string
  let subagentsDir: string

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'subagents-test-'))
    subagentsDir = join(tmp, 'subagents')
    mkdirSync(subagentsDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns empty array when subagents dir does not exist', () => {
    const empty = join(tmpdir(), 'nonexistent-' + Math.random())
    const result = mergeSubagents(empty)
    expect(result).toEqual([])
  })

  it('returns empty array when subagents dir is empty', () => {
    const result = mergeSubagents(subagentsDir)
    expect(result).toEqual([])
  })

  it('tags each tool_call event with subagentId from filename', () => {
    writeFileSync(join(subagentsDir, 'agent-abc123.jsonl'),
      '{"type":"assistant","uuid":"a1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"assistant","content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls"}}]}}'
    )
    const events = mergeSubagents(subagentsDir)
    const toolCalls = events.filter(e => e.type === 'tool_call')
    expect(toolCalls).toHaveLength(1)
    if (toolCalls[0]!.type === 'tool_call') {
      expect(toolCalls[0]!.data.subagentId).toBe('agent-abc123')
    }
  })

  it('merges events from multiple subagent files', () => {
    writeFileSync(join(subagentsDir, 'agent-aaa.jsonl'),
      '{"type":"assistant","uuid":"a1","timestamp":"2026-04-21T10:00:00.000Z","message":{"role":"assistant","content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"x"}}]}}'
    )
    writeFileSync(join(subagentsDir, 'agent-bbb.jsonl'),
      '{"type":"assistant","uuid":"a2","timestamp":"2026-04-21T10:00:01.000Z","message":{"role":"assistant","content":[{"type":"tool_use","id":"t2","name":"Grep","input":{"pattern":"y"}}]}}'
    )
    const events = mergeSubagents(subagentsDir).filter(e => e.type === 'tool_call')
    expect(events).toHaveLength(2)
    const ids = events.flatMap(e => e.type === 'tool_call' ? [e.data.subagentId] : [])
    expect(ids).toContain('agent-aaa')
    expect(ids).toContain('agent-bbb')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @silent-build/harvester test`
Expected: FAIL

- [ ] **Step 3: Implement `packages/harvester/src/subagent-merger.ts`**

```typescript
import { existsSync, readdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { parseJsonl } from './parser.js'
import { extractToolCalls, extractFileOps } from './extractor.js'
import type { TimelineEvent } from '@silent-build/shared'

export function mergeSubagents(subagentsDir: string): TimelineEvent[] {
  if (!existsSync(subagentsDir)) return []
  const files = readdirSync(subagentsDir).filter(f => f.endsWith('.jsonl'))
  const merged: TimelineEvent[] = []

  for (const file of files) {
    const subagentId = basename(file, extname(file))
    const events = parseJsonl(join(subagentsDir, file))
    const toolCalls = extractToolCalls(events).map(tc => ({
      ...tc,
      data: { ...tc.data, subagentId }
    }))
    const fileOps = extractFileOps(events)
    merged.push(...toolCalls, ...fileOps)
  }
  return merged
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm --filter @silent-build/harvester test`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/harvester/src/subagent-merger.ts packages/harvester/tests/subagent-merger.test.ts
git commit -m "feat(harvester): merge subagent jsonl events into main timeline"
```

---

## Task 10: Harvester — Builder (compose SessionTimeline)

Łączy wszystko: parser → extractors → phase-detector → subagent-merger → `SessionTimeline` zgodny z schema.

**Files:**
- Create: `packages/harvester/src/builder.ts`
- Create: `packages/harvester/tests/builder.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/harvester/tests/builder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildTimeline } from '../src/builder.js'
import { SessionTimelineSchema, type ManualMarkersFile } from '@silent-build/shared'

const FIXTURE = new URL('../fixtures/sample-session.jsonl', import.meta.url).pathname

describe('buildTimeline', () => {
  it('returns valid SessionTimeline from real fixture without markers', () => {
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers: null,
      projectName: 'test-project'
    })
    expect(() => SessionTimelineSchema.parse(timeline)).not.toThrow()
    expect(timeline.project.name).toBe('test-project')
    expect(timeline.phases).toHaveLength(4)
    expect(timeline.events.length).toBeGreaterThan(0)
    expect(timeline.metrics.promptsCount).toBeGreaterThan(0)
  })

  it('events are sorted by ts ascending', () => {
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers: null,
      projectName: 'test-project'
    })
    for (let i = 1; i < timeline.events.length; i++) {
      expect(timeline.events[i]!.ts).toBeGreaterThanOrEqual(timeline.events[i - 1]!.ts)
    }
  })

  it('phases come from markers when provided', () => {
    const firstTs = 1745253913012 // matches fixture start approx
    const markers: ManualMarkersFile = {
      project: 'test',
      markers: [
        { phase: 'project-start', timestamp: firstTs, projectName: 'test' },
        { phase: 'backend-start', timestamp: firstTs + 1000 },
        { phase: 'frontend-start', timestamp: firstTs + 2000 },
        { phase: 'security-start', timestamp: firstTs + 3000 }
      ]
    }
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers,
      projectName: 'test'
    })
    expect(timeline.phases[1]!.source).toBe('manual-marker')
  })

  it('metrics match extracted events', () => {
    const timeline = buildTimeline({
      sessionJsonlPath: FIXTURE,
      subagentsDir: null,
      markers: null,
      projectName: 'test'
    })
    const promptsInEvents = timeline.events.filter(e => e.type === 'prompt').length
    expect(timeline.metrics.promptsCount).toBe(promptsInEvents)
    const filesInEvents = new Set(
      timeline.events
        .filter(e => e.type === 'file_write' || e.type === 'file_edit')
        .map(e => (e as any).data.path)
    )
    expect(timeline.metrics.filesTouched).toBe(filesInEvents.size)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @silent-build/harvester test`
Expected: FAIL

- [ ] **Step 3: Implement `packages/harvester/src/builder.ts`**

```typescript
import { parseJsonl } from './parser.js'
import {
  extractPrompts,
  extractTokens,
  extractToolCalls,
  extractFileOps,
  computeTimerBounds
} from './extractor.js'
import { detectPhases } from './phase-detector.js'
import { mergeSubagents } from './subagent-merger.js'
import type { SessionTimeline, TimelineEvent, ManualMarkersFile } from '@silent-build/shared'

export interface BuildArgs {
  sessionJsonlPath: string
  subagentsDir: string | null
  markers: ManualMarkersFile | null
  projectName: string
}

export function buildTimeline(args: BuildArgs): SessionTimeline {
  const parsed = parseJsonl(args.sessionJsonlPath)
  const { startTs, endTs } = computeTimerBounds(parsed)

  const events: TimelineEvent[] = [
    ...extractPrompts(parsed),
    ...extractTokens(parsed),
    ...extractFileOps(parsed),
    ...extractToolCalls(parsed)
  ]

  if (args.subagentsDir) {
    events.push(...mergeSubagents(args.subagentsDir))
  }

  events.sort((a, b) => a.ts - b.ts)

  const phases = detectPhases({
    markers: args.markers,
    startTs: args.markers?.markers[0]?.timestamp ?? startTs,
    endTs
  })

  const totalTokens = events
    .filter(e => e.type === 'tokens_delta')
    .reduce((sum, e) => {
      if (e.type !== 'tokens_delta') return sum
      return sum + e.data.input + e.data.output
    }, 0)

  const filesTouched = new Set(
    events
      .filter(e => e.type === 'file_write' || e.type === 'file_edit')
      .map(e => (e.data as { path: string }).path)
  ).size

  const promptsCount = events.filter(e => e.type === 'prompt').length
  const toolCallsCount = events.filter(e => e.type === 'tool_call').length

  return {
    project: { name: args.projectName, startTs, endTs },
    phases,
    events,
    metrics: { totalTokens, filesTouched, promptsCount, toolCallsCount }
  }
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm --filter @silent-build/harvester test`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/harvester/src/builder.ts packages/harvester/tests/builder.test.ts
git commit -m "feat(harvester): compose SessionTimeline from parsed events + markers + subagents"
```

---

## Task 11: Harvester — CLI

**Files:**
- Create: `packages/harvester/src/cli.ts`

- [ ] **Step 1: Implement `packages/harvester/src/cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { buildTimeline } from './builder.js'
import { ManualMarkersFileSchema } from '@silent-build/shared'

const program = new Command()

program
  .name('harvest')
  .description('Parse Claude Code session jsonl into SessionTimeline')
  .requiredOption('-p, --project <dir>', 'output project dir (e.g. output/focusfeed-2026-04-21)')
  .option('-s, --session <uuid>', 'session UUID (auto-detects latest if omitted)')
  .option('-r, --project-root <path>', 'project path to resolve CC slug', process.cwd())
  .action((opts: { project: string; session?: string; projectRoot: string }) => {
    const slug = slugify(opts.projectRoot)
    const ccProjectDir = join(homedir(), '.claude', 'projects', slug)

    if (!existsSync(ccProjectDir)) {
      throw new Error(`CC project dir not found: ${ccProjectDir}`)
    }

    const sessionUuid = opts.session ?? findLatestSession(ccProjectDir)
    const sessionJsonl = join(ccProjectDir, `${sessionUuid}.jsonl`)
    if (!existsSync(sessionJsonl)) {
      throw new Error(`Session jsonl not found: ${sessionJsonl}`)
    }

    const subagentsDir = join(ccProjectDir, sessionUuid, 'subagents')
    const markersPath = join(opts.project, 'manual_markers.json')
    const markers = existsSync(markersPath)
      ? ManualMarkersFileSchema.parse(JSON.parse(readFileSync(markersPath, 'utf-8')))
      : null

    const projectName = markers?.project ?? 'Unknown'
    const timeline = buildTimeline({
      sessionJsonlPath: sessionJsonl,
      subagentsDir: existsSync(subagentsDir) ? subagentsDir : null,
      markers,
      projectName
    })

    const outPath = join(opts.project, 'timeline.json')
    writeFileSync(outPath, JSON.stringify(timeline, null, 2))
    console.log(`Wrote timeline: ${outPath}`)
    console.log(`  events: ${timeline.events.length}`)
    console.log(`  phases: ${timeline.phases.map(p => `${p.index}/${p.label}`).join(', ')}`)
    console.log(`  duration: ${formatDuration(timeline.project.endTs - timeline.project.startTs)}`)
    console.log(`  tokens: ${timeline.metrics.totalTokens.toLocaleString()}`)
    console.log(`  files touched: ${timeline.metrics.filesTouched}`)
  })

function slugify(absPath: string): string {
  return absPath.replace(/\//g, '-')
}

function findLatestSession(ccProjectDir: string): string {
  const files = readdirSync(ccProjectDir).filter(f => f.endsWith('.jsonl'))
  if (files.length === 0) throw new Error(`No jsonl sessions in ${ccProjectDir}`)
  const latest = files
    .map(f => ({ f, mtime: statSync(join(ccProjectDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]!
  return latest.f.replace('.jsonl', '')
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

program.parse()
```

- [ ] **Step 2: Smoke-test CLI against current session**

Run:
```bash
mkdir -p /tmp/harvest-smoke
pnpm harvest --project /tmp/harvest-smoke --project-root /home/bartek/video-projects/silent-build
cat /tmp/harvest-smoke/timeline.json | head -30
```

Expected: `timeline.json` created, first 30 lines show project, phases, events.

Cleanup: `rm -rf /tmp/harvest-smoke`

- [ ] **Step 3: Commit**

```bash
git add packages/harvester/src/cli.ts
git commit -m "feat(harvester): add pnpm harvest CLI with auto-session-discovery"
```

---

## Task 12: Overlay — Remotion project init + format utilities

**Files:**
- Create: `packages/overlay/package.json`
- Create: `packages/overlay/tsconfig.json`
- Create: `packages/overlay/remotion.config.ts`
- Create: `packages/overlay/src/Root.tsx`
- Create: `packages/overlay/src/lib/format-duration.ts`
- Create: `packages/overlay/src/lib/format-number.ts`
- Create: `packages/overlay/src/lib/timeline-loader.ts`
- Create: `packages/overlay/tests/format-duration.test.ts`
- Create: `packages/overlay/tests/format-number.test.ts`
- Create: `packages/overlay/src/fixtures/mock-timeline.json`

- [ ] **Step 1: Write tests for format utilities**

Create `packages/overlay/tests/format-duration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatDuration } from '../src/lib/format-duration.js'

describe('formatDuration', () => {
  it('formats zero as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })
  it('formats seconds under a minute', () => {
    expect(formatDuration(45_000)).toBe('00:00:45')
  })
  it('formats minutes and seconds', () => {
    expect(formatDuration(125_000)).toBe('00:02:05')
  })
  it('formats hours', () => {
    expect(formatDuration(3_725_000)).toBe('01:02:05')
  })
  it('clamps negative input to 00:00:00', () => {
    expect(formatDuration(-100)).toBe('00:00:00')
  })
})
```

Create `packages/overlay/tests/format-number.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatNumber } from '../src/lib/format-number.js'

describe('formatNumber', () => {
  it('returns raw number under 1000', () => {
    expect(formatNumber(999)).toBe('999')
  })
  it('formats thousands with k suffix', () => {
    expect(formatNumber(1_500)).toBe('1.5k')
    expect(formatNumber(127_321)).toBe('127k')
  })
  it('formats millions with M suffix', () => {
    expect(formatNumber(2_500_000)).toBe('2.5M')
  })
})
```

- [ ] **Step 2: Create package files**

Create `packages/overlay/package.json`:

```json
{
  "name": "@silent-build/overlay",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "studio": "remotion studio src/Root.tsx",
    "render": "tsx src/render-cli.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@silent-build/shared": "workspace:*",
    "@remotion/cli": "^4.0.200",
    "@remotion/renderer": "^4.0.200",
    "commander": "^12.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "^4.0.200"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "tsx": "^4.19.0"
  }
}
```

Create `packages/overlay/tsconfig.json`:

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

Create `packages/overlay/remotion.config.ts`:

```typescript
import { Config } from '@remotion/cli/config'
Config.setVideoImageFormat('png')
Config.setConcurrency(4)
Config.setPixelFormat('yuva444p10le') // alpha channel for ProRes
Config.setCodec('prores')
Config.setProResProfile('4444')
```

- [ ] **Step 3: Implement `packages/overlay/src/lib/format-duration.ts`**

```typescript
export function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
```

- [ ] **Step 4: Implement `packages/overlay/src/lib/format-number.ts`**

```typescript
export function formatNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const k = n / 1000
    return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`
  }
  const m = n / 1_000_000
  return m >= 100 ? `${Math.round(m)}M` : `${m.toFixed(1)}M`
}
```

- [ ] **Step 5: Implement `packages/overlay/src/lib/timeline-loader.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { SessionTimelineSchema, type SessionTimeline } from '@silent-build/shared'

export function loadTimeline(path: string): SessionTimeline {
  const raw = readFileSync(path, 'utf-8')
  return SessionTimelineSchema.parse(JSON.parse(raw))
}
```

- [ ] **Step 6: Create mock timeline fixture**

Create `packages/overlay/src/fixtures/mock-timeline.json`:

```json
{
  "project": { "name": "FocusFeed (mock)", "startTs": 1700000000000, "endTs": 1700010000000 },
  "phases": [
    { "index": 1, "label": "Architecture", "startTs": 1700000000000, "endTs": 1700002500000, "source": "manual-marker" },
    { "index": 2, "label": "Backend", "startTs": 1700002500000, "endTs": 1700005500000, "source": "manual-marker" },
    { "index": 3, "label": "Frontend (Claude Design)", "startTs": 1700005500000, "endTs": 1700008500000, "source": "manual-marker" },
    { "index": 4, "label": "Security", "startTs": 1700008500000, "endTs": 1700010000000, "source": "manual-marker" }
  ],
  "events": [
    { "ts": 1700000000000, "type": "prompt", "data": { "text": "Setup Next.js 15 with App Router", "tokensIn": 12 } },
    { "ts": 1700000120000, "type": "file_write", "data": { "path": "app/page.tsx", "linesAdded": 45 } },
    { "ts": 1700000300000, "type": "tool_call", "data": { "name": "Bash", "args": { "command": "pnpm install" } } },
    { "ts": 1700000500000, "type": "tokens_delta", "data": { "input": 1250, "output": 890 } }
  ],
  "metrics": { "totalTokens": 45000, "filesTouched": 14, "promptsCount": 23, "toolCallsCount": 89 }
}
```

- [ ] **Step 7: Implement minimal `packages/overlay/src/Root.tsx`**

```typescript
import { Composition } from 'remotion'
import { Dashboard } from './Dashboard.js'
import mockTimeline from './fixtures/mock-timeline.json'
import { SessionTimelineSchema } from '@silent-build/shared'

const parsed = SessionTimelineSchema.parse(mockTimeline)
const durationMs = parsed.project.endTs - parsed.project.startTs
const FPS = 60
const durationFrames = Math.max(60, Math.ceil((durationMs / 1000) * FPS))

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Dashboard"
    component={Dashboard}
    durationInFrames={durationFrames}
    fps={FPS}
    width={576}
    height={1080}
    defaultProps={{ timeline: parsed }}
  />
)
```

- [ ] **Step 8: Create placeholder `packages/overlay/src/Dashboard.tsx`**

```typescript
import type { SessionTimeline } from '@silent-build/shared'

export interface DashboardProps {
  timeline: SessionTimeline
}

export const Dashboard: React.FC<DashboardProps> = ({ timeline }) => (
  <div style={{ width: 576, height: 1080, background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace', padding: 24 }}>
    <h2 style={{ fontSize: 24 }}>Dashboard placeholder</h2>
    <p>Project: {timeline.project.name}</p>
    <p>Phases: {timeline.phases.length}</p>
    <p>Events: {timeline.events.length}</p>
  </div>
)
```

- [ ] **Step 9: Install deps, run tests, typecheck**

Run:
```bash
pnpm install
pnpm --filter @silent-build/overlay test
pnpm --filter @silent-build/overlay typecheck
```

Expected: 8 tests PASS (5 duration + 3 number), typecheck clean

- [ ] **Step 10: Commit**

```bash
git add packages/overlay pnpm-lock.yaml
git commit -m "feat(overlay): init Remotion project with format utilities and mock timeline"
```

---

## Task 13: Overlay — Widgets Tier A (Timer, CurrentPrompt, TokenCounter, FileActivity)

Każdy widget dostaje `timeline` + `currentMs` (ile czasu sesji upłynęło w tej klatce) i renderuje stan dla tej klatki.

**Files:**
- Create: `packages/overlay/src/widgets/Timer.tsx`
- Create: `packages/overlay/src/widgets/CurrentPrompt.tsx`
- Create: `packages/overlay/src/widgets/TokenCounter.tsx`
- Create: `packages/overlay/src/widgets/FileActivity.tsx`

- [ ] **Step 1: Implement `packages/overlay/src/widgets/Timer.tsx`**

```typescript
import { formatDuration } from '../lib/format-duration.js'

export const Timer: React.FC<{ elapsedMs: number }> = ({ elapsedMs }) => (
  <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: 2 }}>
    {formatDuration(elapsedMs)}
  </div>
)
```

- [ ] **Step 2: Implement `packages/overlay/src/widgets/CurrentPrompt.tsx`**

```typescript
import type { SessionTimeline } from '@silent-build/shared'

export const CurrentPrompt: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const prompts = timeline.events.filter(e => e.type === 'prompt')
  const last = [...prompts].reverse().find(p => p.ts <= absTs)
  const text = last && last.type === 'prompt' ? last.data.text : '—'
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 14, opacity: 0.6, textTransform: 'uppercase' }}>Current prompt</div>
      <div style={{ fontSize: 18, marginTop: 8, lineHeight: 1.4 }}>{text}</div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `packages/overlay/src/widgets/TokenCounter.tsx`**

```typescript
import type { SessionTimeline } from '@silent-build/shared'
import { formatNumber } from '../lib/format-number.js'

const MAX_TOKENS = 200_000

export const TokenCounter: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const used = timeline.events
    .filter(e => e.type === 'tokens_delta' && e.ts <= absTs)
    .reduce((s, e) => s + (e.type === 'tokens_delta' ? e.data.input + e.data.output : 0), 0)
  const pct = Math.min(100, (used / MAX_TOKENS) * 100)
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 14, opacity: 0.6, textTransform: 'uppercase' }}>Tokens</div>
      <div style={{ fontSize: 20, marginTop: 4 }}>{formatNumber(used)} / {formatNumber(MAX_TOKENS)}</div>
      <div style={{ width: '100%', height: 6, background: '#1a1a1a', marginTop: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#4ade80', transition: 'width 0.2s' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `packages/overlay/src/widgets/FileActivity.tsx`**

```typescript
import type { SessionTimeline } from '@silent-build/shared'

export const FileActivity: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const writes = new Set<string>()
  const edits = new Set<string>()
  for (const e of timeline.events) {
    if (e.ts > absTs) break
    if (e.type === 'file_write') writes.add(e.data.path)
    else if (e.type === 'file_edit') edits.add(e.data.path)
  }
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 14, opacity: 0.6, textTransform: 'uppercase' }}>Files</div>
      <div style={{ fontSize: 18, marginTop: 4 }}>
        {writes.size} written · {edits.size} edited
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @silent-build/overlay typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add packages/overlay/src/widgets
git commit -m "feat(overlay): add Timer, CurrentPrompt, TokenCounter, FileActivity widgets"
```

---

## Task 14: Overlay — Widgets Tier B (ActivityLog, PhaseBar, SecurityPanel dummy)

**Files:**
- Create: `packages/overlay/src/widgets/ActivityLog.tsx`
- Create: `packages/overlay/src/widgets/PhaseBar.tsx`
- Create: `packages/overlay/src/widgets/SecurityPanel.tsx`

- [ ] **Step 1: Implement `packages/overlay/src/widgets/ActivityLog.tsx`**

```typescript
import type { SessionTimeline } from '@silent-build/shared'
import { formatDuration } from '../lib/format-duration.js'

const MAX_ENTRIES = 8

interface Entry {
  ts: number
  icon: string
  text: string
  isSubagent: boolean
}

export const ActivityLog: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const entries: Entry[] = []

  for (const e of timeline.events) {
    if (e.ts > absTs) break
    const relMs = e.ts - timeline.project.startTs
    if (e.type === 'file_write') entries.push({ ts: e.ts, icon: 'W', text: `Writing ${short(e.data.path)}`, isSubagent: false })
    else if (e.type === 'file_edit') entries.push({ ts: e.ts, icon: 'E', text: `Editing ${short(e.data.path)}`, isSubagent: false })
    else if (e.type === 'tool_call') {
      const sub = Boolean(e.data.subagentId)
      entries.push({ ts: e.ts, icon: sub ? 's' : 'T', text: `${e.data.name}${sub ? ' (subagent)' : ''}`, isSubagent: sub })
    }
  }

  const latest = entries.slice(-MAX_ENTRIES)
  return (
    <div style={{ marginTop: 24, border: '1px solid #1a1a1a', padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>Activity log</div>
      {latest.map((e, i) => (
        <div key={i} style={{ fontSize: 13, display: 'flex', gap: 8, color: e.isSubagent ? '#94a3b8' : '#e5e5e5', marginTop: 2 }}>
          <span style={{ opacity: 0.5, width: 56 }}>{formatDuration(e.ts - timeline.project.startTs)}</span>
          <span style={{ width: 18 }}>{e.icon}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text}</span>
        </div>
      ))}
    </div>
  )
}

function short(path: string): string {
  const parts = path.split('/')
  return parts.slice(-2).join('/')
}
```

- [ ] **Step 2: Implement `packages/overlay/src/widgets/PhaseBar.tsx`**

```typescript
import type { SessionTimeline } from '@silent-build/shared'

export const PhaseBar: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const active = timeline.phases.find(p => absTs >= p.startTs && absTs < p.endTs) ?? timeline.phases[timeline.phases.length - 1]!
  const sessionDur = timeline.project.endTs - timeline.project.startTs
  const pct = Math.min(100, (currentMs / sessionDur) * 100)

  return (
    <div style={{ padding: 16, borderTop: '1px solid #1a1a1a' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {timeline.phases.map(p => {
          const phaseStartPct = ((p.startTs - timeline.project.startTs) / sessionDur) * 100
          const phaseEndPct = ((p.endTs - timeline.project.startTs) / sessionDur) * 100
          const filled = Math.max(0, Math.min(phaseEndPct, pct) - phaseStartPct)
          const width = phaseEndPct - phaseStartPct
          return (
            <div key={p.index} style={{ flex: width, background: '#1a1a1a', height: 6, position: 'relative' }}>
              <div style={{ width: `${(filled / width) * 100}%`, height: '100%', background: p.index === active.index ? '#4ade80' : '#64748b' }} />
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
        <span>Phase {active.index}/4</span>
        <span style={{ fontWeight: 600 }}>{active.label}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `packages/overlay/src/widgets/SecurityPanel.tsx`**

```typescript
import type { SessionTimeline } from '@silent-build/shared'

// MVP: dummy — pokazuje "Idle" dopoki nie ma eventow typu security_finding w timeline
export const SecurityPanel: React.FC<{ timeline: SessionTimeline; currentMs: number }> = ({ timeline, currentMs }) => {
  const absTs = timeline.project.startTs + currentMs
  const findings = timeline.events.filter(e => e.type === 'security_finding' && e.ts <= absTs)
  const hasAny = findings.length > 0

  return (
    <div style={{ marginTop: 16, border: '1px solid #1a1a1a', padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>Security</div>
      {!hasAny && <div style={{ fontSize: 14, opacity: 0.7 }}>Idle</div>}
      {findings.map((f, i) => {
        if (f.type !== 'security_finding') return null
        return (
          <div key={i} style={{ fontSize: 13, color: f.data.fixed ? '#4ade80' : '#f87171', marginTop: 4 }}>
            [{f.data.severity}] {f.data.title} {f.data.fixed ? '(fixed)' : ''}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @silent-build/overlay typecheck`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add packages/overlay/src/widgets/ActivityLog.tsx packages/overlay/src/widgets/PhaseBar.tsx packages/overlay/src/widgets/SecurityPanel.tsx
git commit -m "feat(overlay): add ActivityLog, PhaseBar, SecurityPanel widgets"
```

---

## Task 15: Overlay — Dashboard composition

Łączymy widgety w jeden komponent Dashboard.

**Files:**
- Modify: `packages/overlay/src/Dashboard.tsx`

- [ ] **Step 1: Replace `packages/overlay/src/Dashboard.tsx`**

```typescript
import { useCurrentFrame, useVideoConfig } from 'remotion'
import type { SessionTimeline } from '@silent-build/shared'
import { Timer } from './widgets/Timer.js'
import { CurrentPrompt } from './widgets/CurrentPrompt.js'
import { TokenCounter } from './widgets/TokenCounter.js'
import { FileActivity } from './widgets/FileActivity.js'
import { ActivityLog } from './widgets/ActivityLog.js'
import { PhaseBar } from './widgets/PhaseBar.js'
import { SecurityPanel } from './widgets/SecurityPanel.js'

export interface DashboardProps {
  timeline: SessionTimeline
}

export const Dashboard: React.FC<DashboardProps> = ({ timeline }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentMs = Math.floor((frame / fps) * 1000)
  const sessionDur = timeline.project.endTs - timeline.project.startTs
  const clampedMs = Math.min(currentMs, sessionDur)

  return (
    <div style={{
      width: 576, height: 1080,
      background: '#0a0a0a', color: '#e5e5e5',
      fontFamily: 'monospace',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: 16, borderBottom: '1px solid #1a1a1a', fontSize: 14, opacity: 0.8 }}>
        Project: <span style={{ fontWeight: 700, opacity: 1 }}>{timeline.project.name}</span>
      </div>

      <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
        <Timer elapsedMs={clampedMs} />
        <CurrentPrompt timeline={timeline} currentMs={clampedMs} />
        <TokenCounter timeline={timeline} currentMs={clampedMs} />
        <FileActivity timeline={timeline} currentMs={clampedMs} />
        <ActivityLog timeline={timeline} currentMs={clampedMs} />
        <SecurityPanel timeline={timeline} currentMs={clampedMs} />
      </div>

      <PhaseBar timeline={timeline} currentMs={clampedMs} />
    </div>
  )
}
```

- [ ] **Step 2: Manually verify in Remotion Studio**

Run: `pnpm studio`
Expected: browser opens Remotion Studio, "Dashboard" composition visible, play button animates through mock timeline showing Timer ticking, ActivityLog populating, Phase changes.

Quit studio (Ctrl+C in terminal) when verified.

- [ ] **Step 3: Commit**

```bash
git add packages/overlay/src/Dashboard.tsx
git commit -m "feat(overlay): compose Dashboard from widgets with frame-based animation"
```

---

## Task 16: Overlay — Render CLI (MOV + PNG sequence)

CLI wrapper wokół `@remotion/renderer` który czyta `timeline.json` i renderuje dwa outputy.

**Files:**
- Create: `packages/overlay/src/render-cli.ts`

- [ ] **Step 1: Implement `packages/overlay/src/render-cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { bundle } from '@remotion/bundler'
import { renderMedia, renderStill, selectComposition, renderFrames } from '@remotion/renderer'
import { join, resolve } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { loadTimeline } from './lib/timeline-loader.js'

const program = new Command()

program
  .name('render')
  .description('Render silent-build overlay from timeline.json')
  .requiredOption('-p, --project <dir>', 'project output dir (contains timeline.json)')
  .option('--format <format>', 'mov | png | both', 'both')
  .option('--fps <n>', 'frames per second', '60')
  .action(async (opts: { project: string; format: 'mov' | 'png' | 'both'; fps: string }) => {
    const projectDir = resolve(opts.project)
    const timelinePath = join(projectDir, 'timeline.json')
    if (!existsSync(timelinePath)) {
      throw new Error(`timeline.json not found in ${projectDir}`)
    }

    const timeline = loadTimeline(timelinePath)
    const fps = parseInt(opts.fps, 10)
    const durationSec = Math.ceil((timeline.project.endTs - timeline.project.startTs) / 1000)
    const durationFrames = Math.max(fps, durationSec * fps)

    const entry = join(import.meta.dirname, 'Root.tsx')
    console.log(`Bundling Remotion project from ${entry}`)
    const bundleLocation = await bundle({ entryPoint: entry })

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'Dashboard',
      inputProps: { timeline }
    })

    composition.durationInFrames = durationFrames
    composition.fps = fps

    if (opts.format === 'mov' || opts.format === 'both') {
      const movPath = join(projectDir, 'dashboard.mov')
      console.log(`Rendering ${movPath}`)
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'prores',
        proResProfile: '4444',
        outputLocation: movPath,
        inputProps: { timeline },
        pixelFormat: 'yuva444p10le'
      })
      console.log(`Done: ${movPath}`)
    }

    if (opts.format === 'png' || opts.format === 'both') {
      const pngDir = join(projectDir, 'dashboard_frames')
      mkdirSync(pngDir, { recursive: true })
      console.log(`Rendering PNG sequence to ${pngDir}`)
      await renderFrames({
        composition,
        serveUrl: bundleLocation,
        inputProps: { timeline },
        imageFormat: 'png',
        outputDir: pngDir,
        frameRange: [0, durationFrames - 1],
        onFrameUpdate: (done) => {
          if (done % 60 === 0) console.log(`  ${done}/${durationFrames} frames`)
        },
        concurrency: 4
      })
      console.log(`Done: ${pngDir}`)
    }
  })

program.parseAsync().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/overlay/src/render-cli.ts
git commit -m "feat(overlay): add render CLI for MOV and PNG sequence output"
```

---

## Task 17: E2E smoke test + README

Pełen przebieg na realnej sesji + dokumentacja użycia.

**Files:**
- Create: `README.md` (root)
- Create: `scripts/smoke-e2e.sh`

- [ ] **Step 1: Create E2E smoke test script**

Create `scripts/smoke-e2e.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Smoke test: harvest current brainstorm session -> render 10 sek sampleem PNG
# Expected: output/smoke-test-<date>/timeline.json + dashboard_frames/*.png

SMOKE_DIR="output/smoke-test-$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$SMOKE_DIR"

echo "[smoke] project-start"
SILENT_BUILD_DIR="$SMOKE_DIR" pnpm mark project-start --name "SmokeTest" --output-root "$(dirname "$SMOKE_DIR")"

# find the actual created dir (mark adds date suffix)
ACTUAL_DIR=$(ls -dt output/smoketest-* | head -1)
echo "[smoke] actual dir: $ACTUAL_DIR"

echo "[smoke] harvest"
pnpm harvest --project "$ACTUAL_DIR" --project-root "$(pwd)"

echo "[smoke] render PNG only (faster than MOV for smoke)"
pnpm render --project "$ACTUAL_DIR" --format png --fps 30

echo "[smoke] verify outputs"
test -f "$ACTUAL_DIR/timeline.json" || { echo "FAIL: no timeline.json"; exit 1; }
test -d "$ACTUAL_DIR/dashboard_frames" || { echo "FAIL: no dashboard_frames"; exit 1; }
FRAME_COUNT=$(ls "$ACTUAL_DIR/dashboard_frames" | wc -l)
test "$FRAME_COUNT" -gt 0 || { echo "FAIL: no PNG frames"; exit 1; }

echo "[smoke] OK — $FRAME_COUNT frames rendered, timeline valid"
echo "[smoke] artifacts in $ACTUAL_DIR"
```

Make executable: `chmod +x scripts/smoke-e2e.sh`

- [ ] **Step 2: Run smoke test end-to-end**

Run: `./scripts/smoke-e2e.sh`
Expected: exits 0, prints "smoke OK", PNG frames in `output/smoketest-*/dashboard_frames/`

If passes, cleanup: `rm -rf output/smoketest-*`

- [ ] **Step 3: Create root `README.md`**

```markdown
# silent-build

Post-processing pipeline dla wiralowych filmow silent-coding. Zamienia sesje Claude Code (`.jsonl`) w PNG/MOV overlay, ktory wklejamy obok OBS recording w CapCut.

## Architektura

3 paczki:
- `@silent-build/markers` — CLI, zapisuje manual phase markers
- `@silent-build/harvester` — CLI, parsuje `.jsonl` sesje -> `timeline.json`
- `@silent-build/overlay` — Remotion project, renderuje dashboard -> PNG/MOV
- `@silent-build/shared` — Zod schemas, TS types (kontrakt miedzy paczkami)

Spec: `docs/superpowers/specs/2026-04-21-silent-build-design.md`
Plan: `docs/superpowers/plans/2026-04-21-silent-build-pipeline-mvp.md`

## Wymagania

- Node 22+
- pnpm 9+

## Setup

```bash
pnpm install
pnpm test                # wszystkie paczki
pnpm typecheck
```

## Workflow per film

1. **Przed sesja:**
   ```bash
   pnpm mark project-start --name "FocusFeed"
   # zapisz komende `export SILENT_BUILD_DIR=...` z outputu
   ```

2. **OBS:** rozpocznij nagrywanie -> `output/focusfeed-<date>/screen.mp4`

3. **Claude Code:** koduj jak normalnie. Sesja sie loguje do `~/.claude/projects/.../<session-uuid>.jsonl`

4. **Na zmianach faz (w trakcie sesji):**
   ```bash
   pnpm mark backend-start
   pnpm mark frontend-start
   pnpm mark security-start
   pnpm mark polish-start
   ```

5. **Po sesji — harvest + render:**
   ```bash
   pnpm harvest --project $SILENT_BUILD_DIR
   pnpm render --project $SILENT_BUILD_DIR
   ```

6. **Montaz w CapCut:**
   - Import `screen.mp4` (70% lewa)
   - Import `dashboard_frames/` jako image sequence (30% prawa)
   - Sync po pierwszej klatce, ciecia, tempo, muzyka, thumbnail

## Struktura

```
packages/
  shared/      # typy i schematy (Zod)
  markers/     # pnpm mark <phase>
  harvester/   # pnpm harvest
  overlay/     # pnpm render / pnpm studio
output/
  <project>-<date>/
    manual_markers.json
    timeline.json
    screen.mp4             # gitignored
    dashboard.mov          # gitignored
    dashboard_frames/      # gitignored
docs/
  superpowers/
    specs/                 # design docs
    plans/                 # implementation plans
```

## Development

- `pnpm studio` — Remotion Studio z mock timeline, hot reload dashboardu
- `pnpm test` — Vitest
- `./scripts/smoke-e2e.sh` — pelen pipeline na biezacej sesji CC
```

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-e2e.sh README.md
git commit -m "test: add e2e smoke script; docs: add root README with workflow"
```

---

## Self-Review Checklist (wykonywane przez Claude piszącego plan — już ukończone inline)

**Spec coverage check:**
- [x] Sek 2 spec (in-scope items) → Task 1-17
- [x] Sek 3 arch → Task 1, 10, 11 (3 moduły + zewnętrzny CapCut)
- [x] Sek 4 struktura katalogów → Task 1, 3, 4, 5, 12 (każda paczka w swoim tasku)
- [x] Sek 5 data flow → Task 4 (markers), 11 (harvest), 16 (render)
- [x] Sek 6 Timeline schema → Task 3 (Zod schemas)
- [x] Sek 7 Dashboard layout → Task 13, 14, 15 (widgets + composition)
- [x] Sek 8 format filmu → Task 12 (Remotion config), 16 (render CLI)
- [x] Sek 9 error handling → Task 5 (parser fault-tolerant), 8 (phase fallback), 11 (missing markers akceptowane)
- [x] Sek 10 testing → Task 2 (fixture), all tasks (TDD per feature), Task 17 (E2E)
- [x] Sek 11 pilot FocusFeed → MVP pipeline gotowy na ten projekt; sam build FocusFeed to osobna aktywność poza pipeline
- [x] Sek 12 manual/auto split → Task 17 README
- [x] Sek 13 P2 items → wyraźnie poza MVP scope, nie w planie

**Type consistency check:** wszędzie `SessionTimeline`, `Phase`, `TimelineEvent`, `ManualMarker`, `ManualMarkersFile` z `@silent-build/shared` — spójnie w Task 3, 4, 8, 10, 11, 12-15.

**Placeholder scan:** brak TBD/TODO/podobnie w stepsach — każdy step ma konkretny code block albo konkretną komendę.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-21-silent-build-pipeline-mvp.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
