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
      "• Today's class schedule (query daily_schedule view)",
      '• Any unmarked attendance from previous classes',
      '• Outstanding invoices over 14 days',
      '• Stale trial leads (48h+ no contact)',
      '• Pending approval queue items older than 24h',
      '• Any students with 3+ consecutive absences',
      'Present as a quick morning summary — flag anything that needs action today.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 8 * * 1-5', // Weekdays 8am AEST
    context_mode: 'isolated',
  },
  {
    id: 'seed-engagement-monitor',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'Weekly student engagement check. Query the database and report:',
      '• Students who missed 2+ classes in the last 2 weeks',
      '• Students whose attendance rate dropped below 75%',
      "• Any trial students who haven't been followed up on",
      '• Classes with declining enrolment (compare last 4 weeks)',
      'For each flagged student, suggest a specific follow-up action.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 9 * * 3', // Wednesday 9am AEST
    context_mode: 'isolated',
  },
  {
    id: 'seed-discord-digest',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      "Discord activity digest. Check today's Discord channel activity and summarise:",
      '• Which student channels had messages today and rough volume',
      '• Any unanswered student questions (messages with no bot reply)',
      '• Any channels that have been silent for 7+ days',
      '• Notable interactions worth flagging',
      'Keep it brief — just the highlights.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 20 * * *', // Daily 8pm AEST
    context_mode: 'isolated',
  },

  {
    id: 'seed-parent-email-followup',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'PRE-CHECK: Query recent parent emails received in the last 48 hours. If there are no unanswered parent emails, reply with "No unanswered parent emails — all clear." and stop.',
      '',
      'Unanswered Parent Email Follow-up. Check Gmail for parent emails that have not been replied to:',
      '• List each unanswered email with sender name, subject, and time received',
      '• Flag any emails older than 24 hours as urgent',
      '• For each email, draft a brief suggested reply outline (warm, professional tone)',
      '• Prioritise: enrolment queries > billing questions > general enquiries',
      'Present as an actionable list sorted by urgency.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 16 * * 1-5', // Weekdays 4pm AEST
    context_mode: 'isolated',
  },
  {
    id: 'seed-invoice-payment-reminder',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'PRE-CHECK: Query outstanding invoices from the database. If there are no overdue invoices (past due date) and no invoices due within the next 7 days, reply with "No invoice actions needed this week." and stop.',
      '',
      'Invoice & Payment Reminder Dispatch. Review all outstanding invoices and report:',
      '• Overdue invoices: student name, amount, days overdue',
      '• Invoices due within the next 7 days: student name, amount, due date',
      '• Any students with 2+ consecutive missed payments (flag for personal follow-up)',
      '• Suggest which students should receive an automated reminder vs personal message',
      'Present as a prioritised action list. Keep tone professional but firm.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 10 * * 1', // Monday 10am AEST
    context_mode: 'isolated',
  },
  {
    id: 'seed-weekly-progress-report',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'Weekly Progress Report. Compile a summary of this week\'s BEAM Academy operations:',
      '',
      '• Total classes held this week and attendance rate',
      '• New enrolments and trial conversions',
      '• Revenue collected vs outstanding',
      '• Student highlights (strong performance, concerns, milestones)',
      '• Operational issues encountered and their resolution status',
      '• Key metrics comparison: this week vs last week',
      '',
      'Format as a concise executive summary suitable for end-of-week review.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 17 * * 5', // Friday 5pm AEST
    context_mode: 'isolated',
  },
  {
    id: 'seed-holiday-rsvp-tracker',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'PRE-CHECK: Check if there are any upcoming holiday programmes or intensive sessions within the next 4 weeks. If there are none scheduled, reply with "No upcoming holiday programmes — RSVP tracking not needed." and stop.',
      '',
      'Holiday/Intensive RSVP Tracker. For each upcoming holiday programme or intensive:',
      '• Programme name, dates, and capacity',
      '• Current RSVP count vs capacity (show percentage)',
      '• Students who have been invited but not yet responded',
      '• Students who RSVPed but have not paid',
      '• Suggest follow-up actions: who to chase, when to send reminders',
      'Flag any programmes at risk of under-enrolment (below 60% capacity with < 2 weeks to go).',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 9 * * 2,4', // Tuesday & Thursday 9am AEST
    context_mode: 'isolated',
  },
  {
    id: 'seed-term-progress-summary',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'End-of-Term Student Progress Summary. Generate a comprehensive progress report:',
      '',
      '• For each active student: attendance rate, classes attended, subjects enrolled',
      '• Performance trends: improving, stable, or declining (based on attendance patterns)',
      '• Students with perfect or near-perfect attendance (recognition candidates)',
      '• Students at risk: low attendance, missed payments, or disengagement signals',
      '• Recommendations for next term: class adjustments, follow-ups needed',
      '',
      'This is a term-end review — be thorough. Group by year level, then alphabetically.',
    ].join('\n'),
    schedule_type: 'once',
    schedule_value: '2026-06-19T09:00:00+10:00', // End of Term 2, 2026
    context_mode: 'isolated',
  },
  {
    id: 'seed-monday-goal-nudge',
    group_folder: 'telegram_main',
    chat_jid: 'tg:8063765377',
    prompt: [
      'PRE-CHECK: Check if there are any active students with classes scheduled this week. If there are no classes this week (e.g. school holidays), reply with "No classes this week — skipping goal nudge." and stop.',
      '',
      'Monday Goal-Setting Nudge. Prepare a motivational start-of-week message for students:',
      '• Review what was covered last week across all active classes',
      '• Identify 2-3 key focus areas for this week based on the curriculum schedule',
      '• Draft a short, encouraging message (2-3 sentences) for each active class channel',
      '• Tone: warm, motivating, specific to what they are learning (not generic)',
      '• Include a quick tip or study strategy relevant to the upcoming content',
      '',
      'Send each message to the appropriate Discord class channel.',
    ].join('\n'),
    schedule_type: 'cron',
    schedule_value: '0 8 * * 1', // Monday 8am AEST
    context_mode: 'isolated',
  },
];

function computeFirstRun(scheduleType: string, scheduleValue: string): string {
  if (scheduleType === 'once') {
    return new Date(scheduleValue).toISOString();
  }
  const interval = CronExpressionParser.parse(scheduleValue, { tz: TIMEZONE });
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
      next_run: computeFirstRun(def.schedule_type, def.schedule_value),
      status: 'active',
      created_at: new Date().toISOString(),
    });
    seeded++;
  }

  if (seeded > 0) {
    logger.info({ count: seeded }, 'Seeded scheduled tasks');
  }
}
