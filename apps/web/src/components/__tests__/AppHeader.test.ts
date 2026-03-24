import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { usePagesStore, useSyncStore, useDatabasesStore } from '@/stores';

// Mock the stores barrel export so we can control return values per test
vi.mock('@/stores', () => ({
  usePagesStore: vi.fn(),
  useSyncStore: vi.fn(),
  useDatabasesStore: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/composables', () => ({
  useToast: () => ({
    toasts: ref([]),
    addToast: vi.fn(),
    removeToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('@/composables/useSidebar', () => ({
  useSidebar: () => ({
    isOverlay: ref(false),
    isOpen: ref(true),
    toggle: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/composables/usePagePanels', () => ({
  usePagePanels: () => ({
    showCommentsPanel: ref(false),
    showVersionHistory: ref(false),
    showShareModal: ref(false),
    commentCount: ref(0),
    openComments: vi.fn(),
    closeComments: vi.fn(),
    openVersionHistory: vi.fn(),
    closeVersionHistory: vi.fn(),
    openShare: vi.fn(),
    closeShare: vi.fn(),
    setCommentCount: vi.fn(),
    closePanels: vi.fn(),
  }),
}));

import AppHeader from '../AppHeader.vue';

function mountHeader() {
  return mount(AppHeader, {
    global: {
      stubs: {
        NotificationBell: { template: '<div />' },
        ShareModal: { template: '<div />' },
        VersionHistoryModal: { template: '<div />' },
        CommentsPanel: { template: '<div />' },
        PageContextMenu: { template: '<div />' },
        SaveAsTemplateModal: { template: '<div />' },
        ConfirmDialog: { template: '<div />' },
        Teleport: true,
        Transition: true,
      },
    },
  });
}

describe('AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Default mock return values (no current page, idle sync)
    vi.mocked(usePagesStore).mockReturnValue({
      currentPage: null,
      isFavorite: vi.fn().mockReturnValue(false),
      toggleFavorite: vi.fn(),
    } as unknown as ReturnType<typeof usePagesStore>);

    vi.mocked(useSyncStore).mockReturnValue({
      status: 'idle',
      statusMessage: '',
    } as unknown as ReturnType<typeof useSyncStore>);

    vi.mocked(useDatabasesStore).mockReturnValue({
      currentDatabase: null,
      deleteDatabase: vi.fn(),
    } as unknown as ReturnType<typeof useDatabasesStore>);
  });

  // -----------------------------------------------------------------
  // Breadcrumbs / header-left section
  // -----------------------------------------------------------------

  describe('breadcrumbs and page title', () => {
    it('shows "Dashboard" text when no current page is set', () => {
      const wrapper = mountHeader();

      const headerTitle = wrapper.find('.header-title');
      expect(headerTitle.exists()).toBe(true);
      expect(headerTitle.text()).toBe('Dashboard');
    });

    it('shows breadcrumbs with icon and title when currentPage exists', () => {
      vi.mocked(usePagesStore).mockReturnValue({
        currentPage: { id: 'page-1', title: 'My Page', icon: '📝' },
        isFavorite: vi.fn().mockReturnValue(false),
        toggleFavorite: vi.fn(),
      } as unknown as ReturnType<typeof usePagesStore>);

      const wrapper = mountHeader();

      expect(wrapper.find('.breadcrumbs').exists()).toBe(true);
      expect(wrapper.find('.breadcrumb-icon').text()).toBe('📝');
      expect(wrapper.find('.breadcrumb-title').text()).toBe('My Page');
    });

    it('shows default icon (📄) when currentPage has no icon', () => {
      vi.mocked(usePagesStore).mockReturnValue({
        currentPage: { id: 'page-2', title: 'Untitled', icon: null },
        isFavorite: vi.fn().mockReturnValue(false),
        toggleFavorite: vi.fn(),
      } as unknown as ReturnType<typeof usePagesStore>);

      const wrapper = mountHeader();

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

      const wrapper = mountHeader();

      expect(wrapper.find('.sync-indicator').exists()).toBe(false);
    });

    it('shows sync dot when status is pending', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        status: 'pending',
        statusMessage: 'Waiting to save...',
      } as unknown as ReturnType<typeof useSyncStore>);

      const wrapper = mountHeader();

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

      const wrapper = mountHeader();

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

      const wrapper = mountHeader();

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

      const wrapper = mountHeader();

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

      const wrapper = mountHeader();

      const syncText = wrapper.find('.sync-text');
      expect(syncText.exists()).toBe(true);
      expect(syncText.text()).toBe('Saving...');
    });
  });

  // -----------------------------------------------------------------
  // Action buttons in header-right
  // -----------------------------------------------------------------

  describe('action buttons', () => {
    beforeEach(() => {
      // Action buttons only render when currentPage is set
      vi.mocked(usePagesStore).mockReturnValue({
        currentPage: { id: 'page-1', title: 'My Page', icon: '📝' },
        isFavorite: vi.fn().mockReturnValue(false),
        toggleFavorite: vi.fn(),
      } as unknown as ReturnType<typeof usePagesStore>);
    });

    it('renders action buttons (history, comments, favourite)', () => {
      const wrapper = mountHeader();

      const actionButtons = wrapper.findAll('.action-btn');
      expect(actionButtons).toHaveLength(3);
    });

    it('renders share button', () => {
      const wrapper = mountHeader();

      const shareBtn = wrapper.find('.share-btn');
      expect(shareBtn.exists()).toBe(true);
    });

    it('renders more options button', () => {
      const wrapper = mountHeader();

      const moreBtn = wrapper.find('.more-btn');
      expect(moreBtn.exists()).toBe(true);
    });
  });

  // -----------------------------------------------------------------
  // Database view context
  // -----------------------------------------------------------------

  describe('database view context', () => {
    beforeEach(() => {
      // No current page, but a current database
      vi.mocked(usePagesStore).mockReturnValue({
        currentPage: null,
        isFavorite: vi.fn().mockReturnValue(false),
        toggleFavorite: vi.fn(),
      } as unknown as ReturnType<typeof usePagesStore>);

      vi.mocked(useDatabasesStore).mockReturnValue({
        currentDatabase: { id: 'db-1', name: 'Task Tracker' },
        deleteDatabase: vi.fn(),
      } as unknown as ReturnType<typeof useDatabasesStore>);
    });

    it('shows database name in breadcrumbs when currentDatabase is set', () => {
      const wrapper = mountHeader();

      expect(wrapper.find('.breadcrumbs').exists()).toBe(true);
      expect(wrapper.find('.breadcrumb-title').text()).toBe('Task Tracker');
    });

    it('shows database icon in breadcrumbs', () => {
      const wrapper = mountHeader();

      const icon = wrapper.find('.breadcrumb-icon');
      expect(icon.exists()).toBe(true);
    });

    it('does not show page-specific action buttons (history, comments, favourite)', () => {
      const wrapper = mountHeader();

      const actionButtons = wrapper.findAll('.action-btn');
      expect(actionButtons).toHaveLength(0);
    });

    it('does not show share button on database view', () => {
      const wrapper = mountHeader();

      expect(wrapper.find('.share-btn').exists()).toBe(false);
    });

    it('shows a more-options button for databases', () => {
      const wrapper = mountHeader();

      expect(wrapper.find('.db-more-btn').exists()).toBe(true);
    });

    it('shows database dropdown menu when more-options is clicked', async () => {
      const wrapper = mountHeader();

      await wrapper.find('.db-more-btn').trigger('click');

      expect(wrapper.find('.db-context-menu').exists()).toBe(true);
    });

    it('shows rename and delete options in database dropdown', async () => {
      const wrapper = mountHeader();

      await wrapper.find('.db-more-btn').trigger('click');

      const menuText = wrapper.find('.db-context-menu').text();
      expect(menuText).toContain('Rename');
      expect(menuText).toContain('Delete');
    });
  });

  // -----------------------------------------------------------------
  // Neither page nor database (dashboard)
  // -----------------------------------------------------------------

  describe('dashboard context', () => {
    it('shows "Dashboard" when neither page nor database is set', () => {
      const wrapper = mountHeader();

      expect(wrapper.find('.header-title').text()).toBe('Dashboard');
      expect(wrapper.find('.breadcrumbs').exists()).toBe(false);
    });

    it('does not show any action buttons on dashboard', () => {
      const wrapper = mountHeader();

      expect(wrapper.findAll('.action-btn')).toHaveLength(0);
      expect(wrapper.find('.share-btn').exists()).toBe(false);
      expect(wrapper.find('.more-btn').exists()).toBe(false);
      expect(wrapper.find('.db-more-btn').exists()).toBe(false);
    });
  });
});
