import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===========================================
// MOCKS
// ===========================================

const { mockPrisma, mockSendInviteEmail, mockGenerateInviteToken, mockExpiresIn, mockIsExpired } =
  vi.hoisted(() => ({
    mockPrisma: {
      organization: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      organizationMember: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      invite: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
      user: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    },
    mockSendInviteEmail: vi.fn(),
    mockGenerateInviteToken: vi.fn(),
    mockExpiresIn: vi.fn(),
    mockIsExpired: vi.fn(),
  }));

vi.mock('../../../lib/prisma.js', () => ({ prisma: mockPrisma }));
vi.mock('../../../services/email.service.js', () => ({ sendInviteEmail: mockSendInviteEmail }));
vi.mock('../../../utils/tokens.js', () => ({
  generateInviteToken: mockGenerateInviteToken,
  expiresIn: mockExpiresIn,
  isExpired: mockIsExpired,
  EXPIRATION: { INVITE: 604800000 },
}));
vi.mock('../organizations.middleware.js', () => ({
  canModifyMember: vi.fn(),
  canAssignRole: vi.fn(),
}));

import {
  createOrganization,
  getUserOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getMembers,
  getMember,
  updateMemberRole,
  removeMember,
  leaveOrganization,
  transferOwnership,
  validateEmailDomain,
  createInvite,
  getInvites,
  getInvite,
  cancelInvite,
  resendInvite,
  getInviteStatus,
} from '../organizations.service.js';

import { canModifyMember, canAssignRole } from '../organizations.middleware.js';

// ===========================================
// HELPERS
// ===========================================

function resetMocks() {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === 'function') {
      (model as ReturnType<typeof vi.fn>).mockReset();
    } else {
      for (const method of Object.values(model)) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
  mockSendInviteEmail.mockReset();
  mockGenerateInviteToken.mockReset();
  mockExpiresIn.mockReset();
  mockIsExpired.mockReset();
  vi.mocked(canModifyMember).mockReset();
  vi.mocked(canAssignRole).mockReset();
}

// ===========================================
// TESTS
// ===========================================

