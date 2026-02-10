import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SlashCommandMenu from '../SlashCommandMenu.vue';
import type { SlashCommand } from '../slashCommands';

function createTestCommands(): SlashCommand[] {
  return [
    {
      id: 'paragraph',
      labelKey: 'slashCommands.paragraph',
      descriptionKey: 'slashCommands.paragraphDescription',
      icon: 'M4 6h16',
      group: 'basic',
      keywords: ['text', 'plain'],
      action: vi.fn(),
    },
    {
      id: 'heading1',
      labelKey: 'slashCommands.heading1',
      descriptionKey: 'slashCommands.heading1Description',
      icon: 'M4 6h16',
      group: 'basic',
      keywords: ['h1', 'title'],
      action: vi.fn(),
    },
    {
      id: 'bulletList',
      labelKey: 'slashCommands.bulletList',
      descriptionKey: 'slashCommands.bulletListDescription',
      icon: 'M4 6h16',
      group: 'lists',
      keywords: ['ul', 'unordered'],
      action: vi.fn(),
    },
  ];
}

function mountMenu(
  overrides: {
    commands?: SlashCommand[];
    selectedIndex?: number;
  } = {}
) {
  return mount(SlashCommandMenu, {
    props: {
      commands: overrides.commands ?? createTestCommands(),
      selectedIndex: overrides.selectedIndex ?? 0,
    },
  });
}

describe('SlashCommandMenu', () => {
  it('renders all passed commands', () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands });
    const items = wrapper.findAll('[role="option"]');
    expect(items).toHaveLength(3);
  });

  it('shows group headers', () => {
    const wrapper = mountMenu();
    const headers = wrapper.findAll('.slash-menu-group-header');
    expect(headers.length).toBeGreaterThanOrEqual(2);
  });

  it('highlights the command at selectedIndex', () => {
    const wrapper = mountMenu({ selectedIndex: 1 });
    const items = wrapper.findAll('[role="option"]');
    expect(items[1].attributes('aria-selected')).toBe('true');
    expect(items[0].attributes('aria-selected')).toBe('false');
  });

  it('emits select on Enter keypress', async () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands, selectedIndex: 0 });
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]).toEqual([commands[0]]);
  });

  it('emits close on Escape keypress', async () => {
    const wrapper = mountMenu();
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits navigate with incremented index on ArrowDown', async () => {
    const wrapper = mountMenu({ selectedIndex: 0 });
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('navigate')).toBeTruthy();
    expect(wrapper.emitted('navigate')![0]).toEqual([1]);
  });

  it('emits navigate with 0 when ArrowDown at last item (cycle)', async () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands, selectedIndex: commands.length - 1 });
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('navigate')![0]).toEqual([0]);
  });

  it('emits navigate with decremented index on ArrowUp', async () => {
    const wrapper = mountMenu({ selectedIndex: 2 });
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('navigate')).toBeTruthy();
    expect(wrapper.emitted('navigate')![0]).toEqual([1]);
  });

  it('emits navigate with last index when ArrowUp at first item (cycle)', async () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands, selectedIndex: 0 });
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('navigate')![0]).toEqual([commands.length - 1]);
  });

  it('emits select on item click', async () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands });
    const items = wrapper.findAll('[role="option"]');
    await items[1].trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]).toEqual([commands[1]]);
  });

  it('has correct ARIA attributes on container', () => {
    const wrapper = mountMenu();
    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);
  });

  it('has correct ARIA role="option" on items', () => {
    const wrapper = mountMenu();
    const items = wrapper.findAll('[role="option"]');
    expect(items.length).toBe(3);
  });

  it('sets aria-selected correctly on items', () => {
    const wrapper = mountMenu({ selectedIndex: 2 });
    const items = wrapper.findAll('[role="option"]');
    expect(items[0].attributes('aria-selected')).toBe('false');
    expect(items[1].attributes('aria-selected')).toBe('false');
    expect(items[2].attributes('aria-selected')).toBe('true');
  });

  it('shows "no results" message when commands list is empty', () => {
    const wrapper = mountMenu({ commands: [] });
    expect(wrapper.text()).toContain('No matching commands');
  });
});
