import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import * as collaborationService from './collaboration.service.js';
import { getSessionByToken } from '../../services/session.service.js';
import { validateWsToken } from '../../utils/tokens.js';
import { env } from '../../config/index.js';

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
 * Context passed through Hocuspocus hooks
 */
export interface HocuspocusContext {
  documentName: string;
  token: string;
  requestHeaders: Record<string, string>;
  connection: {
    readOnly: boolean;
  };
  context?: {
    userId: string;
    organizationId: string;
    userName?: string;
  };
}

/**
 * Parse document name into organization and page IDs
 * Format: "orgId/pageId"
 */
export function parseDocumentName(
  documentName: string
): { organizationId: string; pageId: string } | null {
  const parts = documentName.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return {
    organizationId: parts[0],
    pageId: parts[1],
  };
}

/**
 * Create and configure the Hocuspocus instance for Fastify integration
 */
export function createHocuspocusServer(): Hocuspocus {
  const server = new Hocuspocus({
    name: 'librediary-collab',

    /**
     * Authentication hook - validates session and page access
     */
    async onAuthenticate(data) {
      const { documentName, requestHeaders } = data;

      // Extract token from cookie header (browser sends cookies with WebSocket upgrade)
      const cookies = parseCookies(requestHeaders?.cookie);
      const cookieToken = cookies[SESSION_COOKIE_NAME];

      // Also check for token passed directly from client (WS token or session token)
      const clientToken = data.token;

      // Parse document name to get org and page IDs
      const parsed = parseDocumentName(documentName);
      if (!parsed) {
        throw new Error('Invalid document name format');
      }

      // Try different authentication methods
      let userId: string | null = null;
      let userName: string | undefined;

      // 1. Try WS token first (passed by client)
      if (clientToken) {
        const secret = env.SESSION_SECRET ?? env.APP_SECRET;
        userId = validateWsToken(clientToken, secret);
      }

      // 2. Fall back to session cookie
      if (!userId && cookieToken) {
        const session = await getSessionByToken(cookieToken);
        if (session) {
          userId = session.userId;
          userName = session.user.name || session.user.email;
        }
      }

      // 3. Try client token as session token (for API clients)
      if (!userId && clientToken) {
        const session = await getSessionByToken(clientToken);
        if (session) {
          userId = session.userId;
          userName = session.user.name || session.user.email;
        }
      }

      // Require authentication
      if (!userId) {
        throw new Error('Authentication required');
      }

      // Check if user has access to this page
      const access = await collaborationService.validatePageAccess(parsed.pageId, userId);

      if (!access.hasAccess) {
        throw new Error('Access denied to this document');
      }

      // Return context for subsequent hooks
      return {
        userId,
        organizationId: parsed.organizationId,
        userName,
      };
    },

    /**
     * Load document from database
     */
    async onLoadDocument(data) {
      const { documentName } = data;

      const parsed = parseDocumentName(documentName);
      if (!parsed) {
        return; // Will create empty document
      }

      try {
        const yjsState = await collaborationService.loadDocument(
          parsed.organizationId,
          parsed.pageId
        );

        if (yjsState) {
          // Apply stored state to the Yjs document
          const update = new Uint8Array(yjsState);
          Y.applyUpdate(data.document, update);
        }
      } catch (error) {
        console.error('Error loading document:', error);
        // Continue with empty document if load fails
      }

      return data.document;
    },

    /**
     * Store document to database (debounced by Hocuspocus)
     */
    async onStoreDocument(data) {
      const { documentName, context, document } = data;

      const parsed = parseDocumentName(documentName);
      if (!parsed || !context?.userId) {
        return;
      }

      try {
        // Encode current document state
        const yjsState = Buffer.from(Y.encodeStateAsUpdate(document));

        await collaborationService.storeDocument(
          parsed.organizationId,
          parsed.pageId,
          yjsState,
          context.userId
        );
      } catch (error) {
        console.error('Error storing document:', error);
        // Don't throw - this would disconnect all users
      }
    },

    /**
     * Handle new connections for awareness/presence
     */
    async onConnect(data) {
      const { context } = data;

      // Add user info to awareness for cursor display
      if (context?.userName) {
        data.connection.awareness?.setLocalStateField('user', {
          name: context.userName,
          color: generateUserColor(context.userId),
        });
      }
    },

    /**
     * Clean up on disconnect
     */
    async onDisconnect(_data) {
      // Hocuspocus handles cleanup automatically
      // This hook is available for custom cleanup if needed
    },
  });

  return server;
}

/**
 * Generate a consistent color for a user based on their ID
 */
function generateUserColor(userId: string): string {
  // Simple hash to generate consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to hex color
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

// Export singleton server instance
let serverInstance: Hocuspocus | null = null;

export function getHocuspocusServer(): Hocuspocus {
  if (!serverInstance) {
    serverInstance = createHocuspocusServer();
  }
  return serverInstance;
}
