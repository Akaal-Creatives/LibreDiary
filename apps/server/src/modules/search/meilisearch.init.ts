import {
  getMeilisearchClient,
  PAGES_INDEX,
  isMeilisearchConfigured,
} from '../../lib/meilisearch.js';

let healthy = false;
let healthTimer: ReturnType<typeof setInterval> | null = null;

/** Whether Meilisearch is currently reachable and healthy. */
export function isMeilisearchAvailable(): boolean {
  return healthy;
}

/**
 * Initialise the Meilisearch index and start periodic health checks.
 * Safe to call even when Meilisearch is not configured — it will no-op.
 */
export async function initMeilisearch(): Promise<void> {
  if (!isMeilisearchConfigured()) return;

  const client = getMeilisearchClient();
  if (!client) return;

  try {
    // Create or get the pages index
    await client.createIndex(PAGES_INDEX, { primaryKey: 'id' }).catch(() => {
      // Index may already exist — ignore 'index_already_exists' error
    });

    const index = client.index(PAGES_INDEX);

    // Configure searchable and filterable attributes
    await index.updateSearchableAttributes(['title', 'plainContent']);
    await index.updateFilterableAttributes(['orgId', 'createdById', 'createdAt', 'updatedAt']);
    await index.updateSortableAttributes(['updatedAt', 'createdAt']);

    healthy = true;
    console.log('[meilisearch] Connected and index configured:', PAGES_INDEX);
  } catch (err) {
    healthy = false;
    console.warn('[meilisearch] Initial connection failed — PG FTS will be used as fallback:', err);
  }

  // Periodic health check every 30 seconds
  healthTimer = setInterval(async () => {
    try {
      const client = getMeilisearchClient();
      if (!client) {
        healthy = false;
        return;
      }
      await client.health();
      if (!healthy) {
        console.log('[meilisearch] Connection recovered');
      }
      healthy = true;
    } catch {
      if (healthy) {
        console.warn('[meilisearch] Health check failed — falling back to PG FTS');
      }
      healthy = false;
    }
  }, 30_000);

  // Unref the timer so it does not keep the process alive
  if (healthTimer && typeof healthTimer === 'object' && 'unref' in healthTimer) {
    healthTimer.unref();
  }
}

/** Stop the health-check timer (useful in tests). */
export function stopMeilisearchHealthCheck(): void {
  if (healthTimer) {
    clearInterval(healthTimer);
    healthTimer = null;
  }
}
