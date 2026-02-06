import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock services using vi.hoisted
const { mockPublicService, mockPermissionsService, mockPublicPage, mockSharedPage, resetMocks } =
  vi.hoisted(() => {
    const mockPublicService = {
      getPublicPage: vi.fn(),
      togglePublicAccess: vi.fn(),
      generatePublicSlug: vi.fn(),
      getPageByShareToken: vi.fn(),
    };

    const mockPermissionsService = {
      validateShareToken: vi.fn(),
    };

    const mockPublicPage = {
      id: 'page-123',
      organizationId: 'org-123',
      title: 'Public Test Page',
      htmlContent: '<p>Hello World</p>',
      isPublic: true,
      publicSlug: 'public-test-page-abc123',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: 'user-123',
        name: 'Test Author',
      },
    };

    const mockSharedPage = {
      id: 'page-456',
      organizationId: 'org-123',
      title: 'Shared Page',
      htmlContent: '<p>Shared content</p>',
      icon: '📝',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: 'user-123',
        name: 'Test Author',
      },
      permission: {
        level: 'VIEW',
        expiresAt: null,
      },
    };

    function resetMocks() {
      Object.values(mockPublicService).forEach((mock) => mock.mockReset());
      Object.values(mockPermissionsService).forEach((mock) => mock.mockReset());
    }

    return {
      mockPublicService,
      mockPermissionsService,
      mockPublicPage,
      mockSharedPage,
      resetMocks,
    };
  });

// Mock the services
vi.mock('../public.service.js', () => mockPublicService);
vi.mock('../../permissions/permissions.service.js', () => mockPermissionsService);

// Import after mocking
import Fastify from 'fastify';
import publicRoutes from '../public.routes.js';

describe('Public Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    await app.register(publicRoutes, { prefix: '/public/pages' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /public/pages/:slug', () => {
    it('should return public page by slug', async () => {
      mockPublicService.getPublicPage.mockResolvedValue(mockPublicPage);

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/public-test-page-abc123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.page.title).toBe('Public Test Page');
      expect(body.data.page.publicSlug).toBe('public-test-page-abc123');
    });

    it('should return 404 for non-existent slug', async () => {
      mockPublicService.getPublicPage.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/nonexistent-slug',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PAGE_NOT_FOUND');
    });

    it('should return 403 for non-public page', async () => {
      mockPublicService.getPublicPage.mockRejectedValue(new Error('PAGE_NOT_PUBLIC'));

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/private-page-slug',
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PAGE_NOT_PUBLIC');
    });
  });

  describe('GET /public/share/:token', () => {
    it('should return shared page for valid token', async () => {
      mockPublicService.getPageByShareToken.mockResolvedValue(mockSharedPage);

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/share/valid-token-abc123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.page.title).toBe('Shared Page');
      expect(body.data.page.permission.level).toBe('VIEW');
    });

    it('should return page with EDIT permission level', async () => {
      mockPublicService.getPageByShareToken.mockResolvedValue({
        ...mockSharedPage,
        permission: { level: 'EDIT', expiresAt: null },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/share/edit-token-abc123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.page.permission.level).toBe('EDIT');
    });

    it('should return 404 for invalid token', async () => {
      mockPublicService.getPageByShareToken.mockRejectedValue(new Error('INVALID_SHARE_TOKEN'));

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/share/invalid-token',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_SHARE_TOKEN');
    });

    it('should return 410 for expired token', async () => {
      mockPublicService.getPageByShareToken.mockRejectedValue(new Error('SHARE_TOKEN_EXPIRED'));

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/share/expired-token',
      });

      expect(response.statusCode).toBe(410);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SHARE_TOKEN_EXPIRED');
    });

    it('should return 404 for trashed page', async () => {
      mockPublicService.getPageByShareToken.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/public/pages/share/trashed-page-token',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PAGE_NOT_FOUND');
    });
  });
});
