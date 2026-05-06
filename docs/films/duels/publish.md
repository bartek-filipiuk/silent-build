# duels — YouTube publish draft

Filled out before YT upload. Final source-of-truth for video metadata.

## Title (≤70 chars)

Pick one (or write a fifth):

- [ ] T1 — `9 days. 1 multiplayer game. fastduels.com is live.`
- [x] T4 — `Silent build #1: duels — from concept to fastduels.com` ← decision per docs/films/duels/production-plan.md
- [ ] T-write — `<your option>`

## Description

```
Pełna sesja "silent build" — 9 dni Claude Code od pomysłu do fastduels.com (multiplayer 1v1 PWA, SvelteKit + Cloudflare + PartyKit).

— LINKI —
Repo: https://github.com/bartek-filipiuk/duels
Live: https://fastduels.com
silent-build (pipeline): https://github.com/bartek-filipiuk/silent-build

— TIMESTAMPS —
0:00 Hook
0:05 Project reveal
0:35 Phase 1 — Concept
1:30 Phase 2 — Build
3:00 Phase 3 — Design
4:00 Phase 4 — Audit
4:45 Phase 5 — Deploy
5:30 Demo (live)
6:30 Stats
6:35 Outro

— TECH —
SvelteKit · Cloudflare Workers · PartyKit · D1 · Better Auth · Paraglide i18n
Claude Code (Opus 4.7) · superpowers · silent-build pipeline

— WHAT IS THIS —
"Silent build" is the format: I give Claude Code a brief, step away, and let the dashboard do the talking. No scripted narration, no hand-holding — what you see is the actual development.

Subscribe — silent build #2 next week.
```

## Tags (max ~10, YouTube cuts after that)

```
silent build, claude code, ai pair programming, svelte, cloudflare, partykit, multiplayer game, solo dev, vibe coding, 1v1 game
```

## Thumbnail

- [ ] Generated via `pnpm render:thumb` ? OR Figma override
- [ ] Path: `output/duels/assets/thumbnail.png` (or Figma export)
- Hero text: "9 DAYS · 1 GAME"
- Subtitle: "fastduels.com"
- Background: NASA palette + brand pattern

## End-screen + cards

- End-screen 20s: Subscribe button + "Watch next" placeholder for silent-build #2
- Card #1 @ 1:00: link to duels repo
- Card #2 @ 4:45: link to fastduels.com

## Pre-publish checklist

- [ ] All 5 viral pipeline decisions confirmed (left panel, voiceover, music, language, title)
- [ ] `output/duels/segments/manifest.json` rendered + sanity check on first frame of each clip
- [ ] ProjectIntro + StatsCard + at least 2 CommitCards + at least 2 CodeZooms rendered
- [ ] ElevenLabs TTS done — `output/duels/voiceover/{hook,outro}.mp3` exist + sound natural
- [ ] OBS demo screencast `output/duels/demo.mov` — 60s, no glitches, cursor visible
- [ ] Face record `output/duels/face.mov` — 30s+ of takes, audio clean
- [ ] Premiere assembly preview — full 7 min, no audio gaps, captions in sync
- [ ] PL captions reviewed (auto-generate then edit) — `output/duels/captions-pl.srt`
- [ ] EN captions reviewed — `output/duels/captions-en.srt`
- [ ] Privacy: unlisted upload, share with 1-2 reviewers, 24h soak
- [ ] Schedule public release

## Post-publish (24h)

- [ ] Track views, retention curves
- [ ] Read all comments, reply to top 5
- [ ] Update repo README in silent-build + duels with YT link
- [ ] Tweet/LinkedIn announcement
- [ ] Add to silent-build playlist on YT
