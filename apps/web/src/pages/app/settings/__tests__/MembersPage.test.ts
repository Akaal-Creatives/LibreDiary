import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const { mockAuthStore, mockOrgsStore } = vi.hoisted(() => ({
  mockAuthStore: {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } as any,
    currentOrganizationId: 'org-1',
    currentOrganization: { id: 'org-1', name: 'Test Org' } as any,
  },
  mockOrgsStore: {
    members: [] as any[],
    invites: [] as any[],
    isOwner: false,
    isAdmin: false,
    canManageMembers: false,
    canManageInvites: false,
    fetchOrganization: vi.fn(),
    fetchMembers: vi.fn(),
    fetchInvites: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    cancelInvite: vi.fn(),
    resendInvite: vi.fn(),
  },
}));

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStore,
}));

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => mockOrgsStore,
}));

vi.mock('@/services', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/components/MemberRoleBadge.vue', () => ({
  default: {
    name: 'MemberRoleBadge',
    template: '<span class="stub-role-badge">{{ role }}</span>',
    props: ['role', 'size'],
  },
}));

vi.mock('@/components/InviteMemberModal.vue', () => ({
  default: {
    name: 'InviteMemberModal',
    template: '<div class="stub-invite-modal" />',
    props: ['open'],
    emits: ['close', 'invited'],
  },
}));

import MembersPage from '../MembersPage.vue';

