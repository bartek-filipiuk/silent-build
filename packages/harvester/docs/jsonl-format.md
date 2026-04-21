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
