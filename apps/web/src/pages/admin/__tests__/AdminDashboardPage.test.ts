import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockAdminService = vi.hoisted(() => ({
  getStats: vi.fn(),
  getSystemHealth: vi.fn(),
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

vi.mock('@/components/skeletons/DashboardSkeleton.vue', () => ({
  default: {
    name: 'DashboardSkeleton',
    template:
      '<div class="stub-dashboard-skeleton"><div class="stat-card skeleton" v-for="i in 9" :key="i" /></div>',
  },
}));

import AdminDashboardPage from '../AdminDashboardPage.vue';

const sampleStats = {
  users: { total: 42, verified: 38, superAdmins: 3 },
  organizations: { total: 10, active: 7 },
  pages: 250,
  databases: 15,
  files: { total: 120, totalSize: 52428800 },
  templates: 8,
  backups: 4,
};

const sampleHealth = {
  database: { status: 'connected' as const },
  storage: { status: 'connected' as const },
  collaboration: { status: 'connected' as const },
  server: {
    uptime: 86400,
    nodeVersion: 'v20.10.0',
    memory: { rss: 104857600, heapTotal: 83886080, heapUsed: 62914560 },
  },
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
    mockAdminService.getSystemHealth.mockResolvedValue(sampleHealth);
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
    expect(wrapper.find('.stub-dashboard-skeleton').exists()).toBe(true);
    expect(wrapper.find('.stats-grid').exists()).toBe(false);
  });

  it('shows skeleton cards whilst loading', () => {
    mockAdminService.getStats.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();
    const skeletons = wrapper.findAll('.stat-card.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays stats after successful load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.stub-dashboard-skeleton').exists()).toBe(false);
    expect(wrapper.find('.stats-grid').exists()).toBe(true);

    const statValues = wrapper.findAll('.stat-value');
    // Total Users, Super Admins, Organizations, Deleted Orgs, Pages, Databases, Files, Templates, Backups
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
      ...sampleStats,
      organizations: { total: 20, active: 15 },
    });
    const wrapper = mountPage();
    await flushPromises();

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[3].text()).toBe('5'); // 20 - 15
  });

  it('shows page count stat card', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const labels = wrapper.findAll('.stat-label').map((el) => el.text());
    expect(labels).toContain('Pages');

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[4].text()).toBe('250');
  });

  it('shows database count stat card', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const labels = wrapper.findAll('.stat-label').map((el) => el.text());
    expect(labels).toContain('Databases');

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[5].text()).toBe('15');
  });

  it('shows file count stat card', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const labels = wrapper.findAll('.stat-label').map((el) => el.text());
    expect(labels).toContain('Files');

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[6].text()).toBe('120');
  });

  it('shows template count stat card', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const labels = wrapper.findAll('.stat-label').map((el) => el.text());
    expect(labels).toContain('Templates');

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[7].text()).toBe('8');
  });

  it('shows backup count stat card', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const labels = wrapper.findAll('.stat-label').map((el) => el.text());
    expect(labels).toContain('Backups');

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[8].text()).toBe('4');
  });

  it('shows storage usage section with formatted size', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const sectionTitles = wrapper.findAll('.section-title').map((el) => el.text());
    expect(sectionTitles).toContain('Storage Usage');

    expect(wrapper.find('.storage-section').exists()).toBe(true);
    expect(wrapper.find('.storage-section').text()).toContain('50.0 MB');
  });

  it('shows health section with status indicators', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const sectionTitles = wrapper.findAll('.section-title').map((el) => el.text());
    expect(sectionTitles).toContain('System Health');

    expect(wrapper.find('.health-section').exists()).toBe(true);

    const healthLabels = wrapper.findAll('.health-label').map((el) => el.text());
    expect(healthLabels).toContain('Database');
    expect(healthLabels).toContain('Storage');
    expect(healthLabels).toContain('Collaboration');
  });

  it('shows server uptime in human-readable format', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.health-section').text()).toContain('1d 0h');
  });

  it('shows Node.js version', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.health-section').text()).toContain('v20.10.0');
  });

  it('shows toast on stats error and hides stats grid', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminService.getStats.mockRejectedValue(new Error('Network error'));

    const wrapper = mountPage();
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to load statistics');
    expect(wrapper.find('.stats-grid').exists()).toBe(false);
    expect(wrapper.find('.stub-dashboard-skeleton').exists()).toBe(false);

    consoleSpy.mockRestore();
  });

  it('shows toast on health fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminService.getSystemHealth.mockRejectedValue(new Error('Health error'));

    mountPage();
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to load system health');
    consoleSpy.mockRestore();
  });

  it('renders quick actions section with three links', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const sectionTitles = wrapper.findAll('.section-title').map((el) => el.text());
    expect(sectionTitles).toContain('Quick Actions');
    const actionCards = wrapper.findAll('.action-card');
    expect(actionCards).toHaveLength(3);
  });

  it('shows correct titles for quick action cards', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const titles = wrapper.findAll('.action-title').map((el) => el.text());
    expect(titles).toEqual(['Manage Users', 'Manage Organizations', 'System Settings']);
  });

  it('calls both getStats and getSystemHealth on mount', async () => {
    mountPage();
    await flushPromises();
    expect(mockAdminService.getStats).toHaveBeenCalledTimes(1);
    expect(mockAdminService.getSystemHealth).toHaveBeenCalledTimes(1);
  });
});
