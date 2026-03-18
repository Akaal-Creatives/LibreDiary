import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

const {
  mockPrismaPage,
  mockPrismaPageVersion,
  mockPrismaOrganization,
  mockPrismaOrganizationMember,
  mockPrisma,
  mockYjsStateToText,
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
    mockYjsStateToText: vi.fn(),
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../utils/yjs-to-text.js', () => ({
  yjsStateToText: mockYjsStateToText,
}));

vi.mock('../../../services/session.service.js', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    getSessionByToken: vi.fn(),
    touchSession: vi.fn().mockResolvedValue(undefined),
  };
});

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import versionsRoutes from '../versions.routes.js';
import * as sessionService from '../../../services/session.service.js';

describe('Version Diff Routes', () => {
  let app: FastifyInstance;

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yjsStateA = Buffer.from([1, 2, 3]);
  const yjsStateB = Buffer.from([4, 5, 6]);

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
    title: 'Current Title',
    yjsState: Buffer.from([7, 8, 9]),
    trashedAt: null,
    createdById: 'user-123',
    createdAt: now,
    updatedAt: now,
  };

  const mockVersionA = {
    id: 'version-1',
    pageId: 'page-123',
    version: 1,
    title: 'Version One',
    yjsState: yjsStateA,
    createdById: 'user-123',
    createdAt: new Date('2024-01-01'),
  };

  const mockVersionB = {
    id: 'version-2',
    pageId: 'page-123',
    version: 2,
    title: 'Version Two',
    yjsState: yjsStateB,
    createdById: 'user-123',
    createdAt: new Date('2024-01-02'),
  };

  const mockSessionWithUser = {
    id: 'session-123',
    userId: 'user-123',
    token: 'valid-token',
    expiresAt: futureDate,
    lastActiveAt: now,
    user: mockUser,
  };

  function resetMocks() {
    Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaPageVersion).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
    mockYjsStateToText.mockReset();
  }

  beforeAll(async () => {
    app = Fastify({ logger: false });
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
    vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
    mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
    mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // ===========================================
  // GET VERSION DIFF
  // ===========================================

  describe('GET /api/v1/organizations/:orgId/pages/:pageId/versions/:versionId/diff', () => {
    it('should return diff between two versions', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst
        .mockResolvedValueOnce(mockVersionA)
        .mockResolvedValueOnce(mockVersionB);
      mockYjsStateToText.mockReturnValue('some content');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/version-1/diff?compareWith=version-2',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.from).toBeDefined();
      expect(body.data.to).toBeDefined();
      expect(body.data.changes).toBeDefined();
      expect(body.data.stats).toBeDefined();
    });

    it('should return 400 when compareWith is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/version-1/diff',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should support compareWith=current', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValueOnce(mockVersionA);
      mockYjsStateToText.mockReturnValue('content');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/version-1/diff?compareWith=current',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.to.versionId).toBe('current');
    });

    it('should return 404 if page not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/nonexistent/versions/version-1/diff?compareWith=version-2',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if version not found', async () => {
      mockPrismaPage.findFirst.mockResolvedValue(mockPage);
      mockPrismaPageVersion.findFirst.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/nonexistent/diff?compareWith=version-2',
        cookies: { session_token: 'valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/pages/page-123/versions/version-1/diff?compareWith=version-2',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
