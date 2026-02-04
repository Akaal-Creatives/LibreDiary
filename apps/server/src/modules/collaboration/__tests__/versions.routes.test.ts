import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const {
  mockPrismaPage,
  mockPrismaPageVersion,
  mockPrismaOrganization,
  mockPrismaOrganizationMember,
  mockPrisma,
} = vi.hoisted(() => {
  const mockPrismaPage = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockPrismaPageVersion = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
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
    pageVersion: mockPrismaPageVersion,
    organization: mockPrismaOrganization,
    organizationMember: mockPrismaOrganizationMember,
  };

  return {
    mockPrismaPage,
    mockPrismaPageVersion,
    mockPrismaOrganization,
    mockPrismaOrganizationMember,
    mockPrisma,
  };
});

// Mock modules before any imports
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock the session service to avoid prisma calls
vi.mock('../../../services/session.service.js', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    getSessionByToken: vi.fn(),
    touchSession: vi.fn().mockResolvedValue(undefined),
  };
});

// Import Fastify and plugins directly for test app
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import versionsRoutes from '../versions.routes.js';
import * as sessionService from '../../../services/session.service.js';

function resetMocks() {
  Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaPageVersion).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
}

describe('Versions Routes', () => {
  let app: FastifyInstance;

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yjsState = Buffer.from([1, 2, 3, 4]);

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    deletedAt: null,
    emailVerified: true,
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
    createdBy: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
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

    await app.register(versionsRoutes, {
      prefix: '/api/v1/organizations/:orgId/pages/:pageId/versions',
    });

    await app.ready();
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();

    // Default auth setup - valid session and org access
    vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
    mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
    mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // ===========================================
  // CREATE VERSION
  // ===========================================

  describe('POST /api/v1/organizations/:orgId/pages/:pageId/versions', () => {
    it('should create a new version', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.count.mockResolvedValue(2);
      mockPrismaPageVersion.create.mockResolvedValue({
        ...mockVersion,
        version: 3,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/versions',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.version).toBe(3);
    });

    it('should return 404 if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/versions',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if page is in trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/versions',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/versions',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ===========================================
  // GET VERSIONS
  // ===========================================

  describe('GET /api/v1/organizations/:orgId/pages/:pageId/versions', () => {
    it('should return all versions for a page', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findMany.mockResolvedValue([
        { ...mockVersion, version: 3 },
        { ...mockVersion, version: 2 },
        { ...mockVersion, version: 1 },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(3);
      expect(body[0].version).toBe(3);
    });

    it('should return 404 if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/nonexistent/versions',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // GET VERSION
  // ===========================================

  describe('GET /api/v1/organizations/:orgId/pages/:pageId/versions/:versionId', () => {
    it('should return a specific version', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(mockVersion);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/version-123',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('version-123');
    });

    it('should return 404 if version not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/nonexistent',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/nonexistent/versions/version-123',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // RESTORE VERSION
  // ===========================================

  describe('POST /api/v1/organizations/:orgId/pages/:pageId/versions/:versionId/restore', () => {
    it('should restore page to a specific version', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(mockVersion);
      mockPrismaPage.update.mockResolvedValue({
        ...mockPage,
        title: mockVersion.title,
        yjsState: mockVersion.yjsState,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/version-123/restore',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('page-123');
    });

    it('should return 404 if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/nonexistent/versions/version-123/restore',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if version not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/nonexistent/restore',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if page is in trash', async () => {
      mockPrismaPage.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: now,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/version-123/restore',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
