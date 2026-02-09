import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const { mockAuthStore, mockOrgsStore } = vi.hoisted(() => ({
  mockAuthStore: {
    user: { id: 'user-1', name: 'Test User' } as any,
    currentOrganizationId: 'org-1',
    currentOrganization: { id: 'org-1', name: 'Test Org' } as any,
  },
  mockOrgsStore: {
    invites: [] as any[],
    fetchOrganization: vi.fn(),
    fetchInvites: vi.fn(),
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

import InvitesPage from '../InvitesPage.vue';

function mountPage() {
  return mount(InvitesPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('InvitesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset store defaults
    mockAuthStore.currentOrganizationId = 'org-1';
    mockAuthStore.currentOrganization = { id: 'org-1', name: 'Test Org' };

    mockOrgsStore.invites = [];
    mockOrgsStore.fetchOrganization.mockResolvedValue(undefined);
    mockOrgsStore.fetchInvites.mockResolvedValue(undefined);
    mockOrgsStore.cancelInvite.mockResolvedValue(undefined);
    mockOrgsStore.resendInvite.mockResolvedValue(undefined);
  });

  // ---- Page Header ----

  describe('page header', () => {
    it('renders the page title "Pending Invites"', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-title').text()).toBe('Pending Invites');
    });

    it('displays the organisation name in the subtitle', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Test Org');
    });

    it('renders the "Send Invite" button', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const btn = wrapper.find('.btn-primary');
      expect(btn.exists()).toBe(true);
      expect(btn.text()).toContain('Send Invite');
    });
  });

  // ---- Loading State ----

  describe('loading state', () => {
    it('shows loading state while invites are being fetched', () => {
      mockOrgsStore.fetchOrganization.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      const wrapper = mountPage();

      expect(wrapper.find('.loading-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading invites...');
    });

    it('hides loading state after invites load', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.loading-state').exists()).toBe(false);
    });
  });

  // ---- Empty State ----

  describe('empty state', () => {
    it('shows empty state when there are no invites', async () => {
      mockOrgsStore.invites = [];
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('No pending invites');
    });

    it('shows a "Send Invite" button within the empty state', async () => {
      mockOrgsStore.invites = [];
      const wrapper = mountPage();
      await flushPromises();

      const emptyStateBtn = wrapper.find('.empty-state .btn-primary');
      expect(emptyStateBtn.exists()).toBe(true);
      expect(emptyStateBtn.text()).toContain('Send Invite');
    });
  });

  // ---- Invites List ----

  describe('invites list', () => {
    const futureDate = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days from now
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday

    const mockInvites = [
      {
        id: 'inv-1',
        email: 'alice@example.com',
        role: 'MEMBER' as const,
        status: 'PENDING' as const,
        createdAt: '2025-01-10T10:00:00Z',
        expiresAt: futureDate,
      },
      {
        id: 'inv-2',
        email: 'bob@example.com',
        role: 'ADMIN' as const,
        status: 'PENDING' as const,
        createdAt: '2025-01-08T10:00:00Z',
        expiresAt: pastDate,
      },
    ];

    it('displays all invites', async () => {
      mockOrgsStore.invites = mockInvites;
      const wrapper = mountPage();
      await flushPromises();

      const inviteCards = wrapper.findAll('.invite-card');
      expect(inviteCards).toHaveLength(2);
    });

    it('shows invite email addresses', async () => {
      mockOrgsStore.invites = mockInvites;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('alice@example.com');
      expect(wrapper.text()).toContain('bob@example.com');
    });

    it('shows "Expired" for expired invites', async () => {
      mockOrgsStore.invites = [mockInvites[1]];
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.status-expired').exists()).toBe(true);
      expect(wrapper.find('.status-expired').text()).toBe('Expired');
    });

    it('shows resend button for non-expired invites', async () => {
      mockOrgsStore.invites = [mockInvites[0]];
      const wrapper = mountPage();
      await flushPromises();

      const inviteCard = wrapper.find('.invite-card');
      const actionBtns = inviteCard.findAll('.action-btn');
      // Should have resend button + cancel button
      expect(actionBtns.length).toBe(2);
    });

    it('hides resend button for expired invites', async () => {
      mockOrgsStore.invites = [mockInvites[1]];
      const wrapper = mountPage();
      await flushPromises();

      const inviteCard = wrapper.find('.invite-card');
      const actionBtns = inviteCard.findAll('.action-btn');
      // Should only have cancel button
      expect(actionBtns.length).toBe(1);
    });

    it('displays the role badge for each invite', async () => {
      mockOrgsStore.invites = mockInvites;
      const wrapper = mountPage();
      await flushPromises();

      const roleBadges = wrapper.findAll('.stub-role-badge');
      expect(roleBadges).toHaveLength(2);
      expect(roleBadges[0].text()).toBe('MEMBER');
      expect(roleBadges[1].text()).toBe('ADMIN');
    });
  });

  // ---- Invite Actions ----

  describe('invite actions', () => {
    const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();

    const activeInvite = {
      id: 'inv-1',
      email: 'alice@example.com',
      role: 'MEMBER' as const,
      status: 'PENDING' as const,
      createdAt: '2025-01-10T10:00:00Z',
      expiresAt: futureDate,
    };

    it('calls cancelInvite when cancel button is clicked', async () => {
      mockOrgsStore.invites = [activeInvite];
      const wrapper = mountPage();
      await flushPromises();

      const cancelBtn = wrapper.find('.action-danger');
      await cancelBtn.trigger('click');
      await flushPromises();

      expect(mockOrgsStore.cancelInvite).toHaveBeenCalledWith('inv-1');
    });

    it('shows success message after cancelling an invite', async () => {
      mockOrgsStore.invites = [activeInvite];
      const wrapper = mountPage();
      await flushPromises();

      const cancelBtn = wrapper.find('.action-danger');
      await cancelBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.alert-success').exists()).toBe(true);
      expect(wrapper.text()).toContain('Invite cancelled');
    });

    it('calls resendInvite when resend button is clicked', async () => {
      mockOrgsStore.invites = [activeInvite];
      const wrapper = mountPage();
      await flushPromises();

      // The resend button is the first action-btn (not action-danger)
      const actionBtns = wrapper.findAll('.action-btn');
      const resendBtn = actionBtns.find((btn) => !btn.classes().includes('action-danger'));
      await resendBtn!.trigger('click');
      await flushPromises();

      expect(mockOrgsStore.resendInvite).toHaveBeenCalledWith('inv-1');
    });

    it('shows success message after resending an invite', async () => {
      mockOrgsStore.invites = [activeInvite];
      const wrapper = mountPage();
      await flushPromises();

      const actionBtns = wrapper.findAll('.action-btn');
      const resendBtn = actionBtns.find((btn) => !btn.classes().includes('action-danger'));
      await resendBtn!.trigger('click');
      await flushPromises();

      expect(wrapper.find('.alert-success').exists()).toBe(true);
      expect(wrapper.text()).toContain('Invite resent successfully');
    });

    it('shows error message when cancel fails', async () => {
      mockOrgsStore.cancelInvite.mockRejectedValue(new Error('Server error'));
      mockOrgsStore.invites = [activeInvite];
      const wrapper = mountPage();
      await flushPromises();

      const cancelBtn = wrapper.find('.action-danger');
      await cancelBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to cancel invite');
    });

    it('shows error message when resend fails', async () => {
      mockOrgsStore.resendInvite.mockRejectedValue(new Error('Server error'));
      mockOrgsStore.invites = [activeInvite];
      const wrapper = mountPage();
      await flushPromises();

      const actionBtns = wrapper.findAll('.action-btn');
      const resendBtn = actionBtns.find((btn) => !btn.classes().includes('action-danger'));
      await resendBtn!.trigger('click');
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to resend invite');
    });
  });

  // ---- Data Loading ----

  describe('data loading', () => {
    it('fetches organisation and invites on mount', async () => {
      mountPage();
      await flushPromises();

      expect(mockOrgsStore.fetchOrganization).toHaveBeenCalledTimes(1);
      expect(mockOrgsStore.fetchInvites).toHaveBeenCalledTimes(1);
    });

    it('shows error message when loading fails', async () => {
      mockOrgsStore.fetchOrganization.mockRejectedValue(new Error('Network error'));
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load invites');
    });
  });
});
