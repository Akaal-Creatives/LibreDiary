import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AppHeader from '../AppHeader.vue';
import { usePagesStore, useSyncStore } from '@/stores';

// Mock the stores barrel export so we can control return values per test
vi.mock('@/stores', () => ({
  usePagesStore: vi.fn(),
  useSyncStore: vi.fn(),
}));

describe('AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Default mock return values (no current page, idle sync)
    vi.mocked(usePagesStore).mockReturnValue({
      currentPage: null,
    } as unknown as ReturnType<typeof usePagesStore>);

    vi.mocked(useSyncStore).mockReturnValue({
      status: 'idle',
      statusMessage: '',
    } as unknown as ReturnType<typeof useSyncStore>);
  });

  // -----------------------------------------------------------------
  // Breadcrumbs / header-left section
  // -----------------------------------------------------------------

  describe('breadcrumbs and page title', () => {
    it('shows "Dashboard" text when no current page is set', () => {
      const wrapper = mount(AppHeader);

      const headerTitle = wrapper.find('.header-title');
      expect(headerTitle.exists()).toBe(true);
      expect(headerTitle.text()).toBe('Dashboard');
    });

    it('shows breadcrumbs with icon and title when currentPage exists', () => {
      vi.mocked(usePagesStore).mockReturnValue({
        currentPage: { id: 'page-1', title: 'My Page', icon: '📝' },
      } as unknown as ReturnType<typeof usePagesStore>);

      const wrapper = mount(AppHeader);

      expect(wrapper.find('.breadcrumbs').exists()).toBe(true);
      expect(wrapper.find('.breadcrumb-icon').text()).toBe('📝');
      expect(wrapper.find('.breadcrumb-title').text()).toBe('My Page');
    });

    it('shows default icon (📄) when currentPage has no icon', () => {
      vi.mocked(usePagesStore).mockReturnValue({
        currentPage: { id: 'page-2', title: 'Untitled', icon: null },
      } as unknown as ReturnType<typeof usePagesStore>);

      const wrapper = mount(AppHeader);

      expect(wrapper.find('.breadcrumb-icon').text()).toBe('📄');
    });
  });

  // -----------------------------------------------------------------
  // Sync status indicator
  // -----------------------------------------------------------------

  describe('sync status indicator', () => {
    it('hides sync indicator when status is idle', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        status: 'idle',
        statusMessage: '',
      } as unknown as ReturnType<typeof useSyncStore>);

      const wrapper = mount(AppHeader);

      expect(wrapper.find('.sync-indicator').exists()).toBe(false);
    });

    it('shows sync dot when status is pending', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        status: 'pending',
        statusMessage: 'Waiting to save...',
      } as unknown as ReturnType<typeof useSyncStore>);

      const wrapper = mount(AppHeader);

      const indicator = wrapper.find('.sync-indicator');
      expect(indicator.exists()).toBe(true);
      expect(indicator.classes()).toContain('sync-pending');
      expect(wrapper.find('.sync-dot').exists()).toBe(true);
    });

    it('shows sync dot when status is saving', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        status: 'saving',
        statusMessage: 'Saving...',
      } as unknown as ReturnType<typeof useSyncStore>);

      const wrapper = mount(AppHeader);

      const indicator = wrapper.find('.sync-indicator');
      expect(indicator.exists()).toBe(true);
      expect(indicator.classes()).toContain('sync-saving');
      expect(wrapper.find('.sync-dot').exists()).toBe(true);
    });

    it('shows sync checkmark when status is saved', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        status: 'saved',
        statusMessage: 'All changes saved',
      } as unknown as ReturnType<typeof useSyncStore>);

      const wrapper = mount(AppHeader);

      const indicator = wrapper.find('.sync-indicator');
      expect(indicator.exists()).toBe(true);
      expect(indicator.classes()).toContain('sync-saved');
      expect(wrapper.find('.sync-check').exists()).toBe(true);
      // Ensure the checkmark SVG is rendered
      expect(wrapper.find('.check-icon').exists()).toBe(true);
    });

    it('shows sync error icon when status is error', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        status: 'error',
        statusMessage: 'Failed to save',
      } as unknown as ReturnType<typeof useSyncStore>);

      const wrapper = mount(AppHeader);

      const indicator = wrapper.find('.sync-indicator');
      expect(indicator.exists()).toBe(true);
      expect(indicator.classes()).toContain('sync-error');
      expect(wrapper.find('.sync-error').exists()).toBe(true);
      // Ensure the error SVG is rendered
      expect(wrapper.find('.error-icon').exists()).toBe(true);
    });

    it('displays sync status message text', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        status: 'saving',
        statusMessage: 'Saving...',
      } as unknown as ReturnType<typeof useSyncStore>);

      const wrapper = mount(AppHeader);

      const syncText = wrapper.find('.sync-text');
      expect(syncText.exists()).toBe(true);
      expect(syncText.text()).toBe('Saving...');
    });
  });

  // -----------------------------------------------------------------
  // Action buttons in header-right
  // -----------------------------------------------------------------

  describe('action buttons', () => {
    it('renders action buttons (history, comments, favourite)', () => {
      const wrapper = mount(AppHeader);

      const actionButtons = wrapper.findAll('.action-btn');
      expect(actionButtons).toHaveLength(3);

      // Verify by their title attributes
      const titles = actionButtons.map((btn) => btn.attributes('title'));
      expect(titles).toContain('View history');
      expect(titles).toContain('Comments');
      expect(titles).toContain('Favourite');
    });

    it('renders share button with "Share" text', () => {
      const wrapper = mount(AppHeader);

      const shareBtn = wrapper.find('.share-btn');
      expect(shareBtn.exists()).toBe(true);
      expect(shareBtn.text()).toBe('Share');
    });

    it('renders more options button', () => {
      const wrapper = mount(AppHeader);

      const moreBtn = wrapper.find('.more-btn');
      expect(moreBtn.exists()).toBe(true);
      expect(moreBtn.attributes('title')).toBe('More options');
    });
  });
});
