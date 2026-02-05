import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock services using vi.hoisted
const { mockPublicService, mockPublicPage, resetMocks } = vi.hoisted(() => {
  const mockPublicService = {
    getPublicPage: vi.fn(),
    togglePublicAccess: vi.fn(),
    generatePublicSlug: vi.fn(),
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

  function resetMocks() {
    Object.values(mockPublicService).forEach((mock) => mock.mockReset());
  }

  return { mockPublicService, mockPublicPage, resetMocks };
});

// Mock the services
vi.mock('../public.service.js', () => mockPublicService);

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
});
