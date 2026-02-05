import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseModal from '../BaseModal.vue';

describe('BaseModal', () => {
  it('renders when open is true', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true },
      slots: { default: '<p>Modal content</p>' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Modal content');
  });

  it('does not render when open is false', () => {
    const wrapper = mount(BaseModal, {
      props: { open: false },
      slots: { default: '<p>Modal content</p>' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).not.toContain('Modal content');
  });

  it('emits close event when Escape is pressed', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, closeOnEscape: true },
      slots: { default: '<p>Modal content</p>' },
      global: {
        stubs: { teleport: true },
      },
    });

    await wrapper.find('.modal-backdrop').trigger('keydown', { key: 'Escape' });

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not emit close on Escape when closeOnEscape is false', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, closeOnEscape: false },
      slots: { default: '<p>Modal content</p>' },
      global: {
        stubs: { teleport: true },
      },
    });

    await wrapper.find('.modal-backdrop').trigger('keydown', { key: 'Escape' });

    expect(wrapper.emitted('close')).toBeFalsy();
  });

  it('emits close event when backdrop is clicked', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, closeOnBackdrop: true },
      slots: { default: '<p>Modal content</p>' },
      global: {
        stubs: { teleport: true },
      },
    });

    await wrapper.find('.modal-backdrop').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not emit close on backdrop click when closeOnBackdrop is false', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, closeOnBackdrop: false },
      slots: { default: '<p>Modal content</p>' },
      global: {
        stubs: { teleport: true },
      },
    });

    await wrapper.find('.modal-backdrop').trigger('click');

    expect(wrapper.emitted('close')).toBeFalsy();
  });

  it('has correct aria attributes', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true },
      slots: { default: '<p>Modal content</p>' },
      global: {
        stubs: { teleport: true },
      },
    });

    const backdrop = wrapper.find('.modal-backdrop');
    expect(backdrop.attributes('role')).toBe('dialog');
    expect(backdrop.attributes('aria-modal')).toBe('true');
  });
});
