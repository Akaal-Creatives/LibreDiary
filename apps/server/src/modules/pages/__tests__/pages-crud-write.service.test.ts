import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting (avoids importing real Prisma)
const { mockPrisma, mockPrismaPage, mockPrismaOrganization, resetMocks, mockPage, now } =
  vi.hoisted(() => {
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

    const mockPrismaOrganization = {
      findUnique: vi.fn(),
    };

    const mockPrisma = {
      page: mockPrismaPage,
      favorite: mockPrismaFavorite,
      organization: mockPrismaOrganization,
      $transaction: vi.fn(),
      $queryRawUnsafe: vi.fn(),
    };

    function resetMocks() {
      Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
      Object.values(mockPrismaFavorite).forEach((mock) => mock.mockReset());
      Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
      mockPrisma.$transaction.mockReset();
      mockPrisma.$queryRawUnsafe.mockReset();
      // Default: unencrypted workspace
      mockPrismaOrganization.findUnique.mockResolvedValue({ isEncrypted: false });
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
      htmlContent: null,
      isPublic: false,
      publicSlug: null,
      trashedAt: null,
      createdById: 'user-123',
      updatedById: null,
      createdAt: now,
      updatedAt: now,
    };

    return { mockPrisma, mockPrismaPage, mockPrismaOrganization, resetMocks, mockPage, now };
  });

// Mock the prisma module BEFORE importing pages.service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));
vi.mock('../../audit/audit.service.js', () => ({ logAudit: vi.fn() }));

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

    it('should update page htmlContent', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        htmlContent: '<p>Hello World</p>',
      });

      const result = await pagesService.updatePage('org-123', 'page-123', 'user-123', {
        htmlContent: '<p>Hello World</p>',
      });

      expect(result.htmlContent).toBe('<p>Hello World</p>');
      expect(mockPrismaPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: expect.objectContaining({
          htmlContent: '<p>Hello World</p>',
          updatedById: 'user-123',
        }),
      });
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

    it('should skip plainContent computation for encrypted workspaces', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue({ isEncrypted: true });
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        htmlContent: 'encrypted-blob-data',
      });

      await pagesService.updatePage('org-123', 'page-123', 'user-123', {
        htmlContent: 'encrypted-blob-data',
      });

      // plainContent should NOT be set when workspace is encrypted
      expect(mockPrismaPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: expect.not.objectContaining({
          plainContent: expect.any(String),
        }),
      });
    });

    it('should compute plainContent for unencrypted workspaces', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue({ isEncrypted: false });
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        htmlContent: '<p>Hello World</p>',
        plainContent: 'Hello World',
      });

      await pagesService.updatePage('org-123', 'page-123', 'user-123', {
        htmlContent: '<p>Hello World</p>',
      });

      expect(mockPrismaPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: expect.objectContaining({
          plainContent: expect.any(String),
        }),
      });
    });

    it('should reject making page public when org is encrypted', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue({ isEncrypted: true });
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      await expect(
        pagesService.updatePage('org-123', 'page-123', 'user-123', {
          isPublic: true,
        })
      ).rejects.toThrow('PUBLIC_SHARING_DISABLED_ENCRYPTED');
    });

    it('should allow making page private even when org is encrypted', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue({ isEncrypted: true });
      const publicPage = { ...mockPage, isPublic: true, publicSlug: 'test-slug' };
      mockPrismaPage.findFirst.mockResolvedValue(publicPage);
      mockPrismaPage.update.mockResolvedValue({ ...publicPage, isPublic: false });

      const result = await pagesService.updatePage('org-123', 'page-123', 'user-123', {
        isPublic: false,
      });

      expect(result.isPublic).toBe(false);
    });

    it('should allow non-public updates when org is encrypted', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue({ isEncrypted: true });
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.update.mockResolvedValue({ ...mockPage, title: 'New Title' });

      const result = await pagesService.updatePage('org-123', 'page-123', 'user-123', {
        title: 'New Title',
      });

      expect(result.title).toBe('New Title');
    });
  });

  describe('trashPage', () => {
    it('should trash a page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      // CTE returns no descendants
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      mockPrismaPage.updateMany.mockResolvedValue({ count: 1 });

      await pagesService.trashPage('org-123', 'page-123');

      expect(mockPrismaPage.updateMany).toHaveBeenCalled();
    });

    it('should trash page with descendants', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      // CTE returns descendant IDs
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ id: 'child-1' }]);
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
