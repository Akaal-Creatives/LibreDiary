import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import * as collaborationService from './collaboration.service.js';
import { getSessionByToken } from '../../services/session.service.js';
import { validateWsToken } from '../../utils/tokens.js';
import { env } from '../../config/index.js';
import { yjsDocToText } from '../../utils/yjs-to-text.js';
import { prisma } from '../../lib/prisma.js';
import { indexPage } from '../search/meilisearch.service.js';
import { logger } from '../../lib/logger.js';
import { encryptYjsState, decryptYjsState, isEncryptedYjsState } from './yjs-encrypt.js';

const SESSION_COOKIE_NAME = 'session_token';

/**
 * Track the last authenticated userId per document so that onStoreDocument
 * can still persist changes even after all users have disconnected.
 */
const lastKnownUserByDocument = new Map<string, string>();

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

    // Explicit debounce: save 2s after last change, max 10s after first change
    debounce: 2000,
    maxDebounce: 10000,

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

      // Track last authenticated user for this document so onStoreDocument
      // can still save after all users disconnect
      lastKnownUserByDocument.set(documentName, userId);

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
        let yjsState = await collaborationService.loadDocument(
          parsed.organizationId,
          parsed.pageId
        );

        if (yjsState) {
          // Decrypt if stored encrypted (for encrypted workspaces)
          if (isEncryptedYjsState(yjsState)) {
            yjsState = decryptYjsState(yjsState, parsed.organizationId);
          }

          // Decode yjsState and check whether it carries any real text.
          // If it's empty but the page has htmlContent, skip loading the
          // Yjs state so the frontend's insertInitialContentIfEmpty()
          // can restore from the HTML backup instead.
          const tempDoc = new Y.Doc();
          Y.applyUpdate(tempDoc, new Uint8Array(yjsState));
          const yjsText = yjsDocToText(tempDoc).trim();
          tempDoc.destroy();

          if (!yjsText) {
            const page = await prisma.page.findFirst({
              where: { id: parsed.pageId, organizationId: parsed.organizationId },
              select: { htmlContent: true },
            });

            const hasHtmlContent =
              page?.htmlContent &&
              page.htmlContent.trim() &&
              page.htmlContent !== '<p></p>' &&
              page.htmlContent !== '<p><br></p>';

            if (hasHtmlContent) {
              logger.warn(
                `[hocuspocus] yjsState for ${documentName} has no text content but htmlContent exists (${page.htmlContent!.length} chars) — skipping yjsState load so frontend can restore from htmlContent`
              );
              return data.document;
            }
          }

          // Apply stored state to the Yjs document
          const update = new Uint8Array(yjsState);
          Y.applyUpdate(data.document, update);
        }
      } catch (error) {
        logger.error(error, '[hocuspocus] error loading document %s', documentName);
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
      if (!parsed) {
        return;
      }

      // Use context userId if available, otherwise fall back to the last
      // authenticated user for this document. This ensures the final save
      // after all users disconnect still persists.
      const userId = context?.userId || lastKnownUserByDocument.get(documentName);
      if (!userId) {
        logger.warn(
          '[hocuspocus] no userId available for storing document %s — skipping save',
          documentName
        );
        return;
      }

      try {
        // Encode current document state
        let yjsState = Buffer.from(Y.encodeStateAsUpdate(document));

        // Check if workspace has E2EE enabled — if so, encrypt at rest and skip text extraction
        const org = await prisma.organization.findUnique({
          where: { id: parsed.organizationId },
          select: { isEncrypted: true },
        });

        if (org?.isEncrypted) {
          // Encrypt yjsState at rest before storing to database
          yjsState = encryptYjsState(yjsState, parsed.organizationId) as Buffer<ArrayBuffer>;
        }

        await collaborationService.storeDocument(
          parsed.organizationId,
          parsed.pageId,
          yjsState,
          userId
        );

        if (!org?.isEncrypted) {
          // Extract plain text from Yjs doc for search indexing
          const plainContent = yjsDocToText(document);

          // Update plainContent in PostgreSQL (triggers search_vector update)
          const page = await prisma.page.update({
            where: { id: parsed.pageId },
            data: { plainContent },
            select: { id: true, title: true, createdById: true, createdAt: true, updatedAt: true },
          });

          // Index to Meilisearch (fire-and-forget)
          indexPage({
            id: page.id,
            title: page.title,
            plainContent,
            orgId: parsed.organizationId,
            createdById: page.createdById,
            createdAt: Math.floor(page.createdAt.getTime() / 1000),
            updatedAt: Math.floor(page.updatedAt.getTime() / 1000),
          }).catch((err) => {
            logger.error(
              err,
              '[meilisearch] failed to index page from collaboration %s',
              parsed.pageId
            );
          });
        }
      } catch (error) {
        logger.error(error, '[hocuspocus] error storing document %s', documentName);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Hocuspocus onConnect data typing does not expose connection.awareness
        (data as any).connection?.awareness?.setLocalStateField('user', {
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
 * Generate a consistent hex colour for a user based on their ID.
 * Uses 6-digit hex (#RRGGBB) as required by y-prosemirror.
 */
function generateUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert HSL (hue, 70% saturation, 50% lightness) to hex
  const hue = Math.abs(hash % 360);
  const s = 0.7,
    l = 0.5;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const colour = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * colour)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Export singleton server instance
let serverInstance: Hocuspocus | null = null;

export function getHocuspocusServer(): Hocuspocus {
  if (!serverInstance) {
    serverInstance = createHocuspocusServer();
  }
  return serverInstance;
}

/**
 * Gracefully shut down the Hocuspocus server.
 * Flushes all in-memory documents to the database before closing.
 */
export async function destroyHocuspocusServer(): Promise<void> {
  if (serverInstance) {
    logger.info('[hocuspocus] flushing all documents before shutdown...');

    // Flush every in-memory document to the database
    const flushPromises: Promise<unknown>[] = [];
    for (const [, document] of serverInstance.documents) {
      flushPromises.push(
        serverInstance
          .storeDocumentHooks(document, {
            clientsCount: document.getConnectionsCount(),
            context: {},
            document,
            documentName: document.name,
            instance: serverInstance,
            requestHeaders: {},
            requestParameters: new URLSearchParams(),
            socketId: '',
          })
          .catch((err) => {
            logger.error(err, `[hocuspocus] failed to flush document ${document.name}`);
          })
      );
    }
    await Promise.all(flushPromises);

    serverInstance.closeConnections();
    lastKnownUserByDocument.clear();
    serverInstance = null;
    logger.info('[hocuspocus] shutdown complete');
  }
}
