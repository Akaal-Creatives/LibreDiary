import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => ({
    members: [
      {
        id: 'member-1',
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'MEMBER',
        createdAt: '2024-01-01',
        user: { id: 'user-1', email: 'alice@example.com', name: 'Alice Smith', avatarUrl: null },
      },
      {
        id: 'member-2',
        userId: 'user-2',
        organizationId: 'org-1',
        role: 'ADMIN',
        createdAt: '2024-01-01',
        user: {
          id: 'user-2',
          email: 'bob@example.com',
          name: 'Bob Jones',
          avatarUrl: 'https://example.com/bob.jpg',
        },
      },
    ],
    fetchMembers: vi.fn(),
  }),
}));

import CellEditor from '../CellEditor.vue';

describe('CellEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders text input with initial value', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('Hello');
  });

  it('renders number input for NUMBER type', () => {
    const wrapper = mount(CellEditor, {
      props: { value: 42, type: 'NUMBER' },
    });
    const input = wrapper.find('.cell-input');
    expect((input.element as HTMLInputElement).type).toBe('number');
  });

  it('renders date input for DATE type', () => {
    const wrapper = mount(CellEditor, {
      props: { value: '2024-06-15', type: 'DATE' },
    });
    const input = wrapper.find('.cell-input');
    expect((input.element as HTMLInputElement).type).toBe('date');
  });

  it('emits save on Enter key', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    const input = wrapper.find('.cell-input');
    await input.setValue('Updated');
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual(['Updated']);
  });

  it('emits cancel on Escape key', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    const input = wrapper.find('.cell-input');
    await input.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('emits toggled value immediately for CHECKBOX type', () => {
    const wrapper = mount(CellEditor, {
      props: { value: false, type: 'CHECKBOX' },
    });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual([true]);
  });

  it('shows select dropdown for SELECT type', async () => {
    const wrapper = mount(CellEditor, {
      props: {
        value: null,
        type: 'SELECT',
        config: { options: [{ label: 'Done' }, { label: 'Todo' }] },
      },
    });
    await flushPromises();
    const dropdown = wrapper.find('.select-dropdown');
    expect(dropdown.exists()).toBe(true);
    const options = wrapper.findAll('.select-option');
    expect(options).toHaveLength(2);
  });

  it('emits selected option for SELECT type', async () => {
    const wrapper = mount(CellEditor, {
      props: {
        value: null,
        type: 'SELECT',
        config: { options: [{ label: 'Done' }, { label: 'Todo' }] },
      },
    });
    await flushPromises();
    const options = wrapper.findAll('.select-option');
    await options[0]!.trigger('mousedown');
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual(['Done']);
  });

  it('converts empty number input to null', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 42, type: 'NUMBER' },
    });
    const input = wrapper.find('.cell-input');
    await input.setValue('');
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('save')![0]).toEqual([null]);
  });

  it('renders URL input for URL type', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'https://example.com', type: 'URL' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('https://example.com');
  });

  it('renders email input for EMAIL type', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'test@example.com', type: 'EMAIL' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('test@example.com');
  });

  it('toggles checkbox from true to false', () => {
    const wrapper = mount(CellEditor, {
      props: { value: true, type: 'CHECKBOX' },
    });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual([false]);
  });

  it('emits save on Tab key', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    const input = wrapper.find('.cell-input');
    await input.setValue('Tabbed');
    await input.trigger('keydown', { key: 'Tab' });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual(['Tabbed']);
  });

  it('handles null initial value for text input', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: null, type: 'TEXT' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect((input.element as HTMLInputElement).value).toBe('');
  });

  it('handles multi-select type with options', async () => {
    const wrapper = mount(CellEditor, {
      props: {
        value: ['Tag A'],
        type: 'MULTI_SELECT',
        config: { options: [{ label: 'Tag A' }, { label: 'Tag B' }, { label: 'Tag C' }] },
      },
    });
    await flushPromises();
    const dropdown = wrapper.find('.select-dropdown');
    expect(dropdown.exists()).toBe(true);
  });

  // Person property type
  describe('PERSON type', () => {
    it('shows person dropdown with org members', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: null, type: 'PERSON' },
      });
      await flushPromises();
      const dropdown = wrapper.find('.person-dropdown');
      expect(dropdown.exists()).toBe(true);
      const options = wrapper.findAll('.person-option');
      expect(options).toHaveLength(2);
    });

    it('displays member names in dropdown', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: null, type: 'PERSON' },
      });
      await flushPromises();
      expect(wrapper.text()).toContain('Alice Smith');
      expect(wrapper.text()).toContain('Bob Jones');
    });

    it('emits save with user ID on member selection', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: null, type: 'PERSON' },
      });
      await flushPromises();
      const options = wrapper.findAll('.person-option');
      await options[0]!.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0]).toEqual(['user-1']);
    });

    it('highlights currently selected member', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: 'user-2', type: 'PERSON' },
      });
      await flushPromises();
      const options = wrapper.findAll('.person-option');
      expect(options[1]!.classes()).toContain('selected');
    });

    it('allows clearing person value', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: 'user-1', type: 'PERSON' },
      });
      await flushPromises();
      const clearBtn = wrapper.find('.person-clear');
      expect(clearBtn.exists()).toBe(true);
      await clearBtn.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0]).toEqual([null]);
    });
  });
});
