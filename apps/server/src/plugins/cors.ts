import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/index.js';

const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

export async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Ensure CORS headers are always present on error responses
  // This handles cases where middleware returns errors before CORS headers are set
  fastify.addHook('onSend', async (request, reply, _payload) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      // Only add if not already set
      if (!reply.hasHeader('access-control-allow-origin')) {
        reply.header('access-control-allow-origin', origin);
        reply.header('access-control-allow-credentials', 'true');
        reply.header('vary', 'Origin');
      }
    }
  });
}
