import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mockPrisma, mockPrismaPage, resetMocks, mockPage, mockChildPage } from './pages.mocks.js';

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import * as pagesService from '../pages.service.js';

describe('Pages Service - Read Operations', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

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
