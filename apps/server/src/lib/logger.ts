import pino from 'pino';
import { env } from '../config/index.js';

/**
 * Shared application logger.
 *
 * Uses the same pino configuration as the Fastify server instance so that log
 * output is consistent across request handlers, schedulers and init modules.
 */
export const logger = pino({
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
});
