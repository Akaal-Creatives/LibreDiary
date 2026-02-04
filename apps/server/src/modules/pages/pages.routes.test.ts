import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const {
  mockPrismaPage,
  mockPrismaFavorite,
  mockPrismaOrganization,
  mockPrismaOrganizationMember,
  mockPrisma,
} = vi.hoisted(() => {
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
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };

  const mockPrismaOrganizationMember = {
    findUnique: vi.fn(),
  };

  const mockPrisma = {
    page: mockPrismaPage,
    favorite: mockPrismaFavorite,
    organization: mockPrismaOrganization,
    organizationMember: mockPrismaOrganizationMember,
    $transaction: vi.fn(),
  };

  return {
    mockPrismaPage,
    mockPrismaFavorite,
    mockPrismaOrganization,
    mockPrismaOrganizationMember,
    mockPrisma,
  };
});

// Mock modules before any imports
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock the session service to avoid prisma calls
vi.mock('../../services/session.service.js', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    createSession: vi.fn().mockImplementation(async (opts) => ({
      id: 'mock-session-id',
      userId: opts.userId,
      token: 'mock-session-token',
      userAgent: opts.userAgent ?? null,
      ipAddress: opts.ipAddress ?? null,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })),
    getSessionByToken: vi.fn(),
    touchSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    deleteSessionByToken: vi.fn().mockResolvedValue(undefined),
    getUserSessions: vi.fn().mockResolvedValue([]),
  };
});

// Import Fastify and plugins directly for test app
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { pagesRoutes, trashRoutes, favoritesRoutes } from './pages.routes.js';
import * as sessionService from '../../services/session.service.js';

function resetMocks() {
  Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaFavorite).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
}

describe('Page Routes', () => {
  let app: FastifyInstance;

  // Test data
  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    deletedAt: null,
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    deletedAt: null,
  };

  const mockMembership = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-123',
    role: 'MEMBER',
  };

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    parentId: null,
    position: 0,
    title: 'Test Page',
    icon: null,
    coverUrl: null,
    yjsState: null,
    isPublic: false,
    publicSlug: null,
    trashedAt: null,
    createdById: 'user-123',
    updatedById: null,
    createdAt: now,
    updatedAt: now,
  };

  const mockFavorite = {
    id: 'fav-123',
    userId: 'user-123',
    pageId: 'page-123',
    position: 0,
    createdAt: now,
  };

  const mockSessionWithUser = {
    id: 'session-123',
    userId: 'user-123',
    token: 'valid-token',
    expiresAt: futureDate,
    lastActiveAt: now,
    user: mockUser,
  };

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    await app.register(cookie, {
      secret: 'test-secret-key-must-be-at-least-32-characters',
    });

    await app.register(pagesRoutes, { prefix: '/api/v1/organizations/:orgId/pages' });
    await app.register(trashRoutes, { prefix: '/api/v1/organizations/:orgId/trash' });
    await app.register(favoritesRoutes, { prefix: '/api/v1/organizations/:orgId/favorites' });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks();
    // Default: user is authenticated and has org access
    vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
    mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
    mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
  });

  // ===========================================
  // PAGE CRUD
  // ===========================================

  describe('POST /api/v1/organizations/:orgId/pages', () => {
    it('should create page successfully', async () => {
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: -1 } });
      mockPrismaPage.create.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages',
        headers: { cookie: 'session_token=valid-token' },
        payload: { title: 'Test Page' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.page.title).toBe('Test Page');
    });

    it('should create page with parent', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.create.mockResolvedValue({
        ...mockPage,
        id: 'page-456',
        parentId: 'page-123',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages',
        headers: { cookie: 'session_token=valid-token' },
        payload: { title: 'Child Page', parentId: 'page-123' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.page.parentId).toBe('page-123');
    });

    it('should return 401 without authentication', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages',
        payload: { title: 'Test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-member', async () => {
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages',
        headers: { cookie: 'session_token=valid-token' },
        payload: { title: 'Test' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/organizations/:orgId/pages', () => {
    it('should return page tree', async () => {
      mockPrismaPage.findMany.mockResolvedValue([mockPage]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.pages).toHaveLength(1);
    });
  });

  describe('GET /api/v1/organizations/:orgId/pages/:pageId', () => {
    it('should return single page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page.id).toBe('page-123');
    });

    it('should return 404 for non-existent page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/nonexistent',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/organizations/:orgId/pages/:pageId', () => {
    it('should update page title', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        title: 'Updated Title',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123/pages/page-123',
        headers: { cookie: 'session_token=valid-token' },
        payload: { title: 'Updated Title' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page.title).toBe('Updated Title');
    });

    it('should return 400 for trashed page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123/pages/page-123',
        headers: { cookie: 'session_token=valid-token' },
        payload: { title: 'Updated Title' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('PAGE_IN_TRASH');
    });
  });

  describe('DELETE /api/v1/organizations/:orgId/pages/:pageId', () => {
    it('should trash page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.findMany.mockResolvedValue([]);
      mockPrismaPage.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/pages/page-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.message).toBe('Page moved to trash');
    });
  });

  // ===========================================
  // HIERARCHY
  // ===========================================

  describe('POST /api/v1/organizations/:orgId/pages/:pageId/move', () => {
    it('should move page to root', async () => {
      const childPage = { ...mockPage, id: 'page-456', parentId: 'page-123' };
      mockPrismaPage.findFirst.mockResolvedValue(childPage);
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.update.mockResolvedValue({
        ...childPage,
        parentId: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-456/move',
        headers: { cookie: 'session_token=valid-token' },
        payload: { parentId: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.page.parentId).toBeNull();
    });

    it('should return 400 for invalid parent', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/move',
        headers: { cookie: 'session_token=valid-token' },
        payload: { parentId: 'page-123' }, // Self-reference
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PARENT');
    });
  });

  describe('GET /api/v1/organizations/:orgId/pages/:pageId/ancestors', () => {
    it('should return ancestors', async () => {
      const grandparent = { ...mockPage, id: 'grandparent', parentId: null };
      const parent = { ...mockPage, id: 'parent', parentId: 'grandparent' };
      const child = { ...mockPage, id: 'child', parentId: 'parent' };

      mockPrismaPage.findFirst
        .mockResolvedValueOnce(child)
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(grandparent);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/child/ancestors',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.ancestors).toHaveLength(2);
    });
  });

  describe('POST /api/v1/organizations/:orgId/pages/:pageId/duplicate', () => {
    it('should duplicate page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.create.mockResolvedValue({
        ...mockPage,
        id: 'page-copy',
        title: 'Test Page (copy)',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/duplicate',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.page.title).toBe('Test Page (copy)');
    });
  });

  // ===========================================
  // FAVORITES
  // ===========================================

  describe('POST /api/v1/organizations/:orgId/pages/:pageId/favorite', () => {
    it('should add page to favorites', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaFavorite.findUnique.mockResolvedValue(null);
      mockPrismaFavorite.aggregate.mockResolvedValue({ _max: { position: -1 } });
      mockPrismaFavorite.create.mockResolvedValue(mockFavorite);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/favorite',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.favorite.pageId).toBe('page-123');
    });

    it('should return 400 if already favorited', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaFavorite.findUnique.mockResolvedValue(mockFavorite);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/favorite',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('FAVORITE_EXISTS');
    });
  });

  describe('DELETE /api/v1/organizations/:orgId/pages/:pageId/favorite', () => {
    it('should remove from favorites', async () => {
      mockPrismaFavorite.findUnique.mockResolvedValue(mockFavorite);
      mockPrismaFavorite.delete.mockResolvedValue({});

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/pages/page-123/favorite',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if not in favorites', async () => {
      mockPrismaFavorite.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/pages/page-123/favorite',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('FAVORITE_NOT_FOUND');
    });
  });

  describe('POST /api/v1/organizations/:orgId/pages/:pageId/restore', () => {
    it('should restore page from trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });
      mockPrismaPage.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrismaPage.update.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/restore',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if page not in trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/restore',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('PAGE_NOT_IN_TRASH');
    });
  });
});

