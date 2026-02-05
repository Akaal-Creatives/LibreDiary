import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting (avoids importing real Prisma)
const { mockPrisma, mockPrismaPage, resetMocks, mockPage, now } = vi.hoisted(() => {
  const mockPrismaPage = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockPrismaFavorite = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockPrisma = {
    page: mockPrismaPage,
    favorite: mockPrismaFavorite,
    $transaction: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaFavorite).forEach((mock) => mock.mockReset());
    mockPrisma.$transaction.mockReset();
  }

  const now = new Date();

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    parentId: null,
    position: 0,
    title: 'Test Page',
    icon: null,
    coverUrl: null,
    yjsState: null,
    isPublic: false,
    publicSlug: null,
    trashedAt: null,
    createdById: 'user-123',
    updatedById: null,
    createdAt: now,
    updatedAt: now,
  };

  return { mockPrisma, mockPrismaPage, resetMocks, mockPage, now };
});

// Mock the prisma module BEFORE importing pages.service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import service AFTER mocking
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
      // First call returns children, second call (for grandchildren) returns empty
      mockPrismaPage.findMany.mockResolvedValueOnce([{ id: 'child-1' }]).mockResolvedValueOnce([]); // No grandchildren - prevents infinite recursion
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
