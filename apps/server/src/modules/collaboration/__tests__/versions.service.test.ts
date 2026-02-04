import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, mockPrismaPageVersion, mockPrismaPage } = vi.hoisted(() => {
  const mockPrismaPageVersion = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaPage = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockPrisma = {
    pageVersion: mockPrismaPageVersion,
    page: mockPrismaPage,
    $transaction: vi.fn(),
  };

  return { mockPrisma, mockPrismaPageVersion, mockPrismaPage };
});

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import service after mocking
import * as versionsService from '../versions.service.js';

function resetMocks() {
  Object.values(mockPrismaPageVersion).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
}

describe('Versions Service', () => {
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
  const yjsState = Buffer.from([1, 2, 3, 4]); // Mock Yjs state

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Test Page',
    yjsState: yjsState,
    trashedAt: null,
    createdById: 'user-123',
    createdAt: now,
    updatedAt: now,
  };

  const mockVersion = {
    id: 'version-123',
    pageId: 'page-123',
    version: 1,
    title: 'Test Page',
    yjsState: yjsState,
    createdById: 'user-123',
    createdAt: now,
  };

  // ===========================================
  // CREATE VERSION
  // ===========================================

  describe('createVersion', () => {
    it('should create a new version with incremented version number', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.count.mockResolvedValue(2);
      mockPrismaPageVersion.create.mockResolvedValue({
        ...mockVersion,
        version: 3,
      });

      const result = await versionsService.createVersion('org-123', 'page-123', 'user-123');

      expect(result.version).toBe(3);
      expect(result.pageId).toBe('page-123');
      expect(mockPrismaPageVersion.create).toHaveBeenCalledWith({
        data: {
          pageId: 'page-123',
          version: 3,
          title: 'Test Page',
          yjsState: yjsState,
          createdById: 'user-123',
        },
      });
    });

    it('should create version 1 for first version', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.count.mockResolvedValue(0);
      mockPrismaPageVersion.create.mockResolvedValue({
        ...mockVersion,
        version: 1,
      });

      const result = await versionsService.createVersion('org-123', 'page-123', 'user-123');

      expect(result.version).toBe(1);
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(
        versionsService.createVersion('org-123', 'nonexistent', 'user-123')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });

    it('should throw PAGE_IN_TRASH if page is trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      await expect(
        versionsService.createVersion('org-123', 'page-123', 'user-123')
      ).rejects.toThrow('PAGE_IN_TRASH');
    });
  });

  // ===========================================
  // GET VERSIONS
  // ===========================================

  describe('getVersions', () => {
    it('should return all versions for a page ordered by version desc', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findMany.mockResolvedValue([
        { ...mockVersion, version: 3 },
        { ...mockVersion, version: 2 },
        { ...mockVersion, version: 1 },
      ]);

      const result = await versionsService.getVersions('org-123', 'page-123');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
      expect(mockPrismaPageVersion.findMany).toHaveBeenCalledWith({
        where: { pageId: 'page-123' },
        orderBy: { version: 'desc' },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      });
    });

    it('should return empty array if no versions exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findMany.mockResolvedValue([]);

      const result = await versionsService.getVersions('org-123', 'page-123');

      expect(result).toHaveLength(0);
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(versionsService.getVersions('org-123', 'nonexistent')).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });
  });

  // ===========================================
  // GET VERSION
  // ===========================================

  describe('getVersion', () => {
    it('should return a specific version', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(mockVersion);

      const result = await versionsService.getVersion('org-123', 'page-123', 'version-123');

      expect(result?.id).toBe('version-123');
      expect(result?.version).toBe(1);
    });

    it('should return null if version not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(null);

      const result = await versionsService.getVersion('org-123', 'page-123', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(
        versionsService.getVersion('org-123', 'nonexistent', 'version-123')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });
  });

  // ===========================================
  // RESTORE VERSION
  // ===========================================

  describe('restoreVersion', () => {
    it('should restore page to a specific version', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(mockVersion);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        title: mockVersion.title,
        yjsState: mockVersion.yjsState,
      });

      const result = await versionsService.restoreVersion(
        'org-123',
        'page-123',
        'version-123',
        'user-456'
      );

      expect(result.yjsState).toEqual(mockVersion.yjsState);
      expect(mockPrismaPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          title: mockVersion.title,
          yjsState: mockVersion.yjsState,
          updatedById: 'user-456',
        },
      });
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(
        versionsService.restoreVersion('org-123', 'nonexistent', 'version-123', 'user-123')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });

    it('should throw PAGE_IN_TRASH if page is trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      await expect(
        versionsService.restoreVersion('org-123', 'page-123', 'version-123', 'user-123')
      ).rejects.toThrow('PAGE_IN_TRASH');
    });

    it('should throw VERSION_NOT_FOUND if version does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(null);

      await expect(
        versionsService.restoreVersion('org-123', 'page-123', 'nonexistent', 'user-123')
      ).rejects.toThrow('VERSION_NOT_FOUND');
    });
  });
});
