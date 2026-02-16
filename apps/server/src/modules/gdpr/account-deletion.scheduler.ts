import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../../lib/logger.js';
import { processScheduledDeletions } from './account-deletion.service.js';
import { cleanupExpiredExports } from './data-export.service.js';

let scheduledTask: ScheduledTask | null = null;

/**
 * Start the GDPR scheduler.
 * Runs daily at 03:00 to:
 * - Process accounts past the 30-day grace period
 * - Clean up expired data export archives
 */
export function startGdprScheduler(): void {
  const schedule = '0 3 * * *'; // Daily at 03:00

  if (!cron.validate(schedule)) {
    logger.error(`[gdpr] Invalid schedule: ${schedule}`);
    return;
  }

  scheduledTask = cron.schedule(schedule, async () => {
    try {
      logger.info('[gdpr] Scheduled GDPR maintenance starting...');

      const deleted = await processScheduledDeletions();
      if (deleted > 0) {
        logger.info(`[gdpr] Permanently deleted ${deleted} account(s)`);
      }

      const cleaned = await cleanupExpiredExports();
      if (cleaned > 0) {
        logger.info(`[gdpr] Cleaned up ${cleaned} expired export(s)`);
      }

      logger.info('[gdpr] Scheduled GDPR maintenance completed');
    } catch (error) {
      logger.error(error, '[gdpr] Scheduled GDPR maintenance failed');
    }
  });

  logger.info('[gdpr] GDPR scheduler started (daily at 03:00)');
}

/**
 * Stop the GDPR scheduler.
 */
export function stopGdprScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
