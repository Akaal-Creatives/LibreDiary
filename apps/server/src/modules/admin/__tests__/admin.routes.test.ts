import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockPrismaUser, mockPrismaSystemSettings, mockPrisma, mockFilesService, mockHocuspocus } =
  vi.hoisted(() => {
    const mockPrismaUser = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };

    const mockPrismaOrganization = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };

    const mockPrismaOrganizationMember = {
      findMany: vi.fn(),
      count: vi.fn(),
    };

    const mockPrismaSystemSettings = {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    };

    const mockPrisma = {
      user: mockPrismaUser,
      organization: mockPrismaOrganization,
      organizationMember: mockPrismaOrganizationMember,
      systemSettings: mockPrismaSystemSettings,
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      page: { count: vi.fn().mockResolvedValue(0) },
      database: { count: vi.fn().mockResolvedValue(0) },
      file: {
        count: vi.fn().mockResolvedValue(0),
        aggregate: vi.fn().mockResolvedValue({ _sum: { size: null } }),
      },
      template: { count: vi.fn().mockResolvedValue(0) },
      backup: { count: vi.fn().mockResolvedValue(0) },
    };

    const mockFilesService = {
      testStorageConnection: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
      getStorageInfo: vi.fn().mockResolvedValue({ type: 'local', totalFiles: 0, totalSize: 0 }),
    };

    const mockHocuspocus = {
      getHocuspocusServer: vi.fn().mockReturnValue({}),
    };

    return {
      mockPrismaUser,
      mockPrismaOrganization,
      mockPrismaOrganizationMember,
      mockPrismaSystemSettings,
      mockPrisma,
      mockFilesService,
      mockHocuspocus,
    };
  });

// Mock modules before any imports
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../files/files.service.js', () => mockFilesService);

vi.mock('../../collaboration/hocuspocus.js', () => mockHocuspocus);

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

describe('Admin Routes', () => {
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

  describe('GET /api/v1/admin/users', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-super-admin users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        cookies: {
          session_token: 'regular-user-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return paginated users for super admin', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          isSuperAdmin: false,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          _count: { memberships: 2 },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          isSuperAdmin: false,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          _count: { memberships: 1 },
        },
      ];

      mockPrismaUser.findMany.mockResolvedValue(mockUsers);
      mockPrismaUser.count.mockResolvedValue(2);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toHaveLength(2);
      expect(body.data.pagination.total).toBe(2);
    });

    it('should support search query', async () => {
      mockPrismaUser.findMany.mockResolvedValue([]);
      mockPrismaUser.count.mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users?search=test',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ name: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  describe('GET /api/v1/admin/users/:userId', () => {
    it('should return 404 for non-existent user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users/non-existent',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return user details with memberships', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        isSuperAdmin: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        memberships: [
          {
            id: 'membership-1',
            role: 'MEMBER',
            organization: {
              id: 'org-1',
              name: 'Org 1',
              slug: 'org-1',
            },
          },
        ],
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users/user-1',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe('user-1');
      expect(body.data.user.memberships).toHaveLength(1);
    });
  });

  describe('PATCH /api/v1/admin/users/:userId', () => {
    it('should update user isSuperAdmin status', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        isSuperAdmin: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaUser.update.mockResolvedValue({
        ...mockUser,
        isSuperAdmin: true,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/users/user-1',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: {
          isSuperAdmin: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.isSuperAdmin).toBe(true);
    });

    it('should not allow super admin to remove their own super admin status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/users/admin-1',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: {
          isSuperAdmin: false,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CANNOT_REMOVE_OWN_ADMIN');
    });
  });

  describe('DELETE /api/v1/admin/users/:userId', () => {
    it('should soft delete a user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        isSuperAdmin: false,
        deletedAt: null,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaUser.update.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/users/user-1',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should not allow super admin to delete themselves', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/users/admin-1',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CANNOT_DELETE_SELF');
    });
  });

  // ============================================
  // SETTINGS
  // ============================================

  const sampleSettings = {
    id: 'system',
    setupCompleted: true,
    setupCompletedAt: new Date('2025-01-01'),
    setupCompletedBy: 'admin-1',
    siteName: 'LibreDiary',
    allowSignups: false,
    requireEmailVerification: true,
    sessionMaxAge: 604800000,
    maxOrganisationsPerUser: 0,
    defaultUserLocale: 'en',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  };

  describe('GET /api/v1/admin/settings', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/settings',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-super-admin users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'regular-user-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return settings for super admin', async () => {
      mockPrismaSystemSettings.findUnique.mockResolvedValue(sampleSettings);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.settings.siteName).toBe('LibreDiary');
      expect(body.data.settings.allowSignups).toBe(false);
      expect(body.data.settings.requireEmailVerification).toBe(true);
      expect(body.data.settings.sessionMaxAge).toBe(604800000);
      expect(body.data.settings.maxOrganisationsPerUser).toBe(0);
      expect(body.data.settings.defaultUserLocale).toBe('en');
      // Should not include setup fields
      expect(body.data.settings).not.toHaveProperty('setupCompleted');
      expect(body.data.settings).not.toHaveProperty('id');
    });

    it('should return 404 when no settings exist', async () => {
      mockPrismaSystemSettings.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SETTINGS_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/admin/settings', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        payload: { siteName: 'New Name' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-super-admin users', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'regular-user-token',
        },
        payload: { siteName: 'New Name' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should update settings with valid data', async () => {
      const updatedSettings = { ...sampleSettings, siteName: 'My Diary' };
      mockPrismaSystemSettings.upsert.mockResolvedValue(updatedSettings);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: { siteName: 'My Diary' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.settings.siteName).toBe('My Diary');
    });

    it('should reject empty siteName', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: { siteName: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject negative sessionMaxAge', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: { sessionMaxAge: -1 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject sessionMaxAge below minimum (5 min)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: { sessionMaxAge: 100000 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject sessionMaxAge above maximum (30 days)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: { sessionMaxAge: 3000000000 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject unknown fields (strict schema)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: { unknownField: 'value' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should trigger audit log on successful update', async () => {
      mockPrismaSystemSettings.upsert.mockResolvedValue(sampleSettings);

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/settings',
        cookies: {
          session_token: 'super-admin-token',
        },
        payload: { allowSignups: true },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADMIN_SETTINGS_UPDATED',
            userId: 'admin-1',
            resourceType: 'system_settings',
          }),
        })
      );
    });
  });

  // ============================================
  // HEALTH
  // ============================================

  describe('GET /api/v1/admin/health', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/health',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-super-admin users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/health',
        cookies: {
          session_token: 'regular-user-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 200 with health object for super admin', async () => {
      mockPrismaUser.count.mockResolvedValue(1);
      mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
      mockHocuspocus.getHocuspocusServer.mockReturnValue({});

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/health',
        cookies: {
          session_token: 'super-admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.health).toBeDefined();
      expect(body.data.health.database).toBeDefined();
      expect(body.data.health.storage).toBeDefined();
      expect(body.data.health.collaboration).toBeDefined();
      expect(body.data.health.server).toBeDefined();
    });
  });
});
