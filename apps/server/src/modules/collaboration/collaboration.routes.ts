import type { FastifyPluginAsync } from 'fastify';
import { getHocuspocusServer } from './hocuspocus.js';

/**
 * WebSocket routes for real-time collaboration
 * Handles Hocuspocus connections for Yjs document sync
 */
const collaborationRoutes: FastifyPluginAsync = async (fastify) => {
  const hocuspocus = getHocuspocusServer();

  /**
   * WebSocket endpoint for collaboration
   * URL format: /collaboration/:orgId/:pageId
   *
   * In hocuspocus v4, the document name and auth token are sent by the provider
   * in the first WebSocket message, so they no longer need to be extracted here.
   * Cookie-based auth is handled inside the onAuthenticate hook in hocuspocus.ts.
   */
  fastify.get('/:orgId/:pageId', { websocket: true }, async (socket, request) => {
    // Build a web-standard Request for hocuspocus v4 (v3 accepted IncomingMessage directly)
    const connectionHeaders = new Headers();
    for (const [k, v] of Object.entries(request.raw.headers)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) {
        v.forEach((val) => connectionHeaders.append(k, val));
      } else {
        connectionHeaders.set(k, v);
      }
    }
    const connectionRequest = new Request(
      `http://${request.headers.host ?? 'localhost'}${request.url}`,
      { method: 'GET', headers: connectionHeaders }
    );
    hocuspocus.handleConnection(socket, connectionRequest);
  });
};

export default collaborationRoutes;
