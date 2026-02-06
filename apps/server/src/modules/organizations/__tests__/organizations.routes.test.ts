import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockOrgService, mockOrganization, mockMembership, mockInvite, resetMocks } = vi.hoisted(
  () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockOrganization = {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
      logoUrl: null,
      accentColor: null,
      allowedDomains: [],
      aiEnabled: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const mockMembership = {
      id: 'member-123',
      organizationId: 'org-123',
      userId: 'user-123',
      role: 'OWNER',
      createdAt: now,
      user: {
        id: 'user-123',
        email: 'owner@example.com',
        name: 'Owner User',
        avatarUrl: null,
      },
    };

    const mockInvite = {
      id: 'invite-123',
      organizationId: 'org-123',
      email: 'invited@example.com',
      role: 'MEMBER',
      token: 'invite-token',
      expiresAt: futureDate,
      acceptedAt: null,
      createdById: 'user-123',
      createdAt: now,
    };

    const mockOrgService = {
      createOrganization: vi.fn(),
      getUserOrganizations: vi.fn(),
      updateOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
      getMembers: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      leaveOrganization: vi.fn(),
      transferOwnership: vi.fn(),
      createInvite: vi.fn(),
      getInvites: vi.fn(),
      getInviteStatus: vi.fn(),
      cancelInvite: vi.fn(),
      resendInvite: vi.fn(),
    };

    function resetMocks() {
      Object.values(mockOrgService).forEach((mock) => mock.mockReset());
    }

    return { mockOrgService, mockOrganization, mockMembership, mockInvite, resetMocks };
  }
);

// Mock modules before any imports
vi.mock('../organizations.service.js', () => mockOrgService);

vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(
    async (request: {
      user: { id: string; email: string; name: string };
      sessionToken: string;
    }) => {
      request.user = { id: 'user-123', email: 'owner@example.com', name: 'Owner User' };
      request.sessionToken = 'valid-token';
    }
  ),
}));

vi.mock('../organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(
    async (request: {
      organizationId: string;
      organization: typeof mockOrganization;
      membership: typeof mockMembership;
    }) => {
      request.organizationId = 'org-123';
      request.organization = mockOrganization;
      request.membership = mockMembership;
    }
  ),
  requireOrgRole: vi.fn(() => async (request: { membership: typeof mockMembership }) => {
    request.membership = mockMembership;
  }),
}));

// Import Fastify and routes after mocking
import Fastify from 'fastify';
import { organizationRoutes } from '../organizations.routes.js';

