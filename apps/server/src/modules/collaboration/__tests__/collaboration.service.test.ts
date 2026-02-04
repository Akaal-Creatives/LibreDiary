import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, mockPrismaPage, mockPrismaOrganizationMember } = vi.hoisted(() => {
  const mockPrismaPage = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockPrismaOrganizationMember = {
    findUnique: vi.fn(),
  };

  const mockPrisma = {
    page: mockPrismaPage,
    organizationMember: mockPrismaOrganizationMember,
  };

  return { mockPrisma, mockPrismaPage, mockPrismaOrganizationMember };
});

// Mock the prisma module
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import service after mocking
import * as collaborationService from '../collaboration.service.js';

function resetMocks() {
  Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
}

describe('Collaboration Service', () => {
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
  const yjsState = Buffer.from([1, 2, 3, 4]);

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

  const mockMembership = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-123',
    role: 'MEMBER',
  };

  // ===========================================
  // LOAD DOCUMENT
  // ===========================================

  describe('loadDocument', () => {
    it('should load Yjs state for a page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      const result = await collaborationService.loadDocument('org-123', 'page-123');

      expect(result).toEqual(yjsState);
      expect(mockPrismaPage.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'page-123',
          organizationId: 'org-123',
          trashedAt: null,
        },
        select: {
          yjsState: true,
        },
      });
    });

    it('should return null if page has no Yjs state', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        yjsState: null,
      });

      const result = await collaborationService.loadDocument('org-123', 'page-123');

      expect(result).toBeNull();
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(collaborationService.loadDocument('org-123', 'nonexistent')).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });
  });

  // ===========================================
  // STORE DOCUMENT
  // ===========================================

  describe('storeDocument', () => {
    it('should store Yjs state for a page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        yjsState: yjsState,
      });

      await collaborationService.storeDocument('org-123', 'page-123', yjsState, 'user-123');

      expect(mockPrismaPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          yjsState: yjsState,
          updatedById: 'user-123',
        },
      });
    });

    it('should throw PAGE_NOT_FOUND if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      await expect(
        collaborationService.storeDocument('org-123', 'nonexistent', yjsState, 'user-123')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });

    it('should throw PAGE_IN_TRASH if page is trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      await expect(
        collaborationService.storeDocument('org-123', 'page-123', yjsState, 'user-123')
      ).rejects.toThrow('PAGE_IN_TRASH');
    });
  });

  // ===========================================
  // VALIDATE PAGE ACCESS
  // ===========================================

  describe('validatePageAccess', () => {
    it('should return true if user has access to page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);

      const result = await collaborationService.validatePageAccess('page-123', 'user-123');

      expect(result).toEqual({
        hasAccess: true,
        organizationId: 'org-123',
        pageId: 'page-123',
      });
    });

    it('should return false if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const result = await collaborationService.validatePageAccess('nonexistent', 'user-123');

      expect(result).toEqual({
        hasAccess: false,
        organizationId: null,
        pageId: 'nonexistent',
      });
    });

    it('should return false if page is trashed', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      const result = await collaborationService.validatePageAccess('page-123', 'user-123');

      expect(result).toEqual({
        hasAccess: false,
        organizationId: 'org-123',
        pageId: 'page-123',
      });
    });

    it('should return false if user is not org member', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(null);

      const result = await collaborationService.validatePageAccess('page-123', 'user-456');

      expect(result).toEqual({
        hasAccess: false,
        organizationId: 'org-123',
        pageId: 'page-123',
      });
    });
  });

  // ===========================================
  // GET PAGE INFO
  // ===========================================

  describe('getPageInfo', () => {
    it('should return page title and organization', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      const result = await collaborationService.getPageInfo('page-123');

      expect(result).toEqual({
        id: 'page-123',
        title: 'Test Page',
        organizationId: 'org-123',
      });
    });

    it('should return null if page does not exist', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const result = await collaborationService.getPageInfo('nonexistent');

      expect(result).toBeNull();
    });
  });
});
