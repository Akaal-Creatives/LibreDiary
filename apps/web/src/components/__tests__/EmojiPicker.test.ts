import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EmojiPicker from '../EmojiPicker.vue';

function mountPicker(props: { modelValue?: string | null } = {}) {
  return mount(EmojiPicker, {
    props,
    attachTo: document.body,
  });
}

describe('EmojiPicker', () => {
  it('renders emoji categories', () => {
    const wrapper = mountPicker();

    const categories = wrapper.findAll('.emoji-category');
    expect(categories.length).toBe(5);

    expect(wrapper.text()).toContain('Smileys');
    expect(wrapper.text()).toContain('Objects');
    expect(wrapper.text()).toContain('Symbols');
    expect(wrapper.text()).toContain('Nature');
    expect(wrapper.text()).toContain('Tech');

    wrapper.unmount();
  });

  it('renders search input', () => {
    const wrapper = mountPicker();

    const input = wrapper.find('.picker-search');
    expect(input.exists()).toBe(true);
    expect(input.attributes('placeholder')).toBe('Search emoji...');

    wrapper.unmount();
  });

  it('emits update:modelValue and close when clicking an emoji', async () => {
    const wrapper = mountPicker();

    const emojiBtn = wrapper.find('.emoji-btn');
    await emojiBtn.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toHaveLength(1);
    expect(typeof wrapper.emitted('update:modelValue')![0][0]).toBe('string');
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('shows remove button when modelValue is set', () => {
    const wrapper = mountPicker({ modelValue: '😀' });

    expect(wrapper.find('.remove-btn').exists()).toBe(true);

    wrapper.unmount();
  });

  it('does not show remove button when modelValue is null', () => {
    const wrapper = mountPicker({ modelValue: null });

    expect(wrapper.find('.remove-btn').exists()).toBe(false);

    wrapper.unmount();
  });

  it('emits update:modelValue with null and close when clicking remove', async () => {
    const wrapper = mountPicker({ modelValue: '😀' });

    await wrapper.find('.remove-btn').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([null]);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('highlights selected emoji with selected class', () => {
    const wrapper = mountPicker({ modelValue: '😀' });

    const selectedBtn = wrapper.find('.emoji-btn.selected');
    expect(selectedBtn.exists()).toBe(true);
    expect(selectedBtn.text()).toContain('😀');

    wrapper.unmount();
  });
});
