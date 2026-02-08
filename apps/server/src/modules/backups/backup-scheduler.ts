import cron from 'node-cron';
import { env } from '../../config/index.js';
import { createSystemBackup } from './system-backup.service.js';
import { cleanupOldBackups } from './backup.service.js';

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Starts the backup scheduler if BACKUP_ENABLED is true.
 * Runs system backups on the configured cron schedule and cleans up old backups.
 */
export function startBackupScheduler(): void {
  if (!env.BACKUP_ENABLED) {
    return;
  }

  if (!cron.validate(env.BACKUP_SCHEDULE)) {
    console.error(`Invalid backup schedule: ${env.BACKUP_SCHEDULE}`);
    return;
  }

  scheduledTask = cron.schedule(env.BACKUP_SCHEDULE, async () => {
    try {
      console.log('Scheduled backup starting...');
      await createSystemBackup();
      const cleaned = await cleanupOldBackups();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} old backup(s)`);
      }
      console.log('Scheduled backup completed');
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
  });

  console.log(`Backup scheduler started (schedule: ${env.BACKUP_SCHEDULE})`);
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
