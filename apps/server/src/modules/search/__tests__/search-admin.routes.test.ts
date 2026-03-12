import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted for mock setup
const { mockPrisma, mockSearchAdminService } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    organization: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    organizationMember: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    systemSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    page: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    database: { count: vi.fn().mockResolvedValue(0) },
    file: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { size: null } }),
    },
    template: { count: vi.fn().mockResolvedValue(0) },
    backup: { count: vi.fn().mockResolvedValue(0) },
  };

  const mockSearchAdminService = {
    triggerReindex: vi.fn().mockResolvedValue({ totalIndexed: 100, durationMs: 1500 }),
    getReindexStatus: vi.fn().mockReturnValue({ running: false, progress: null }),
  };

  return { mockPrisma, mockSearchAdminService };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../search-admin.service.js', () => mockSearchAdminService);

vi.mock('../../files/files.service.js', () => ({
  testStorageConnection: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
  getStorageInfo: vi.fn().mockResolvedValue({ type: 'local', totalFiles: 0, totalSize: 0 }),
}));

vi.mock('../../collaboration/hocuspocus.js', () => ({
  getHocuspocusServer: vi.fn().mockReturnValue({}),
}));

vi.mock('../../ai/ai.service.js', () => ({
  testConnection: vi.fn().mockResolvedValue({ success: true }),
  maskApiKey: vi.fn((key: string) => `****${key.substring(key.length - 4)}`),
}));

vi.mock('../../../services/session.service.js', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    getSessionByToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'super-admin-token') {
        return {
          id: 'session-1',
          userId: 'admin-1',
          token: 'super-admin-token',
          expiresAt: new Date(Date.now() + 86400000),
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            isSuperAdmin: true,
            emailVerified: true,
            name: 'Super Admin',
            deletedAt: null,
          },
        };
      }
      if (token === 'regular-user-token') {
        return {
          id: 'session-2',
          userId: 'user-1',
          token: 'regular-user-token',
          expiresAt: new Date(Date.now() + 86400000),
          user: {
            id: 'user-1',
            email: 'user@example.com',
            isSuperAdmin: false,
            emailVerified: true,
            name: 'Regular User',
            deletedAt: null,
          },
        };
      }
      return null;
    }),
    touchSession: vi.fn().mockResolvedValue(undefined),
  };
});

// Import app after mocks
import { buildApp } from '../../../app.js';

describe('Search Admin Routes', () => {
  let app: FastifyInstance;
  let csrfToken: string;

  async function getCsrfToken(): Promise<string> {
    const res = await app.inject({ method: 'GET', url: '/health' });
    const csrfCookie = res.cookies.find((c) => c.name === 'csrf_token');
    return csrfCookie?.value ?? '';
  }

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    csrfToken = await getCsrfToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchAdminService.triggerReindex.mockResolvedValue({
      totalIndexed: 100,
      durationMs: 1500,
    });
    mockSearchAdminService.getReindexStatus.mockReturnValue({
      running: false,
      progress: null,
    });
  });

  describe('POST /api/v1/admin/search/reindex', () => {
    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/search/reindex',
        headers: {
          cookie: `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for non-super-admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/search/reindex',
        cookies: { session_token: 'regular-user-token' },
        headers: {
          cookie: `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 and triggers reindex for super admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/search/reindex',
        cookies: { session_token: 'super-admin-token' },
        headers: {
          cookie: `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.totalIndexed).toBe(100);
      expect(body.data.durationMs).toBe(1500);
      expect(mockSearchAdminService.triggerReindex).toHaveBeenCalled();
    });

    it('returns 409 when already in progress', async () => {
      mockSearchAdminService.triggerReindex.mockRejectedValueOnce(new Error('REINDEX_IN_PROGRESS'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/search/reindex',
        cookies: { session_token: 'super-admin-token' },
        headers: {
          cookie: `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('REINDEX_IN_PROGRESS');
    });
  });

  describe('GET /api/v1/admin/search/reindex/status', () => {
    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/search/reindex/status',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for non-super-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/search/reindex/status',
        cookies: { session_token: 'regular-user-token' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with status for super admin', async () => {
      mockSearchAdminService.getReindexStatus.mockReturnValue({
        running: true,
        progress: { processed: 50, total: 200 },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/search/reindex/status',
        cookies: { session_token: 'super-admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.running).toBe(true);
      expect(body.data.progress).toEqual({ processed: 50, total: 200 });
    });
  });
});
