# Scene templates (6 scenes, what each is about)

Six fixed scenes by id. Use these as your assignment guide. Title is human-editable per project.

## 1. `start` — Concept

The "where it all began" moment.

**Looks for:**
- First 1–5 user prompts of the entire timeline
- Reading concept docs / brainstorm notes
- Statement of project goal

**Example titles:** "Concept", "Where it began", "The brief", "Idea"
**Default overlay:** `Intro` (4 s)
**Recommended clips:** 1 (sometimes 2 if first session was a long ideation)
**Suggested duration:** 60–90 s on screen

---

## 2. `plan` — Plan / Architecture

Decision-making, spec writing, roadmap drafting.

**Looks for:**
- Prompts mentioning "plan", "spec", "roadmap", "architecture", "design brief"
- First Write of `spec.md`, `roadmap.md`, design brief, ADR docs
- Use of `superpowers:writing-plans` or `superpowers:brainstorming` skills

**Example titles:** "Architecture", "The plan", "Setting up the rails", "Roadmap"
**Default overlay:** `PhaseTransition` (phaseNumber: 2, 2.5 s)
**Recommended clips:** 1–2
**Suggested duration:** 90–120 s

---

## 3. `build` — Build

Heavy implementation. The "watch them code" moment.

**Looks for:**
- `editBurst`-tagged candidates (≥10 edits in 10 min on the same file)
- `scaffolding`-tagged candidates (≥5 new file Writes in 10 min)
- `agentRun`-tagged candidates (Agent tool, ≥5 min wallclock)
- Top-edited files in the project (e.g., the core engine module)

**Example titles:** "Building the engine", "Multiplayer match-room", "Core game logic"
**Default overlay:** `PhaseTransition` (phaseNumber: 3, 2.5 s)
**Recommended clips:** 2–3 (most generous of the six scenes)
**Suggested duration:** 150–240 s

---

## 4. `design` — Design / Frontend

UI work, visual polish, i18n, branding.

**Looks for:**
- Edits to `*.svelte`, `*.tsx`, `*.jsx`, `*.vue`, `messages/*.json`, `*.css`, `*.scss`, `tailwind.config.*`
- Candidates with `design` keyword match (with real prompt content)
- Logo/wordmark files, brand guidelines

**Example titles:** "Frontend & i18n", "Visual layer", "Design system", "Make it feel right"
**Default overlay:** `PhaseTransition` (phaseNumber: 4, 2.5 s)
**Recommended clips:** 1–3
**Suggested duration:** 90–150 s

---

## 5. `audit` — Security / Audit

The "is this safe to ship?" moment.

**Looks for:**
- Candidates with `audit`/`security`/`recon`/`vulnerability` keyword
- Edits inside `.security-audit/` or `security/` folders
- Bug-fix prompts post-audit (CSP, CORS, auth issues)
- Use of `security-review` or `security-audit` skills

**Example titles:** "Security review", "The audit", "Hardening", "Pre-launch checks"
**Default overlay:** `PhaseTransition` (phaseNumber: 5, 2.5 s)
**Recommended clips:** 1–2
**Suggested duration:** 60–120 s

**Fallback:** If no real audit happened, surface a Bash check of any project-side audit folder (`.security-audit/`, `audit/`) and use file timestamps as a synthetic clip. Note this transparently in the rationale.

---

## 6. `end` — Ship

Deploy, push to prod, "it's live".

**Looks for:**
- `git commit`, `git push origin main`, `gh pr merge`, `gh pr create`
- Domain rebrand commits
- Last 1–3 user prompts of the timeline
- Bash commands referencing `wrangler deploy`, `vercel deploy`, `fly deploy`, etc.

**Example titles:** "Ship to production", "Live on fastduels.com", "Deploy day", "It's out"
**Default overlay:** `Outro` (7 s)
**Recommended clips:** 1–2
**Suggested duration:** 60–120 s

---

## Anti-templates (avoid)

These do NOT belong in any scene:
- Skill-activation messages
- Task-notification messages
- Empty `firstPromptText` candidates with no surrounding context worth showing
- Long Bash output dumps (the dashboard already shows tool calls)
- Repetitive "fix typo / fix lint" edits

If you can't find ≥1 strong candidate for a scene, prefer fewer clips (down to 1) over filler. The film breathes better with focused scenes.
