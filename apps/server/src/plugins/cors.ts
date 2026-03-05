import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/index.js';
import { logger } from '../lib/logger.js';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter((origin) => {
    if (!origin) return false;
    try {
      new URL(origin);
      return true;
    } catch {
      logger.warn('[cors] ignoring malformed CORS origin: %s', origin);
      return false;
    }
  });

export const corsPlugin = fp(
  async function corsPluginInner(fastify: FastifyInstance) {
    await fastify.register(cors, {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
  },
  { name: 'cors-plugin' }
);
