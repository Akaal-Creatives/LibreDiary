import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { requireSuperAdmin } from '../admin.middleware.js';

describe('Admin Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let sendMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ send: sendMock });

    mockRequest = {};
    mockReply = {
      status: statusMock,
    };
  });

  describe('requireSuperAdmin', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await requireSuperAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    it('should return 403 if user is not a super admin', async () => {
      mockRequest.user = {
        id: 'user-1',
        email: 'user@example.com',
        isSuperAdmin: false,
        emailVerified: true,
        emailVerifiedAt: null,
        passwordHash: 'hash',
        name: 'User',
        avatarUrl: null,
        locale: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      await requireSuperAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Super admin access required',
        },
      });
    });

    it('should allow access for super admin user', async () => {
      mockRequest.user = {
        id: 'admin-1',
        email: 'admin@example.com',
        isSuperAdmin: true,
        emailVerified: true,
        emailVerifiedAt: null,
        passwordHash: 'hash',
        name: 'Admin',
        avatarUrl: null,
        locale: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      await requireSuperAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Should not call status/send if access is allowed
      expect(statusMock).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    });

    it('should return 403 for deleted super admin user', async () => {
      mockRequest.user = {
        id: 'admin-1',
        email: 'admin@example.com',
        isSuperAdmin: true,
        emailVerified: true,
        emailVerifiedAt: null,
        passwordHash: 'hash',
        name: 'Admin',
        avatarUrl: null,
        locale: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(), // User is deleted
      };

      await requireSuperAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Super admin access required',
        },
      });
    });
  });
});
