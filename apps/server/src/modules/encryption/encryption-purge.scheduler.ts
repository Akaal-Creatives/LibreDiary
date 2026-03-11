import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { purgeEncryptedData } from './encryption.service.js';

let scheduledTask: ScheduledTask | null = null;

/**
 * Start the encryption purge scheduler.
 * Runs daily at 03:00 to permanently purge encrypted data
 * for organisations that have been past the 7-day grace period.
 */
export function startEncryptionPurgeScheduler(): void {
  const schedule = '0 3 * * *'; // Daily at 03:00

  if (!cron.validate(schedule)) {
    logger.error(`[encryption-purge] Invalid schedule: ${schedule}`);
    return;
  }

  scheduledTask = cron.schedule(schedule, async () => {
    try {
      logger.info('[encryption-purge] Scheduled purge check starting...');

      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - gracePeriodMs);

      const expiredOrgs = await prisma.organization.findMany({
        where: {
          isEncrypted: false,
          encryptionDisabledAt: {
            lte: cutoff,
          },
        },
        select: { id: true },
      });

      if (expiredOrgs.length === 0) {
        logger.info('[encryption-purge] No organisations past grace period');
        return;
      }

      logger.info(
        `[encryption-purge] Found ${expiredOrgs.length} organisation(s) past grace period`
      );

      for (const org of expiredOrgs) {
        try {
          await purgeEncryptedData(org.id);
          logger.info(`[encryption-purge] Purged encrypted data for organisation ${org.id}`);
        } catch (error) {
          logger.error(error, `[encryption-purge] Failed to purge organisation ${org.id}`);
        }
      }

      logger.info('[encryption-purge] Scheduled purge check completed');
    } catch (error) {
      logger.error(error, '[encryption-purge] Scheduled purge check failed');
    }
  });

  logger.info('[encryption-purge] Encryption purge scheduler started (daily at 03:00)');
}

/**
 * Stop the encryption purge scheduler.
 */
export function stopEncryptionPurgeScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
