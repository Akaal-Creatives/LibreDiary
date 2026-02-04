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

describe('Pages Service - Hierarchy Operations', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

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
});
