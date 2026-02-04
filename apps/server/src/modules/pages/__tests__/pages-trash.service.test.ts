import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import {
  mockPrisma,
  mockPrismaPage,
  resetMocks,
  mockPage,
  mockChildPage,
  now,
} from './pages.mocks.js';

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import * as pagesService from '../pages.service.js';

describe('Pages Service - Trash Operations', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('getTrashedPages', () => {
    it('should return trashed pages', async () => {
      mockPrismaPage.findMany.mockResolvedValue([{ ...mockPage, trashedAt: now }]);

      const result = await pagesService.getTrashedPages('org-123');

      expect(result).toHaveLength(1);
      expect(result[0].trashedAt).not.toBeNull();
    });
  });

  describe('restorePage', () => {
    it('should restore page from trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.update.mockResolvedValue(mockPage);

      const result = await pagesService.restorePage('org-123', 'page-123');

      expect(result.trashedAt).toBeNull();
    });

    it('should restore to root if parent is trashed', async () => {
      mockPrismaPage.findFirst
        .mockResolvedValueOnce({
          ...mockChildPage,
          trashedAt: now,
        })
        .mockResolvedValueOnce(null); // Parent not found (trashed)

      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.update.mockResolvedValue({
        ...mockChildPage,
        trashedAt: null,
        parentId: null,
      });

      await pagesService.restorePage('org-123', 'page-456');

      expect(mockPrismaPage.update).toHaveBeenCalledWith({
        where: { id: 'page-456' },
        data: {
          trashedAt: null,
          parentId: null,
          position: 1,
        },
      });
    });

    it('should throw if page not in trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      await expect(pagesService.restorePage('org-123', 'page-123')).rejects.toThrow(
        'PAGE_NOT_IN_TRASH'
      );
    });
  });

  describe('permanentlyDeletePage', () => {
    it('should delete page permanently', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });
      mockPrismaPage.delete.mockResolvedValue({});

      await pagesService.permanentlyDeletePage('org-123', 'page-123');

      expect(mockPrismaPage.delete).toHaveBeenCalledWith({
        where: { id: 'page-123' },
      });
    });

    it('should throw if page not in trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      await expect(pagesService.permanentlyDeletePage('org-123', 'page-123')).rejects.toThrow(
        'PAGE_NOT_IN_TRASH'
      );
    });
  });
});
