import { prisma } from '../../lib/prisma.js';
import { bulkIndex, type MeiliPageDocument } from './meilisearch.service.js';
import { htmlToText } from '../../utils/html-to-text.js';
import { yjsStateToText } from '../../utils/yjs-to-text.js';

const BATCH_SIZE = 500;

let reindexRunning = false;
let reindexProgress: { processed: number; total: number } | null = null;

export interface ReindexResult {
  totalIndexed: number;
  durationMs: number;
}

export interface ReindexStatus {
  running: boolean;
  progress: { processed: number; total: number } | null;
}

/**
 * Get the current reindex status.
 */
export function getReindexStatus(): ReindexStatus {
  return {
    running: reindexRunning,
    progress: reindexProgress,
  };
}

/**
 * Trigger a full reindex of all non-trashed pages into Meilisearch.
 * Throws 'REINDEX_IN_PROGRESS' if already running.
 */
export async function triggerReindex(): Promise<ReindexResult> {
  if (reindexRunning) {
    throw new Error('REINDEX_IN_PROGRESS');
  }

  reindexRunning = true;
  reindexProgress = null;

  const start = performance.now();
  let totalIndexed = 0;

  try {
    const totalCount = await prisma.page.count({ where: { trashedAt: null } });
    reindexProgress = { processed: 0, total: totalCount };

    let cursor: string | undefined;

    while (totalIndexed < totalCount) {
      const pages = await prisma.page.findMany({
        where: { trashedAt: null },
        select: {
          id: true,
          title: true,
          plainContent: true,
          htmlContent: true,
          yjsState: true,
          organizationId: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (pages.length === 0) break;

      const docs: MeiliPageDocument[] = pages.map((page) => {
        let plainContent = page.plainContent ?? '';

        if (!plainContent && page.yjsState) {
          try {
            plainContent = yjsStateToText(page.yjsState as unknown as Uint8Array);
          } catch {
            // Ignore corrupt Yjs state
          }
        }

        if (!plainContent && page.htmlContent) {
          plainContent = htmlToText(page.htmlContent);
        }

        return {
          id: page.id,
          title: page.title,
          plainContent,
          orgId: page.organizationId,
          createdById: page.createdById,
          createdAt: Math.floor(page.createdAt.getTime() / 1000),
          updatedAt: Math.floor(page.updatedAt.getTime() / 1000),
        };
      });

      await bulkIndex(docs);

      totalIndexed += pages.length;
      cursor = pages[pages.length - 1].id;
      reindexProgress = { processed: totalIndexed, total: totalCount };
    }

    const durationMs = Math.round(performance.now() - start);
    return { totalIndexed, durationMs };
  } finally {
    reindexRunning = false;
  }
}
