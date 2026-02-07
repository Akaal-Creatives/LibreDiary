import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import type { PageVersion } from '@/services';

// Hoist mock declarations so they are available before module imports
const { mockVersionsService } = vi.hoisted(() => ({
  mockVersionsService: {
    getVersions: vi.fn(),
    getVersion: vi.fn(),
    createVersion: vi.fn(),
    restoreVersion: vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  versionsService: mockVersionsService,
}));

vi.mock('@/stores', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useOrganizationsStore: () => ({
      currentOrganization: { id: 'org-1' },
    }),
  };
});

// Stub ConfirmDialog to avoid rendering its internal template
vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    template: '<div class="stub-confirm-dialog" />',
    props: ['open', 'title', 'message', 'confirmText', 'cancelText', 'variant', 'loading'],
    emits: ['confirm', 'close'],
  },
}));

import VersionHistoryModal from '../VersionHistoryModal.vue';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeVersions(): PageVersion[] {
  return [
    {
      id: 'v-3',
      pageId: 'page-1',
      version: 3,
      title: 'Updated page',
      createdAt: new Date().toISOString(), // today
      createdBy: { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
    },
    {
      id: 'v-2',
      pageId: 'page-1',
      version: 2,
      title: 'Draft changes',
      createdAt: new Date(Date.now() - 86_400_000).toISOString(), // yesterday
      createdBy: { id: 'user-2', name: null, email: 'bob@test.com' },
    },
    {
      id: 'v-1',
      pageId: 'page-1',
      version: 1,
      title: 'Initial version',
      createdAt: '2024-01-15T10:00:00Z',
      createdBy: { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
    },
  ];
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

const defaultProps = {
  pageId: 'page-1',
  pageTitle: 'My Test Page',
  isOpen: false,
};

function mountModal(props: Partial<typeof defaultProps> = {}) {
  return mount(VersionHistoryModal, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
        TransitionGroup: true,
      },
    },
  });
}

/**
 * Helper: mount closed, then open the modal and flush promises so the
 * watcher fires and versions are loaded.
 */
