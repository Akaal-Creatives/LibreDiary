import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGetAuditLogs = vi.hoisted(() => vi.fn());
const mockGetAuditLogActions = vi.hoisted(() => vi.fn());

vi.mock('@/services/admin.service', () => ({
  getAuditLogs: mockGetAuditLogs,
  getAuditLogActions: mockGetAuditLogActions,
}));

import AdminAuditLogsPage from '../AdminAuditLogsPage.vue';

const sampleLogs = [
  {
    id: 'log-1',
    action: 'AUTH_LOGIN',
    userId: 'user-1',
    organizationId: null,
    resourceType: null,
    resourceId: null,
    metadata: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: '2025-01-15T10:30:00Z',
    user: { email: 'alice@example.com', name: 'Alice Smith' },
    organization: null,
  },
  {
    id: 'log-2',
    action: 'PAGE_CREATED',
    userId: 'user-2',
    organizationId: 'org-1',
    resourceType: 'page',
    resourceId: 'page-1',
    metadata: { title: 'My Page' },
    ipAddress: null,
    userAgent: null,
    createdAt: '2025-01-15T11:00:00Z',
    user: { email: 'bob@example.com', name: null },
    organization: { name: 'Acme Corp', slug: 'acme-corp' },
  },
  {
    id: 'log-3',
    action: 'BACKUP_CREATED',
    userId: null,
    organizationId: null,
    resourceType: 'backup',
    resourceId: 'backup-1',
    metadata: null,
    ipAddress: null,
    userAgent: null,
    createdAt: '2025-01-15T12:00:00Z',
    user: null,
    organization: null,
  },
];

const samplePagination = {
  page: 1,
  limit: 50,
  total: 3,
  totalPages: 1,
};

const sampleActions = ['AUTH_LOGIN', 'PAGE_CREATED', 'BACKUP_CREATED'];

function mountPage() {
  return mount(AdminAuditLogsPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('AdminAuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuditLogs.mockResolvedValue({
      logs: sampleLogs,
      pagination: samplePagination,
    });
    mockGetAuditLogActions.mockResolvedValue(sampleActions);
  });

  it('renders page header with title "Audit Logs"', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-title').text()).toBe('Audit Logs');
  });

  it('shows loading skeleton whilst fetching', () => {
    mockGetAuditLogs.mockReturnValue(new Promise(() => {}));
    mockGetAuditLogActions.mockReturnValue(new Promise(() => {}));

    const wrapper = mountPage();

    expect(wrapper.findAll('.skeleton-row').length).toBeGreaterThan(0);
  });

  it('displays audit log table after load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('shows empty state when no logs', async () => {
    mockGetAuditLogs.mockResolvedValue({
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No audit logs found');
  });

  it('calls getAuditLogs and getAuditLogActions on mount', async () => {
    mountPage();
    await flushPromises();

    expect(mockGetAuditLogs).toHaveBeenCalledTimes(1);
    expect(mockGetAuditLogActions).toHaveBeenCalledTimes(1);
  });

  it('applies action filter when selected', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const actionSelect = wrapper.find('.filter-action');
    await actionSelect.setValue('AUTH_LOGIN');
    await flushPromises();

    expect(mockGetAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'AUTH_LOGIN', page: 1 })
    );
  });

  it('navigates pagination', async () => {
    mockGetAuditLogs.mockResolvedValue({
      logs: sampleLogs,
      pagination: { page: 1, limit: 50, total: 120, totalPages: 3 },
    });

    const wrapper = mountPage();
    await flushPromises();

    const nextBtn = wrapper.find('.page-btn-next');
    await nextBtn.trigger('click');
    await flushPromises();

    expect(mockGetAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('clears all filters', async () => {
    const wrapper = mountPage();
    await flushPromises();

    // Set a filter first
    const actionSelect = wrapper.find('.filter-action');
    await actionSelect.setValue('AUTH_LOGIN');
    await flushPromises();

    // Clear filters
    const clearBtn = wrapper.find('.clear-filters-btn');
    await clearBtn.trigger('click');
    await flushPromises();

    expect(mockGetAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: undefined, page: 1 })
    );
  });

  it('shows user name/email, "System" when userId is null', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const userCells = wrapper.findAll('.user-cell');
    // log-1: Alice Smith (alice@example.com)
    expect(userCells[0].text()).toContain('Alice Smith');
    // log-3: userId is null -> System
    expect(userCells[2].text()).toBe('System');
  });

  it('formats dates in en-GB locale', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const dateCells = wrapper.findAll('.date-text');
    // Should contain "15 Jan 2025" in en-GB format
    expect(dateCells[0].text()).toContain('Jan');
    expect(dateCells[0].text()).toContain('2025');
  });
});
