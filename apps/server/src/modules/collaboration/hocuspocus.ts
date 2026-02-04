import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import * as collaborationService from './collaboration.service.js';
import { getSessionByToken } from '../../services/session.service.js';

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
 * Create and configure the Hocuspocus WebSocket server
 */
export function createHocuspocusServer(): Server {
  const server = new Server({
    name: 'librediary-collab',

    /**
     * Authentication hook - validates session and page access
     */
    async onAuthenticate(data) {
      const { documentName, token } = data;

      // Require authentication token
      if (!token) {
        throw new Error('Authentication required');
      }

      // Parse document name to get org and page IDs
      const parsed = parseDocumentName(documentName);
      if (!parsed) {
        throw new Error('Invalid document name format');
      }

      // Validate session token
      const session = await getSessionByToken(token);
      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Check if user has access to this page
      const access = await collaborationService.validatePageAccess(parsed.pageId, session.userId);

      if (!access.hasAccess) {
        throw new Error('Access denied to this document');
      }

      // Return context for subsequent hooks
      return {
        userId: session.userId,
        organizationId: parsed.organizationId,
        userName: session.user.name || session.user.email,
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
let serverInstance: Server | null = null;

export function getHocuspocusServer(): Server {
  if (!serverInstance) {
    serverInstance = createHocuspocusServer();
  }
  return serverInstance;
}
