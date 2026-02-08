import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockAdminService = vi.hoisted(() => ({
  getOrganizations: vi.fn(),
  deleteOrganization: vi.fn(),
  restoreOrganization: vi.fn(),
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

vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    props: ['open', 'title', 'message', 'confirmText', 'variant'],
    emits: ['confirm', 'close'],
    template: '<div v-if="open" class="confirm-dialog-stub"><slot /></div>',
  },
}));

import AdminOrganizationsPage from '../AdminOrganizationsPage.vue';

const sampleOrganizations = [
  {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    logoUrl: null,
    accentColor: '#FF5733',
    createdAt: '2024-01-10T10:00:00Z',
    deletedAt: null,
    memberCount: 15,
  },
  {
    id: 'org-2',
    name: 'Widget Inc',
    slug: 'widget-inc',
    logoUrl: null,
    accentColor: null,
    createdAt: '2024-02-14T09:00:00Z',
    deletedAt: '2024-05-01T12:00:00Z',
    memberCount: 5,
  },
];

const samplePagination = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
};

function mountPage() {
  return mount(AdminOrganizationsPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('AdminOrganizationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockAdminService.getOrganizations.mockResolvedValue({
      organizations: sampleOrganizations,
      pagination: samplePagination,
    });
  });

  it('renders the page header with title and description', () => {
    const wrapper = mountPage();
    expect(wrapper.find('.page-title').text()).toBe('Organizations');
    expect(wrapper.find('.page-description').text()).toBe('Manage all organizations in the system');
  });

  it('shows loading skeleton rows whilst data is being fetched', () => {
    mockAdminService.getOrganizations.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();
    expect(wrapper.findAll('.skeleton-row').length).toBeGreaterThan(0);
  });

  it('displays organisations after successful load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('shows organisation name and slug', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const orgNames = wrapper.findAll('.org-name');
    expect(orgNames[0].text()).toBe('Acme Corp');
    expect(orgNames[1].text()).toBe('Widget Inc');

    const orgSlugs = wrapper.findAll('.org-slug');
    expect(orgSlugs[0].text()).toBe('/acme-corp');
    expect(orgSlugs[1].text()).toBe('/widget-inc');
  });

  it('shows correct status badges for active and deleted orgs', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const badges = wrapper.findAll('.badge');
    expect(badges[0].text()).toBe('Active');
    expect(badges[0].classes()).toContain('badge-active');
    expect(badges[1].text()).toBe('Deleted');
    expect(badges[1].classes()).toContain('badge-deleted');
  });

  it('shows member count for each organisation', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const memberCounts = wrapper.findAll('.member-count');
    expect(memberCounts[0].text()).toBe('15');
    expect(memberCounts[1].text()).toBe('5');
  });

  it('shows total organisations count in toolbar stats', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.stats-text').text()).toContain('2 organizations total');
  });

  it('shows empty state when no organisations are returned', async () => {
    mockAdminService.getOrganizations.mockResolvedValue({
      organizations: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No organizations found');
  });

  it('shows restore button for deleted organisations', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    const deletedRow = rows[1];
    expect(deletedRow.find('.action-btn.restore').exists()).toBe(true);
  });

  it('shows delete button for active organisations', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    const activeRow = rows[0];
    expect(activeRow.find('.action-btn.danger').exists()).toBe(true);
  });

  it('calls restoreOrganization when restore button is clicked', async () => {
    mockAdminService.restoreOrganization.mockResolvedValue(undefined);

    const wrapper = mountPage();
    await flushPromises();

    const restoreBtn = wrapper.find('.action-btn.restore');
    await restoreBtn.trigger('click');
    await flushPromises();

    expect(mockAdminService.restoreOrganization).toHaveBeenCalledWith('org-2');
    expect(mockToast.success).toHaveBeenCalledWith('Organization restored successfully');
  });

  it('shows toast on restore error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminService.restoreOrganization.mockRejectedValue(new Error('Server error'));

    const wrapper = mountPage();
    await flushPromises();

    const restoreBtn = wrapper.find('.action-btn.restore');
    await restoreBtn.trigger('click');
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to restore organization');
    consoleSpy.mockRestore();
  });

  it('shows toast on load error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdminService.getOrganizations.mockRejectedValue(new Error('Network failure'));

    mountPage();
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to load organizations');
    consoleSpy.mockRestore();
  });

  it('renders search input', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const searchInput = wrapper.find('.search-input');
    expect(searchInput.exists()).toBe(true);
    expect(searchInput.attributes('placeholder')).toBe('Search organizations by name or slug...');
  });

  it('does not show pagination when totalPages is 1', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.pagination').exists()).toBe(false);
  });

  it('shows pagination when totalPages is greater than 1', async () => {
    mockAdminService.getOrganizations.mockResolvedValue({
      organizations: sampleOrganizations,
      pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.pagination').exists()).toBe(true);
    expect(wrapper.find('.page-info').text()).toContain('Page 1 of 3');
  });

  it('applies accent colour to organisation logo', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const logos = wrapper.findAll('.org-logo');
    expect(logos[0].attributes('style')).toContain('#FF5733');
    // org-2 has null accentColor, falls back to default #6B8F71
    expect(logos[1].attributes('style')).toContain('#6B8F71');
  });
});
