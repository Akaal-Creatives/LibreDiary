import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

const mockAuthStore = vi.hoisted(() => ({
  user: { name: null as string | null },
}));

const mockPagesStore = vi.hoisted(() => ({
  rootPages: [] as Array<{ id: string }>,
}));

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStore,
  usePagesStore: () => mockPagesStore,
}));

import GettingStartedChecklist from '../GettingStartedChecklist.vue';

function mountChecklist() {
  return mount(GettingStartedChecklist);
}

describe('GettingStartedChecklist', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthStore.user = { name: null };
    mockPagesStore.rootPages = [];
  });

  it('renders checklist when visible', () => {
    const wrapper = mountChecklist();
    expect(wrapper.find('.checklist').exists()).toBe(true);
    expect(wrapper.find('.checklist-title').text()).toBe('Getting started');
  });

  it('shows correct counter', () => {
    const wrapper = mountChecklist();
    expect(wrapper.find('.checklist-counter').text()).toBe('0/4');
  });

  it('renders 4 checklist items', () => {
    const wrapper = mountChecklist();
    expect(wrapper.findAll('.checklist-item')).toHaveLength(4);
  });

  it('marks items as completed when conditions are met', () => {
    mockPagesStore.rootPages = [{ id: 'p1' }];
    mockAuthStore.user = { name: 'Test' };

    const wrapper = mountChecklist();
    const items = wrapper.findAll('.checklist-item');
    expect(items[0].classes()).toContain('completed');
    expect(items[1].classes()).toContain('completed');
    expect(items[2].classes()).not.toContain('completed');
  });

  it('emits navigate event when clickable item is clicked', async () => {
    const wrapper = mountChecklist();

    // The "Explore templates" item (index 2) has a route
    const clickableItems = wrapper.findAll('.clickable .item-inner');
    await clickableItems[1].trigger('click'); // explore-templates

    expect(wrapper.emitted('navigate')).toBeTruthy();
    expect(wrapper.emitted('navigate')![0]).toEqual([{ name: 'templates' }]);
  });

  it('dismisses checklist when dismiss button is clicked', async () => {
    const wrapper = mountChecklist();
    await wrapper.find('.dismiss-btn').trigger('click');

    expect(wrapper.find('.checklist').exists()).toBe(false);
  });

  it('does not render when dismissed in localStorage', () => {
    localStorage.setItem(
      'librediary-getting-started',
      JSON.stringify({ dismissed: true, manuallyCompleted: [] })
    );

    const wrapper = mountChecklist();
    expect(wrapper.find('.checklist').exists()).toBe(false);
  });

  it('has accessible progress bar', () => {
    const wrapper = mountChecklist();
    const progressBar = wrapper.find('[role="progressbar"]');
    expect(progressBar.exists()).toBe(true);
    expect(progressBar.attributes('aria-valuenow')).toBe('0');
    expect(progressBar.attributes('aria-valuemax')).toBe('4');
  });

  it('has accessible section label', () => {
    const wrapper = mountChecklist();
    const section = wrapper.find('[aria-label="Getting started checklist"]');
    expect(section.exists()).toBe(true);
  });

  it('does not render when all items are completed', () => {
    mockPagesStore.rootPages = [{ id: 'p1' }];
    mockAuthStore.user = { name: 'Test' };
    localStorage.setItem(
      'librediary-getting-started',
      JSON.stringify({
        dismissed: false,
        manuallyCompleted: ['explore-templates', 'invite-member'],
      })
    );

    const wrapper = mountChecklist();
    expect(wrapper.find('.checklist').exists()).toBe(false);
  });
});