async function mountAndOpen(
  props: Partial<typeof defaultProps> = {},
  versions: PageVersion[] = makeVersions()
) {
  mockVersionsService.getVersions.mockResolvedValue(versions);
  const wrapper = mountModal(props);
  await wrapper.setProps({ isOpen: true });
  await flushPromises();
  return wrapper;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VersionHistoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  // =========================================================================
  // Rendering & visibility
  // =========================================================================

  describe('rendering', () => {
    it('should not render modal content when isOpen is false', () => {
      const wrapper = mountModal({ isOpen: false });
      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });

    it('should render modal content when isOpen is true', async () => {
      const wrapper = await mountAndOpen();
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    });

    it('should display "Version History" as the modal title', async () => {
      const wrapper = await mountAndOpen();
      expect(wrapper.find('.modal-title').text()).toBe('Version History');
    });

    it('should display the page title as the subtitle', async () => {
      const wrapper = await mountAndOpen({ pageTitle: 'My Notes' });
      expect(wrapper.find('.modal-subtitle').text()).toBe('My Notes');
    });
  });

  // =========================================================================
  // Loading state
  // =========================================================================

  describe('loading state', () => {
    it('should show 4 skeleton items whilst versions are loading', async () => {
      // Keep the promise pending so loading remains true
      mockVersionsService.getVersions.mockReturnValue(new Promise(() => {}));
      const wrapper = mountModal();
      await wrapper.setProps({ isOpen: true });
      await flushPromises();

      const skeletons = wrapper.findAll('.skeleton-item');
      expect(skeletons).toHaveLength(4);
      expect(wrapper.find('.modal-loading').exists()).toBe(true);
    });
  });

  // =========================================================================
  // Error state
  // =========================================================================

  describe('error state', () => {
    it('should show error message when fetching versions fails', async () => {
      mockVersionsService.getVersions.mockRejectedValue(new Error('Network error'));
      const wrapper = mountModal();
      await wrapper.setProps({ isOpen: true });
      await flushPromises();

      expect(wrapper.find('.modal-error').exists()).toBe(true);
      expect(wrapper.find('.modal-error p').text()).toBe('Failed to load version history');
    });

    it('should show a retry button that reloads versions on click', async () => {
      mockVersionsService.getVersions.mockRejectedValueOnce(new Error('fail'));
      const wrapper = mountModal();
      await wrapper.setProps({ isOpen: true });
      await flushPromises();

      expect(wrapper.find('.retry-btn').exists()).toBe(true);

      // Now make the retry succeed
      mockVersionsService.getVersions.mockResolvedValueOnce(makeVersions());
      await wrapper.find('.retry-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal-error').exists()).toBe(false);
      expect(wrapper.findAll('.version-item')).toHaveLength(3);
    });
  });

  // =========================================================================
  // Empty state
  // =========================================================================

  describe('empty state', () => {
    it('should show empty state when there are no versions', async () => {
      const wrapper = await mountAndOpen({}, []);
      expect(wrapper.find('.modal-empty').exists()).toBe(true);
      expect(wrapper.find('.modal-empty h3').text()).toBe('No versions yet');
    });
  });

  // =========================================================================
  // Version list
  // =========================================================================

  describe('version list', () => {
    it('should render one item per version', async () => {
      const wrapper = await mountAndOpen();
      expect(wrapper.findAll('.version-item')).toHaveLength(3);
    });

    it('should display "Current" badge for the first version in the list', async () => {
      const wrapper = await mountAndOpen();
      const badges = wrapper.findAll('.version-badge');
      expect(badges[0]!.text()).toBe('Current');
    });

    it('should display "vN" badges for non-first versions', async () => {
      const wrapper = await mountAndOpen();
      const badges = wrapper.findAll('.version-badge');
      expect(badges[1]!.text()).toBe('v2');
      expect(badges[2]!.text()).toBe('v1');
    });

    it('should display the version title for each item', async () => {
      const wrapper = await mountAndOpen();
      const titles = wrapper.findAll('.version-title');
      expect(titles[0]!.text()).toBe('Updated page');
      expect(titles[1]!.text()).toBe('Draft changes');
      expect(titles[2]!.text()).toBe('Initial version');
    });

    it('should display author name when available', async () => {
      const wrapper = await mountAndOpen();
      const authors = wrapper.findAll('.version-author');
      expect(authors[0]!.text()).toBe('Alice');
    });

    it('should fall back to email when author name is null', async () => {
      const wrapper = await mountAndOpen();
      const authors = wrapper.findAll('.version-author');
      // Second version has name: null
      expect(authors[1]!.text()).toBe('bob@test.com');
    });
  });

  // =========================================================================
  // Close behaviour
  // =========================================================================

  describe('close behaviour', () => {
    it('should emit close when the close button is clicked', async () => {
      const wrapper = await mountAndOpen();
      await wrapper.find('.close-btn').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit close when clicking the overlay background', async () => {
      const wrapper = await mountAndOpen();
      await wrapper.find('.modal-overlay').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  // =========================================================================
  // Confirm dialog for restore
  // =========================================================================

  describe('restore confirmation', () => {
    it('should open the confirm dialog when a version item is clicked', async () => {
      const wrapper = await mountAndOpen();
      const items = wrapper.findAll('.version-item');

      // Click the second version (not current)
      await items[1]!.trigger('click');

      const dialog = wrapper.findComponent({ name: 'ConfirmDialog' });
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('Restore Version');
      expect(dialog.props('message')).toContain('version 2');
    });

    it('should call restoreVersion and emit restored + close on confirm', async () => {
      mockVersionsService.restoreVersion.mockResolvedValue({
        id: 'page-1',
        title: 'Draft changes',
      });
      const wrapper = await mountAndOpen();

      // Select a version
      const items = wrapper.findAll('.version-item');
      await items[1]!.trigger('click');

      // Simulate the ConfirmDialog emitting "confirm"
      const dialog = wrapper.findComponent({ name: 'ConfirmDialog' });
      dialog.vm.$emit('confirm');
      await flushPromises();

      expect(mockVersionsService.restoreVersion).toHaveBeenCalledWith('org-1', 'page-1', 'v-2');
      expect(wrapper.emitted('restored')).toHaveLength(1);
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should show error message when restore fails', async () => {
      mockVersionsService.restoreVersion.mockRejectedValue(new Error('Restore failed'));
      const wrapper = await mountAndOpen();

      // Select a version
      const items = wrapper.findAll('.version-item');
      await items[1]!.trigger('click');

      // Simulate confirm
      const dialog = wrapper.findComponent({ name: 'ConfirmDialog' });
      dialog.vm.$emit('confirm');
      await flushPromises();

      expect(wrapper.find('.modal-error').exists()).toBe(true);
      expect(wrapper.find('.modal-error p').text()).toBe('Failed to restore version');
    });
  });

  // =========================================================================
  // Watch behaviour — loadVersions only fires on isOpen change
  // =========================================================================

  describe('watch behaviour', () => {
    it('should call getVersions when isOpen changes from false to true', async () => {
      mockVersionsService.getVersions.mockResolvedValue([]);
      const wrapper = mountModal({ isOpen: false });

      await wrapper.setProps({ isOpen: true });
      await flushPromises();

      expect(mockVersionsService.getVersions).toHaveBeenCalledWith('org-1', 'page-1');
    });

    it('should not call getVersions when isOpen changes from true to false', async () => {
      const wrapper = await mountAndOpen();
      mockVersionsService.getVersions.mockClear();

      await wrapper.setProps({ isOpen: false });
      await flushPromises();

      expect(mockVersionsService.getVersions).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // formatDate coverage
  // =========================================================================

  describe('date formatting', () => {
    it('should display "Today at ..." for versions created today', async () => {
      const todayVersions: PageVersion[] = [
        {
          id: 'v-1',
          pageId: 'page-1',
          version: 1,
          title: 'Today edit',
          createdAt: new Date().toISOString(),
          createdBy: { id: 'u-1', name: 'Alice', email: 'alice@test.com' },
        },
      ];
      const wrapper = await mountAndOpen({}, todayVersions);
      const dateText = wrapper.find('.version-date').text();
      expect(dateText).toMatch(/^Today at /);
    });

    it('should display "Yesterday at ..." for versions created yesterday', async () => {
      const yesterdayVersions: PageVersion[] = [
        {
          id: 'v-1',
          pageId: 'page-1',
          version: 1,
          title: 'Yesterday edit',
          createdAt: new Date(Date.now() - 86_400_000).toISOString(),
          createdBy: { id: 'u-1', name: 'Alice', email: 'alice@test.com' },
        },
      ];
      const wrapper = await mountAndOpen({}, yesterdayVersions);
      const dateText = wrapper.find('.version-date').text();
      expect(dateText).toMatch(/^Yesterday at /);
    });

    it('should display "N days ago" for versions between 2 and 6 days old', async () => {
      const threeDaysAgo: PageVersion[] = [
        {
          id: 'v-1',
          pageId: 'page-1',
          version: 1,
          title: 'Older edit',
          createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          createdBy: { id: 'u-1', name: 'Alice', email: 'alice@test.com' },
        },
      ];
      const wrapper = await mountAndOpen({}, threeDaysAgo);
      const dateText = wrapper.find('.version-date').text();
      expect(dateText).toBe('3 days ago');
    });

    it('should display a formatted date string for versions 7+ days old', async () => {
      const oldVersions: PageVersion[] = [
        {
          id: 'v-1',
          pageId: 'page-1',
          version: 1,
          title: 'Old edit',
          createdAt: '2024-01-15T10:00:00Z',
          createdBy: { id: 'u-1', name: 'Alice', email: 'alice@test.com' },
        },
      ];
      const wrapper = await mountAndOpen({}, oldVersions);
      const dateText = wrapper.find('.version-date').text();
      // Should contain month and day (e.g. "Jan 15, 2024" or locale equivalent)
      expect(dateText).toMatch(/Jan/);
      expect(dateText).toMatch(/15/);
    });
  });
});
