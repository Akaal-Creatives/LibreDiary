import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, resetMocks, mockPage, _now } = vi.hoisted(() => {
  const mockPrismaPage = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  const mockPrisma = {
    page: mockPrismaPage,
  };

  function resetMocks() {
    Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  }

  const now = new Date();

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Test Page',
    htmlContent: '<p>Test content</p>',
    isPublic: true,
    publicSlug: 'test-page-abc123',
    trashedAt: null,
    createdById: 'user-123',
    createdAt: now,
    updatedAt: now,
    createdBy: {
      id: 'user-123',
      name: 'Test Author',
      email: 'author@example.com',
    },
  };

  return { mockPrisma, resetMocks, mockPage, _now: now };
});

// Mock the prisma module BEFORE importing public.service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import service AFTER mocking
import * as publicService from '../public.service.js';

describe('Public Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('getPublicPage', () => {
    it('should return public page by slug', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);

      const result = await publicService.getPublicPage('test-page-abc123');

      expect(result.title).toBe('Test Page');
      expect(result.isPublic).toBe(true);
      expect(mockPrisma.page.findFirst).toHaveBeenCalledWith({
        where: {
          publicSlug: 'test-page-abc123',
          trashedAt: null,
        },
        select: expect.objectContaining({
          id: true,
          title: true,
          htmlContent: true,
          isPublic: true,
          publicSlug: true,
        }),
      });
    });

    it('should throw PAGE_NOT_FOUND for non-existent slug', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(publicService.getPublicPage('nonexistent')).rejects.toThrow('PAGE_NOT_FOUND');
    });

    it('should throw PAGE_NOT_PUBLIC for private page', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({
        ...mockPage,
        isPublic: false,
      });

      await expect(publicService.getPublicPage('private-page')).rejects.toThrow('PAGE_NOT_PUBLIC');
    });
  });

  describe('togglePublicAccess', () => {
    it('should enable public access and generate slug', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        ...mockPage,
        isPublic: false,
        publicSlug: null,
      });
      mockPrisma.page.findFirst.mockResolvedValue(null); // No existing slug
      mockPrisma.page.update.mockResolvedValue({
        ...mockPage,
        isPublic: true,
        publicSlug: 'test-page-abc123',
      });

      const result = await publicService.togglePublicAccess('page-123', true);

      expect(result.isPublic).toBe(true);
      expect(result.publicSlug).toBeTruthy();
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          isPublic: true,
          publicSlug: expect.any(String),
        },
      });
    });

    it('should disable public access and keep slug', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(mockPage);
      mockPrisma.page.update.mockResolvedValue({
        ...mockPage,
        isPublic: false,
      });

      const result = await publicService.togglePublicAccess('page-123', false);

      expect(result.isPublic).toBe(false);
      // Slug is preserved for re-enabling
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          isPublic: false,
        },
      });
    });

    it('should throw PAGE_NOT_FOUND for non-existent page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(publicService.togglePublicAccess('nonexistent', true)).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });
  });

  describe('generatePublicSlug', () => {
    it('should generate a unique slug from title', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null); // No collision

      const slug = await publicService.generatePublicSlug('My Test Page');

      expect(slug).toMatch(/^my-test-page-[a-z0-9]+$/);
    });

    it('should handle special characters in title', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      const slug = await publicService.generatePublicSlug('Hello! @World# 2024');

      expect(slug).toMatch(/^hello-world-2024-[a-z0-9]+$/);
    });

    it('should regenerate slug on collision', async () => {
      // First call returns collision, second call returns null
      mockPrisma.page.findFirst
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);

      const slug = await publicService.generatePublicSlug('Test Page');

      expect(slug).toMatch(/^test-page-[a-z0-9]+$/);
      expect(mockPrisma.page.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
