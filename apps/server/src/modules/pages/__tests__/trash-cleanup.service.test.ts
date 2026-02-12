import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies using vi.hoisted
const { mockPrisma, mockRemovePage, mockLogAudit } = vi.hoisted(() => {
  const mockPrisma = {
    page: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    mockPrisma,
    mockRemovePage: vi.fn().mockResolvedValue(undefined),
    mockLogAudit: vi.fn(),
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../search/meilisearch.service.js', () => ({
  removePage: mockRemovePage,
}));

vi.mock('../../audit/audit.service.js', () => ({
  logAudit: mockLogAudit,
}));

import { cleanupExpiredTrash } from '../trash-cleanup.service.js';

describe('Trash Cleanup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.page.findMany.mockReset().mockResolvedValue([]);
    mockPrisma.page.delete.mockReset().mockResolvedValue({});
    mockRemovePage.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // cleanupExpiredTrash
  // ===========================================

  describe('cleanupExpiredTrash', () => {
    it('should return 0 when no expired trash exists', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      const result = await cleanupExpiredTrash();

      expect(result).toBe(0);
    });

    it('should query for pages trashed more than 30 days ago', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await cleanupExpiredTrash();

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trashedAt: expect.objectContaining({
              not: null,
              lt: expect.any(Date),
            }),
          }),
        })
      );

      // Verify the cutoff date is approximately 30 days ago
      const callArgs = mockPrisma.page.findMany.mock.calls[0][0];
      const cutoffDate = callArgs.where.trashedAt.lt as Date;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const diffMs = Math.abs(cutoffDate.getTime() - thirtyDaysAgo.getTime());
      expect(diffMs).toBeLessThan(5000); // Within 5 seconds
    });

    it('should permanently delete each expired page', async () => {
      const expiredPages = [
        {
          id: 'page-1',
          organizationId: 'org-1',
          title: 'Old Page 1',
          trashedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'page-2',
          organizationId: 'org-1',
          title: 'Old Page 2',
          trashedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.page.findMany.mockResolvedValue(expiredPages);

      const result = await cleanupExpiredTrash();

      expect(result).toBe(2);
      expect(mockPrisma.page.delete).toHaveBeenCalledTimes(2);
      expect(mockPrisma.page.delete).toHaveBeenCalledWith({ where: { id: 'page-1' } });
      expect(mockPrisma.page.delete).toHaveBeenCalledWith({ where: { id: 'page-2' } });
    });

    it('should remove each page from Meilisearch index', async () => {
      const expiredPages = [
        {
          id: 'page-1',
          organizationId: 'org-1',
          title: 'Old Page',
          trashedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.page.findMany.mockResolvedValue(expiredPages);

      await cleanupExpiredTrash();

      expect(mockRemovePage).toHaveBeenCalledWith('page-1');
    });

    it('should log audit entry for each deleted page', async () => {
      const expiredPages = [
        {
          id: 'page-1',
          organizationId: 'org-1',
          title: 'Old Page 1',
          trashedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'page-2',
          organizationId: 'org-2',
          title: 'Old Page 2',
          trashedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.page.findMany.mockResolvedValue(expiredPages);

      await cleanupExpiredTrash();

      expect(mockLogAudit).toHaveBeenCalledTimes(2);
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAGE_DELETED_PERMANENTLY',
          organizationId: 'org-1',
          resourceType: 'page',
          resourceId: 'page-1',
          metadata: expect.objectContaining({ title: 'Old Page 1', reason: 'trash_expired' }),
        })
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAGE_DELETED_PERMANENTLY',
          organizationId: 'org-2',
          resourceType: 'page',
          resourceId: 'page-2',
        })
      );
    });

    it('should continue processing remaining pages if one deletion fails', async () => {
      const expiredPages = [
        {
          id: 'page-1',
          organizationId: 'org-1',
          title: 'Fail Page',
          trashedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'page-2',
          organizationId: 'org-1',
          title: 'Success Page',
          trashedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.page.findMany.mockResolvedValue(expiredPages);
      mockPrisma.page.delete.mockRejectedValueOnce(new Error('DB error')).mockResolvedValueOnce({});

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await cleanupExpiredTrash();

      // Should still have processed the second page
      expect(mockPrisma.page.delete).toHaveBeenCalledTimes(2);
      // Only count successful deletions
      expect(result).toBe(1);

      consoleSpy.mockRestore();
    });

    it('should not throw if Meilisearch removal fails', async () => {
      const expiredPages = [
        {
          id: 'page-1',
          organizationId: 'org-1',
          title: 'Page',
          trashedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.page.findMany.mockResolvedValue(expiredPages);
      mockRemovePage.mockRejectedValue(new Error('Meili down'));

      const result = await cleanupExpiredTrash();

      // Deletion should still succeed
      expect(result).toBe(1);
      expect(mockPrisma.page.delete).toHaveBeenCalledTimes(1);
    });

    it('should select only id, organizationId, and title fields', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await cleanupExpiredTrash();

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            organizationId: true,
            title: true,
            trashedAt: true,
          },
        })
      );
    });

    it('should handle pages from multiple organisations', async () => {
      const expiredPages = [
        {
          id: 'page-1',
          organizationId: 'org-1',
          title: 'Org1 Page',
          trashedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'page-2',
          organizationId: 'org-2',
          title: 'Org2 Page',
          trashedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'page-3',
          organizationId: 'org-1',
          title: 'Org1 Page 2',
          trashedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.page.findMany.mockResolvedValue(expiredPages);

      const result = await cleanupExpiredTrash();

      expect(result).toBe(3);
      expect(mockPrisma.page.delete).toHaveBeenCalledTimes(3);
    });
  });
});
