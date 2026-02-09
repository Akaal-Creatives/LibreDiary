import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
    },
  };

  return { mockPrisma };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
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

import { buildApp } from '../../../app.js';

describe('Audit Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // GET /api/v1/admin/audit-logs
  // ===========================================

  describe('GET /api/v1/admin/audit-logs', () => {
    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-super-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs',
        cookies: {
          session_token: 'regular-user-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return paginated audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'AUTH_LOGIN',
          userId: 'admin-1',
          organizationId: null,
          resourceType: null,
          resourceId: null,
          metadata: null,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'admin-1', email: 'admin@example.com', name: 'Super Admin' },
      ]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.logs).toHaveLength(1);
      expect(body.data.pagination.total).toBe(1);
      expect(body.data.pagination.page).toBe(1);
    });

    it('should filter by action query param', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.organization.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs?action=AUTH_LOGIN',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'AUTH_LOGIN',
          }),
        })
      );
    });
  });

  // ===========================================
  // GET /api/v1/admin/audit-logs/actions
  // ===========================================

  describe('GET /api/v1/admin/audit-logs/actions', () => {
    it('should require super admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs/actions',
        cookies: {
          session_token: 'regular-user-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return distinct action types', async () => {
      mockPrisma.auditLog.groupBy.mockResolvedValue([
        { action: 'AUTH_LOGIN' },
        { action: 'PAGE_CREATED' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs/actions',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.actions).toEqual(['AUTH_LOGIN', 'PAGE_CREATED']);
    });
  });
});
