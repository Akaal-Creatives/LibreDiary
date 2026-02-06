import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockPagesService, mockPage, mockFavorite, resetMocks } = vi.hoisted(() => {
  const now = new Date();

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    parentId: null,
    title: 'Test Page',
    icon: null,
    coverUrl: null,
    isPublic: false,
    publicSlug: null,
    yjsState: null,
    htmlContent: null,
    position: 0,
    trashedAt: null,
    createdById: 'user-123',
    createdAt: now,
    updatedAt: now,
    lastEditedById: 'user-123',
    lastEditedAt: now,
  };

  const mockFavorite = {
    id: 'fav-123',
    userId: 'user-123',
    pageId: 'page-123',
    position: 0,
    createdAt: now,
    page: mockPage,
  };

  const mockPagesService = {
    createPage: vi.fn(),
    getPageTree: vi.fn(),
    getPage: vi.fn(),
    updatePage: vi.fn(),
    trashPage: vi.fn(),
    movePage: vi.fn(),
    getPageAncestors: vi.fn(),
    duplicatePage: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    restorePage: vi.fn(),
    getTrashedPages: vi.fn(),
    permanentlyDeletePage: vi.fn(),
    getUserFavorites: vi.fn(),
    reorderFavorites: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockPagesService).forEach((mock) => mock.mockReset());
  }

  return { mockPagesService, mockPage, mockFavorite, resetMocks };
});

// Mock modules before any imports
vi.mock('../pages.service.js', () => mockPagesService);

vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(
    async (request: {
      user: { id: string; email: string; name: string };
      sessionToken: string;
    }) => {
      request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      request.sessionToken = 'valid-token';
    }
  ),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(async (request: { organizationId: string }) => {
    request.organizationId = 'org-123';
  }),
}));

// Import Fastify and routes after mocking
import Fastify from 'fastify';
import { pagesRoutes, trashRoutes, favoritesRoutes } from '../pages.routes.js';

