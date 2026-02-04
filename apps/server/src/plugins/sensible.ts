import sensible from '@fastify/sensible';
import type { FastifyInstance } from 'fastify';

export async function sensiblePlugin(fastify: FastifyInstance) {
  await fastify.register(sensible);
}
