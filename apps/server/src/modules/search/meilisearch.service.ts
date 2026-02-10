import { getMeilisearchClient, PAGES_INDEX } from '../../lib/meilisearch.js';
import { isMeilisearchAvailable } from './meilisearch.init.js';

/**
 * Shape of a page document stored in the Meilisearch index.
 */
export interface MeiliPageDocument {
  id: string;
  title: string;
  plainContent: string;
  orgId: string;
  createdById: string;
  createdAt: number; // Unix timestamp (seconds)
  updatedAt: number; // Unix timestamp (seconds)
}

/**
 * Upsert a single page document into the Meilisearch index.
 * Fire-and-forget: errors are logged, never thrown.
 */
export async function indexPage(doc: MeiliPageDocument): Promise<void> {
  try {
    if (!isMeilisearchAvailable()) return;

    const client = getMeilisearchClient();
    if (!client) return;

    await client.index(PAGES_INDEX).addDocuments([doc]);
  } catch (err) {
    console.error('[meilisearch] Failed to index page:', doc.id, err);
  }
}

/**
 * Remove a page from the Meilisearch index.
 * Fire-and-forget: errors are logged, never thrown.
 */
export async function removePage(pageId: string): Promise<void> {
  try {
    if (!isMeilisearchAvailable()) return;

    const client = getMeilisearchClient();
    if (!client) return;

    await client.index(PAGES_INDEX).deleteDocument(pageId);
  } catch (err) {
    console.error('[meilisearch] Failed to remove page:', pageId, err);
  }
}

/**
 * Batch upsert multiple page documents for bulk reindexing.
 * Fire-and-forget: errors are logged, never thrown.
 */
export async function bulkIndex(docs: MeiliPageDocument[]): Promise<void> {
  try {
    if (!isMeilisearchAvailable()) return;
    if (docs.length === 0) return;

    const client = getMeilisearchClient();
    if (!client) return;

    await client.index(PAGES_INDEX).addDocuments(docs);
  } catch (err) {
    console.error('[meilisearch] Failed to bulk index', docs.length, 'pages:', err);
  }
}
