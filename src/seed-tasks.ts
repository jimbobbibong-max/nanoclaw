import { CronExpressionParser } from 'cron-parser';

import { TIMEZONE } from './config.js';
import { createTask, getTaskById } from './db.js';
import { logger } from './logger.js';
import { ScheduledTask } from './types.js';

/**
 * Seed tasks are recreated on every NanoClaw startup if they don't already
 * exist in the database. This solves the persistence problem where
 * session-scoped tasks expire after a few days.
 *
 * Each task has a deterministic ID so it won't be duplicated on restart.
 */

interface SeedTaskDefinition {
  id: string;
  group_folder: string;
  chat_jid: string;
  prompt: string;
  schedule_type: ScheduledTask['schedule_type'];
  schedule_value: string;
  context_mode: ScheduledTask['context_mode'];
}

const SEED_TASKS: SeedTaskDefinition[] = [
  {
    id: 'seed-morning-briefing',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'Good morning ops briefing. Check the following and report concisely:',
      '• Today\'s class schedule (query daily_schedule view)',
      '• Any unmarked attendance from previous classes',
      '• Outstanding invoices over 14 days',
      '• Stale trial leads (48h+ no contact)',
      '• Pending approval queue items older than 24h',
      '• Any students with 3+ consecutive absences',
      'Present as a quick morning summary — flag anything that needs action today.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 8 * * 1-5', // Weekdays 8am
    context_mode: 'group',
  },
  {
    id: 'seed-engagement-monitor',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'Weekly student engagement check. Query the database and report:',
      '• Students who missed 2+ classes in the last 2 weeks',
      '• Students whose attendance rate dropped below 75%',
      '• Any trial students who haven\'t been followed up on',
      '• Classes with declining enrolment (compare last 4 weeks)',
      'For each flagged student, suggest a specific follow-up action.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 9 * * 3', // Wednesday 9am
    context_mode: 'group',
  },
  {
    id: 'seed-discord-digest',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'Discord activity digest. Check today\'s Discord channel activity and summarise:',
      '• Which student channels had messages today and rough volume',
      '• Any unanswered student questions (messages with no bot reply)',
      '• Any channels that have been silent for 7+ days',
      '• Notable interactions worth flagging',
      'Keep it brief — just the highlights.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 20 * * *', // Daily 8pm
    context_mode: 'group',
  },
];

function computeFirstRun(cronExpr: string): string {
  const interval = CronExpressionParser.parse(cronExpr, { tz: TIMEZONE });
  return interval.next().toISOString() as string;
}

export function seedScheduledTasks(): void {
  let seeded = 0;

  for (const def of SEED_TASKS) {
    const existing = getTaskById(def.id);
    if (existing) continue;

    createTask({
      id: def.id,
      group_folder: def.group_folder,
      chat_jid: def.chat_jid,
      prompt: def.prompt,
      schedule_type: def.schedule_type,
      schedule_value: def.schedule_value,
      context_mode: def.context_mode,
      next_run: computeFirstRun(def.schedule_value),
      status: 'active',
      created_at: new Date().toISOString(),
    });
    seeded++;
  }

  if (seeded > 0) {
    logger.info({ count: seeded }, 'Seeded scheduled tasks');
  }
}
