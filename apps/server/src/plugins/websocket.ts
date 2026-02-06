import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import type { FastifyPluginAsync } from 'fastify';

/**
 * WebSocket plugin for real-time collaboration
 * Enables WebSocket support in Fastify for Hocuspocus integration
 */
const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB max message size
      clientTracking: true,
    },
  });
};

export default fp(websocketPlugin, {
  name: 'websocket-plugin',
});
