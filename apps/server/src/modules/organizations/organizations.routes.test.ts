import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const {
  mockPrismaOrganization,
  mockPrismaOrganizationMember,
  mockPrismaUser,
  mockPrismaInvite,
  mockPrisma,
} = vi.hoisted(() => {
  const mockPrismaOrganization = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaOrganizationMember = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaUser = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockPrismaInvite = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockPrisma = {
    organization: mockPrismaOrganization,
    organizationMember: mockPrismaOrganizationMember,
    user: mockPrismaUser,
    invite: mockPrismaInvite,
    $transaction: vi.fn(),
  };

  return {
    mockPrismaOrganization,
    mockPrismaOrganizationMember,
    mockPrismaUser,
    mockPrismaInvite,
    mockPrisma,
  };
});

// Mock modules before any imports
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../services/email.service.js', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock the session service to avoid prisma calls in it
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
import { organizationRoutes } from './organizations.routes.js';
import * as sessionService from '../../services/session.service.js';

function resetMocks() {
  Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaInvite).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
}

describe('Organization Routes', () => {
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
    logoUrl: null,
    accentColor: '#6366f1',
    allowedDomain: null,
    aiEnabled: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const mockMembership = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-123',
    role: 'OWNER',
    createdAt: now,
    updatedAt: now,
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

    await app.register(organizationRoutes, { prefix: '/api/v1/organizations' });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks();
    // Default: user is authenticated
    vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
  });

  describe('POST /api/v1/organizations', () => {
    it('should create organization successfully', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(null); // slug check
      mockPrisma.$transaction.mockResolvedValue({
        organization: mockOrganization,
        membership: mockMembership,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: { cookie: 'session_token=valid-token' },
        payload: { name: 'Test Organization' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization.name).toBe('Test Organization');
      expect(body.data.membership.role).toBe('OWNER');
    });

    it('should return 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: { cookie: 'session_token=valid-token' },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: { cookie: 'session_token=valid-token' },
        payload: { name: 'Test', slug: 'INVALID SLUG!' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        payload: { name: 'Test' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/organizations', () => {
    it('should list user organizations', async () => {
      mockPrismaOrganizationMember.findMany.mockResolvedValue([
        { ...mockMembership, organization: mockOrganization },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organizations).toHaveLength(1);
    });
  });

  describe('GET /api/v1/organizations/:orgId', () => {
    it('should return organization details for member', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization.id).toBe('org-123');
      expect(body.data.membership.role).toBe('OWNER');
    });

    it('should return 404 for non-existent organization', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/nonexistent',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 for non-member', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_ORG_MEMBER');
    });
  });

  describe('PATCH /api/v1/organizations/:orgId', () => {
    it('should update organization as ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaOrganization.update.mockResolvedValue({
        ...mockOrganization,
        name: 'Updated Name',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.organization.name).toBe('Updated Name');
    });

    it('should return 403 for MEMBER trying to update', async () => {
      const memberMembership = { ...mockMembership, role: 'MEMBER' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(memberMembership);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should return 403 for ADMIN trying to update allowedDomain', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
        payload: { allowedDomain: 'example.com' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow OWNER to update allowedDomain', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership); // OWNER
      mockPrismaOrganization.update.mockResolvedValue({
        ...mockOrganization,
        allowedDomain: 'example.com',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
        payload: { allowedDomain: 'example.com' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/v1/organizations/:orgId', () => {
    it('should soft delete organization as OWNER', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaOrganization.update.mockResolvedValue({
        ...mockOrganization,
        deletedAt: new Date(),
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 for ADMIN trying to delete', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/organizations/:orgId/members', () => {
    it('should list members for organization member', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([
        { ...mockMembership, user: mockUser },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/members',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.members).toHaveLength(1);
    });
  });

  describe('PATCH /api/v1/organizations/:orgId/members/:memberId', () => {
    it('should update member role as OWNER', async () => {
      const targetMember = {
        id: 'member-456',
        organizationId: 'org-123',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(targetMember);
      mockPrismaOrganizationMember.update.mockResolvedValue({
        ...targetMember,
        role: 'ADMIN',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123/members/member-456',
        headers: { cookie: 'session_token=valid-token' },
        payload: { role: 'ADMIN' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.member.role).toBe('ADMIN');
    });

    it('should return 403 for ADMIN trying to promote to ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      const targetMember = {
        id: 'member-456',
        organizationId: 'org-123',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(targetMember);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/organizations/org-123/members/member-456',
        headers: { cookie: 'session_token=valid-token' },
        payload: { role: 'ADMIN' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/organizations/:orgId/members/:memberId', () => {
    it('should remove member as ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      const targetMember = {
        id: 'member-456',
        organizationId: 'org-123',
        userId: 'user-456',
        role: 'MEMBER',
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(targetMember);
      mockPrismaOrganizationMember.delete.mockResolvedValue(targetMember);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/members/member-456',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 for ADMIN trying to remove another ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      const targetAdmin = {
        id: 'member-456',
        organizationId: 'org-123',
        userId: 'user-456',
        role: 'ADMIN',
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(targetAdmin);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/members/member-456',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/organizations/:orgId/leave', () => {
    it('should allow member to leave', async () => {
      const memberMembership = { ...mockMembership, role: 'MEMBER' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(memberMembership);
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(memberMembership);
      mockPrismaOrganizationMember.delete.mockResolvedValue(memberMembership);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/leave',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for last owner trying to leave', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(mockMembership);
      mockPrismaOrganizationMember.count.mockResolvedValue(1); // Only one owner

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/leave',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('LAST_OWNER');
    });
  });

  describe('POST /api/v1/organizations/:orgId/invites', () => {
    it('should create invite as ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      const mockInvite = {
        id: 'invite-123',
        email: 'new@example.com',
        token: 'invite-token',
        organizationId: 'org-123',
        role: 'MEMBER',
        invitedById: 'user-123',
        expiresAt: futureDate,
        acceptedAt: null,
        createdAt: now,
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaOrganization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaUser.findUnique
        .mockResolvedValueOnce({ ...mockUser, memberships: [] }) // Check if user exists
        .mockResolvedValueOnce(mockUser); // Get inviter
      mockPrismaInvite.findFirst.mockResolvedValue(null); // No existing invite
      mockPrismaInvite.create.mockResolvedValue(mockInvite);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/invites',
        headers: { cookie: 'session_token=valid-token' },
        payload: { email: 'new@example.com', role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.invite.email).toBe('new@example.com');
    });

    it('should return 403 for ADMIN trying to invite as ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaOrganization.findUnique.mockResolvedValue(mockOrganization);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/invites',
        headers: { cookie: 'session_token=valid-token' },
        payload: { email: 'new@example.com', role: 'ADMIN' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 for domain lockdown violation', async () => {
      const orgWithDomain = { ...mockOrganization, allowedDomain: 'company.com' };
      mockPrismaOrganization.findFirst.mockResolvedValue(orgWithDomain);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaOrganization.findUnique.mockResolvedValue(orgWithDomain);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/invites',
        headers: { cookie: 'session_token=valid-token' },
        payload: { email: 'new@other.com', role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('DOMAIN_NOT_ALLOWED');
    });
  });

  describe('GET /api/v1/organizations/:orgId/invites', () => {
    it('should list invites as ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaInvite.findMany.mockResolvedValue([
        {
          id: 'invite-123',
          email: 'new@example.com',
          role: 'MEMBER',
          expiresAt: futureDate,
          acceptedAt: null,
          invitedBy: mockUser,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/invites',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.invites).toHaveLength(1);
      expect(body.data.invites[0].status).toBe('PENDING');
    });

    it('should return 403 for MEMBER trying to list invites', async () => {
      const memberMembership = { ...mockMembership, role: 'MEMBER' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(memberMembership);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/org-123/invites',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/organizations/:orgId/invites/:inviteId', () => {
    it('should cancel invite as ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      const mockInvite = {
        id: 'invite-123',
        email: 'new@example.com',
        organizationId: 'org-123',
        acceptedAt: null,
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaInvite.findFirst.mockResolvedValue(mockInvite);
      mockPrismaInvite.delete.mockResolvedValue(mockInvite);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/organizations/org-123/invites/invite-123',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/organizations/:orgId/invites/:inviteId/resend', () => {
    it('should resend invite as ADMIN', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      const mockInvite = {
        id: 'invite-123',
        email: 'new@example.com',
        organizationId: 'org-123',
        acceptedAt: null,
        organization: mockOrganization,
        invitedBy: mockUser,
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);
      mockPrismaInvite.findFirst.mockResolvedValue(mockInvite);
      mockPrismaInvite.update.mockResolvedValue({
        ...mockInvite,
        token: 'new-token',
        expiresAt: futureDate,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/invites/invite-123/resend',
        headers: { cookie: 'session_token=valid-token' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/organizations/:orgId/transfer-ownership', () => {
    it('should transfer ownership as OWNER', async () => {
      const targetMember = {
        id: 'member-456',
        organizationId: 'org-123',
        userId: 'user-456',
        role: 'ADMIN',
      };

      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(mockMembership);
      mockPrismaOrganizationMember.findFirst
        .mockResolvedValueOnce(targetMember) // New owner
        .mockResolvedValueOnce(mockMembership); // Current owner
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/transfer-ownership',
        headers: { cookie: 'session_token=valid-token' },
        payload: { newOwnerId: 'user-456' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 for non-OWNER trying to transfer', async () => {
      const adminMembership = { ...mockMembership, role: 'ADMIN' };
      mockPrismaOrganization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaOrganizationMember.findUnique.mockResolvedValue(adminMembership);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/org-123/transfer-ownership',
        headers: { cookie: 'session_token=valid-token' },
        payload: { newOwnerId: 'user-456' },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
