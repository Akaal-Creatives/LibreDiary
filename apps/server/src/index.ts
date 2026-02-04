import { env } from './config/index.js';
import { buildApp } from './app.js';

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
        await app.close();
        app.log.info('Server closed');
        process.exit(0);
      } catch (error) {
        app.log.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  }
}

main();
