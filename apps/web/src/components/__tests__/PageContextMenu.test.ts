import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PageContextMenu from '../PageContextMenu.vue';
import type { Page } from '@librediary/shared';

const page: Page = {
  id: 'page-1',
  title: 'Test Page',
  icon: null,
  parentId: null,
  organizationId: 'org-1',
  position: 0,
  coverUrl: null,
  htmlContent: null,
  isPublic: false,
  publicSlug: null,
  trashedAt: null,
  createdById: 'user-1',
  updatedById: null,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

function mountMenu(props: Partial<{ page: Page; x: number; y: number }> = {}) {
  return mount(PageContextMenu, {
    props: {
      page,
      x: 100,
      y: 200,
      ...props,
    },
    attachTo: document.body,
  });
}

describe('PageContextMenu', () => {
  it('renders all 5 menu items', () => {
    const wrapper = mountMenu();

    const items = wrapper.findAll('.menu-item');
    expect(items).toHaveLength(5);

    expect(wrapper.text()).toContain('Add subpage');
    expect(wrapper.text()).toContain('Duplicate');
    expect(wrapper.text()).toContain('Rename');
    expect(wrapper.text()).toContain('Add to favorites');
    expect(wrapper.text()).toContain('Move to trash');

    wrapper.unmount();
  });

  it('positions at the given x, y coordinates', () => {
    const wrapper = mountMenu({ x: 150, y: 250 });

    const menu = wrapper.find('.context-menu');
    const style = menu.attributes('style');
    expect(style).toContain('left: 150px');
    expect(style).toContain('top: 250px');

    wrapper.unmount();
  });

  it('emits addSubpage and close when clicking the add subpage button', async () => {
    const wrapper = mountMenu();

    const items = wrapper.findAll('.menu-item');
    await items[0].trigger('click');

    expect(wrapper.emitted('addSubpage')).toBeTruthy();
    expect(wrapper.emitted('addSubpage')![0]).toEqual([page]);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('emits duplicate and close when clicking duplicate', async () => {
    const wrapper = mountMenu();

    const items = wrapper.findAll('.menu-item');
    await items[1].trigger('click');

    expect(wrapper.emitted('duplicate')).toBeTruthy();
    expect(wrapper.emitted('duplicate')![0]).toEqual([page]);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('emits rename and close when clicking rename', async () => {
    const wrapper = mountMenu();

    const items = wrapper.findAll('.menu-item');
    await items[2].trigger('click');

    expect(wrapper.emitted('rename')).toBeTruthy();
    expect(wrapper.emitted('rename')![0]).toEqual([page]);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('emits toggleFavorite and close when clicking favorite', async () => {
    const wrapper = mountMenu();

    const items = wrapper.findAll('.menu-item');
    await items[3].trigger('click');

    expect(wrapper.emitted('toggleFavorite')).toBeTruthy();
    expect(wrapper.emitted('toggleFavorite')![0]).toEqual([page]);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('emits moveToTrash and close when clicking trash (has class danger)', async () => {
    const wrapper = mountMenu();

    const trashBtn = wrapper.find('.menu-item.danger');
    expect(trashBtn.exists()).toBe(true);

    await trashBtn.trigger('click');

    expect(wrapper.emitted('moveToTrash')).toBeTruthy();
    expect(wrapper.emitted('moveToTrash')![0]).toEqual([page]);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('has role="menu" on the container', () => {
    const wrapper = mountMenu();

    const menu = wrapper.find('.context-menu');
    expect(menu.attributes('role')).toBe('menu');

    wrapper.unmount();
  });
});
