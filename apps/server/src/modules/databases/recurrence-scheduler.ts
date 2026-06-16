import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { createNextOccurrence } from './recurrence.service.js';

let scheduledTask: ScheduledTask | null = null;

// Runs at the top of every hour
const SCHEDULE = '0 * * * *';

export function startRecurrenceScheduler(): void {
  scheduledTask = cron.schedule(SCHEDULE, async () => {
    try {
      const dueRows = await prisma.databaseRow.findMany({
        where: {
          recurrenceStatus: 'ACTIVE',
          nextOccurrenceAt: { lte: new Date() },
        },
        select: { id: true },
      });

      if (dueRows.length === 0) return;

      logger.info(`Recurrence scheduler: processing ${dueRows.length} due row(s)`);

      for (const { id } of dueRows) {
        try {
          await createNextOccurrence(id);
        } catch (err) {
          logger.error(err, `Failed to create next occurrence for row ${id}`);
        }
      }

      logger.info('Recurrence scheduler: done');
    } catch (err) {
      logger.error(err, 'Recurrence scheduler failed');
    }
  });

  logger.info(`Recurrence scheduler started (schedule: ${SCHEDULE})`);
}

export function stopRecurrenceScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
