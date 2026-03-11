import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TimeReportPanel from '../TimeReportPanel.vue';

vi.mock('@/stores/databases', () => ({
  useDatabasesStore: () => ({
    sortedProperties: [
      {
        id: 'dur-prop',
        databaseId: 'db-1',
        name: 'Time Spent',
        type: 'DURATION',
        position: 0,
        config: null,
      },
    ],
    filteredAndSortedRows: [
      {
        id: 'r1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'dur-prop': 3_600_000 },
        createdById: 'user-1',
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'r2',
        databaseId: 'db-1',
        position: 1,
        cells: { 'dur-prop': 1_800_000 },
        createdById: 'user-2',
        createdAt: '2026-03-05',
        updatedAt: '2026-03-05',
      },
    ],
  }),
}));

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => ({
    members: [
      { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } },
      { user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' } },
    ],
  }),
}));

describe('TimeReportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collapsed by default', () => {
    const wrapper = mount(TimeReportPanel);
    expect(wrapper.find('.time-report__header').exists()).toBe(true);
    expect(wrapper.find('.time-report__body').exists()).toBe(false);
  });

  it('shows total badge when collapsed and data exists', () => {
    const wrapper = mount(TimeReportPanel);
    expect(wrapper.find('.time-report__badge').text()).toContain('1h');
  });

  it('expands when header is clicked', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    expect(wrapper.find('.time-report__body').exists()).toBe(true);
  });

  it('shows summary cards when expanded', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    const cards = wrapper.findAll('.time-report__card');
    expect(cards).toHaveLength(3);
  });

  it('displays total time in first card', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    const totalCard = wrapper.findAll('.time-report__card-value')[0];
    expect(totalCard!.text()).toContain('1h');
  });

  it('displays per-user breakdown', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    const userRows = wrapper.findAll('.time-report__user-row');
    expect(userRows).toHaveLength(2);
    expect(wrapper.find('.time-report__user-name').text()).toBe('Alice');
  });

  it('has aria-expanded attribute on header', () => {
    const wrapper = mount(TimeReportPanel);
    expect(wrapper.find('.time-report__header').attributes('aria-expanded')).toBe('false');
  });

  it('toggles aria-expanded when clicked', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    expect(wrapper.find('.time-report__header').attributes('aria-expanded')).toBe('true');
  });

  it('has export CSV button', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    expect(wrapper.find('.time-report__export-btn').exists()).toBe(true);
    expect(wrapper.find('.time-report__export-btn').text()).toContain('Export CSV');
  });

  it('shows date inputs when expanded', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    const dateInputs = wrapper.findAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
  });

  it('collapses when header is clicked again', async () => {
    const wrapper = mount(TimeReportPanel);
    await wrapper.find('.time-report__header').trigger('click');
    expect(wrapper.find('.time-report__body').exists()).toBe(true);
    await wrapper.find('.time-report__header').trigger('click');
    expect(wrapper.find('.time-report__body').exists()).toBe(false);
  });
});
