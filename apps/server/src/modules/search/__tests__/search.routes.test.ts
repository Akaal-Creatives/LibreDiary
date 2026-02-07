import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(async (request: { organizationId: string }) => {
    request.organizationId = 'org-123';
  }),
}));

// Mock services using vi.hoisted
const { mockSearchService, resetMocks } = vi.hoisted(() => {
  const mockSearchService = {
    searchPages: vi.fn(),
    parseSearchQuery: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockSearchService).forEach((mock) => mock.mockReset());
  }

  return { mockSearchService, resetMocks };
});

vi.mock('../search.service.js', () => mockSearchService);

// Import after mocking
import Fastify from 'fastify';
import searchRoutes from '../search.routes.js';

describe('Search Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(searchRoutes, { prefix: '/organizations/:orgId/search' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  describe('GET /organizations/:orgId/search', () => {
    const mockResults = {
      results: [
        {
          id: 'page-1',
          title: 'Test Page',
          icon: null,
          createdById: 'user-1',
          createdByName: 'Test User',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          titleHighlight: '<mark>Test</mark> Page',
          contentHighlight: 'Some <mark>test</mark> content...',
          rank: 0.5,
        },
      ],
      total: 1,
    };

    it('should return search results for a valid query', async () => {
      mockSearchService.searchPages.mockResolvedValue(mockResults);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.results).toHaveLength(1);
      expect(body.data.total).toBe(1);
      expect(body.data.query).toBe('test');
    });

    it('should pass all query parameters to the service', async () => {
      mockSearchService.searchPages.mockResolvedValue({ results: [], total: 0 });

      await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=hello&limit=10&offset=5&dateFrom=2024-01-01&dateTo=2024-12-31&createdById=user-456',
      });

      expect(mockSearchService.searchPages).toHaveBeenCalledWith({
        query: 'hello',
        organizationId: 'org-123',
        limit: 10,
        offset: 5,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        createdById: 'user-456',
      });
    });

    it('should use default limit and offset', async () => {
      mockSearchService.searchPages.mockResolvedValue({ results: [], total: 0 });

      await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=test',
      });

      expect(mockSearchService.searchPages).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 0,
        })
      );
    });

    it('should return 400 when query is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when query is empty', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when limit exceeds maximum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=test&limit=100',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=test&dateFrom=01-01-2024',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 500 when service throws unexpected error', async () => {
      mockSearchService.searchPages.mockRejectedValue(new Error('DB_CONNECTION_FAILED'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=test',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should map result fields correctly', async () => {
      mockSearchService.searchPages.mockResolvedValue(mockResults);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=test',
      });

      const body = JSON.parse(response.body);
      const result = body.data.results[0];
      expect(result.id).toBe('page-1');
      expect(result.title).toBe('Test Page');
      expect(result.titleHighlight).toBe('<mark>Test</mark> Page');
      expect(result.contentHighlight).toBe('Some <mark>test</mark> content...');
      expect(result.icon).toBeNull();
      expect(result.createdById).toBe('user-1');
      expect(result.createdByName).toBe('Test User');
      expect(result.rank).toBe(0.5);
    });

    it('should return empty results when no matches found', async () => {
      mockSearchService.searchPages.mockResolvedValue({ results: [], total: 0 });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/search?q=nonexistent',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.results).toHaveLength(0);
      expect(body.data.total).toBe(0);
    });
  });
});
