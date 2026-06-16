import { env } from './config/index.js';
import { buildApp } from './app.js';
import { startBackupScheduler, stopBackupScheduler } from './modules/backups/index.js';
import { startGdprScheduler, stopGdprScheduler } from './modules/gdpr/index.js';
import { startTrashCleanupScheduler, stopTrashCleanupScheduler } from './modules/pages/index.js';
import { startDemoReseedScheduler, stopDemoReseedScheduler } from './modules/demo/index.js';
import {
  startEncryptionPurgeScheduler,
  stopEncryptionPurgeScheduler,
} from './modules/encryption/index.js';
import {
  startRecurrenceScheduler,
  stopRecurrenceScheduler,
} from './modules/databases/index.js';
import { destroyHocuspocusServer } from './modules/collaboration/hocuspocus.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    app.log.info(`Server running in ${env.NODE_ENV} mode`);
    app.log.info(`Health check: http://${env.HOST}:${env.PORT}/health`);
    app.log.info(`Developer info: http://${env.HOST}:${env.PORT}/dev`);
    app.log.info(`API: http://${env.HOST}:${env.PORT}/api/v1`);

    // Start schedulers
    startBackupScheduler();
    startGdprScheduler();
    startTrashCleanupScheduler();
    startDemoReseedScheduler();
    startEncryptionPurgeScheduler();
    startRecurrenceScheduler();
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);

      try {
        stopBackupScheduler();
        stopGdprScheduler();
        stopTrashCleanupScheduler();
        stopDemoReseedScheduler();
        stopEncryptionPurgeScheduler();
        stopRecurrenceScheduler();
        // Flush all in-memory Yjs documents to database before closing
        await destroyHocuspocusServer();
        await app.close();
        app.log.info('Server closed');
        process.exit(0);
      } catch (error) {
        app.log.error(error as Error, 'Error during shutdown');
        process.exit(1);
      }
    });
  }
}

main();
