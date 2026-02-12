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

  it('emits select on item mousedown', async () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands });
    const items = wrapper.findAll('[role="option"]');
    await items[1].trigger('mousedown');
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

  it('does not emit select on Enter when commands is empty', async () => {
    const wrapper = mountMenu({ commands: [] });
    // No listbox rendered when empty, so emit nothing
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.emitted('select')).toBeFalsy();
  });

  it('orders groups correctly: basic items appear before lists items', () => {
    const wrapper = mountMenu();
    const headers = wrapper.findAll('.slash-menu-group-header');
    expect(headers[0].text()).toContain('Basic Blocks');
    expect(headers[1].text()).toContain('Lists');
  });

  it('renders translated label text for each command', () => {
    const wrapper = mountMenu();
    expect(wrapper.text()).toContain('Text');
    expect(wrapper.text()).toContain('Heading 1');
    expect(wrapper.text()).toContain('Bullet List');
  });

  it('renders translated description text for each command', () => {
    const wrapper = mountMenu();
    expect(wrapper.text()).toContain('Plain text block');
    expect(wrapper.text()).toContain('Large section heading');
    expect(wrapper.text()).toContain('Unordered list with bullet points');
  });

  it('renders SVG icons with the command icon path data', () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands });
    const paths = wrapper.findAll('svg path');
    expect(paths.length).toBe(commands.length);
    expect(paths[0].attributes('d')).toBe(commands[0].icon);
  });

  it('applies slash-menu-item--active class to the selected item', () => {
    const wrapper = mountMenu({ selectedIndex: 1 });
    const items = wrapper.findAll('.slash-menu-item');
    expect(items[0].classes()).not.toContain('slash-menu-item--active');
    expect(items[1].classes()).toContain('slash-menu-item--active');
    expect(items[2].classes()).not.toContain('slash-menu-item--active');
  });

  it('listbox has tabindex="0" for keyboard focusability', () => {
    const wrapper = mountMenu();
    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.attributes('tabindex')).toBe('0');
  });

  it('does not emit navigate or select on unrecognised keys (Tab)', async () => {
    const wrapper = mountMenu();
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'Tab' });
    expect(wrapper.emitted('navigate')).toBeFalsy();
    expect(wrapper.emitted('select')).toBeFalsy();
    expect(wrapper.emitted('close')).toBeFalsy();
  });

  it('does not emit navigate or select on letter key presses', async () => {
    const wrapper = mountMenu();
    await wrapper.find('[role="listbox"]').trigger('keydown', { key: 'a' });
    expect(wrapper.emitted('navigate')).toBeFalsy();
    expect(wrapper.emitted('select')).toBeFalsy();
  });

  it('only shows groups that have matching commands', () => {
    const listsOnly: SlashCommand[] = [
      {
        id: 'bulletList',
        labelKey: 'slashCommands.bulletList',
        descriptionKey: 'slashCommands.bulletListDescription',
        icon: 'M4 6h16',
        group: 'lists',
        keywords: ['ul'],
        action: vi.fn(),
      },
    ];
    const wrapper = mountMenu({ commands: listsOnly });
    const headers = wrapper.findAll('.slash-menu-group-header');
    expect(headers).toHaveLength(1);
    expect(headers[0].text()).toContain('Lists');
  });

  it('hides listbox and shows empty state when no commands match', () => {
    const wrapper = mountMenu({ commands: [] });
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.find('.slash-menu-empty').exists()).toBe(true);
  });

  it('emits select with correct command for middle item mousedown', async () => {
    const commands = createTestCommands();
    const wrapper = mountMenu({ commands });
    const items = wrapper.findAll('[role="option"]');
    await items[2].trigger('mousedown');
    expect(wrapper.emitted('select')![0]).toEqual([commands[2]]);
  });

  it('visual item order matches flat array index order for keyboard navigation', () => {
    const commands = createTestCommands();
    // The nth visual item should correspond to the nth flat index
    // i.e. items[0] is selected when selectedIndex=0, items[1] when selectedIndex=1, etc.
    for (let i = 0; i < commands.length; i++) {
      const w = mountMenu({ commands, selectedIndex: i });
      const allItems = w.findAll('[role="option"]');
      expect(allItems[i].attributes('aria-selected')).toBe('true');
    }
  });

  it('renders correct number of group headers for commands in single group', () => {
    const basicOnly: SlashCommand[] = [
      {
        id: 'paragraph',
        labelKey: 'slashCommands.paragraph',
        descriptionKey: 'slashCommands.paragraphDescription',
        icon: 'M4 6h16',
        group: 'basic',
        keywords: ['text'],
        action: vi.fn(),
      },
      {
        id: 'heading1',
        labelKey: 'slashCommands.heading1',
        descriptionKey: 'slashCommands.heading1Description',
        icon: 'M4 6h16',
        group: 'basic',
        keywords: ['h1'],
        action: vi.fn(),
      },
    ];
    const wrapper = mountMenu({ commands: basicOnly });
    const headers = wrapper.findAll('.slash-menu-group-header');
    expect(headers).toHaveLength(1);
    expect(headers[0].text()).toContain('Basic Blocks');
  });
});
