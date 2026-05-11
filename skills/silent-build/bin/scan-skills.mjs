#!/usr/bin/env node
/**
 * Scan Claude Code session jsonl(s) for skill / plugin / slash-command /
 * MCP-tool usage. Returns structured JSON the silent-build skill weaves
 * into scenariusz.md.
 *
 * Why this matters: a session that used `superpowers:brainstorming` then
 * `superpowers:writing-plans` then `security-audit` tells a different
 * story than a freestyle prompt session. Surfacing these in the script
 * gives the film credibility ("this didn't happen by accident — I forced
 * the design phase first") instead of fairy-tale narration.
 *
 * Usage:
 *   node skills/silent-build/bin/scan-skills.mjs <jsonl-dir>
 *
 * Output (stdout, JSON):
 *   {
 *     skills: { "superpowers:brainstorming": 2, "security-audit": 1 },
 *     pluginDirs: ["brainstorming", "writing-plans", "security-audit"],
 *     slashCommands: { "/security-audit": 2, "/simplify": 1 },
 *     mcpTools: { "mcp__chrome-devtools__take_screenshot": 20 },
 *     byCategory: {
 *       "design-thinking": ["superpowers:brainstorming"],
 *       "planning": ["superpowers:writing-plans"],
 *       "security": ["security-audit"],
 *       "deploy": ["coolify-deploy"]
 *     },
 *     narrationHints: [
 *       "Sesja zaczęła się od superpowers:brainstorming — wymusza design-first przed kodem.",
 *       "Audit fazy uruchomiony przez /security-audit skill — znalazł i naprawił X podatności.",
 *       ...
 *     ]
 *   }
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SKILL_BASE_RX = /Base directory for this skill:\s+[^\n]+\/skills\/([a-z][\w-]+)/g
const SLASH_RX = /(?:^|\s)(\/[a-z][a-z][a-z_-]{0,28})(?=\s|$|[.,!?])/g

// Slash commands we KNOW signal a meaningful workflow choice. Filters out
// path-fragment false positives like /home, /lib, /app, /api, /src.
const KNOWN_SLASH_COMMANDS = new Set([
  '/security-audit',
  '/coolify-deploy',
  '/simplify',
  '/curate-narrative',
  '/silent-build',
  '/brainstorming',
  '/writing-plans',
  '/test-driven-development',
  '/start-silent-build-project',
  '/generate-voiceover-script',
  '/blog-by-session',
  '/code-review',
  '/security-review',
  '/humanize-text',
  '/playwright',
  '/init',
  '/review',
  '/loop',
  '/schedule'
])

/** Map skill name to a narrative category so the silent-build skill knows
 *  WHERE in scenariusz.md to mention it (which scene fits). */
const categorize = (name) => {
  const n = name.toLowerCase()
  if (n.includes('brainstorm') || n.includes('design-thinking')) return 'design-thinking'
  if (n.includes('writing-plans') || n.includes('spec') || n.includes('plan')) return 'planning'
  if (n.includes('security') || n.includes('audit') || n.includes('pentest')) return 'security'
  if (n.includes('test-driven') || n.includes('tdd') || n.includes('test')) return 'quality'
  if (n.includes('simplify') || n.includes('code-review') || n.includes('review')) return 'refactor'
  if (n.includes('deploy') || n.includes('coolify') || n.includes('vercel') || n.includes('fly')) return 'deploy'
  if (n.includes('humanize') || n.includes('blog') || n.includes('voiceover')) return 'content'
  if (n.includes('curate') || n.includes('silent-build') || n.includes('film-')) return 'meta'
  if (n.includes('playwright') || n.includes('chrome') || n.includes('puppeteer')) return 'browser-test'
  if (n.includes('frontend-design')) return 'design'
  return 'other'
}

const scanFile = (path, agg) => {
  let content
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return
  }
  const lines = content.split('\n').filter(Boolean)
  for (const line of lines) {
    let ev
    try {
      ev = JSON.parse(line)
    } catch {
      continue
    }
    const c = ev?.message?.content
    if (Array.isArray(c)) {
      for (const p of c) {
        if (!p || typeof p !== 'object') continue
        if (p.type === 'tool_use') {
          const name = p.name ?? ''
          if (name === 'Skill') {
            const sk = p.input?.skill
            if (typeof sk === 'string') agg.skills[sk] = (agg.skills[sk] ?? 0) + 1
          } else if (name.startsWith('mcp__')) {
            agg.mcpTools[name] = (agg.mcpTools[name] ?? 0) + 1
          }
        }
        if (p.type === 'text' && typeof p.text === 'string') {
          for (const m of p.text.matchAll(SKILL_BASE_RX)) {
            agg.pluginDirs.add(m[1])
          }
        }
      }
    }
    // Slash commands appear in user message content (string or array)
    const scanText = (txt) => {
      for (const m of txt.matchAll(SLASH_RX)) {
        const cmd = m[1]
        if (KNOWN_SLASH_COMMANDS.has(cmd)) {
          agg.slashCommands[cmd] = (agg.slashCommands[cmd] ?? 0) + 1
        }
      }
    }
    if (typeof c === 'string') scanText(c)
    else if (Array.isArray(c)) {
      for (const p of c) {
        if (p && typeof p === 'object' && typeof p.text === 'string') scanText(p.text)
      }
    }
  }
}

