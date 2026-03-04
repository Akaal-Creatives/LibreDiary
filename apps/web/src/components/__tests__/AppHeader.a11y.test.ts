import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('@/stores', () => ({
  usePagesStore: () => ({
    currentPage: { id: 'p1', title: 'My Page', icon: null },
    isFavorite: vi.fn().mockReturnValue(false),
    toggleFavorite: vi.fn(),
  }),
  useSyncStore: () => ({ status: 'idle', statusMessage: '' }),
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

describe('AppHeader accessibility', () => {
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
          Teleport: true,
          Transition: true,
        },
      },
    });
  }

  it('all icon-only action buttons have aria-label', () => {
    const wrapper = mountHeader();
    const actionButtons = wrapper.findAll('.action-btn');
    actionButtons.forEach((btn) => {
      expect(btn.attributes('aria-label')).toBeTruthy();
    });
  });

  it('share button has aria-label', () => {
    const wrapper = mountHeader();
    const shareBtn = wrapper.find('.share-btn');
    if (shareBtn.exists()) {
      expect(shareBtn.attributes('aria-label')).toBeTruthy();
    }
  });
});
