import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { reseedDemoData } from './demo-reseed.service.js';

let scheduledTask: ScheduledTask | null = null;

/**
 * Starts the demo reseed scheduler if DEMO_MODE is true.
 * Reseeds demo data on the configured cron schedule.
 */
export function startDemoReseedScheduler(): void {
  if (!env.DEMO_MODE) {
    return;
  }

  if (!cron.validate(env.DEMO_RESEED_SCHEDULE)) {
    logger.error(`Invalid demo reseed schedule: ${env.DEMO_RESEED_SCHEDULE}`);
    return;
  }

  scheduledTask = cron.schedule(env.DEMO_RESEED_SCHEDULE, async () => {
    try {
      logger.info('Scheduled demo reseed starting...');
      await reseedDemoData();
      logger.info('Scheduled demo reseed completed');
    } catch (error) {
      logger.error(error, 'Scheduled demo reseed failed');
    }
  });

  logger.info(`Demo reseed scheduler started (schedule: ${env.DEMO_RESEED_SCHEDULE})`);
}

/**
 * Stops the demo reseed scheduler.
 */
export function stopDemoReseedScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
