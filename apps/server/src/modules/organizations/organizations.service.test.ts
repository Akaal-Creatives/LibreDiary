import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Mock modules
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../services/email.service.js', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

import * as orgService from './organizations.service.js';
import { canModifyMember, canAssignRole } from './organizations.middleware.js';

function resetMocks() {
  Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaInvite).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
}

describe('Organizations Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
    role: 'OWNER' as const,
    createdAt: now,
    updatedAt: now,
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
  };

  describe('createOrganization', () => {
    it('should create organization with user as OWNER', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(null); // slug check
      mockPrisma.$transaction.mockResolvedValue({
        organization: mockOrganization,
        membership: mockMembership,
      });

      const result = await orgService.createOrganization('user-123', {
        name: 'Test Organization',
      });

      expect(result.organization.name).toBe('Test Organization');
      expect(result.membership.role).toBe('OWNER');
    });

    it('should generate unique slug when slug is taken', async () => {
      mockPrismaOrganization.findFirst
        .mockResolvedValueOnce({ id: 'existing' }) // First slug taken
        .mockResolvedValueOnce(null); // test-org-1 available
      mockPrisma.$transaction.mockResolvedValue({
        organization: { ...mockOrganization, slug: 'test-org-1' },
        membership: mockMembership,
      });

      const result = await orgService.createOrganization('user-123', {
        name: 'Test Organization',
      });

      expect(mockPrismaOrganization.findFirst).toHaveBeenCalledTimes(2);
      expect(result.organization.slug).toBe('test-org-1');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations', async () => {
      mockPrismaOrganizationMember.findMany.mockResolvedValue([
        { ...mockMembership, organization: mockOrganization },
      ]);

      const result = await orgService.getUserOrganizations('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Organization');
    });

    it('should filter out deleted organizations', async () => {
      mockPrismaOrganizationMember.findMany.mockResolvedValue([
        { ...mockMembership, organization: { ...mockOrganization, deletedAt: now } },
      ]);

      const result = await orgService.getUserOrganizations('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateOrganization', () => {
    it('should update organization', async () => {
      mockPrismaOrganization.update.mockResolvedValue({
        ...mockOrganization,
        name: 'Updated Name',
      });

      const result = await orgService.updateOrganization('org-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteOrganization', () => {
    it('should soft delete organization', async () => {
      mockPrismaOrganization.update.mockResolvedValue({
        ...mockOrganization,
        deletedAt: now,
      });

      await orgService.deleteOrganization('org-123');

      expect(mockPrismaOrganization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('getMembers', () => {
    it('should return members with user details', async () => {
      mockPrismaOrganizationMember.findMany.mockResolvedValue([
        { ...mockMembership, user: mockUser },
      ]);

      const result = await orgService.getMembers('org-123');

      expect(result).toHaveLength(1);
      expect(result[0].user.email).toBe('test@example.com');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const targetMember = { ...mockMembership, id: 'member-456', role: 'MEMBER' as const };
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(targetMember);
      mockPrismaOrganizationMember.update.mockResolvedValue({
        ...targetMember,
        role: 'ADMIN',
      });

      const result = await orgService.updateMemberRole('org-123', 'member-456', 'ADMIN', 'OWNER');

      expect(result.role).toBe('ADMIN');
    });

    it('should throw if target member not found', async () => {
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(null);

      await expect(
        orgService.updateMemberRole('org-123', 'nonexistent', 'ADMIN', 'OWNER')
      ).rejects.toThrow('MEMBER_NOT_FOUND');
    });

    it('should throw if demoting last owner', async () => {
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(mockMembership);
      mockPrismaOrganizationMember.count.mockResolvedValue(1);

      await expect(
        orgService.updateMemberRole('org-123', 'member-123', 'ADMIN', 'OWNER')
      ).rejects.toThrow('LAST_OWNER');
    });
  });

  describe('removeMember', () => {
    it('should remove member', async () => {
      const targetMember = {
        ...mockMembership,
        id: 'member-456',
        userId: 'user-456',
        role: 'MEMBER' as const,
      };
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(targetMember);
      mockPrismaOrganizationMember.delete.mockResolvedValue(targetMember);

      await orgService.removeMember('org-123', 'member-456', 'user-123', 'ADMIN');

      expect(mockPrismaOrganizationMember.delete).toHaveBeenCalled();
    });

    it('should throw if trying to remove self', async () => {
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(mockMembership);

      await expect(
        orgService.removeMember('org-123', 'member-123', 'user-123', 'OWNER')
      ).rejects.toThrow('USE_LEAVE_ENDPOINT');
    });
  });

  describe('leaveOrganization', () => {
    it('should allow member to leave', async () => {
      const memberMembership = { ...mockMembership, role: 'MEMBER' as const };
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(memberMembership);
      mockPrismaOrganizationMember.delete.mockResolvedValue(memberMembership);

      await orgService.leaveOrganization('org-123', 'user-123');

      expect(mockPrismaOrganizationMember.delete).toHaveBeenCalled();
    });

    it('should throw if last owner tries to leave', async () => {
      mockPrismaOrganizationMember.findFirst.mockResolvedValue(mockMembership);
      mockPrismaOrganizationMember.count.mockResolvedValue(1);

      await expect(orgService.leaveOrganization('org-123', 'user-123')).rejects.toThrow(
        'LAST_OWNER'
      );
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership', async () => {
      const targetMember = {
        ...mockMembership,
        id: 'member-456',
        userId: 'user-456',
        role: 'ADMIN' as const,
      };
      mockPrismaOrganizationMember.findFirst
        .mockResolvedValueOnce(targetMember)
        .mockResolvedValueOnce(mockMembership);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await orgService.transferOwnership('org-123', 'user-456', 'user-123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('validateEmailDomain', () => {
    it('should return true if no domain restriction', () => {
      expect(orgService.validateEmailDomain('user@any.com', null)).toBe(true);
    });

    it('should return true if domain matches', () => {
      expect(orgService.validateEmailDomain('user@company.com', 'company.com')).toBe(true);
    });

    it('should return false if domain does not match', () => {
      expect(orgService.validateEmailDomain('user@other.com', 'company.com')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(orgService.validateEmailDomain('user@COMPANY.COM', 'company.com')).toBe(true);
    });
  });

  describe('createInvite', () => {
    it('should create invite', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'new@example.com',
        token: 'token',
        organizationId: 'org-123',
        role: 'MEMBER',
        invitedById: 'user-123',
        expiresAt: futureDate,
        acceptedAt: null,
        createdAt: now,
      };

      mockPrismaOrganization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaUser.findUnique
        .mockResolvedValueOnce({ ...mockUser, memberships: [] })
        .mockResolvedValueOnce(mockUser);
      mockPrismaInvite.findFirst.mockResolvedValue(null);
      mockPrismaInvite.create.mockResolvedValue(mockInvite);

      const result = await orgService.createInvite(
        'org-123',
        { email: 'new@example.com', role: 'MEMBER' },
        'user-123',
        'ADMIN'
      );

      expect(result.email).toBe('new@example.com');
    });

    it('should throw if domain not allowed', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue({
        ...mockOrganization,
        allowedDomain: 'company.com',
      });

      await expect(
        orgService.createInvite(
          'org-123',
          { email: 'user@other.com', role: 'MEMBER' },
          'user-123',
          'ADMIN'
        )
      ).rejects.toThrow('DOMAIN_NOT_ALLOWED');
    });

    it('should throw if invite already exists', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaUser.findUnique.mockResolvedValue({ ...mockUser, memberships: [] });
      mockPrismaInvite.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        orgService.createInvite(
          'org-123',
          { email: 'new@example.com', role: 'MEMBER' },
          'user-123',
          'ADMIN'
        )
      ).rejects.toThrow('INVITE_ALREADY_EXISTS');
    });

    it('should throw if user is already a member', async () => {
      mockPrismaOrganization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaUser.findUnique.mockResolvedValue({
        ...mockUser,
        memberships: [{ organizationId: 'org-123' }],
      });

      await expect(
        orgService.createInvite(
          'org-123',
          { email: 'test@example.com', role: 'MEMBER' },
          'user-123',
          'ADMIN'
        )
      ).rejects.toThrow('MEMBER_ALREADY_EXISTS');
    });
  });

  describe('getInviteStatus', () => {
    it('should return ACCEPTED for accepted invites', () => {
      const invite = { acceptedAt: now, expiresAt: futureDate } as any;
      expect(orgService.getInviteStatus(invite)).toBe('ACCEPTED');
    });

    it('should return EXPIRED for expired invites', () => {
      const pastDate = new Date(now.getTime() - 1000);
      const invite = { acceptedAt: null, expiresAt: pastDate } as any;
      expect(orgService.getInviteStatus(invite)).toBe('EXPIRED');
    });

    it('should return PENDING for valid invites', () => {
      const invite = { acceptedAt: null, expiresAt: futureDate } as any;
      expect(orgService.getInviteStatus(invite)).toBe('PENDING');
    });
  });
});

describe('Organizations Middleware Helpers', () => {
  describe('canModifyMember', () => {
    it('OWNER can modify anyone', () => {
      expect(canModifyMember('OWNER', 'OWNER')).toBe(true);
      expect(canModifyMember('OWNER', 'ADMIN')).toBe(true);
      expect(canModifyMember('OWNER', 'MEMBER')).toBe(true);
    });

    it('ADMIN can only modify MEMBERs', () => {
      expect(canModifyMember('ADMIN', 'OWNER')).toBe(false);
      expect(canModifyMember('ADMIN', 'ADMIN')).toBe(false);
      expect(canModifyMember('ADMIN', 'MEMBER')).toBe(true);
    });

    it('MEMBER cannot modify anyone', () => {
      expect(canModifyMember('MEMBER', 'OWNER')).toBe(false);
      expect(canModifyMember('MEMBER', 'ADMIN')).toBe(false);
      expect(canModifyMember('MEMBER', 'MEMBER')).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    it('OWNER can assign any role', () => {
      expect(canAssignRole('OWNER', 'OWNER')).toBe(true);
      expect(canAssignRole('OWNER', 'ADMIN')).toBe(true);
      expect(canAssignRole('OWNER', 'MEMBER')).toBe(true);
    });

    it('ADMIN can only assign MEMBER role', () => {
      expect(canAssignRole('ADMIN', 'OWNER')).toBe(false);
      expect(canAssignRole('ADMIN', 'ADMIN')).toBe(false);
      expect(canAssignRole('ADMIN', 'MEMBER')).toBe(true);
    });

    it('MEMBER cannot assign any role', () => {
      expect(canAssignRole('MEMBER', 'OWNER')).toBe(false);
      expect(canAssignRole('MEMBER', 'ADMIN')).toBe(false);
      expect(canAssignRole('MEMBER', 'MEMBER')).toBe(false);
    });
  });
});