describe('Organization Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    // Mock request decorators
    app.decorateRequest('user', null);
    app.decorateRequest('sessionToken', null);
    app.decorateRequest('organizationId', null);
    app.decorateRequest('organization', null);
    app.decorateRequest('membership', null);

    await app.register(organizationRoutes, { prefix: '/organizations' });
    await app.ready();
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // ===========================================
  // CREATE ORGANIZATION
  // ===========================================

  describe('POST /organizations', () => {
    it('should create a new organization', async () => {
      mockOrgService.createOrganization.mockResolvedValue({
        organization: mockOrganization,
        membership: mockMembership,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: { name: 'Test Organization' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization.name).toBe('Test Organization');
      expect(body.data.membership.role).toBe('OWNER');
    });

    it('should create organization with optional fields', async () => {
      mockOrgService.createOrganization.mockResolvedValue({
        organization: {
          ...mockOrganization,
          slug: 'custom-slug',
          accentColor: '#FF5733',
          logoUrl: 'https://example.com/logo.png',
        },
        membership: mockMembership,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Test Organization',
          slug: 'custom-slug',
          accentColor: '#FF5733',
          logoUrl: 'https://example.com/logo.png',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.organization.slug).toBe('custom-slug');
    });

    it('should return 400 for empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: { name: '' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: { name: 'Test', slug: 'INVALID_SLUG!' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid accent color', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: { name: 'Test', accentColor: 'not-a-color' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for duplicate slug', async () => {
      mockOrgService.createOrganization.mockRejectedValue(new Error('INVALID_SLUG'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: { name: 'Test', slug: 'existing-slug' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // LIST ORGANIZATIONS
  // ===========================================

  describe('GET /organizations', () => {
    it('should return user organizations', async () => {
      mockOrgService.getUserOrganizations.mockResolvedValue([mockOrganization]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organizations).toHaveLength(1);
    });

    it('should return empty array when user has no organizations', async () => {
      mockOrgService.getUserOrganizations.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.organizations).toEqual([]);
    });
  });

  // ===========================================
  // GET ORGANIZATION
  // ===========================================

  describe('GET /organizations/:orgId', () => {
    it('should return organization details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization).toBeDefined();
      expect(body.data.membership).toBeDefined();
    });
  });

  // ===========================================
  // UPDATE ORGANIZATION
  // ===========================================

  describe('PATCH /organizations/:orgId', () => {
    it('should update organization name', async () => {
      mockOrgService.updateOrganization.mockResolvedValue({
        ...mockOrganization,
        name: 'Updated Name',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123',
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.organization.name).toBe('Updated Name');
    });

    it('should update organization settings', async () => {
      mockOrgService.updateOrganization.mockResolvedValue({
        ...mockOrganization,
        aiEnabled: true,
        accentColor: '#00FF00',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123',
        payload: { aiEnabled: true, accentColor: '#00FF00' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for invalid slug', async () => {
      mockOrgService.updateOrganization.mockRejectedValue(new Error('INVALID_SLUG'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123',
        payload: { slug: 'taken-slug' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // DELETE ORGANIZATION
  // ===========================================

  describe('DELETE /organizations/:orgId', () => {
    it('should delete organization', async () => {
      mockOrgService.deleteOrganization.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  // ===========================================
  // GET MEMBERS
  // ===========================================

  describe('GET /organizations/:orgId/members', () => {
    it('should return organization members', async () => {
      mockOrgService.getMembers.mockResolvedValue([mockMembership]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/members',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.members).toHaveLength(1);
    });
  });

  // ===========================================
  // UPDATE MEMBER ROLE
  // ===========================================

  describe('PATCH /organizations/:orgId/members/:memberId', () => {
    it('should update member role', async () => {
      mockOrgService.updateMemberRole.mockResolvedValue({
        ...mockMembership,
        role: 'ADMIN',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/members/member-456',
        payload: { role: 'ADMIN' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.member.role).toBe('ADMIN');
    });

    it('should return 400 for invalid role', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/members/member-456',
        payload: { role: 'INVALID_ROLE' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 when modifying owner', async () => {
      mockOrgService.updateMemberRole.mockRejectedValue(new Error('CANNOT_MODIFY_OWNER'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/members/member-123',
        payload: { role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 for non-existent member', async () => {
      mockOrgService.updateMemberRole.mockRejectedValue(new Error('MEMBER_NOT_FOUND'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/members/nonexistent',
        payload: { role: 'ADMIN' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // REMOVE MEMBER
  // ===========================================

  describe('DELETE /organizations/:orgId/members/:memberId', () => {
    it('should remove member', async () => {
      mockOrgService.removeMember.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/members/member-456',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 when trying to remove self', async () => {
      mockOrgService.removeMember.mockRejectedValue(new Error('USE_LEAVE_ENDPOINT'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/members/member-123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('USE_LEAVE_ENDPOINT');
    });

    it('should return 403 when modifying owner', async () => {
      mockOrgService.removeMember.mockRejectedValue(new Error('CANNOT_MODIFY_OWNER'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/members/owner-member',
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ===========================================
  // LEAVE ORGANIZATION
  // ===========================================

  describe('POST /organizations/:orgId/leave', () => {
    it('should leave organization', async () => {
      mockOrgService.leaveOrganization.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/leave',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if last owner', async () => {
      mockOrgService.leaveOrganization.mockRejectedValue(new Error('LAST_OWNER'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/leave',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('LAST_OWNER');
    });
  });

  // ===========================================
  // TRANSFER OWNERSHIP
  // ===========================================

  describe('POST /organizations/:orgId/transfer-ownership', () => {
    it('should transfer ownership', async () => {
      mockOrgService.transferOwnership.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/transfer-ownership',
        payload: { newOwnerId: 'user-456' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for missing newOwnerId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/transfer-ownership',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent target member', async () => {
      mockOrgService.transferOwnership.mockRejectedValue(new Error('MEMBER_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/transfer-ownership',
        payload: { newOwnerId: 'nonexistent' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // CREATE INVITE
  // ===========================================

  describe('POST /organizations/:orgId/invites', () => {
    it('should create invite', async () => {
      mockOrgService.createInvite.mockResolvedValue(mockInvite);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites',
        payload: { email: 'invited@example.com', role: 'MEMBER' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.invite.email).toBe('invited@example.com');
    });

    it('should create invite with default role', async () => {
      mockOrgService.createInvite.mockResolvedValue(mockInvite);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites',
        payload: { email: 'invited@example.com' },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should return 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites',
        payload: { email: 'invalid' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for existing invite', async () => {
      mockOrgService.createInvite.mockRejectedValue(new Error('INVITE_ALREADY_EXISTS'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites',
        payload: { email: 'existing@example.com' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for existing member', async () => {
      mockOrgService.createInvite.mockRejectedValue(new Error('MEMBER_ALREADY_EXISTS'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites',
        payload: { email: 'member@example.com' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for domain not allowed', async () => {
      mockOrgService.createInvite.mockRejectedValue(new Error('DOMAIN_NOT_ALLOWED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites',
        payload: { email: 'user@blocked-domain.com' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // LIST INVITES
  // ===========================================

  describe('GET /organizations/:orgId/invites', () => {
    it('should return pending invites', async () => {
      mockOrgService.getInvites.mockResolvedValue([mockInvite]);
      mockOrgService.getInviteStatus.mockReturnValue('pending');

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/invites',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.invites).toHaveLength(1);
      expect(body.data.invites[0].status).toBe('pending');
    });

    it('should return empty array when no invites', async () => {
      mockOrgService.getInvites.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/invites',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.invites).toEqual([]);
    });
  });

  // ===========================================
  // CANCEL INVITE
  // ===========================================

  describe('DELETE /organizations/:orgId/invites/:inviteId', () => {
    it('should cancel invite', async () => {
      mockOrgService.cancelInvite.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/invites/invite-123',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 for non-existent invite', async () => {
      mockOrgService.cancelInvite.mockRejectedValue(new Error('INVITE_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/invites/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for already accepted invite', async () => {
      mockOrgService.cancelInvite.mockRejectedValue(new Error('INVITE_ALREADY_ACCEPTED'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/invites/accepted-invite',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // RESEND INVITE
  // ===========================================

  describe('POST /organizations/:orgId/invites/:inviteId/resend', () => {
    it('should resend invite', async () => {
      mockOrgService.resendInvite.mockResolvedValue(mockInvite);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites/invite-123/resend',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.invite).toBeDefined();
      expect(body.data.message).toContain('resent');
    });

    it('should return 404 for non-existent invite', async () => {
      mockOrgService.resendInvite.mockRejectedValue(new Error('INVITE_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites/nonexistent/resend',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for already accepted invite', async () => {
      mockOrgService.resendInvite.mockRejectedValue(new Error('INVITE_ALREADY_ACCEPTED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/invites/accepted-invite/resend',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
