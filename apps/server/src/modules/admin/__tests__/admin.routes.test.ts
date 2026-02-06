import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockPrismaUser, mockPrisma } = vi.hoisted(() => {
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

  const mockPrisma = {
    user: mockPrismaUser,
    organization: mockPrismaOrganization,
    organizationMember: mockPrismaOrganizationMember,
  };

  return {
    mockPrismaUser,
    mockPrismaOrganization,
    mockPrismaOrganizationMember,
    mockPrisma,
  };
});

// Mock modules before any imports
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
});
