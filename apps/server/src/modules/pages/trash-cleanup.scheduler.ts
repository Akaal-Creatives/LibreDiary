import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../../lib/logger.js';
import { cleanupExpiredTrash } from './trash-cleanup.service.js';

let scheduledTask: ScheduledTask | null = null;

/**
 * Start the trash cleanup scheduler.
 * Runs daily at 02:00 to permanently delete pages
 * that have been in the trash for more than 30 days.
 */
export function startTrashCleanupScheduler(): void {
  const schedule = '0 2 * * *'; // Daily at 02:00

  if (!cron.validate(schedule)) {
    logger.error(`[trash-cleanup] Invalid schedule: ${schedule}`);
    return;
  }

  scheduledTask = cron.schedule(schedule, async () => {
    try {
      logger.info('[trash-cleanup] Scheduled trash cleanup starting...');

      const deleted = await cleanupExpiredTrash();
      if (deleted > 0) {
        logger.info(`[trash-cleanup] Permanently deleted ${deleted} expired trashed page(s)`);
      }

      logger.info('[trash-cleanup] Scheduled trash cleanup completed');
    } catch (error) {
      logger.error(error, '[trash-cleanup] Scheduled trash cleanup failed');
    }
  });

  logger.info('[trash-cleanup] Trash cleanup scheduler started (daily at 02:00)');
}

/**
 * Stop the trash cleanup scheduler.
 */
export function stopTrashCleanupScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
