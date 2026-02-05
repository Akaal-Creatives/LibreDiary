import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOrganizationsStore } from '../organizations';
import { useAuthStore } from '../auth';
import { organizationsService } from '@/services/organizations.service';
import type { Organization, OrganizationMember } from '@librediary/shared';
import type { MemberWithUser, InviteInfo } from '@/services/organizations.service';

// Mock the organizations service
vi.mock('@/services/organizations.service', () => ({
  organizationsService: {
    getOrganization: vi.fn(),
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
    getMembers: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    leaveOrganization: vi.fn(),
    transferOwnership: vi.fn(),
    getInvites: vi.fn(),
    createInvite: vi.fn(),
    cancelInvite: vi.fn(),
    resendInvite: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useOrganizationsStore', () => {
  // Test data
  const mockOrg: Organization = {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logoUrl: null,
    accentColor: null,
    allowedDomains: [],
    aiEnabled: false,
  };

  const mockMembership: OrganizationMember = {
    id: 'member-1',
    userId: 'user-1',
    organizationId: 'org-1',
    role: 'OWNER',
    createdAt: new Date().toISOString(),
  };

  const mockMemberWithUser: MemberWithUser = {
    ...mockMembership,
    user: {
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      avatarUrl: null,
    },
  };

  const mockInvite: InviteInfo = {
    id: 'invite-1',
    email: 'invited@test.com',
    role: 'MEMBER',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    invitedBy: {
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Helper to setup auth store with org
  function setupAuthStore(role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER') {
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      emailVerified: true,
      isSuperAdmin: false,
      locale: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl: null,
    });
    authStore.setOrganizations([mockOrg], [{ organizationId: mockOrg.id, role }]);
    return authStore;
  }

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useOrganizationsStore();

      expect(store.currentMembership).toBeNull();
      expect(store.members).toEqual([]);
      expect(store.invites).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.membersLoading).toBe(false);
      expect(store.invitesLoading).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should return currentOrganization from auth store', () => {
      setupAuthStore();
      const store = useOrganizationsStore();

      expect(store.currentOrganization).toEqual(mockOrg);
    });

    it('should return currentOrganizationId from auth store', () => {
      setupAuthStore();
      const store = useOrganizationsStore();

      expect(store.currentOrganizationId).toBe(mockOrg.id);
    });

    describe('Role-based computed properties', () => {
      it('should identify owner role correctly', () => {
        setupAuthStore('OWNER');
        const store = useOrganizationsStore();

        expect(store.userRole).toBe('OWNER');
        expect(store.isOwner).toBe(true);
        expect(store.isAdmin).toBe(true);
        expect(store.isMember).toBe(true);
      });

      it('should identify admin role correctly', () => {
        setupAuthStore('ADMIN');
        const store = useOrganizationsStore();

        expect(store.userRole).toBe('ADMIN');
        expect(store.isOwner).toBe(false);
        expect(store.isAdmin).toBe(true);
        expect(store.isMember).toBe(true);
      });

      it('should identify member role correctly', () => {
        setupAuthStore('MEMBER');
        const store = useOrganizationsStore();

        expect(store.userRole).toBe('MEMBER');
        expect(store.isOwner).toBe(false);
        expect(store.isAdmin).toBe(false);
        expect(store.isMember).toBe(true);
      });

      it('should return null role when no membership', () => {
        const authStore = useAuthStore();
        authStore.setOrganizations([], []);
        const store = useOrganizationsStore();

        expect(store.userRole).toBeNull();
        expect(store.isOwner).toBe(false);
        expect(store.isAdmin).toBe(false);
        expect(store.isMember).toBe(false);
      });
    });

    describe('Permission computed properties', () => {
      it('should allow owner all permissions', () => {
        setupAuthStore('OWNER');
        const store = useOrganizationsStore();

        expect(store.canManageMembers).toBe(true);
        expect(store.canManageSettings).toBe(true);
        expect(store.canManageInvites).toBe(true);
        expect(store.canDeleteOrganization).toBe(true);
        expect(store.canConfigureDomainLockdown).toBe(true);
        expect(store.canTransferOwnership).toBe(true);
      });

      it('should allow admin limited permissions', () => {
        setupAuthStore('ADMIN');
        const store = useOrganizationsStore();

        expect(store.canManageMembers).toBe(true);
        expect(store.canManageSettings).toBe(true);
        expect(store.canManageInvites).toBe(true);
        expect(store.canDeleteOrganization).toBe(false);
        expect(store.canConfigureDomainLockdown).toBe(false);
        expect(store.canTransferOwnership).toBe(false);
      });

      it('should deny member management permissions', () => {
        setupAuthStore('MEMBER');
        const store = useOrganizationsStore();

        expect(store.canManageMembers).toBe(false);
        expect(store.canManageSettings).toBe(false);
        expect(store.canManageInvites).toBe(false);
        expect(store.canDeleteOrganization).toBe(false);
        expect(store.canConfigureDomainLockdown).toBe(false);
        expect(store.canTransferOwnership).toBe(false);
      });
    });
  });

  describe('Organization Actions', () => {
    describe('fetchOrganization', () => {
      it('should fetch and update organization data', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.getOrganization).mockResolvedValue({
          organization: mockOrg,
          membership: mockMembership,
        });

        await store.fetchOrganization();

        expect(organizationsService.getOrganization).toHaveBeenCalledWith(mockOrg.id);
        expect(store.currentMembership).toEqual(mockMembership);
        expect(store.loading).toBe(false);
      });

      it('should not fetch if no current organization', async () => {
        const authStore = useAuthStore();
        authStore.setOrganizations([], []);
        const store = useOrganizationsStore();

        await store.fetchOrganization();

        expect(organizationsService.getOrganization).not.toHaveBeenCalled();
      });

      it('should set loading state correctly', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.getOrganization).mockImplementation(
          () =>
            new Promise((resolve) => {
              expect(store.loading).toBe(true);
              resolve({ organization: mockOrg, membership: mockMembership });
            })
        );

        await store.fetchOrganization();

        expect(store.loading).toBe(false);
      });

      it('should reset loading on error', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.getOrganization).mockRejectedValue(new Error('Failed'));

        await expect(store.fetchOrganization()).rejects.toThrow('Failed');
        expect(store.loading).toBe(false);
      });
    });

    describe('createOrganization', () => {
      it('should create organization and update stores', async () => {
        const authStore = useAuthStore();
        authStore.setUser({
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          emailVerified: true,
          isSuperAdmin: false,
          locale: 'en',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          avatarUrl: null,
        });
        authStore.setOrganizations([], []);

        const store = useOrganizationsStore();

        vi.mocked(organizationsService.createOrganization).mockResolvedValue({
          organization: mockOrg,
          membership: mockMembership,
        });

        const result = await store.createOrganization({ name: 'Test Org' });

        expect(organizationsService.createOrganization).toHaveBeenCalledWith({ name: 'Test Org' });
        expect(result).toEqual(mockOrg);
        expect(authStore.organizations).toContainEqual(mockOrg);
        expect(authStore.currentOrganizationId).toBe(mockOrg.id);
        expect(store.currentMembership).toEqual(mockMembership);
      });
    });

    describe('updateOrganization', () => {
      it('should update organization in auth store', async () => {
        const authStore = setupAuthStore();
        const store = useOrganizationsStore();

        const updatedOrg = { ...mockOrg, name: 'Updated Org' };
        vi.mocked(organizationsService.updateOrganization).mockResolvedValue({
          organization: updatedOrg,
        });

        await store.updateOrganization({ name: 'Updated Org' });

        expect(organizationsService.updateOrganization).toHaveBeenCalledWith(mockOrg.id, {
          name: 'Updated Org',
        });
        expect(authStore.organizations[0]?.name).toBe('Updated Org');
      });

      it('should not update if no current organization', async () => {
        const authStore = useAuthStore();
        authStore.setOrganizations([], []);
        const store = useOrganizationsStore();

        await store.updateOrganization({ name: 'Updated Org' });

        expect(organizationsService.updateOrganization).not.toHaveBeenCalled();
      });
    });

    describe('deleteOrganization', () => {
      it('should delete organization and clear state', async () => {
        const authStore = setupAuthStore();
        const store = useOrganizationsStore();
        store.members = [mockMemberWithUser];
        store.invites = [mockInvite];

        vi.mocked(organizationsService.deleteOrganization).mockResolvedValue({
          message: 'Deleted',
        });

        await store.deleteOrganization();

        expect(organizationsService.deleteOrganization).toHaveBeenCalledWith(mockOrg.id);
        expect(authStore.organizations).toEqual([]);
        expect(store.currentMembership).toBeNull();
        expect(store.members).toEqual([]);
        expect(store.invites).toEqual([]);
      });
    });
  });

  describe('Member Management Actions', () => {
    describe('fetchMembers', () => {
      it('should fetch and update members list', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.getMembers).mockResolvedValue({
          members: [mockMemberWithUser],
        });

        await store.fetchMembers();

        expect(organizationsService.getMembers).toHaveBeenCalledWith(mockOrg.id);
        expect(store.members).toEqual([mockMemberWithUser]);
        expect(store.membersLoading).toBe(false);
      });

      it('should set membersLoading state correctly', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.getMembers).mockImplementation(
          () =>
            new Promise((resolve) => {
              expect(store.membersLoading).toBe(true);
              resolve({ members: [mockMemberWithUser] });
            })
        );

        await store.fetchMembers();

        expect(store.membersLoading).toBe(false);
      });
    });

    describe('updateMemberRole', () => {
      it('should update member role and refresh members', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.updateMemberRole).mockResolvedValue({
          member: { ...mockMembership, role: 'ADMIN' },
        });
        vi.mocked(organizationsService.getMembers).mockResolvedValue({
          members: [{ ...mockMemberWithUser, role: 'ADMIN' }],
        });

        await store.updateMemberRole('member-1', 'ADMIN');

        expect(organizationsService.updateMemberRole).toHaveBeenCalledWith(
          mockOrg.id,
          'member-1',
          'ADMIN'
        );
        expect(organizationsService.getMembers).toHaveBeenCalled();
      });
    });

    describe('removeMember', () => {
      it('should remove member from local state', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        store.members = [mockMemberWithUser];

        vi.mocked(organizationsService.removeMember).mockResolvedValue({ message: 'Removed' });

        await store.removeMember('member-1');

        expect(organizationsService.removeMember).toHaveBeenCalledWith(mockOrg.id, 'member-1');
        expect(store.members).toEqual([]);
      });

      it('should only remove the specified member', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        const otherMember: MemberWithUser = {
          ...mockMemberWithUser,
          id: 'member-2',
          userId: 'user-2',
        };
        store.members = [mockMemberWithUser, otherMember];

        vi.mocked(organizationsService.removeMember).mockResolvedValue({ message: 'Removed' });

        await store.removeMember('member-1');

        expect(store.members).toEqual([otherMember]);
      });
    });

    describe('leaveOrganization', () => {
      it('should leave and clear organization state', async () => {
        const authStore = setupAuthStore();
        const store = useOrganizationsStore();
        store.members = [mockMemberWithUser];
        store.invites = [mockInvite];

        vi.mocked(organizationsService.leaveOrganization).mockResolvedValue({ message: 'Left' });

        await store.leaveOrganization();

        expect(organizationsService.leaveOrganization).toHaveBeenCalledWith(mockOrg.id);
        expect(authStore.organizations).toEqual([]);
        expect(store.currentMembership).toBeNull();
        expect(store.members).toEqual([]);
        expect(store.invites).toEqual([]);
      });
    });

    describe('transferOwnership', () => {
      it('should transfer ownership and refresh data', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.transferOwnership).mockResolvedValue({
          message: 'Transferred',
        });
        vi.mocked(organizationsService.getOrganization).mockResolvedValue({
          organization: mockOrg,
          membership: { ...mockMembership, role: 'ADMIN' },
        });
        vi.mocked(organizationsService.getMembers).mockResolvedValue({
          members: [mockMemberWithUser],
        });

        await store.transferOwnership('new-owner-id');

        expect(organizationsService.transferOwnership).toHaveBeenCalledWith(
          mockOrg.id,
          'new-owner-id'
        );
        expect(organizationsService.getOrganization).toHaveBeenCalled();
        expect(organizationsService.getMembers).toHaveBeenCalled();
      });
    });
  });

  describe('Invite Management Actions', () => {
    describe('fetchInvites', () => {
      it('should fetch and update invites list', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.getInvites).mockResolvedValue({
          invites: [mockInvite],
        });

        await store.fetchInvites();

        expect(organizationsService.getInvites).toHaveBeenCalledWith(mockOrg.id);
        expect(store.invites).toEqual([mockInvite]);
        expect(store.invitesLoading).toBe(false);
      });

      it('should set invitesLoading state correctly', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();

        vi.mocked(organizationsService.getInvites).mockImplementation(
          () =>
            new Promise((resolve) => {
              expect(store.invitesLoading).toBe(true);
              resolve({ invites: [mockInvite] });
            })
        );

        await store.fetchInvites();

        expect(store.invitesLoading).toBe(false);
      });
    });

    describe('createInvite', () => {
      it('should create invite and add to list', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        store.invites = [];

        vi.mocked(organizationsService.createInvite).mockResolvedValue({ invite: mockInvite });

        await store.createInvite({ email: 'invited@test.com', role: 'MEMBER' });

        expect(organizationsService.createInvite).toHaveBeenCalledWith(mockOrg.id, {
          email: 'invited@test.com',
          role: 'MEMBER',
        });
        expect(store.invites).toContainEqual(mockInvite);
      });

      it('should prepend new invite to list', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        const existingInvite: InviteInfo = { ...mockInvite, id: 'invite-2' };
        store.invites = [existingInvite];

        vi.mocked(organizationsService.createInvite).mockResolvedValue({ invite: mockInvite });

        await store.createInvite({ email: 'invited@test.com', role: 'MEMBER' });

        expect(store.invites[0]).toEqual(mockInvite);
        expect(store.invites[1]).toEqual(existingInvite);
      });
    });

    describe('cancelInvite', () => {
      it('should cancel invite and remove from list', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        store.invites = [mockInvite];

        vi.mocked(organizationsService.cancelInvite).mockResolvedValue({ message: 'Cancelled' });

        await store.cancelInvite('invite-1');

        expect(organizationsService.cancelInvite).toHaveBeenCalledWith(mockOrg.id, 'invite-1');
        expect(store.invites).toEqual([]);
      });

      it('should only remove the cancelled invite', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        const otherInvite: InviteInfo = { ...mockInvite, id: 'invite-2' };
        store.invites = [mockInvite, otherInvite];

        vi.mocked(organizationsService.cancelInvite).mockResolvedValue({ message: 'Cancelled' });

        await store.cancelInvite('invite-1');

        expect(store.invites).toEqual([otherInvite]);
      });
    });

    describe('resendInvite', () => {
      it('should resend invite and update in list', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        store.invites = [mockInvite];

        const updatedInvite: InviteInfo = {
          ...mockInvite,
          expiresAt: new Date(Date.now() + 172800000).toISOString(),
        };
        vi.mocked(organizationsService.resendInvite).mockResolvedValue({
          invite: updatedInvite,
          message: 'Resent',
        });

        await store.resendInvite('invite-1');

        expect(organizationsService.resendInvite).toHaveBeenCalledWith(mockOrg.id, 'invite-1');
        expect(store.invites[0]).toEqual(updatedInvite);
      });

      it('should not update if invite not found', async () => {
        setupAuthStore();
        const store = useOrganizationsStore();
        store.invites = [mockInvite];

        const updatedInvite: InviteInfo = { ...mockInvite, id: 'invite-other' };
        vi.mocked(organizationsService.resendInvite).mockResolvedValue({
          invite: updatedInvite,
          message: 'Resent',
        });

        await store.resendInvite('invite-other');

        // Original invite should remain unchanged
        expect(store.invites[0]).toEqual(mockInvite);
      });
    });
  });

  describe('Reset Action', () => {
    it('should reset all store state', () => {
      setupAuthStore();
      const store = useOrganizationsStore();
      store.currentMembership = mockMembership;
      store.members = [mockMemberWithUser];
      store.invites = [mockInvite];

      store.reset();

      expect(store.currentMembership).toBeNull();
      expect(store.members).toEqual([]);
      expect(store.invites).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should reset loading on fetchOrganization error', async () => {
      setupAuthStore();
      const store = useOrganizationsStore();

      vi.mocked(organizationsService.getOrganization).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchOrganization()).rejects.toThrow();
      expect(store.loading).toBe(false);
    });

    it('should reset membersLoading on fetchMembers error', async () => {
      setupAuthStore();
      const store = useOrganizationsStore();

      vi.mocked(organizationsService.getMembers).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchMembers()).rejects.toThrow();
      expect(store.membersLoading).toBe(false);
    });

    it('should reset invitesLoading on fetchInvites error', async () => {
      setupAuthStore();
      const store = useOrganizationsStore();

      vi.mocked(organizationsService.getInvites).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchInvites()).rejects.toThrow();
      expect(store.invitesLoading).toBe(false);
    });
  });
});
