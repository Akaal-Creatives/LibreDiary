import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const { mockPagesStore, mockDialog } = vi.hoisted(() => ({
  mockPagesStore: {
    fetchTrashedPages: vi.fn(),
    trashedPages: [] as any[],
    trashLoading: false,
    restorePage: vi.fn(),
    permanentlyDeletePage: vi.fn(),
  },
  mockDialog: {
    confirm: vi.fn().mockResolvedValue(true),
    alert: vi.fn(),
  },
}));

vi.mock('@/stores', () => ({ usePagesStore: () => mockPagesStore }));
vi.mock('@/composables', () => ({ useDialog: () => mockDialog }));

import TrashPage from '../TrashPage.vue';

const trashedPages = [
  {
    id: 'page-1',
    title: 'Deleted Note',
    icon: null,
    parentId: null,
    organizationId: 'org-1',
    position: 0,
    coverUrl: null,
    htmlContent: null,
    isPublic: false,
    publicSlug: null,
    trashedAt: '2024-06-01T10:00:00Z',
    createdById: 'user-1',
    updatedById: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'page-2',
    title: 'Old Draft',
    icon: '\uD83D\uDCDD',
    parentId: null,
    organizationId: 'org-1',
    position: 1,
    coverUrl: null,
    htmlContent: null,
    isPublic: false,
    publicSlug: null,
    trashedAt: '2024-06-02T14:30:00Z',
    createdById: 'user-1',
    updatedById: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

describe('TrashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockPagesStore.trashedPages = [];
    mockPagesStore.trashLoading = false;
    mockPagesStore.fetchTrashedPages.mockResolvedValue(undefined);
    mockPagesStore.restorePage.mockResolvedValue(undefined);
    mockPagesStore.permanentlyDeletePage.mockResolvedValue(undefined);
    mockDialog.confirm.mockResolvedValue(true);
  });

  it('calls fetchTrashedPages on mount', async () => {
    mount(TrashPage);
    await flushPromises();
    expect(mockPagesStore.fetchTrashedPages).toHaveBeenCalled();
  });

  it('shows loading state when trashLoading is true', () => {
    mockPagesStore.trashLoading = true;
    const wrapper = mount(TrashPage);
    expect(wrapper.find('.loading-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading trashed pages');
  });

  it('shows empty state when no trashed pages', async () => {
    mockPagesStore.trashedPages = [];
    mockPagesStore.trashLoading = false;
    const wrapper = mount(TrashPage);
    await flushPromises();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Trash is empty');
  });

  it('renders page header with title and description', () => {
    const wrapper = mount(TrashPage);
    expect(wrapper.find('.page-header').exists()).toBe(true);
    expect(wrapper.find('.page-title').text()).toContain('Trash');
    expect(wrapper.find('.page-description').text()).toContain('permanently deleted after 30 days');
  });

  it('shows trashed pages list with titles', async () => {
    mockPagesStore.trashedPages = trashedPages;
    const wrapper = mount(TrashPage);
    await flushPromises();

    const items = wrapper.findAll('.trash-item');
    expect(items).toHaveLength(2);
    expect(items[0].find('.item-title').text()).toBe('Deleted Note');
    expect(items[1].find('.item-title').text()).toBe('Old Draft');
  });

  it('shows trashed date for each item', async () => {
    mockPagesStore.trashedPages = trashedPages;
    const wrapper = mount(TrashPage);
    await flushPromises();

    const dates = wrapper.findAll('.item-date');
    expect(dates).toHaveLength(2);
    // Verify dates contain "Deleted" prefix and a formatted date string
    expect(dates[0].text()).toContain('Deleted');
    expect(dates[1].text()).toContain('Deleted');
  });

  it('shows page icon when available', async () => {
    mockPagesStore.trashedPages = trashedPages;
    const wrapper = mount(TrashPage);
    await flushPromises();

    const icons = wrapper.findAll('.item-icon');
    // First page has no icon (should show SVG fallback)
    expect(icons[0].find('svg').exists()).toBe(true);
    // Second page has an emoji icon
    expect(icons[1].text()).toContain('\uD83D\uDCDD');
  });

  it('calls restorePage when restore button is clicked', async () => {
    mockPagesStore.trashedPages = trashedPages;
    const wrapper = mount(TrashPage);
    await flushPromises();

    const restoreBtn = wrapper.findAll('.restore-btn')[0];
    await restoreBtn.trigger('click');
    await flushPromises();

    expect(mockPagesStore.restorePage).toHaveBeenCalledWith('page-1');
  });

  it('shows confirm dialog when delete button is clicked', async () => {
    mockPagesStore.trashedPages = trashedPages;
    const wrapper = mount(TrashPage);
    await flushPromises();

    const deleteBtn = wrapper.findAll('.delete-btn')[0];
    await deleteBtn.trigger('click');
    await flushPromises();

    expect(mockDialog.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Permanently',
        variant: 'destructive',
      })
    );
  });

  it('calls permanentlyDeletePage after confirmation', async () => {
    mockPagesStore.trashedPages = trashedPages;
    mockDialog.confirm.mockResolvedValue(true);
    const wrapper = mount(TrashPage);
    await flushPromises();

    const deleteBtn = wrapper.findAll('.delete-btn')[0];
    await deleteBtn.trigger('click');
    await flushPromises();

    expect(mockPagesStore.permanentlyDeletePage).toHaveBeenCalledWith('page-1');
  });

  it('does not delete when confirmation is cancelled', async () => {
    mockPagesStore.trashedPages = trashedPages;
    mockDialog.confirm.mockResolvedValue(false);
    const wrapper = mount(TrashPage);
    await flushPromises();

    const deleteBtn = wrapper.findAll('.delete-btn')[0];
    await deleteBtn.trigger('click');
    await flushPromises();

    expect(mockPagesStore.permanentlyDeletePage).not.toHaveBeenCalled();
  });

  it('shows error message when fetchTrashedPages fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPagesStore.fetchTrashedPages.mockRejectedValue(new Error('Network error'));

    const wrapper = mount(TrashPage);
    await flushPromises();

    expect(wrapper.find('.error-message').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to load trashed pages');

    consoleError.mockRestore();
  });

  it('shows error message when restore fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPagesStore.trashedPages = trashedPages;
    mockPagesStore.restorePage.mockRejectedValue(new Error('Restore failed'));

    const wrapper = mount(TrashPage);
    await flushPromises();

    const restoreBtn = wrapper.findAll('.restore-btn')[0];
    await restoreBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('.error-message').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to restore page');

    consoleError.mockRestore();
  });
});
