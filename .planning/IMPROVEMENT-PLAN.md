# NanoClaw Improvement Plan — BEAM Academy

Created: 2026-04-02
Based on: 17 research agents across 2 sessions

## Current State

- 3 channels installed (Telegram, Discord, Gmail)
- 101 registered groups (1 Telegram, 100 Discord)
- Running on Mac Mini 24/7 via launchd + OrbStack
- Session TTL (24h rotation) deployed
- OAuth token fallback in container-runner deployed
- OpenClaw running alongside for ops monitoring/heartbeats

## Problem Summary

1. **101 out of 101 groups use generic CLAUDE.md** — no BEAM identity, no tutoring pedagogy
2. **No global CLAUDE.md** — the file mounted into every group is default boilerplate
3. **5 high-value skills not installed** — channel-formatting, compact, pdf-reader, image-vision, voice-transcription
4. **Scheduled tasks expire** after 3 days (session-scoped) — ops checks go silent
5. **Using API credits** ($) instead of subscription — Agent SDK requires API key, no workaround
6. **Channel formatting missing** — Markdown renders as raw asterisks in Telegram/Discord

## Tier 1: Immediate (highest impact, lowest effort)

### 1.1 Create groups/global/CLAUDE.md
- Shared BEAM identity, tutoring pedagogy (Socratic), safeguarding, academic honesty
- Australian English, tone rules, escalation protocol
- This file is mounted read-only into EVERY group container automatically
- **Impact: transforms every group from generic assistant to BEAM tutor instantly**

### 1.2 Batch-update Discord CLAUDE.md files
- Student channels (discord_*-2028): year, subjects, tutor tone, hint-before-answer
- Class channels (discord_y10-maths, etc.): subject + syllabus scope
- Ops channels (discord_triage, discord_general): admin context
- ~10 templates, scripted deployment to ~100 folders

### 1.3 Install channel-formatting skill
- `git fetch upstream skill/channel-formatting && git merge upstream/skill/channel-formatting`
- Converts Markdown to native Telegram/Discord formatting
- Fixes: **bold** renders properly instead of showing raw asterisks

### 1.4 Install add-compact skill
- `git fetch upstream skill/compact && git merge upstream/skill/compact`
- Gives manual `/compact` command via Telegram for mid-day context reset
- Complements the 24h session TTL already deployed

## Tier 2: This Week

### 2.1 Set up OAuth token (if viable)
- Run `claude setup-token` on MacBook
- Add `CLAUDE_CODE_OAUTH_TOKEN` to Mac Mini .env
- Container-runner fallback already deployed
- Note: token format is JSON string, not plain token
- Note: Agent SDK support is unofficial — test thoroughly

### 2.2 Install add-pdf-reader skill
- Students share past papers and resources as PDFs
- Core tutoring workflow — high value

### 2.3 Fix scheduled task persistence
- Current: tasks are session-scoped, expire in 3 days
- Options:
  a) Startup script that recreates tasks on every NanoClaw restart
  b) Code change to make tasks persist independently of sessions
  c) Use the `once` schedule type with a re-scheduling pattern

### 2.4 Update telegram_main/CLAUDE.md
- Add: parent communication tone (warm, professional, "Regards" sign-off)
- Add: correct timetable reference
- Add: proactive scheduled task examples
- Add: Australian English enforcement

### 2.5 Set up 3 initial scheduled tasks
- Morning ops briefing (weekdays 8am)
- Student engagement monitor (Wednesday 9am)
- Discord activity digest (daily 8pm)

## Tier 3: Next Sprint

### 3.1 Model routing via OneCLI
- Route student DMs to Opus (higher quality 1-on-1 tutoring)
- Route group channels to Sonnet (cost-efficient for chat)
- agentIdentifier wiring already exists in container-runner

### 3.2 Install add-image-vision
- Students photograph worksheets and diagrams
- Major tutoring feature

### 3.3 Agent Swarm on Telegram
- Separate bot identities per subject/role
- Cleaner UX for multi-subject operations

### 3.4 Document OpenClaw/NanoClaw boundary
- OpenClaw: heartbeats, proactive monitoring, Gmail hooks, ops alerts
- NanoClaw: channel runtime (Telegram, Discord, Gmail), student interaction
- Clear separation prevents duplicate effort

## 9 Recommended Scheduled Tasks

See AUTOMATIONS.md for full details with cron expressions, prompts, and pre-check scripts.

1. Morning Operations Briefing (weekdays 8am)
2. Unanswered Parent Email Follow-up (weekdays 4pm)
3. Student Engagement Monitor (Wednesday 9am)
4. Invoice & Payment Reminder Dispatch (Monday 10am)
5. Weekly Progress Report (Friday 5pm)
6. Discord Channel Activity Digest (daily 8pm)
7. Holiday/Intensive RSVP Tracker (Tue/Thu 9am)
8. End-of-Term Student Progress Summary (manual trigger)
9. Monday Goal-Setting Nudge to Students (Monday 8am)

## Quality Optimization Notes

- global/CLAUDE.md is the #1 quality lever — every group inherits it
- "Contract" format for CLAUDE.md: Role → Success criteria → Constraints → Uncertainty rule → Output format
- Repeat critical constraints at bottom of CLAUDE.md (improves adherence)
- Self-check instruction: "Before sending any maths explanation, verify your working is correct"
- Session TTL (24h) prevents context rot; /compact handles mid-day resets
- Auto-memory is enabled in containers (CLAUDE_CODE_DISABLE_AUTO_MEMORY=0)
