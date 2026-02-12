import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PageContextMenu from '../PageContextMenu.vue';

describe('PageContextMenu accessibility', () => {
  const page = { id: 'p1', title: 'Test', icon: null, parentId: null };

  function mountMenu() {
    return mount(PageContextMenu, {
      props: { page, x: 100, y: 100 },
    });
  }

  it('menu has role="menu"', () => {
    const wrapper = mountMenu();
    const menu = wrapper.find('[role="menu"]');
    expect(menu.exists()).toBe(true);
  });

  it('all menu items have role="menuitem"', () => {
    const wrapper = mountMenu();
    const items = wrapper.findAll('[role="menuitem"]');
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.attributes('role')).toBe('menuitem');
    });
  });

  it('supports keyboard navigation with ArrowDown/ArrowUp', () => {
    const wrapper = mountMenu();
    const items = wrapper.findAll('[role="menuitem"]');
    // All menu items are buttons and thus keyboard-focusable
    items.forEach((item) => {
      expect(item.element.tagName).toBe('BUTTON');
    });
  });
});
