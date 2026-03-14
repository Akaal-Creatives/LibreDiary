import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AddPropertyPopover from '../AddPropertyPopover.vue';

describe('AddPropertyPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('renders the "+" button', () => {
    const wrapper = mount(AddPropertyPopover);
    expect(wrapper.find('.add-property-btn').exists()).toBe(true);
  });

  it('does not show the popover initially', () => {
    const wrapper = mount(AddPropertyPopover);
    expect(wrapper.find('.add-property-popover').exists()).toBe(false);
  });

  it('toggles the popover visibility when clicking "+"', async () => {
    const wrapper = mount(AddPropertyPopover);

    await wrapper.find('.add-property-btn').trigger('click');
    expect(wrapper.find('.add-property-popover').exists()).toBe(true);

    await wrapper.find('.add-property-btn').trigger('click');
    expect(wrapper.find('.add-property-popover').exists()).toBe(false);
  });

  it('renders the property name input and type select when popover is open', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');

    expect(wrapper.find('.add-property-input').exists()).toBe(true);
    expect(wrapper.find('.add-property-select').exists()).toBe(true);
    expect(wrapper.find('.add-property-submit').exists()).toBe(true);
  });

  it('renders all 15 property type options', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');

    const options = wrapper.findAll('.add-property-select option');
    expect(options).toHaveLength(15);
    expect(options[0]!.text()).toBe('Text');
    expect(options[1]!.text()).toBe('Number');
  });

  it('emits "add" with { name, type } when form is submitted via button click', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');

    const input = wrapper.find('.add-property-input');
    await input.setValue('Priority');

    const select = wrapper.find('.add-property-select');
    await select.setValue('SELECT');

    await wrapper.find('.add-property-submit').trigger('click');

    expect(wrapper.emitted('add')).toBeTruthy();
    expect(wrapper.emitted('add')![0]).toEqual([{ name: 'Priority', type: 'SELECT' }]);
  });

  it('emits "add" when Enter key is pressed in the input', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');

    const input = wrapper.find('.add-property-input');
    await input.setValue('Status');
    await input.trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('add')).toBeTruthy();
    expect(wrapper.emitted('add')![0]).toEqual([{ name: 'Status', type: 'TEXT' }]);
  });

  it('closes the popover on Escape key', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');
    expect(wrapper.find('.add-property-popover').exists()).toBe(true);

    const input = wrapper.find('.add-property-input');
    await input.trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('.add-property-popover').exists()).toBe(false);
  });

  it('resets the form after submission', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');

    const input = wrapper.find('.add-property-input');
    await input.setValue('Priority');

    const select = wrapper.find('.add-property-select');
    await select.setValue('NUMBER');

    await wrapper.find('.add-property-submit').trigger('click');

    // Popover should be closed after submission
    expect(wrapper.find('.add-property-popover').exists()).toBe(false);

    // Re-open and verify values are reset
    await wrapper.find('.add-property-btn').trigger('click');
    const newInput = wrapper.find('.add-property-input').element as HTMLInputElement;
    const newSelect = wrapper.find('.add-property-select').element as HTMLSelectElement;
    expect(newInput.value).toBe('');
    expect(newSelect.value).toBe('TEXT');
  });

  it('does not emit "add" when the name is empty', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');

    // Leave input empty
    await wrapper.find('.add-property-submit').trigger('click');

    expect(wrapper.emitted('add')).toBeFalsy();
  });

  it('trims whitespace from the property name', async () => {
    const wrapper = mount(AddPropertyPopover);
    await wrapper.find('.add-property-btn').trigger('click');

    const input = wrapper.find('.add-property-input');
    await input.setValue('  Tags  ');

    await wrapper.find('.add-property-submit').trigger('click');

    expect(wrapper.emitted('add')![0]).toEqual([{ name: 'Tags', type: 'TEXT' }]);
  });

  it('renders as a <th> element', () => {
    const wrapper = mount(AddPropertyPopover);
    expect(wrapper.element.tagName).toBe('TH');
  });
});
