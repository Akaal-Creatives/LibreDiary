import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockPrismaPage, mockPrismaFavorite, mockPrisma } = vi.hoisted(() => {
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

  return {
    mockPrismaPage,
    mockPrismaFavorite,
    mockPrisma,
  };
});

// Mock modules
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import * as pagesService from './pages.service.js';

function resetMocks() {
  Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaFavorite).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
}

describe('Pages Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

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

  const mockChildPage = {
    ...mockPage,
    id: 'page-456',
    parentId: 'page-123',
    title: 'Child Page',
    position: 0,
  };

  const mockFavorite = {
    id: 'fav-123',
    userId: 'user-123',
    pageId: 'page-123',
    position: 0,
    createdAt: now,
  };

  // ===========================================
  // PAGE CRUD
  // ===========================================

  describe('createPage', () => {
    it('should create a page at root level', async () => {
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: -1 } });
      mockPrismaPage.create.mockResolvedValue(mockPage);

      const result = await pagesService.createPage('org-123', 'user-123', {
        title: 'Test Page',
      });

      expect(result.title).toBe('Test Page');
      expect(mockPrismaPage.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-123',
          createdById: 'user-123',
          title: 'Test Page',
          parentId: null,
          icon: null,
          position: 0,
        },
      });
    });

    it('should create a page with parent', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 1 } });
      mockPrismaPage.create.mockResolvedValue(mockChildPage);

      const result = await pagesService.createPage('org-123', 'user-123', {
        title: 'Child Page',
        parentId: 'page-123',
      });

      expect(result.parentId).toBe('page-123');
    });

    it('should throw if parent does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(
        pagesService.createPage('org-123', 'user-123', {
          title: 'Child Page',
          parentId: 'nonexistent',
        })
      ).rejects.toThrow('INVALID_PARENT');
    });
  });

  describe('getPageTree', () => {
    it('should return page tree structure', async () => {
      mockPrismaPage.findMany.mockResolvedValue([mockPage, mockChildPage]);

      const result = await pagesService.getPageTree('org-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('page-123');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('page-456');
    });

    it('should return empty array for org with no pages', async () => {
      mockPrismaPage.findMany.mockResolvedValue([]);

      const result = await pagesService.getPageTree('org-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPage', () => {
    it('should return page by ID', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      const result = await pagesService.getPage('org-123', 'page-123');

      expect(result?.id).toBe('page-123');
    });

    it('should return null for non-existent page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const result = await pagesService.getPage('org-123', 'nonexistent');

      expect(result).toBeNull();
    });
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

  // ===========================================
  // HIERARCHY OPERATIONS
  // ===========================================

  describe('movePage', () => {
    it('should move page to new parent', async () => {
      const newParent = { ...mockPage, id: 'page-789', title: 'New Parent' };
      mockPrismaPage.findFirst
        .mockResolvedValueOnce(mockChildPage) // page to move
        .mockResolvedValueOnce(newParent) // new parent
        .mockResolvedValueOnce(newParent); // validate move - isAncestor check

      mockPrismaPage.findMany.mockResolvedValue([]); // no ancestors
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.update.mockResolvedValue({
        ...mockChildPage,
        parentId: 'page-789',
      });

      const result = await pagesService.movePage('org-123', 'page-456', {
        parentId: 'page-789',
      });

      expect(result.parentId).toBe('page-789');
    });

    it('should throw if moving page to itself', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      await expect(
        pagesService.movePage('org-123', 'page-123', {
          parentId: 'page-123',
        })
      ).rejects.toThrow('INVALID_PARENT');
    });

    it('should throw if page is trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      await expect(
        pagesService.movePage('org-123', 'page-123', {
          parentId: null,
        })
      ).rejects.toThrow('PAGE_IN_TRASH');
    });
  });

  describe('getPageAncestors', () => {
    it('should return ancestors in order', async () => {
      const grandparent = { ...mockPage, id: 'grandparent', parentId: null };
      const parent = { ...mockPage, id: 'parent', parentId: 'grandparent' };
      const child = { ...mockPage, id: 'child', parentId: 'parent' };

      mockPrismaPage.findFirst
        .mockResolvedValueOnce(child) // target page
        .mockResolvedValueOnce(parent) // first ancestor
        .mockResolvedValueOnce(grandparent); // second ancestor

      const result = await pagesService.getPageAncestors('org-123', 'child');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('grandparent');
      expect(result[1].id).toBe('parent');
    });

    it('should throw if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(pagesService.getPageAncestors('org-123', 'nonexistent')).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });
  });

  describe('duplicatePage', () => {
    it('should duplicate a page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.create.mockResolvedValue({
        ...mockPage,
        id: 'page-copy',
        title: 'Test Page (copy)',
      });

      const result = await pagesService.duplicatePage('org-123', 'page-123', 'user-123');

      expect(result.title).toBe('Test Page (copy)');
    });

    it('should throw if page is trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      await expect(pagesService.duplicatePage('org-123', 'page-123', 'user-123')).rejects.toThrow(
        'PAGE_IN_TRASH'
      );
    });
  });

  // ===========================================
  // TRASH OPERATIONS
  // ===========================================

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

  // ===========================================
  // FAVORITES
  // ===========================================

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

  // ===========================================
  // HELPER FUNCTIONS
  // ===========================================

  describe('buildPageTree', () => {
    it('should build tree from flat array', () => {
      const pages = [
        { ...mockPage, id: 'root', parentId: null, position: 0 },
        { ...mockPage, id: 'child1', parentId: 'root', position: 0 },
        { ...mockPage, id: 'child2', parentId: 'root', position: 1 },
        { ...mockPage, id: 'grandchild', parentId: 'child1', position: 0 },
      ];

      const result = pagesService.buildPageTree(pages);

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].children).toHaveLength(1);
    });

    it('should sort children by position', () => {
      const pages = [
        { ...mockPage, id: 'root', parentId: null, position: 0 },
        { ...mockPage, id: 'child1', parentId: 'root', position: 2 },
        { ...mockPage, id: 'child2', parentId: 'root', position: 0 },
        { ...mockPage, id: 'child3', parentId: 'root', position: 1 },
      ];

      const result = pagesService.buildPageTree(pages);

      expect(result[0].children[0].id).toBe('child2');
      expect(result[0].children[1].id).toBe('child3');
      expect(result[0].children[2].id).toBe('child1');
    });
  });
});
