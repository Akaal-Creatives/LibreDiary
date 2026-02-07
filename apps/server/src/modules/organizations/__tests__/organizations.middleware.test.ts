import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      organization: {
        findFirst: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  requireOrgAccess,
  requireOrgRole,
  canModifyMember,
  canAssignRole,
  compareRoles,
} from '../organizations.middleware.js';

function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    user: undefined,
    organization: undefined,
    membership: undefined,
    params: {},
    ...overrides,
  } as any;
}

function createMockReply() {
  const reply: any = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

describe('Organizations Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireOrgAccess', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireOrgAccess(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        })
      );
    });

    it('should return 400 when orgId param is missing', async () => {
      const request = createMockRequest({
        user: { id: 'u1' },
        params: {},
      });
      const reply = createMockReply();

      await requireOrgAccess(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
        })
      );
    });

    it('should return 404 when organisation does not exist', async () => {
      const request = createMockRequest({
        user: { id: 'u1' },
        params: { orgId: 'org-1' },
      });
      const reply = createMockReply();
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await requireOrgAccess(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'ORG_NOT_FOUND' }),
        })
      );
    });

    it('should return 403 when user is not a member', async () => {
      const mockOrg = { id: 'org-1', name: 'Test Org', deletedAt: null };
      const request = createMockRequest({
        user: { id: 'u1' },
        params: { orgId: 'org-1' },
      });
      const reply = createMockReply();
      mockPrisma.organization.findFirst.mockResolvedValue(mockOrg);
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      await requireOrgAccess(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'NOT_ORG_MEMBER' }),
        })
      );
    });

    it('should attach organisation and membership to request on success', async () => {
      const mockOrg = { id: 'org-1', name: 'Test Org', deletedAt: null };
      const mockMembership = { id: 'm1', role: 'MEMBER', userId: 'u1', organizationId: 'org-1' };
      const request = createMockRequest({
        user: { id: 'u1' },
        params: { orgId: 'org-1' },
      });
      const reply = createMockReply();
      mockPrisma.organization.findFirst.mockResolvedValue(mockOrg);
      mockPrisma.organizationMember.findUnique.mockResolvedValue(mockMembership);

      await requireOrgAccess(request, reply);

      expect(request.organization).toEqual(mockOrg);
      expect(request.membership).toEqual(mockMembership);
      expect(reply.status).not.toHaveBeenCalled();
    });
  });

  describe('requireOrgRole', () => {
    it('should return 403 when membership is missing', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      const middleware = requireOrgRole('ADMIN');
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when role is insufficient', async () => {
      const request = createMockRequest({
        membership: { role: 'MEMBER' },
      });
      const reply = createMockReply();

      const middleware = requireOrgRole('ADMIN');
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INSUFFICIENT_ROLE' }),
        })
      );
    });

    it('should pass through when role meets minimum', async () => {
      const request = createMockRequest({
        membership: { role: 'ADMIN' },
      });
      const reply = createMockReply();

      const middleware = requireOrgRole('ADMIN');
      await middleware(request, reply);

      expect(reply.status).not.toHaveBeenCalled();
    });

    it('should pass through when role exceeds minimum', async () => {
      const request = createMockRequest({
        membership: { role: 'OWNER' },
      });
      const reply = createMockReply();

      const middleware = requireOrgRole('MEMBER');
      await middleware(request, reply);

      expect(reply.status).not.toHaveBeenCalled();
    });
  });

  describe('canModifyMember', () => {
    it('should allow OWNER to modify anyone', () => {
      expect(canModifyMember('OWNER', 'OWNER')).toBe(true);
      expect(canModifyMember('OWNER', 'ADMIN')).toBe(true);
      expect(canModifyMember('OWNER', 'MEMBER')).toBe(true);
    });

    it('should allow ADMIN to modify only MEMBERs', () => {
      expect(canModifyMember('ADMIN', 'MEMBER')).toBe(true);
      expect(canModifyMember('ADMIN', 'ADMIN')).toBe(false);
      expect(canModifyMember('ADMIN', 'OWNER')).toBe(false);
    });

    it('should not allow MEMBER to modify anyone', () => {
      expect(canModifyMember('MEMBER', 'MEMBER')).toBe(false);
      expect(canModifyMember('MEMBER', 'ADMIN')).toBe(false);
      expect(canModifyMember('MEMBER', 'OWNER')).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    it('should allow OWNER to assign any role', () => {
      expect(canAssignRole('OWNER', 'OWNER')).toBe(true);
      expect(canAssignRole('OWNER', 'ADMIN')).toBe(true);
      expect(canAssignRole('OWNER', 'MEMBER')).toBe(true);
    });

    it('should allow ADMIN to assign only MEMBER role', () => {
      expect(canAssignRole('ADMIN', 'MEMBER')).toBe(true);
      expect(canAssignRole('ADMIN', 'ADMIN')).toBe(false);
      expect(canAssignRole('ADMIN', 'OWNER')).toBe(false);
    });

    it('should not allow MEMBER to assign any role', () => {
      expect(canAssignRole('MEMBER', 'MEMBER')).toBe(false);
      expect(canAssignRole('MEMBER', 'ADMIN')).toBe(false);
      expect(canAssignRole('MEMBER', 'OWNER')).toBe(false);
    });
  });

  describe('compareRoles', () => {
    it('should return 0 for equal roles', () => {
      expect(compareRoles('ADMIN', 'ADMIN')).toBe(0);
    });

    it('should return negative when first role is lower', () => {
      expect(compareRoles('MEMBER', 'ADMIN')).toBeLessThan(0);
      expect(compareRoles('MEMBER', 'OWNER')).toBeLessThan(0);
      expect(compareRoles('ADMIN', 'OWNER')).toBeLessThan(0);
    });

    it('should return positive when first role is higher', () => {
      expect(compareRoles('OWNER', 'ADMIN')).toBeGreaterThan(0);
      expect(compareRoles('OWNER', 'MEMBER')).toBeGreaterThan(0);
      expect(compareRoles('ADMIN', 'MEMBER')).toBeGreaterThan(0);
    });
  });
});
