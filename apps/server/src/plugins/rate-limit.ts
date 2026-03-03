import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/index.js';

export async function rateLimitPlugin(fastify: FastifyInstance) {
  // Always register the plugin so that per-route rate limits (e.g. on
  // auth endpoints) are enforced even when the global rate limit is relaxed.
  // When RATE_LIMIT_ENABLED is false, set an effectively unlimited global
  // default (10 000 req/min) while keeping stricter per-route configs active.
  const globalMax = env.RATE_LIMIT_ENABLED ? env.RATE_LIMIT_REQUESTS : 10_000;
  const globalWindow = env.RATE_LIMIT_ENABLED ? env.RATE_LIMIT_WINDOW * 1000 : 60_000;

  await fastify.register(rateLimit, {
    max: globalMax,
    timeWindow: globalWindow,
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