describe('Trash Routes', () => {
  let app: FastifyInstance;

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    deletedAt: null,
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    deletedAt: null,
  };

  const mockMembership = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-123',
    role: 'MEMBER',
  };

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Test Page',
    trashedAt: now,
  };

  const mockSessionWithUser = {
    id: 'session-123',
    userId: 'user-123',
    token: 'valid-token',
    expiresAt: futureDate,
    user: mockUser,
  };

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(cookie, {
      secret: 'test-secret-key-must-be-at-least-32-characters',
    });
    await app.register(trashRoutes, { prefix: '/api/v1/organizations/:orgId/trash' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks();
    vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
    mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
    mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
  });

  describe('GET /api/v1/organizations/:orgId/trash', () => {
    it('should list trashed pages', async () => {
      mockPrismaPage.findMany.mockResolvedValue([mockPage]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/trash',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pages).toHaveLength(1);
    });
  });

  describe('DELETE /api/v1/organizations/:orgId/trash/:pageId', () => {
    it('should permanently delete page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPage.delete.mockResolvedValue({});

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/trash/page-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.message).toBe('Page permanently deleted');
    });

    it('should return 400 if page not in trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: null,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/trash/page-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

describe('Favorites Routes', () => {
  let app: FastifyInstance;

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    deletedAt: null,
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    deletedAt: null,
  };

  const mockMembership = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-123',
    role: 'MEMBER',
  };

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Test Page',
    trashedAt: null,
  };

  const mockFavorite = {
    id: 'fav-123',
    userId: 'user-123',
    pageId: 'page-123',
    position: 0,
    page: mockPage,
  };

  const mockSessionWithUser = {
    id: 'session-123',
    userId: 'user-123',
    token: 'valid-token',
    expiresAt: futureDate,
    user: mockUser,
  };

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(cookie, {
      secret: 'test-secret-key-must-be-at-least-32-characters',
    });
    await app.register(favoritesRoutes, { prefix: '/api/v1/organizations/:orgId/favorites' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks();
    vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
    mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
    mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
  });

  describe('GET /api/v1/organizations/:orgId/favorites', () => {
    it('should list user favorites', async () => {
      mockPrismaFavorite.findMany.mockResolvedValue([mockFavorite]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/favorites',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.favorites).toHaveLength(1);
    });
  });

  describe('PATCH /api/v1/organizations/:orgId/favorites/reorder', () => {
    it('should reorder favorites', async () => {
      mockPrismaFavorite.findMany.mockResolvedValue([{ id: 'fav-1' }, { id: 'fav-2' }]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123/favorites/reorder',
        headers: { cookie: 'session_token=valid-token' },
        payload: { orderedIds: ['fav-2', 'fav-1'] },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for empty orderedIds', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123/favorites/reorder',
        headers: { cookie: 'session_token=valid-token' },
        payload: { orderedIds: [] },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
