import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import KeyboardShortcutsModal from '../KeyboardShortcutsModal.vue';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import { i18n } from '@/i18n';

// Helper to mount KeyboardShortcutsModal with proper context
function mountModal() {
  // We need a parent component that initialises the composable
  const TestWrapper = defineComponent({
    components: { KeyboardShortcutsModal },
    setup() {
      const kb = useKeyboardShortcuts();

      // Register some test shortcuts
      kb.register({
        id: 'test-nav',
        keys: 'mod+k',
        label: 'shortcuts.search',
        description: 'shortcuts.searchDescription',
        handler: vi.fn(),
        global: true,
        category: 'navigation',
      });

      kb.register({
        id: 'test-general',
        keys: 'mod+s',
        label: 'shortcuts.save',
        description: 'shortcuts.saveDescription',
        handler: vi.fn(),
        global: true,
        category: 'general',
      });

      return { kb };
    },
    render() {
      return h(KeyboardShortcutsModal);
    },
  });

  return mount(TestWrapper, {
    global: {
      plugins: [i18n],
    },
    attachTo: document.body,
  });
}

describe('KeyboardShortcutsModal', () => {
  afterEach(() => {
    // Reset help visibility
    const { result, unmount } = (() => {
      let result!: ReturnType<typeof useKeyboardShortcuts>;
      const comp = defineComponent({
        setup() {
          result = useKeyboardShortcuts();
          return () => h('div');
        },
      });
      const w = mount(comp);
      return { result, unmount: () => w.unmount() };
    })();
    result.isHelpVisible.value = false;
    result.unregister('test-nav');
    result.unregister('test-general');
    unmount();
    vi.restoreAllMocks();
  });

  it('should not render when isHelpVisible is false', () => {
    const wrapper = mountModal();

    expect(document.querySelector('.shortcuts-overlay')).toBeNull();

    wrapper.unmount();
  });

  it('should render when isHelpVisible is true', async () => {
    const wrapper = mountModal();

    // Open modal by toggling help
    const { result, unmount } = (() => {
      let result!: ReturnType<typeof useKeyboardShortcuts>;
      const comp = defineComponent({
        setup() {
          result = useKeyboardShortcuts();
          return () => h('div');
        },
      });
      const w = mount(comp);
      return { result, unmount: () => w.unmount() };
    })();

    result.isHelpVisible.value = true;
    await nextTick();

    expect(document.querySelector('.shortcuts-overlay')).not.toBeNull();
    expect(document.querySelector('.shortcuts-modal')).not.toBeNull();

    unmount();
    wrapper.unmount();
  });

  it('should render shortcuts grouped by category', async () => {
    const wrapper = mountModal();

    const { result, unmount } = (() => {
      let result!: ReturnType<typeof useKeyboardShortcuts>;
      const comp = defineComponent({
        setup() {
          result = useKeyboardShortcuts();
          return () => h('div');
        },
      });
      const w = mount(comp);
      return { result, unmount: () => w.unmount() };
    })();

    result.isHelpVisible.value = true;
    await nextTick();

    const groups = document.querySelectorAll('.shortcut-group');
    expect(groups.length).toBeGreaterThan(0);

    const items = document.querySelectorAll('.shortcut-item');
    expect(items.length).toBeGreaterThan(0);

    unmount();
    wrapper.unmount();
  });
});