const buildNarrationHints = (agg) => {
  const hints = []
  const haveSkill = (name) => Object.keys(agg.skills).some((k) => k.includes(name))
  const slashFired = (cmd) => agg.slashCommands[cmd] !== undefined

  if (haveSkill('brainstorm')) {
    hints.push(
      'Sesja zaczęła się od `superpowers:brainstorming` — wymusza design-first dialog przed jakimkolwiek kodem. To nie był freestyle, to był prowadzony research.'
    )
  }
  if (haveSkill('writing-plans')) {
    hints.push(
      'Po brainstorm — `superpowers:writing-plans`. Skill rozbija spec na konkretne taski, każdy commitowany osobno. Wymusza decomposition.'
    )
  }
  if (haveSkill('test-driven') || haveSkill('tdd')) {
    hints.push(
      'TDD enforced przez `superpowers:test-driven-development` — test najpierw, watch fail, potem kod. Niezgodność = blocker.'
    )
  }
  if (haveSkill('security') || slashFired('/security-audit')) {
    hints.push(
      'Audit fazy: `superpowers:security-audit` (lub `/security-audit`). Skill produkuje `.security-audit/` z findings — open redirect, rate limit, CSRF itp. Każdy fix to osobny `fix(security):` commit.'
    )
  }
  if (haveSkill('simplify') || slashFired('/simplify')) {
    hints.push(
      'Refactor pass: `/simplify` skill — review changed code for reuse, quality, efficiency. Fix bez breaking changes. Po build phase, przed release.'
    )
  }
  if (haveSkill('code-review') || slashFired('/code-review')) {
    hints.push(
      'Code review pass — `code-review` skill iteruje przez diff i wskazuje issues. Mocniejsze niż solo "git diff && eyeball".'
    )
  }
  if (haveSkill('coolify-deploy') || slashFired('/coolify-deploy')) {
    hints.push(
      'Deploy do prod via `coolify-deploy` skill — Coolify na Hetznerze. Zero wrangler, zero vercel. Cheap + control.'
    )
  }
  if (haveSkill('frontend-design')) {
    hints.push(
      '`frontend-design` skill — Claude Design integration. Wklejasz link, dostajesz UI. Adapt do stack manualnie ~15 min.'
    )
  }
  if (haveSkill('playwright') || Object.keys(agg.mcpTools).some((t) => t.includes('chrome') || t.includes('playwright'))) {
    hints.push(
      'Browser-side validation: `playwright-skill` lub MCP chrome-devtools. Screenshot przed/po, sprawdzenie UX, smoke test live URL.'
    )
  }
  if (haveSkill('humanize')) {
    hints.push(
      '`humanize-text` skill na końcu — usuwa AI-tells z text content. Use proactively dla blog posts / YT descriptions / README.'
    )
  }
  return hints
}

const main = () => {
  const jsonlDir = process.argv[2]
  if (!jsonlDir || !existsSync(jsonlDir)) {
    console.error(`usage: scan-skills.mjs <jsonl-dir>`)
    process.exit(1)
  }

  const agg = {
    skills: {},
    pluginDirs: new Set(),
    slashCommands: {},
    mcpTools: {}
  }

  for (const f of readdirSync(jsonlDir).filter((x) => x.endsWith('.jsonl'))) {
    scanFile(join(jsonlDir, f), agg)
  }

  // Categorize all detected skills + plugin-dir names
  const allSkillNames = new Set([
    ...Object.keys(agg.skills),
    ...[...agg.pluginDirs]
  ])
  const byCategory = {}
  for (const name of allSkillNames) {
    const cat = categorize(name)
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(name)
  }

  const narrationHints = buildNarrationHints(agg)

  console.log(
    JSON.stringify(
      {
        skills: agg.skills,
        pluginDirs: [...agg.pluginDirs].sort(),
        slashCommands: agg.slashCommands,
        mcpTools: agg.mcpTools,
        byCategory,
        narrationHints
      },
      null,
      2
    )
  )
}

main()
