import type { FastifyPluginAsync } from 'fastify';
import { getHocuspocusServer } from './hocuspocus.js';

const SESSION_COOKIE_NAME = 'session_token';

/**
 * Parse cookies from a cookie header string
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });

  return cookies;
}

/**
 * WebSocket routes for real-time collaboration
 * Handles Hocuspocus connections for Yjs document sync
 */
const collaborationRoutes: FastifyPluginAsync = async (fastify) => {
  // Get the Hocuspocus server instance
  const hocuspocus = getHocuspocusServer();

  /**
   * WebSocket endpoint for collaboration
   * URL format: /collaboration/:orgId/:pageId
   * Document name is constructed as: orgId/pageId
   *
   * Authentication is handled via:
   * 1. Session cookie (primary - for browser connections)
   * 2. Authorization: Bearer token (for API clients)
   * 3. Query string token (fallback)
   */
  fastify.get('/:orgId/:pageId', { websocket: true }, async (socket, request) => {
    // Extract token from cookie, Authorization header, or query string
    const cookies = parseCookies(request.headers.cookie);
    const sessionToken = cookies[SESSION_COOKIE_NAME];

    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    const queryToken = (request.query as Record<string, string>)?.token;

    // Prefer cookie > bearer token > query token
    const token = sessionToken || bearerToken || queryToken || '';

    // Construct document name from URL params
    const { orgId, pageId } = request.params as { orgId: string; pageId: string };
    const documentName = `${orgId}/${pageId}`;

    // Handle the WebSocket connection with Hocuspocus
    hocuspocus.handleConnection(socket, request.raw, {
      documentName,
      token,
      requestHeaders: request.headers as Record<string, string>,
      connection: {
        readOnly: false,
      },
    });
  });
};

export default collaborationRoutes;