function mountPage() {
  return mount(MembersPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('MembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset store defaults
    mockAuthStore.user = { id: 'user-1', name: 'Test User', email: 'test@example.com' };
    mockAuthStore.currentOrganizationId = 'org-1';
    mockAuthStore.currentOrganization = { id: 'org-1', name: 'Test Org' };

    mockOrgsStore.members = [];
    mockOrgsStore.invites = [];
    mockOrgsStore.isOwner = false;
    mockOrgsStore.isAdmin = false;
    mockOrgsStore.canManageMembers = false;
    mockOrgsStore.canManageInvites = false;

    mockOrgsStore.fetchOrganization.mockResolvedValue(undefined);
    mockOrgsStore.fetchMembers.mockResolvedValue(undefined);
    mockOrgsStore.fetchInvites.mockResolvedValue(undefined);
    mockOrgsStore.updateMemberRole.mockResolvedValue(undefined);
    mockOrgsStore.removeMember.mockResolvedValue(undefined);
    mockOrgsStore.cancelInvite.mockResolvedValue(undefined);
    mockOrgsStore.resendInvite.mockResolvedValue(undefined);
  });

  // ---- Page Header ----

  describe('page header', () => {
    it('renders the page title "Members"', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-title').text()).toBe('Members');
    });

    it('displays the organisation name in the subtitle', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Test Org');
    });

    it('shows the invite button when user can manage members', async () => {
      mockOrgsStore.canManageMembers = true;
      const wrapper = mountPage();
      await flushPromises();

      const inviteBtn = wrapper.find('.btn-primary');
      expect(inviteBtn.exists()).toBe(true);
      expect(inviteBtn.text()).toContain('Invite Member');
    });

    it('hides the invite button when user cannot manage members', async () => {
      mockOrgsStore.canManageMembers = false;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.btn-primary').exists()).toBe(false);
    });
  });

  // ---- Loading State ----

  describe('loading state', () => {
    it('shows loading state while data is being fetched', () => {
      mockOrgsStore.fetchOrganization.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      const wrapper = mountPage();

      expect(wrapper.find('.loading-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading members...');
    });

    it('hides loading state after data loads', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.loading-state').exists()).toBe(false);
    });
  });

  // ---- Members List ----

  describe('members list', () => {
    const mockMembers = [
      {
        id: 'member-1',
        userId: 'user-1',
        role: 'OWNER' as const,
        user: { name: 'Test User', email: 'test@example.com' },
      },
      {
        id: 'member-2',
        userId: 'user-2',
        role: 'ADMIN' as const,
        user: { name: 'Admin User', email: 'admin@example.com' },
      },
      {
        id: 'member-3',
        userId: 'user-3',
        role: 'MEMBER' as const,
        user: { name: '', email: 'member@example.com' },
      },
    ];

    it('displays all members', async () => {
      mockOrgsStore.members = mockMembers;
      const wrapper = mountPage();
      await flushPromises();

      const memberCards = wrapper.findAll('.member-card');
      expect(memberCards).toHaveLength(3);
    });

    it('shows member name and email', async () => {
      mockOrgsStore.members = [mockMembers[1]];
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Admin User');
      expect(wrapper.text()).toContain('admin@example.com');
    });

    it('falls back to email when name is empty', async () => {
      mockOrgsStore.members = [mockMembers[2]];
      const wrapper = mountPage();
      await flushPromises();

      const memberName = wrapper.find('.member-name');
      expect(memberName.text()).toContain('member@example.com');
    });

    it('shows "(You)" badge for the current user', async () => {
      mockOrgsStore.members = mockMembers;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.you-badge').exists()).toBe(true);
      expect(wrapper.find('.you-badge').text()).toBe('(You)');
    });

    it('displays member count', async () => {
      mockOrgsStore.members = mockMembers;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.member-count').text()).toBe('3');
    });

    it('shows empty state when there are no members', async () => {
      mockOrgsStore.members = [];
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('No members found');
    });
  });

  // ---- Member Actions ----

  describe('member actions', () => {
    const mockMembers = [
      {
        id: 'member-1',
        userId: 'user-1',
        role: 'OWNER' as const,
        user: { name: 'Test User', email: 'test@example.com' },
      },
      {
        id: 'member-2',
        userId: 'user-2',
        role: 'MEMBER' as const,
        user: { name: 'Other User', email: 'other@example.com' },
      },
    ];

    it('shows action buttons for modifiable members when user is admin', async () => {
      mockOrgsStore.members = mockMembers;
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      // Owner (self) should not have action buttons
      const memberCards = wrapper.findAll('.member-card');
      expect(memberCards[0].find('.member-actions').exists()).toBe(false);
      // Other member should have action buttons
      expect(memberCards[1].find('.member-actions').exists()).toBe(true);
    });

    it('does not show action buttons when user is a regular member', async () => {
      mockOrgsStore.members = mockMembers;
      mockOrgsStore.isOwner = false;
      mockOrgsStore.isAdmin = false;
      const wrapper = mountPage();
      await flushPromises();

      const actionButtons = wrapper.findAll('.member-actions');
      expect(actionButtons).toHaveLength(0);
    });

    it('opens role change modal when change role button is clicked', async () => {
      mockOrgsStore.members = mockMembers;
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      // Click "Change role" button on second member
      const memberCards = wrapper.findAll('.member-card');
      const changeRoleBtn = memberCards[1].findAll('.action-btn')[0];
      await changeRoleBtn.trigger('click');

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.text()).toContain('Change Role');
    });

    it('opens remove confirmation modal when remove button is clicked', async () => {
      mockOrgsStore.members = mockMembers;
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      // Click "Remove member" button on second member
      const memberCards = wrapper.findAll('.member-card');
      const removeBtn = memberCards[1].findAll('.action-btn')[1];
      await removeBtn.trigger('click');

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.text()).toContain('Remove Member');
    });
  });

  // ---- Pending Invites Section ----

  describe('pending invites section', () => {
    const mockInvites = [
      {
        id: 'inv-1',
        email: 'newinvite@example.com',
        role: 'MEMBER' as const,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      },
    ];

    it('shows pending invites section when user can manage invites and there are pending invites', async () => {
      mockOrgsStore.canManageInvites = true;
      mockOrgsStore.invites = mockInvites;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.invites-section').exists()).toBe(true);
      expect(wrapper.text()).toContain('Pending Invitations');
      expect(wrapper.text()).toContain('newinvite@example.com');
    });

    it('hides pending invites section when user cannot manage invites', async () => {
      mockOrgsStore.canManageInvites = false;
      mockOrgsStore.invites = mockInvites;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.invites-section').exists()).toBe(false);
    });

    it('displays invite count badge', async () => {
      mockOrgsStore.canManageInvites = true;
      mockOrgsStore.invites = mockInvites;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.invite-count').text()).toBe('1');
    });
  });

  // ---- Error Handling ----

  describe('error handling', () => {
    it('fetches organisation, members, and invites on mount', async () => {
      mockOrgsStore.canManageInvites = true;
      mountPage();
      await flushPromises();

      expect(mockOrgsStore.fetchOrganization).toHaveBeenCalledTimes(1);
      expect(mockOrgsStore.fetchMembers).toHaveBeenCalledTimes(1);
      expect(mockOrgsStore.fetchInvites).toHaveBeenCalledTimes(1);
    });

    it('shows error message when data loading fails', async () => {
      mockOrgsStore.fetchOrganization.mockRejectedValue(new Error('Network error'));
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load members');
    });
  });
});
