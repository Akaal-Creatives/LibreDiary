import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mockPrisma, mockPrismaPage, resetMocks, mockPage, now } from './pages.mocks.js';

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import * as pagesService from '../pages.service.js';

describe('Pages Service - Write Operations', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('updatePage', () => {
    it('should update page title', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        title: 'Updated Title',
      });

      const result = await pagesService.updatePage('org-123', 'page-123', 'user-123', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(
        pagesService.updatePage('org-123', 'nonexistent', 'user-123', {
          title: 'Updated',
        })
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });

    it('should throw if page is trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      await expect(
        pagesService.updatePage('org-123', 'page-123', 'user-123', {
          title: 'Updated',
        })
      ).rejects.toThrow('PAGE_IN_TRASH');
    });

    it('should throw if public slug already exists', async () => {
      mockPrismaPage.findFirst
        .mockResolvedValueOnce(mockPage)
        .mockResolvedValueOnce({ id: 'other-page' });

      await expect(
        pagesService.updatePage('org-123', 'page-123', 'user-123', {
          publicSlug: 'taken-slug',
        })
      ).rejects.toThrow('SLUG_ALREADY_EXISTS');
    });
  });

  describe('trashPage', () => {
    it('should trash a page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.findMany.mockResolvedValue([]);
      mockPrismaPage.updateMany.mockResolvedValue({ count: 1 });

      await pagesService.trashPage('org-123', 'page-123');

      expect(mockPrismaPage.updateMany).toHaveBeenCalled();
    });

    it('should trash page with descendants', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.findMany.mockResolvedValue([{ id: 'child-1' }]);
      mockPrismaPage.updateMany.mockResolvedValue({ count: 2 });

      await pagesService.trashPage('org-123', 'page-123');

      expect(mockPrismaPage.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['page-123', 'child-1'] },
          organizationId: 'org-123',
        },
        data: {
          trashedAt: expect.any(Date),
        },
      });
    });

    it('should throw if page already trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      await expect(pagesService.trashPage('org-123', 'page-123')).rejects.toThrow(
        'PAGE_ALREADY_IN_TRASH'
      );
    });
  });
});
