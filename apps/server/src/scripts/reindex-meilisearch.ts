/**
 * Bulk reindex all non-trashed pages into Meilisearch.
 *
 * Usage:
 *   pnpm --filter @librediary/server search:reindex
 */
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import { initMeilisearch, stopMeilisearchHealthCheck } from '../modules/search/meilisearch.init.js';
import { bulkIndex, type MeiliPageDocument } from '../modules/search/meilisearch.service.js';
import { htmlToText } from '../utils/html-to-text.js';
import { yjsStateToText } from '../utils/yjs-to-text.js';

const BATCH_SIZE = 500;

async function main() {
  // eslint-disable-next-line no-console
  console.log('[reindex] Initialising Meilisearch connection...');
  await initMeilisearch();

  const totalCount = await prisma.page.count({ where: { trashedAt: null } });
  // eslint-disable-next-line no-console
  console.log(`[reindex] Found ${totalCount} non-trashed pages to index`);

  let processed = 0;
  let cursor: string | undefined;

  while (processed < totalCount) {
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
      // Try to extract plain text from available sources
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

    // Also update plainContent in PG if it was missing
    const updates = pages
      .filter((p) => !p.plainContent)
      .map((p) => {
        const doc = docs.find((d) => d.id === p.id);
        if (!doc || !doc.plainContent) return null;
        return prisma.page.update({
          where: { id: p.id },
          data: { plainContent: doc.plainContent },
        });
      })
      .filter(Boolean);

    if (updates.length > 0) {
      await prisma.$transaction(updates as Prisma.PrismaPromise<unknown>[]);
    }

    processed += pages.length;
    cursor = pages[pages.length - 1]!.id;

    // eslint-disable-next-line no-console
    console.log(`[reindex] Processed ${processed}/${totalCount} pages`);
  }

  // eslint-disable-next-line no-console
  console.log(`[reindex] Complete. ${processed} pages indexed.`);

  stopMeilisearchHealthCheck();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[reindex] Fatal error:', err);
  process.exit(1);
});
