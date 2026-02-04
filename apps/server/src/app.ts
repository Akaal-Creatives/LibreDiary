import Fastify from 'fastify';
import { env } from './config/index.js';
import {
  corsPlugin,
  helmetPlugin,
  cookiePlugin,
  sensiblePlugin,
  errorHandlerPlugin,
} from './plugins/index.js';
import { healthRoutes, devRoutes } from './routes/index.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
              },
            }
          : undefined,
    },
    trustProxy: true,
  });

  // Register plugins
  await fastify.register(corsPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(cookiePlugin);
  await fastify.register(sensiblePlugin);
  await fastify.register(errorHandlerPlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(devRoutes);

  // API routes will be registered under /api prefix
  await fastify.register(
    async (api) => {
      // API v1 routes will be added here
      api.get('/', async () => ({
        success: true,
        data: { message: 'LibreDiary API v1' },
      }));
    },
    { prefix: '/api/v1' }
  );

  return fastify;
}
