import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { createSystemBackup } from './system-backup.service.js';
import { cleanupOldBackups } from './backup.service.js';

let scheduledTask: ScheduledTask | null = null;

/**
 * Starts the backup scheduler if BACKUP_ENABLED is true.
 * Runs system backups on the configured cron schedule and cleans up old backups.
 */
export function startBackupScheduler(): void {
  if (!env.BACKUP_ENABLED) {
    return;
  }

  if (!cron.validate(env.BACKUP_SCHEDULE)) {
    logger.error(`Invalid backup schedule: ${env.BACKUP_SCHEDULE}`);
    return;
  }

  scheduledTask = cron.schedule(env.BACKUP_SCHEDULE, async () => {
    try {
      logger.info('Scheduled backup starting...');
      await createSystemBackup();
      const cleaned = await cleanupOldBackups();
      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} old backup(s)`);
      }
      logger.info('Scheduled backup completed');
    } catch (error) {
      logger.error(error, 'Scheduled backup failed');
    }
  });

  logger.info(`Backup scheduler started (schedule: ${env.BACKUP_SCHEDULE})`);
}

/**
 * Stops the backup scheduler.
 */
export function stopBackupScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
