import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockAdminService = vi.hoisted(() => ({
  getStats: vi.fn(),
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
}));

import AdminDashboardPage from '../AdminDashboardPage.vue';

const sampleStats = {
  users: { total: 42, verified: 38, superAdmins: 3 },
  organizations: { total: 10, active: 7 },
};

function mountPage() {
  return mount(AdminDashboardPage, {
    global: {
      stubs: {
        Teleport: true,
        RouterLink: {
          name: 'RouterLink',
          props: ['to'],
          template: '<a class="router-link"><slot /></a>',
        },
      },
    },
  });
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockAdminService.getStats.mockResolvedValue(sampleStats);
  });

  it('renders the page header with title and description', () => {
    const wrapper = mountPage();
    expect(wrapper.find('.page-title').text()).toBe('Dashboard');
    expect(wrapper.find('.page-description').text()).toBe('System overview and statistics');
  });

  it('shows loading skeleton whilst stats are being fetched', () => {
    // Make getStats hang so loading stays true
    mockAdminService.getStats.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();
    expect(wrapper.find('.loading-grid').exists()).toBe(true);
    expect(wrapper.find('.stats-grid').exists()).toBe(false);
  });

  it('displays stats after successful load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.loading-grid').exists()).toBe(false);
    expect(wrapper.find('.stats-grid').exists()).toBe(true);

    const statValues = wrapper.findAll('.stat-value');
    // Total Users, Super Admins, Organizations, Deleted Orgs
    expect(statValues[0].text()).toBe('42');
    expect(statValues[1].text()).toBe('3');
    expect(statValues[2].text()).toBe('10');
    expect(statValues[3].text()).toBe('3'); // total - active = 10 - 7
  });

  it('displays verified user count in badge', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const badgeValues = wrapper.findAll('.badge-value');
    expect(badgeValues[0].text()).toBe('38'); // verified
  });

  it('displays active organisations count in badge', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const badgeValues = wrapper.findAll('.badge-value');
    expect(badgeValues[1].text()).toBe('7'); // active
  });

  it('computes deleted organisations correctly', async () => {
    mockAdminService.getStats.mockResolvedValue({
      users: { total: 5, verified: 3, superAdmins: 1 },
      organizations: { total: 20, active: 15 },
    });
    const wrapper = mountPage();
    await flushPromises();

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[3].text()).toBe('5'); // 20 - 15
  });

  it('shows toast on error and hides stats grid', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminService.getStats.mockRejectedValue(new Error('Network error'));

    const wrapper = mountPage();
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to load statistics');
    expect(wrapper.find('.stats-grid').exists()).toBe(false);
    expect(wrapper.find('.loading-grid').exists()).toBe(false);

    consoleSpy.mockRestore();
  });

  it('renders quick actions section with three links', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.section-title').text()).toBe('Quick Actions');
    const actionCards = wrapper.findAll('.action-card');
    expect(actionCards).toHaveLength(3);
  });

  it('shows correct titles for quick action cards', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const titles = wrapper.findAll('.action-title').map((el) => el.text());
    expect(titles).toEqual(['Manage Users', 'Manage Organizations', 'System Settings']);
  });

  it('calls adminService.getStats on mount', async () => {
    mountPage();
    await flushPromises();
    expect(mockAdminService.getStats).toHaveBeenCalledTimes(1);
  });
});
