import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockAdminService = vi.hoisted(() => ({
  getUsers: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  restoreUser: vi.fn(),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/services', () => ({
  adminService: mockAdminService,
}));

vi.mock('@/composables', () => ({
  useToast: () => mockToast,
  useLocale: () => ({ currentLocale: ref('en-GB'), setLocale: vi.fn() }),
}));

vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    props: ['open', 'title', 'message', 'confirmText', 'variant'],
    emits: ['confirm', 'close'],
    template: '<div v-if="open" class="confirm-dialog-stub"><slot /></div>',
  },
}));

import AdminUsersPage from '../AdminUsersPage.vue';

const sampleUsers = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Smith',
    avatarUrl: null,
    isSuperAdmin: false,
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00Z',
    deletedAt: null,
    organizationCount: 2,
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    name: 'Bob Jones',
    avatarUrl: null,
    isSuperAdmin: true,
    emailVerified: true,
    createdAt: '2024-02-20T14:30:00Z',
    deletedAt: null,
    organizationCount: 1,
  },
  {
    id: 'user-3',
    email: 'charlie@example.com',
    name: null,
    avatarUrl: null,
    isSuperAdmin: false,
    emailVerified: false,
    createdAt: '2024-03-10T09:00:00Z',
    deletedAt: '2024-04-01T12:00:00Z',
    organizationCount: 0,
  },
];

const samplePagination = {
  page: 1,
  limit: 20,
  total: 3,
  totalPages: 1,
};

function mountPage() {
  return mount(AdminUsersPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockAdminService.getUsers.mockResolvedValue({
      users: sampleUsers,
      pagination: samplePagination,
    });
  });

  it('renders the page header with title and description', () => {
    const wrapper = mountPage();
    expect(wrapper.find('.page-title').text()).toBe('Users');
    expect(wrapper.find('.page-description').text()).toBe('Manage all users in the system');
  });

  it('shows loading skeleton rows whilst data is being fetched', () => {
    mockAdminService.getUsers.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();
    expect(wrapper.findAll('.skeleton-row').length).toBeGreaterThan(0);
  });

  it('displays users after successful load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('shows user name and email in user cells', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const userNames = wrapper.findAll('.user-name');
    expect(userNames[0].text()).toContain('Alice Smith');
    expect(userNames[1].text()).toContain('Bob Jones');
    // user-3 has no name
    expect(userNames[2].text()).toContain('No name');

    const userEmails = wrapper.findAll('.user-email');
    expect(userEmails[0].text()).toBe('alice@example.com');
  });

  it('shows Admin badge for super admin users', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const adminBadges = wrapper.findAll('.admin-badge');
    expect(adminBadges).toHaveLength(1);
    expect(adminBadges[0].text()).toBe('Admin');
  });

  it('shows correct status badges', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const badges = wrapper.findAll('.badge');
    expect(badges[0].text()).toBe('Verified');
    expect(badges[0].classes()).toContain('badge-verified');
    expect(badges[1].text()).toBe('Verified');
    expect(badges[2].text()).toBe('Deleted');
    expect(badges[2].classes()).toContain('badge-deleted');
  });

  it('shows organisation count for each user', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const orgCounts = wrapper.findAll('.org-count');
    expect(orgCounts[0].text()).toBe('2');
    expect(orgCounts[1].text()).toBe('1');
    expect(orgCounts[2].text()).toBe('0');
  });

  it('shows total users count in toolbar stats', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.stats-text').text()).toContain('3 users total');
  });

  it('shows empty state when no users are returned', async () => {
    mockAdminService.getUsers.mockResolvedValue({
      users: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No users found');
  });

  it('shows restore button for deleted users', async () => {
    const wrapper = mountPage();
    await flushPromises();

    // user-3 is deleted so should have a restore button
    const rows = wrapper.findAll('tbody tr');
    const deletedRow = rows[2];
    expect(deletedRow.find('.action-btn.restore').exists()).toBe(true);
  });

  it('shows delete and toggle admin buttons for active users', async () => {
    const wrapper = mountPage();
    await flushPromises();

    // user-1 is active, not deleted
    const rows = wrapper.findAll('tbody tr');
    const activeRow = rows[0];
    const actionBtns = activeRow.findAll('.action-btn');
    expect(actionBtns.length).toBe(2); // toggle admin + delete
  });

  it('calls restoreUser when restore button is clicked', async () => {
    mockAdminService.restoreUser.mockResolvedValue(undefined);

    const wrapper = mountPage();
    await flushPromises();

    const restoreBtn = wrapper.find('.action-btn.restore');
    await restoreBtn.trigger('click');
    await flushPromises();

    expect(mockAdminService.restoreUser).toHaveBeenCalledWith('user-3');
    expect(mockToast.success).toHaveBeenCalledWith('User restored successfully');
  });

  it('shows toast on restore error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminService.restoreUser.mockRejectedValue(new Error('Server error'));

    const wrapper = mountPage();
    await flushPromises();

    const restoreBtn = wrapper.find('.action-btn.restore');
    await restoreBtn.trigger('click');
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to restore user');
    consoleSpy.mockRestore();
  });

  it('shows toast on load error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminService.getUsers.mockRejectedValue(new Error('Network failure'));

    mountPage();
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to load users');
    consoleSpy.mockRestore();
  });

  it('renders search input', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const searchInput = wrapper.find('.search-input');
    expect(searchInput.exists()).toBe(true);
    expect(searchInput.attributes('placeholder')).toBe('Search users by name or email...');
  });

  it('does not show pagination when totalPages is 1', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.pagination').exists()).toBe(false);
  });

  it('shows pagination when totalPages is greater than 1', async () => {
    mockAdminService.getUsers.mockResolvedValue({
      users: sampleUsers,
      pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.pagination').exists()).toBe(true);
    expect(wrapper.find('.page-info').text()).toContain('Page 1 of 3');
  });
});
