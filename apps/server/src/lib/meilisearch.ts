import { Meilisearch } from 'meilisearch';
import { env } from '../config/index.js';

const globalForMeili = globalThis as unknown as {
  meilisearch: Meilisearch | undefined;
};

/**
 * Returns a Meilisearch client singleton, or null when not configured.
 */
export function getMeilisearchClient(): Meilisearch | null {
  if (!env.MEILISEARCH_HOST) return null;

  if (!globalForMeili.meilisearch) {
    globalForMeili.meilisearch = new Meilisearch({
      host: env.MEILISEARCH_HOST,
      apiKey: env.MEILISEARCH_API_KEY,
    });
  }

  return globalForMeili.meilisearch;
}

/** Whether the Meilisearch env vars are configured. */
export function isMeilisearchConfigured(): boolean {
  return !!env.MEILISEARCH_HOST;
}

/** Canonical index name for pages. */
export const PAGES_INDEX = `${env.MEILISEARCH_INDEX_PREFIX}_pages`;
