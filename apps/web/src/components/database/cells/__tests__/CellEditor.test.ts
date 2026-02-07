import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CellEditor from '../CellEditor.vue';

describe('CellEditor', () => {
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
});
