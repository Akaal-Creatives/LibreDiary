import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import {
  mockPrisma,
  mockPrismaPage,
  mockPrismaFavorite,
  resetMocks,
  mockPage,
  mockFavorite,
} from './pages.mocks.js';

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import * as pagesService from '../pages.service.js';

describe('Pages Service - Favorites Operations', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('getUserFavorites', () => {
    it('should return user favorites with pages', async () => {
      mockPrismaFavorite.findMany.mockResolvedValue([{ ...mockFavorite, page: mockPage }]);

      const result = await pagesService.getUserFavorites('org-123', 'user-123');

      expect(result).toHaveLength(1);
      expect(result[0].page.id).toBe('page-123');
    });
  });

  describe('addFavorite', () => {
    it('should add page to favorites', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaFavorite.findUnique.mockResolvedValue(null);
      mockPrismaFavorite.aggregate.mockResolvedValue({ _max: { position: -1 } });
      mockPrismaFavorite.create.mockResolvedValue(mockFavorite);

      const result = await pagesService.addFavorite('user-123', 'page-123', 'org-123');

      expect(result.pageId).toBe('page-123');
    });

    it('should throw if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(pagesService.addFavorite('user-123', 'nonexistent', 'org-123')).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });

    it('should throw if already favorited', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaFavorite.findUnique.mockResolvedValue(mockFavorite);

      await expect(pagesService.addFavorite('user-123', 'page-123', 'org-123')).rejects.toThrow(
        'FAVORITE_EXISTS'
      );
    });
  });

  describe('removeFavorite', () => {
    it('should remove page from favorites', async () => {
      mockPrismaFavorite.findUnique.mockResolvedValue(mockFavorite);
      mockPrismaFavorite.delete.mockResolvedValue({});

      await pagesService.removeFavorite('user-123', 'page-123');

      expect(mockPrismaFavorite.delete).toHaveBeenCalled();
    });

    it('should throw if not in favorites', async () => {
      mockPrismaFavorite.findUnique.mockResolvedValue(null);

      await expect(pagesService.removeFavorite('user-123', 'page-123')).rejects.toThrow(
        'FAVORITE_NOT_FOUND'
      );
    });
  });

  describe('reorderFavorites', () => {
    it('should reorder favorites', async () => {
      mockPrismaFavorite.findMany.mockResolvedValue([{ id: 'fav-1' }, { id: 'fav-2' }]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await pagesService.reorderFavorites('user-123', ['fav-2', 'fav-1']);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw if favorite not found', async () => {
      mockPrismaFavorite.findMany.mockResolvedValue([{ id: 'fav-1' }]);

      await expect(
        pagesService.reorderFavorites('user-123', ['fav-1', 'fav-nonexistent'])
      ).rejects.toThrow('FAVORITE_NOT_FOUND');
    });
  });
});