describe('Pages Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    // Mock request decorators
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    app.decorateRequest('sessionToken', null);

    await app.register(pagesRoutes, { prefix: '/organizations/:orgId/pages' });
    await app.ready();
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // ===========================================
  // CREATE PAGE
  // ===========================================

  describe('POST /organizations/:orgId/pages', () => {
    it('should create a new page', async () => {
      mockPagesService.createPage.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages',
        payload: { title: 'Test Page' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.page.title).toBe('Test Page');
    });

    it('should create a page with optional fields', async () => {
      mockPagesService.createPage.mockResolvedValue({
        ...mockPage,
        parentId: 'parent-123',
        icon: '📝',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages',
        payload: { title: 'Test Page', parentId: 'parent-123', icon: '📝' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.page.parentId).toBe('parent-123');
      expect(body.data.page.icon).toBe('📝');
    });

    it('should create a page without title', async () => {
      mockPagesService.createPage.mockResolvedValue({
        ...mockPage,
        title: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
    });

    it('should return 400 for title exceeding max length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages',
        payload: { title: 'a'.repeat(256) },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ===========================================
  // GET PAGE TREE
  // ===========================================

  describe('GET /organizations/:orgId/pages', () => {
    it('should return page tree', async () => {
      mockPagesService.getPageTree.mockResolvedValue([mockPage]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.pages).toHaveLength(1);
    });

    it('should return empty array when no pages', async () => {
      mockPagesService.getPageTree.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pages).toEqual([]);
    });
  });

  // ===========================================
  // GET SINGLE PAGE
  // ===========================================

  describe('GET /organizations/:orgId/pages/:pageId', () => {
    it('should return a page', async () => {
      mockPagesService.getPage.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages/page-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.page.id).toBe('page-123');
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.getPage.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('PAGE_NOT_FOUND');
    });
  });

  // ===========================================
  // UPDATE PAGE
  // ===========================================

  describe('PATCH /organizations/:orgId/pages/:pageId', () => {
    it('should update page title', async () => {
      mockPagesService.updatePage.mockResolvedValue({
        ...mockPage,
        title: 'Updated Title',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/pages/page-123',
        payload: { title: 'Updated Title' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page.title).toBe('Updated Title');
    });

    it('should update page public settings', async () => {
      mockPagesService.updatePage.mockResolvedValue({
        ...mockPage,
        isPublic: true,
        publicSlug: 'my-public-page',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/pages/page-123',
        payload: { isPublic: true, publicSlug: 'my-public-page' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page.isPublic).toBe(true);
      expect(body.data.page.publicSlug).toBe('my-public-page');
    });

    it('should return 400 for invalid slug format', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/pages/page-123',
        payload: { publicSlug: 'INVALID_SLUG!' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.updatePage.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/pages/nonexistent',
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for duplicate slug', async () => {
      mockPagesService.updatePage.mockRejectedValue(new Error('SLUG_ALREADY_EXISTS'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/pages/page-123',
        payload: { publicSlug: 'existing-slug' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('SLUG_ALREADY_EXISTS');
    });
  });

  // ===========================================
  // DELETE (TRASH) PAGE
  // ===========================================

  describe('DELETE /organizations/:orgId/pages/:pageId', () => {
    it('should trash a page', async () => {
      mockPagesService.trashPage.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/pages/page-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('trash');
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.trashPage.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/pages/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if page already in trash', async () => {
      mockPagesService.trashPage.mockRejectedValue(new Error('PAGE_ALREADY_IN_TRASH'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/pages/page-123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('PAGE_ALREADY_IN_TRASH');
    });
  });

  // ===========================================
  // MOVE PAGE
  // ===========================================

  describe('POST /organizations/:orgId/pages/:pageId/move', () => {
    it('should move page to new parent', async () => {
      mockPagesService.movePage.mockResolvedValue({
        ...mockPage,
        parentId: 'new-parent-123',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/move',
        payload: { parentId: 'new-parent-123' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page.parentId).toBe('new-parent-123');
    });

    it('should move page to root', async () => {
      mockPagesService.movePage.mockResolvedValue({
        ...mockPage,
        parentId: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/move',
        payload: { parentId: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page.parentId).toBeNull();
    });

    it('should move page to specific position', async () => {
      mockPagesService.movePage.mockResolvedValue({
        ...mockPage,
        position: 5,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/move',
        payload: { position: 5 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for invalid parent', async () => {
      mockPagesService.movePage.mockRejectedValue(new Error('INVALID_PARENT'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/move',
        payload: { parentId: 'page-123' }, // Self-reference
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PARENT');
    });

    it('should return 400 for negative position', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/move',
        payload: { position: -1 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // GET PAGE ANCESTORS
  // ===========================================

  describe('GET /organizations/:orgId/pages/:pageId/ancestors', () => {
    it('should return page ancestors', async () => {
      const ancestors = [
        { id: 'grandparent', title: 'Grandparent' },
        { id: 'parent', title: 'Parent' },
      ];
      mockPagesService.getPageAncestors.mockResolvedValue(ancestors);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages/page-123/ancestors',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.ancestors).toHaveLength(2);
    });

    it('should return empty array for root page', async () => {
      mockPagesService.getPageAncestors.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages/page-123/ancestors',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.ancestors).toEqual([]);
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.getPageAncestors.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages/nonexistent/ancestors',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // DUPLICATE PAGE
  // ===========================================

  describe('POST /organizations/:orgId/pages/:pageId/duplicate', () => {
    it('should duplicate a page', async () => {
      mockPagesService.duplicatePage.mockResolvedValue({
        ...mockPage,
        id: 'page-456',
        title: 'Test Page (Copy)',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/duplicate',
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.page.id).toBe('page-456');
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.duplicatePage.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/nonexistent/duplicate',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if page is in trash', async () => {
      mockPagesService.duplicatePage.mockRejectedValue(new Error('PAGE_IN_TRASH'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/duplicate',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // ADD FAVORITE
  // ===========================================

  describe('POST /organizations/:orgId/pages/:pageId/favorite', () => {
    it('should add page to favorites', async () => {
      mockPagesService.addFavorite.mockResolvedValue(mockFavorite);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/favorite',
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.favorite.pageId).toBe('page-123');
    });

    it('should return 400 if already favorited', async () => {
      mockPagesService.addFavorite.mockRejectedValue(new Error('FAVORITE_EXISTS'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/favorite',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('FAVORITE_EXISTS');
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.addFavorite.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/nonexistent/favorite',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // REMOVE FAVORITE
  // ===========================================

  describe('DELETE /organizations/:orgId/pages/:pageId/favorite', () => {
    it('should remove page from favorites', async () => {
      mockPagesService.removeFavorite.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/pages/page-123/favorite',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 if not favorited', async () => {
      mockPagesService.removeFavorite.mockRejectedValue(new Error('FAVORITE_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/pages/page-123/favorite',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // RESTORE PAGE
  // ===========================================

  describe('POST /organizations/:orgId/pages/:pageId/restore', () => {
    it('should restore page from trash', async () => {
      mockPagesService.restorePage.mockResolvedValue({
        ...mockPage,
        trashedAt: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/restore',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.restorePage.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/nonexistent/restore',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if page not in trash', async () => {
      mockPagesService.restorePage.mockRejectedValue(new Error('PAGE_NOT_IN_TRASH'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/restore',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ===========================================
// TRASH ROUTES
// ===========================================

describe('Trash Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    app.decorateRequest('sessionToken', null);

    await app.register(trashRoutes, { prefix: '/organizations/:orgId/trash' });
    await app.ready();
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /organizations/:orgId/trash', () => {
    it('should return trashed pages', async () => {
      mockPagesService.getTrashedPages.mockResolvedValue([{ ...mockPage, trashedAt: new Date() }]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/trash',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pages).toHaveLength(1);
    });

    it('should return empty array when no trashed pages', async () => {
      mockPagesService.getTrashedPages.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/trash',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pages).toEqual([]);
    });
  });

  describe('DELETE /organizations/:orgId/trash/:pageId', () => {
    it('should permanently delete a page', async () => {
      mockPagesService.permanentlyDeletePage.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/trash/page-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.message).toContain('permanently deleted');
    });

    it('should return 404 for non-existent page', async () => {
      mockPagesService.permanentlyDeletePage.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/trash/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if page not in trash', async () => {
      mockPagesService.permanentlyDeletePage.mockRejectedValue(new Error('PAGE_NOT_IN_TRASH'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/trash/page-123',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ===========================================
// FAVORITES ROUTES
// ===========================================

describe('Favorites Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    app.decorateRequest('sessionToken', null);

    await app.register(favoritesRoutes, { prefix: '/organizations/:orgId/favorites' });
    await app.ready();
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /organizations/:orgId/favorites', () => {
    it('should return user favorites', async () => {
      mockPagesService.getUserFavorites.mockResolvedValue([mockFavorite]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/favorites',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.favorites).toHaveLength(1);
    });

    it('should return empty array when no favorites', async () => {
      mockPagesService.getUserFavorites.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/favorites',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.favorites).toEqual([]);
    });
  });

  describe('PATCH /organizations/:orgId/favorites/reorder', () => {
    it('should reorder favorites', async () => {
      mockPagesService.reorderFavorites.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/favorites/reorder',
        payload: { orderedIds: ['page-1', 'page-2', 'page-3'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 for empty orderedIds', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/favorites/reorder',
        payload: { orderedIds: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing orderedIds', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/favorites/reorder',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
