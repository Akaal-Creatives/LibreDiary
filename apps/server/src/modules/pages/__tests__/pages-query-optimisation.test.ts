import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mockPrisma, mockPrismaPage, resetMocks, mockPage } from './pages.mocks.js';

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    ...mockPrisma,
    $queryRawUnsafe: vi.fn(),
  },
}));

import * as pagesService from '../pages.service.js';
import { prisma } from '../../../lib/prisma.js';

const mockQueryRawUnsafe = (prisma as unknown as { $queryRawUnsafe: ReturnType<typeof vi.fn> })
  .$queryRawUnsafe;

describe('Pages Service - Query Optimisation', () => {
  beforeEach(() => {
    resetMocks();
    mockQueryRawUnsafe.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('getPageAncestors (CTE)', () => {
    it('should return ancestors via recursive CTE', async () => {
      const child = { ...mockPage, id: 'child', parentId: 'parent' };
      const grandparent = { ...mockPage, id: 'grandparent', parentId: null };
      const parent = { ...mockPage, id: 'parent', parentId: 'grandparent' };

      // First call: findFirst to get the page
      mockPrismaPage.findFirst.mockResolvedValueOnce(child);

      // Second call: $queryRawUnsafe for CTE
      mockQueryRawUnsafe.mockResolvedValueOnce([grandparent, parent]);

      const result = await pagesService.getPageAncestors('org-123', 'child');

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('grandparent');
      expect(result[1]!.id).toBe('parent');
      // Verify CTE query was used
      expect(mockQueryRawUnsafe).toHaveBeenCalledOnce();
      expect(mockQueryRawUnsafe.mock.calls[0]![0]).toContain('WITH RECURSIVE ancestor_cte');
    });

    it('should return empty array for root page (no parent)', async () => {
      mockPrismaPage.findFirst.mockResolvedValueOnce(mockPage); // root page, parentId is null

      const result = await pagesService.getPageAncestors('org-123', 'page-123');

      expect(result).toHaveLength(0);
      // CTE should not be called for root pages
      expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValueOnce(null);

      await expect(pagesService.getPageAncestors('org-123', 'nonexistent')).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });
  });

  describe('getPageTree (select optimisation)', () => {
    it('should call findMany with select to omit heavy columns', async () => {
      mockPrismaPage.findMany.mockResolvedValueOnce([]);

      await pagesService.getPageTree('org-123');

      expect(mockPrismaPage.findMany).toHaveBeenCalledOnce();
      const callArgs = mockPrismaPage.findMany.mock.calls[0]![0];
      expect(callArgs.select).toBeDefined();
      // Verify heavy columns are excluded
      expect(callArgs.select.yjsState).toBeUndefined();
      expect(callArgs.select.htmlContent).toBeUndefined();
      expect(callArgs.select.plainContent).toBeUndefined();
      // Verify essential columns are included
      expect(callArgs.select.id).toBe(true);
      expect(callArgs.select.title).toBe(true);
      expect(callArgs.select.parentId).toBe(true);
      expect(callArgs.select.position).toBe(true);
    });
  });
});
