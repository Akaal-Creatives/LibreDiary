import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/stores', () => ({
  usePagesStore: () => ({
    currentPage: { id: 'p1', title: 'My Page', icon: null },
  }),
  useSyncStore: () => ({ status: 'idle', statusMessage: '' }),
}));

vi.mock('@/composables/useSidebar', () => ({
  useSidebar: () => ({
    isOverlay: { value: false },
    isOpen: { value: true },
    toggle: vi.fn(),
    close: vi.fn(),
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