describe('Organisations Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // -----------------------------------------
  // Pure functions
  // -----------------------------------------

  describe('validateEmailDomain', () => {
    it('should allow all emails when no domains are specified', () => {
      expect(validateEmailDomain('user@anything.com', [])).toBe(true);
    });

    it('should allow matching domain', () => {
      expect(validateEmailDomain('user@example.com', ['example.com'])).toBe(true);
    });

    it('should reject non-matching domain', () => {
      expect(validateEmailDomain('user@other.com', ['example.com'])).toBe(false);
    });

    it('should be case-insensitive for domain comparison', () => {
      expect(validateEmailDomain('user@EXAMPLE.COM', ['example.com'])).toBe(true);
    });

    it('should match any one of multiple allowed domains', () => {
      expect(validateEmailDomain('user@corp.com', ['example.com', 'corp.com'])).toBe(true);
    });
  });

  describe('getInviteStatus', () => {
    it('should return ACCEPTED when acceptedAt is set', () => {
      const invite = { acceptedAt: new Date(), expiresAt: new Date() } as any;
      expect(getInviteStatus(invite)).toBe('ACCEPTED');
    });

    it('should return EXPIRED when the invite has expired', () => {
      const invite = { acceptedAt: null, expiresAt: new Date(Date.now() - 1000) } as any;
      mockIsExpired.mockReturnValue(true);
      expect(getInviteStatus(invite)).toBe('EXPIRED');
    });

    it('should return PENDING for a non-accepted, non-expired invite', () => {
      const invite = {
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      } as any;
      mockIsExpired.mockReturnValue(false);
      expect(getInviteStatus(invite)).toBe('PENDING');
    });
  });

  // -----------------------------------------
  // createOrganization
  // -----------------------------------------

  describe('createOrganization', () => {
    it('should create org with OWNER membership via transaction', async () => {
      const mockOrg = { id: 'org-1', name: 'Test Org', slug: 'test-org' };
      const mockMembership = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'OWNER',
      };

      // ensureUniqueSlug calls prisma.organization.findFirst
      mockPrisma.organization.findFirst.mockResolvedValue(null); // slug is unique

      mockPrisma.$transaction.mockImplementation(async (cb: unknown) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return cb;
      });
      mockPrisma.organization.create.mockResolvedValue(mockOrg);
      mockPrisma.organizationMember.create.mockResolvedValue(mockMembership);

      const result = await createOrganization('user-1', { name: 'Test Org' });

      expect(result.organization).toEqual(mockOrg);
      expect(result.membership).toEqual(mockMembership);
      expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'OWNER', userId: 'user-1' }),
        })
      );
    });

    it('should use provided slug when given', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: unknown) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return cb;
      });
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        slug: 'custom-slug',
      });
      mockPrisma.organizationMember.create.mockResolvedValue({});

      await createOrganization('user-1', { name: 'My Org', slug: 'custom-slug' });

      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'custom-slug' }),
        })
      );
    });
  });

  // -----------------------------------------
  // getUserOrganizations
  // -----------------------------------------

  describe('getUserOrganizations', () => {
    it('should return non-deleted organisations', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        { organization: { id: 'org-1', name: 'Active', deletedAt: null } },
        { organization: { id: 'org-2', name: 'Deleted', deletedAt: new Date() } },
      ]);

      const result = await getUserOrganizations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-1');
    });

    it('should return empty array when user has no memberships', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);

      const result = await getUserOrganizations('user-1');

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------
  // getOrganization
  // -----------------------------------------

  describe('getOrganization', () => {
    it('should return organisation by ID', async () => {
      const mockOrg = { id: 'org-1', name: 'Test', deletedAt: null };
      mockPrisma.organization.findFirst.mockResolvedValue(mockOrg);

      const result = await getOrganization('org-1');

      expect(result).toEqual(mockOrg);
      expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: { id: 'org-1', deletedAt: null },
      });
    });

    it('should return null for deleted organisation', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      const result = await getOrganization('org-deleted');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------
  // updateOrganization
  // -----------------------------------------

  describe('updateOrganization', () => {
    it('should update organisation fields', async () => {
      const updated = { id: 'org-1', name: 'Updated Name' };
      mockPrisma.organization.update.mockResolvedValue(updated);

      const result = await updateOrganization('org-1', { name: 'Updated Name' });

      expect(result).toEqual(updated);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should handle slug uniqueness when updating slug', async () => {
      // ensureUniqueSlug: first call returns existing, second returns null
      mockPrisma.organization.findFirst
        .mockResolvedValueOnce({ id: 'org-other', slug: 'new-slug' }) // slug taken
        .mockResolvedValueOnce(null); // new-slug-1 is free

      const updated = { id: 'org-1', slug: 'new-slug-1' };
      mockPrisma.organization.update.mockResolvedValue(updated);

      const result = await updateOrganization('org-1', { slug: 'new-slug' });

      expect(result.slug).toBe('new-slug-1');
    });
  });

  // -----------------------------------------
  // deleteOrganization
  // -----------------------------------------

  describe('deleteOrganization', () => {
    it('should soft delete by setting deletedAt', async () => {
      mockPrisma.organization.update.mockResolvedValue({});

      await deleteOrganization('org-1');

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  // -----------------------------------------
  // getMembers
  // -----------------------------------------

  describe('getMembers', () => {
    it('should delegate to prisma with correct query', async () => {
      const mockMembers = [
        { id: 'mem-1', role: 'OWNER', user: { id: 'user-1', email: 'a@b.com' } },
      ];
      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers);

      const result = await getMembers('org-1');

      expect(result).toEqual(mockMembers);
      expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    });
  });

  // -----------------------------------------
  // getMember
  // -----------------------------------------

  describe('getMember', () => {
    it('should return member by ID and orgId', async () => {
      const member = { id: 'mem-1', organizationId: 'org-1', role: 'MEMBER' };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(member);

      const result = await getMember('org-1', 'mem-1');

      expect(result).toEqual(member);
    });

    it('should return null when member not found', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const result = await getMember('org-1', 'mem-999');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------
  // updateMemberRole
  // -----------------------------------------

  describe('updateMemberRole', () => {
    it('should update role when permissions allow', async () => {
      const targetMember = { id: 'mem-1', organizationId: 'org-1', role: 'MEMBER' };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);
      vi.mocked(canModifyMember).mockReturnValue(true);
      vi.mocked(canAssignRole).mockReturnValue(true);
      mockPrisma.organizationMember.update.mockResolvedValue({
        ...targetMember,
        role: 'ADMIN',
      });

      const result = await updateMemberRole('org-1', 'mem-1', 'ADMIN' as any, 'OWNER' as any);

      expect(result.role).toBe('ADMIN');
      expect(mockPrisma.organizationMember.update).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
        data: { role: 'ADMIN' },
      });
    });

    it('should throw MEMBER_NOT_FOUND when target does not exist', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(
        updateMemberRole('org-1', 'mem-999', 'ADMIN' as any, 'OWNER' as any)
      ).rejects.toThrow('MEMBER_NOT_FOUND');
    });

    it('should throw LAST_OWNER when demoting the only owner', async () => {
      const targetMember = { id: 'mem-1', organizationId: 'org-1', role: 'OWNER' };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);
      mockPrisma.organizationMember.count.mockResolvedValue(1);

      await expect(
        updateMemberRole('org-1', 'mem-1', 'ADMIN' as any, 'OWNER' as any)
      ).rejects.toThrow('LAST_OWNER');
    });

    it('should throw CANNOT_MODIFY_HIGHER_ROLE when actor lacks permission', async () => {
      const targetMember = { id: 'mem-1', organizationId: 'org-1', role: 'ADMIN' };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);
      vi.mocked(canModifyMember).mockReturnValue(false);

      await expect(
        updateMemberRole('org-1', 'mem-1', 'MEMBER' as any, 'ADMIN' as any)
      ).rejects.toThrow('CANNOT_MODIFY_HIGHER_ROLE');
    });

    it('should throw INSUFFICIENT_ROLE when actor cannot assign the target role', async () => {
      const targetMember = { id: 'mem-1', organizationId: 'org-1', role: 'MEMBER' };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);
      vi.mocked(canModifyMember).mockReturnValue(true);
      vi.mocked(canAssignRole).mockReturnValue(false);

      await expect(
        updateMemberRole('org-1', 'mem-1', 'OWNER' as any, 'ADMIN' as any)
      ).rejects.toThrow('INSUFFICIENT_ROLE');
    });
  });

  // -----------------------------------------
  // removeMember
  // -----------------------------------------

  describe('removeMember', () => {
    it('should remove member when permitted', async () => {
      const targetMember = {
        id: 'mem-2',
        organizationId: 'org-1',
        userId: 'user-2',
        role: 'MEMBER',
      };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);
      vi.mocked(canModifyMember).mockReturnValue(true);
      mockPrisma.organizationMember.delete.mockResolvedValue({});

      await removeMember('org-1', 'mem-2', 'user-1', 'OWNER' as any);

      expect(mockPrisma.organizationMember.delete).toHaveBeenCalledWith({
        where: { id: 'mem-2' },
      });
    });

    it('should throw MEMBER_NOT_FOUND when target does not exist', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(removeMember('org-1', 'mem-999', 'user-1', 'OWNER' as any)).rejects.toThrow(
        'MEMBER_NOT_FOUND'
      );
    });

    it('should throw USE_LEAVE_ENDPOINT when trying to remove self', async () => {
      const targetMember = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'ADMIN',
      };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);

      await expect(removeMember('org-1', 'mem-1', 'user-1', 'ADMIN' as any)).rejects.toThrow(
        'USE_LEAVE_ENDPOINT'
      );
    });

    it('should throw CANNOT_MODIFY_OWNER when target is OWNER', async () => {
      const targetMember = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-2',
        role: 'OWNER',
      };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);

      await expect(removeMember('org-1', 'mem-1', 'user-1', 'ADMIN' as any)).rejects.toThrow(
        'CANNOT_MODIFY_OWNER'
      );
    });

    it('should throw CANNOT_MODIFY_HIGHER_ROLE when actor lacks permission', async () => {
      const targetMember = {
        id: 'mem-2',
        organizationId: 'org-1',
        userId: 'user-2',
        role: 'ADMIN',
      };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(targetMember);
      vi.mocked(canModifyMember).mockReturnValue(false);

      await expect(removeMember('org-1', 'mem-2', 'user-1', 'ADMIN' as any)).rejects.toThrow(
        'CANNOT_MODIFY_HIGHER_ROLE'
      );
    });
  });

  // -----------------------------------------
  // leaveOrganization
  // -----------------------------------------

  describe('leaveOrganization', () => {
    it('should remove membership when leaving', async () => {
      const membership = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'MEMBER',
      };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(membership);
      mockPrisma.organizationMember.delete.mockResolvedValue({});

      await leaveOrganization('org-1', 'user-1');

      expect(mockPrisma.organizationMember.delete).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
      });
    });

    it('should throw NOT_ORG_MEMBER when user is not a member', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(leaveOrganization('org-1', 'user-1')).rejects.toThrow('NOT_ORG_MEMBER');
    });

    it('should throw LAST_OWNER for sole owner', async () => {
      const membership = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'OWNER',
      };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(membership);
      mockPrisma.organizationMember.count.mockResolvedValue(1);

      await expect(leaveOrganization('org-1', 'user-1')).rejects.toThrow('LAST_OWNER');
    });

    it('should allow owner to leave when there are multiple owners', async () => {
      const membership = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'OWNER',
      };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(membership);
      mockPrisma.organizationMember.count.mockResolvedValue(2);
      mockPrisma.organizationMember.delete.mockResolvedValue({});

      await leaveOrganization('org-1', 'user-1');

      expect(mockPrisma.organizationMember.delete).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
      });
    });
  });

  // -----------------------------------------
  // transferOwnership
  // -----------------------------------------

  describe('transferOwnership', () => {
    it('should swap roles in a transaction', async () => {
      const newOwnerMember = {
        id: 'mem-2',
        organizationId: 'org-1',
        userId: 'user-2',
        role: 'ADMIN',
      };
      const currentOwnerMember = {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'OWNER',
      };

      mockPrisma.organizationMember.findFirst
        .mockResolvedValueOnce(newOwnerMember)
        .mockResolvedValueOnce(currentOwnerMember);

      // transferOwnership uses array transaction
      mockPrisma.organizationMember.update
        .mockReturnValueOnce({ ...newOwnerMember, role: 'OWNER' })
        .mockReturnValueOnce({ ...currentOwnerMember, role: 'ADMIN' });
      mockPrisma.$transaction.mockResolvedValue([
        { ...newOwnerMember, role: 'OWNER' },
        { ...currentOwnerMember, role: 'ADMIN' },
      ]);

      await transferOwnership('org-1', 'user-2', 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw MEMBER_NOT_FOUND when new owner is not a member', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(transferOwnership('org-1', 'user-999', 'user-1')).rejects.toThrow(
        'MEMBER_NOT_FOUND'
      );
    });

    it('should throw UNAUTHORIZED when current owner is not actually an owner', async () => {
      const newOwnerMember = { id: 'mem-2', userId: 'user-2', role: 'ADMIN' };
      const currentOwnerMember = { id: 'mem-1', userId: 'user-1', role: 'ADMIN' }; // Not OWNER

      mockPrisma.organizationMember.findFirst
        .mockResolvedValueOnce(newOwnerMember)
        .mockResolvedValueOnce(currentOwnerMember);

      await expect(transferOwnership('org-1', 'user-2', 'user-1')).rejects.toThrow('UNAUTHORIZED');
    });
  });

  // -----------------------------------------
  // createInvite (organisation service version)
  // -----------------------------------------

  describe('createInvite', () => {
    it('should create invite and send email', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        allowedDomains: [],
      });
      vi.mocked(canAssignRole).mockReturnValue(true);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no existing member
        .mockResolvedValueOnce({ id: 'user-1', email: 'inviter@example.com', name: 'Inviter' }); // inviter
      mockPrisma.invite.findFirst.mockResolvedValue(null);
      mockGenerateInviteToken.mockReturnValue('invite-token');
      mockExpiresIn.mockReturnValue(new Date());
      const mockInvite = { id: 'inv-1', email: 'new@example.com', token: 'invite-token' };
      mockPrisma.invite.create.mockResolvedValue(mockInvite);
      mockSendInviteEmail.mockResolvedValue(undefined);

      const result = await createInvite(
        'org-1',
        { email: 'new@example.com', role: 'MEMBER' as any },
        'user-1',
        'OWNER' as any
      );

      expect(result).toEqual(mockInvite);
      expect(mockSendInviteEmail).toHaveBeenCalledWith(
        'new@example.com',
        'invite-token',
        'Test Org',
        'Inviter'
      );
    });

    it('should throw ORG_NOT_FOUND when organisation does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        createInvite(
          'org-999',
          { email: 'a@b.com', role: 'MEMBER' as any },
          'user-1',
          'OWNER' as any
        )
      ).rejects.toThrow('ORG_NOT_FOUND');
    });

    it('should throw DOMAIN_NOT_ALLOWED when email domain is not permitted', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        allowedDomains: ['corp.com'],
      });

      await expect(
        createInvite(
          'org-1',
          { email: 'user@other.com', role: 'MEMBER' as any },
          'user-1',
          'OWNER' as any
        )
      ).rejects.toThrow('DOMAIN_NOT_ALLOWED');
    });

    it('should throw INSUFFICIENT_ROLE when actor cannot assign role', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        allowedDomains: [],
      });
      vi.mocked(canAssignRole).mockReturnValue(false);

      await expect(
        createInvite(
          'org-1',
          { email: 'user@example.com', role: 'OWNER' as any },
          'user-1',
          'ADMIN' as any
        )
      ).rejects.toThrow('INSUFFICIENT_ROLE');
    });

    it('should throw MEMBER_ALREADY_EXISTS when user is already a member', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        allowedDomains: [],
      });
      vi.mocked(canAssignRole).mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'existing@example.com',
        memberships: [{ organizationId: 'org-1' }],
      });

      await expect(
        createInvite(
          'org-1',
          { email: 'existing@example.com', role: 'MEMBER' as any },
          'user-1',
          'OWNER' as any
        )
      ).rejects.toThrow('MEMBER_ALREADY_EXISTS');
    });

    it('should throw INVITE_ALREADY_EXISTS for pending invite', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        allowedDomains: [],
      });
      vi.mocked(canAssignRole).mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.invite.findFirst.mockResolvedValue({ id: 'inv-existing' });

      await expect(
        createInvite(
          'org-1',
          { email: 'new@example.com', role: 'MEMBER' as any },
          'user-1',
          'OWNER' as any
        )
      ).rejects.toThrow('INVITE_ALREADY_EXISTS');
    });
  });

  // -----------------------------------------
  // getInvites
  // -----------------------------------------

  describe('getInvites', () => {
    it('should return pending invites', async () => {
      const mockInvites = [{ id: 'inv-1', acceptedAt: null }];
      mockPrisma.invite.findMany.mockResolvedValue(mockInvites);

      const result = await getInvites('org-1');

      expect(result).toEqual(mockInvites);
      expect(mockPrisma.invite.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', acceptedAt: null },
        include: {
          invitedBy: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // -----------------------------------------
  // getInvite
  // -----------------------------------------

  describe('getInvite', () => {
    it('should return invite by ID and orgId', async () => {
      const mockInvite = { id: 'inv-1', organizationId: 'org-1' };
      mockPrisma.invite.findFirst.mockResolvedValue(mockInvite);

      const result = await getInvite('org-1', 'inv-1');

      expect(result).toEqual(mockInvite);
    });

    it('should return null when invite not found', async () => {
      mockPrisma.invite.findFirst.mockResolvedValue(null);

      const result = await getInvite('org-1', 'inv-999');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------
  // cancelInvite
  // -----------------------------------------

  describe('cancelInvite', () => {
    it('should delete the invite', async () => {
      const invite = { id: 'inv-1', organizationId: 'org-1', acceptedAt: null };
      mockPrisma.invite.findFirst.mockResolvedValue(invite);
      mockPrisma.invite.delete.mockResolvedValue({});

      await cancelInvite('org-1', 'inv-1');

      expect(mockPrisma.invite.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });

    it('should throw INVITE_NOT_FOUND when invite does not exist', async () => {
      mockPrisma.invite.findFirst.mockResolvedValue(null);

      await expect(cancelInvite('org-1', 'inv-999')).rejects.toThrow('INVITE_NOT_FOUND');
    });

    it('should throw INVITE_ALREADY_ACCEPTED for accepted invite', async () => {
      const invite = { id: 'inv-1', organizationId: 'org-1', acceptedAt: new Date() };
      mockPrisma.invite.findFirst.mockResolvedValue(invite);

      await expect(cancelInvite('org-1', 'inv-1')).rejects.toThrow('INVITE_ALREADY_ACCEPTED');
    });
  });

  // -----------------------------------------
  // resendInvite
  // -----------------------------------------

  describe('resendInvite', () => {
    it('should regenerate token and resend email', async () => {
      const invite = {
        id: 'inv-1',
        email: 'new@example.com',
        acceptedAt: null,
        organization: { name: 'Test Org' },
        invitedBy: { name: 'Inviter', email: 'inviter@example.com' },
      };
      mockPrisma.invite.findFirst.mockResolvedValue(invite);
      mockGenerateInviteToken.mockReturnValue('new-token');
      mockExpiresIn.mockReturnValue(new Date());
      const updatedInvite = { ...invite, token: 'new-token' };
      mockPrisma.invite.update.mockResolvedValue(updatedInvite);
      mockSendInviteEmail.mockResolvedValue(undefined);

      const result = await resendInvite('org-1', 'inv-1');

      expect(result.token).toBe('new-token');
      expect(mockSendInviteEmail).toHaveBeenCalledWith(
        'new@example.com',
        'new-token',
        'Test Org',
        'Inviter'
      );
    });

    it('should throw INVITE_NOT_FOUND when invite does not exist', async () => {
      mockPrisma.invite.findFirst.mockResolvedValue(null);

      await expect(resendInvite('org-1', 'inv-999')).rejects.toThrow('INVITE_NOT_FOUND');
    });

    it('should throw INVITE_ALREADY_ACCEPTED for accepted invite', async () => {
      mockPrisma.invite.findFirst.mockResolvedValue({
        id: 'inv-1',
        acceptedAt: new Date(),
      });

      await expect(resendInvite('org-1', 'inv-1')).rejects.toThrow('INVITE_ALREADY_ACCEPTED');
    });
  });
});
