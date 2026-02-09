import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/index.js';

export async function rateLimitPlugin(fastify: FastifyInstance) {
  if (!env.RATE_LIMIT_ENABLED) {
    return;
  }

  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_REQUESTS,
    timeWindow: env.RATE_LIMIT_WINDOW * 1000, // convert seconds to ms
    allowList: [],
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      },
    }),
  });
}
