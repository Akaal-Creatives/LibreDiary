import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    shortcuts: ref([
      { id: 'save', keys: 'mod+s', label: 'Save', description: 'Save', category: 'general' },
    ]),
    isHelpVisible: ref(true),
    modifierSymbol: ref('⌘'),
  }),
}));

import KeyboardShortcutsModal from '../KeyboardShortcutsModal.vue';

describe('KeyboardShortcutsModal accessibility', () => {
  function mountModal() {
    return mount(KeyboardShortcutsModal, {
      global: {
        stubs: {
          teleport: true,
          Transition: true,
        },
      },
    });
  }

  it('modal has role="dialog"', () => {
    const wrapper = mountModal();
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
  });

  it('modal has aria-modal="true"', () => {
    const wrapper = mountModal();
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
  });

  it('modal has aria-label', () => {
    const wrapper = mountModal();
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-label')).toBeTruthy();
  });

  it('close button has aria-label', () => {
    const wrapper = mountModal();
    const closeButton = wrapper.find('button[aria-label]');
    expect(closeButton.exists()).toBe(true);
    expect(closeButton.attributes('aria-label')).toBeTruthy();
  });
});
