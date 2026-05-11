# Skill / plugin / MCP detection — what to do with the output

`bin/scan-skills.mjs <jsonl-dir>` returns JSON. Use it to weave **credibility-building, anti-fairy-tale** beats into `scenariusz.md`. Default-generated scenariusz often reads "ja gadałem, AI napisała kod" — adding skill context makes it read "ja prowadziłem AI przez zdefiniowany workflow, oto czemu kod się udał".

## Output shape

```json
{
  "skills": { "superpowers:brainstorming": 1, "security-audit": 1 },
  "pluginDirs": ["brainstorming", "writing-plans", "security-audit"],
  "slashCommands": { "/security-audit": 2, "/simplify": 1 },
  "mcpTools": { "mcp__chrome-devtools__take_screenshot": 20 },
  "byCategory": {
    "design-thinking": ["superpowers:brainstorming"],
    "planning":        ["superpowers:writing-plans"],
    "security":        ["security-audit"],
    "deploy":          ["coolify-deploy"]
  },
  "narrationHints": [
    "Sesja zaczęła się od `superpowers:brainstorming` — wymusza design-first…",
    "Po brainstorm — `superpowers:writing-plans`…"
  ]
}
```

## Category → scenariusz mapping

| Kategoria | Co znaczy | Pasuje do sceny |
|---|---|---|
| **design-thinking** | brainstorming skill, design-thinking | `start` (jeśli pierwsze 3 prompty) lub `plan` |
| **planning** | writing-plans, spec, decomposition | `plan` |
| **quality** | test-driven-development (TDD) | `build` |
| **security** | security-audit, /security-audit | `audit` |
| **refactor** | simplify, code-review, /simplify | `build` (post-MVP) lub `end` |
| **deploy** | coolify-deploy, fly-deploy, vercel | `end` |
| **content** | humanize-text, blog-by-session, voiceover | `end` lub outro narration |
| **browser-test** | playwright, mcp__chrome-devtools__* | `design` (visual QA) lub `audit` (smoke test) |
| **design** | frontend-design (Claude Design) | `design` |
| **meta** | curate-narrative, silent-build, generate-voiceover-script | NIE wstawiać do scenariusza filmu o tym projekcie (meta-loop) — wspomnij dopiero w outro jeśli film jest o pipelinie. |
| **other** | unknown skill | optional mention if `count > 3` |

## Anti-fairy-tale pattern

❌ "Po pierwszym prompcie AI wygenerowała 29 plików w 10 minut. Magia."

✅ "Najpierw `superpowers:brainstorming` skill — wymusza design-first dialog. Bez tego pewnie napisałbym 3 pliki bez planu i zaraz refactor. Po brainstorm `superpowers:writing-plans` decomposed feature na 7 tasków. Dopiero wtedy Claude scaffolduje 29 plików — bo wie już co buduje, nie zgaduje."

Konkretne fakty z jsonl (skill name + invocation order) podnoszą credibility. AI-coding video bez tego = "kolejny vibecoder". Z tym = "developer który używa AI jak narzędzia ze structured workflow".

## Wstawki na konkretne skille

**`superpowers:brainstorming`** (design-thinking):
> "Zaczynam każdy projekt od brainstormingu — skill prowadzi przez pytania one-at-a-time aż mam jasny spec. Hard-gate w skillu: nie wolno kodować dopóki design nie jest accepted."

**`superpowers:writing-plans`** (planning):
> "Spec → plan przez writing-plans skill. Rozbija na 5-10 tasków, każdy z osobnym commit. Daje strukturę żeby nie zgubić się w 10h sesji."

**`superpowers:test-driven-development`** (quality):
> "TDD enforced — skill mówi: napisz test, watch fail, dopiero kod. To wymusza decomposition i dokumentuje intent przed implementacją."

**`security-audit`** (security):
> "Po MVP — security-audit skill. Sprawdza open redirect, rate limit, CSRF, autoryzację. Każde finding to commit `fix(security): ...`. Tu znalazłem N podatności."

**`/simplify`** (refactor):
> "Refactor pass: simplify skill. Reviewuje changed code za reuse, quality, efficiency. Nie zmienia behavior — czyści design. Po tym i tylko po tym → release."

**`/coolify-deploy`** (deploy):
> "Deploy do Coolify na Hetznerze przez coolify-deploy skill. Setup environment, healthchecks, logs streaming. Zero wrangler, zero vercel — twoje VPS, twoje DB, 6× tańsze."

**`frontend-design`** (design):
> "Design przez frontend-design skill — Claude Design. Wklejasz link żeby zobaczyć layout, dostajesz JSX. Adapt do stack manualnie ~15 min."

**`mcp__chrome-devtools__*`** (browser-test):
> "Real browser validation przez chrome-devtools MCP. Screenshot przed/po każdej zmianie UI, console.error monitoring. Catch'uje regressions które TypeScript by przegapił."

**`humanize-text`** (content):
> "Output text (descriptions, README, blog posts) przez humanize-text skill na końcu. Usuwa AI-tells — generic openings, em-dashes, repetitive structure."

## Edge cases

- **Tylko 1 skill detected** — wzmianka w 1 scenie wystarczy. Don't force.
- **5+ skille różnych kategorii** — wspomnij top 3 w odpowiednich scenach, reszta w outro jako "+ X helper skills".
- **`silent-build` / `curate-narrative` skill** detected — to skill który **właśnie generuje ten plik**, więc nie wstawiaj do scenariusza filmu o tym projekcie (chyba że film jest meta-tematem o pipelinie).
- **Brak detected skills** — sesja była freestyle prompt. Można wpleść w hook: "Bez skilli, bez specki, freestyle prompt — i zobaczcie co się stało". Czasem freestyle jest pointem.

## When `narrationHints` is empty

Helper zwraca pusty array gdy nie wykrył żadnego znanego skill/slash. To OK — scenariusz fallback do default storytelling beats z `format/left-pane-storytelling.md` bez tooling angles. Nadal działa.
