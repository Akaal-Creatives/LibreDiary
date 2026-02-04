import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/index.js';

export async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
}
