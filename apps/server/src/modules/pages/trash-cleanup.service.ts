import { prisma } from '../../lib/prisma.js';
import { removePage as removePageFromSearch } from '../search/meilisearch.service.js';
import { logAudit } from '../audit/audit.service.js';

const TRASH_RETENTION_DAYS = 30;

/**
 * Permanently delete all pages that have been in the trash for longer
 * than the retention period (30 days).
 *
 * Returns the number of pages successfully deleted.
 */
export async function cleanupExpiredTrash(): Promise<number> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expiredPages = await prisma.page.findMany({
    where: {
      trashedAt: {
        not: null,
        lt: cutoff,
      },
    },
    select: {
      id: true,
      organizationId: true,
      title: true,
      trashedAt: true,
    },
  });

  if (expiredPages.length === 0) {
    return 0;
  }

  let deletedCount = 0;

  for (const page of expiredPages) {
    try {
      // Remove from Meilisearch index (fire-and-forget)
      removePageFromSearch(page.id).catch(() => {});

      await prisma.page.delete({ where: { id: page.id } });

      logAudit({
        action: 'PAGE_DELETED_PERMANENTLY',
        organizationId: page.organizationId,
        resourceType: 'page',
        resourceId: page.id,
        metadata: { title: page.title, reason: 'trash_expired' },
      });

      deletedCount++;
    } catch (error) {
      console.error(`[trash-cleanup] Failed to delete page ${page.id}:`, error);
    }
  }

  return deletedCount;
}
