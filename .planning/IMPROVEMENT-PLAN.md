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

## Tier 3: Next Sprint — COMPLETE: [x]

### 3.1 Install add-image-vision skill
- Students photograph worksheets, diagrams, and worked problems
- Major tutoring feature — unlocks visual Q&A
- `git fetch upstream skill/add-image-vision && git merge upstream/skill/add-image-vision`
- Requires container rebuild (image processing deps)

### 3.2 Install OneCLI on Mac Mini + model routing
- Install: `curl -fsSL onecli.sh/install | sh && curl -fsSL onecli.sh/cli/install | sh`
- Configure: `onecli config set api-host http://127.0.0.1:10254`
- Register credential: `onecli secrets create --name Anthropic --type anthropic --value <key> --host-pattern api.anthropic.com`
- Set up per-agent model routing: student DMs → Opus, group channels → Sonnet
- agentIdentifier wiring already exists in container-runner.ts

### 3.3 Document OpenClaw/NanoClaw boundary
- Write groups/telegram_main/memory/system-architecture.md
- OpenClaw: heartbeats (30min), proactive monitoring, Gmail hooks, ops alerts
- NanoClaw: channel runtime (Telegram, Discord, Gmail), student interaction, scheduled tasks
- Clear separation prevents duplicate effort and conflicting responses

## Tier 4: Advanced Automations — COMPLETE: [ ]

### 4.1 Add remaining 6 scheduled tasks
Already have 3 seed tasks. Add the other 6 from the research:
- Unanswered Parent Email Follow-up (weekdays 4pm)
- Invoice & Payment Reminder Dispatch (Monday 10am)
- Weekly Progress Report (Friday 5pm)
- Holiday/Intensive RSVP Tracker (Tue/Thu 9am)
- End-of-Term Student Progress Summary (manual trigger)
- Monday Goal-Setting Nudge to Students (Monday 8am)
All with pre-check scripts to avoid wasting API calls on quiet days.

### 4.2 Fix scheduled task persistence across restarts
- Tasks are stored in SQLite (scheduled_tasks table) — they persist
- But the SESSION they run in expires after 24h (our TTL)
- All tasks should use context_mode: 'isolated' (fresh session each run)
- Add a startup verification: on NanoClaw boot, log active task count

### 4.3 Create supporting data files for tasks
Tasks reference files like students.md, invoices.md, attendance.md, etc.
- Write a Supabase query script that populates these files on a schedule
- Or teach Andy to query Supabase directly (MCP is already configured)

## Tier 5: Agent Swarm — COMPLETE: [ ]

### 5.1 Create Telegram bot pool via BotFather
- Create 3-4 bots: @beam_maths_bot, @beam_english_bot, @beam_science_bot, @beam_ops_bot
- Each gets its own identity in Telegram group conversations

### 5.2 Install add-telegram-swarm skill
- `git fetch upstream skill/add-telegram-swarm && git merge upstream/skill/add-telegram-swarm`
- Configure TELEGRAM_BOT_POOL with the new bot tokens
- Each sub-agent appears as a named bot when responding

### 5.3 Configure swarm routing
- Maths questions → @beam_maths_bot (Opus for quality)
- English questions → @beam_english_bot
- Science questions → @beam_science_bot
- Ops/admin → @beam_ops_bot (Sonnet for speed)

## Tier 6: Production Hardening — COMPLETE: [ ]

### 6.1 Automated backups
- Cron job on Mac Mini: daily backup of groups/ and store/messages.db
- Destination: ~/nanoclaw-backups/ with 30-day rotation
- `0 2 * * * tar czf ~/nanoclaw-backups/nanoclaw-$(date +\%Y\%m\%d).tar.gz -C ~/nanoclaw groups/ store/`

### 6.2 Log rotation
- /tmp/com.beam.nanoclaw.stdout.log and stderr.log grow forever
- Add logrotate or a cron job: `0 3 * * * truncate -s 0 /tmp/com.beam.nanoclaw.*.log`
- Or switch to the logs/ directory with date-based rotation

### 6.3 Health monitoring
- Cron job that checks if NanoClaw process is running
- If down: restart via launchctl and send Telegram alert to TK
- `*/5 * * * * pgrep -f "nanoclaw/dist/index.js" || (launchctl kickstart gui/$(id -u)/com.beam.nanoclaw && curl -s "https://api.telegram.org/bot.../sendMessage?chat_id=...&text=NanoClaw+restarted")`

### 6.4 Cost tracking
- Daily scheduled task that queries Anthropic API usage
- Reports spend via Telegram: "Today's API cost: $X.XX (budget: $10/day)"
- Alert if approaching daily budget ceiling

### 6.5 Upstream sync schedule
- Monthly: `git fetch upstream && git log upstream/main --oneline -10` to check for updates
- Use /update-nanoclaw skill for selective cherry-picks

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
