import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmDialog from '../ConfirmDialog.vue';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    message: 'Are you sure?',
  };

  it('renders the message', () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Are you sure?');
  });

  it('renders the title when provided', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, title: 'Confirm Action' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Confirm Action');
  });

  it('renders default button texts', () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Cancel');
    expect(wrapper.text()).toContain('Confirm');
  });

  it('renders custom button texts', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...defaultProps,
        confirmText: 'Yes, delete',
        cancelText: 'No, keep it',
      },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Yes, delete');
    expect(wrapper.text()).toContain('No, keep it');
  });

  it('emits confirm and close events when confirm button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
      global: {
        stubs: { teleport: true },
      },
    });

    // Find the primary/danger button (not the secondary cancel button)
    const confirmBtn = wrapper
      .findAll('button')
      .find((btn) => !btn.classes().includes('btn-secondary'));
    await confirmBtn?.trigger('click');

    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits cancel and close events when cancel button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
      global: {
        stubs: { teleport: true },
      },
    });

    await wrapper.find('.btn-secondary').trigger('click');

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('uses primary button style for default variant', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, variant: 'default' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.btn-primary').exists()).toBe(true);
    expect(wrapper.find('.btn-danger').exists()).toBe(false);
  });

  it('uses danger button style for destructive variant', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, variant: 'destructive' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.btn-danger').exists()).toBe(true);
    expect(wrapper.find('.btn-primary').exists()).toBe(false);
  });

  it('shows warning icon for destructive variant', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, variant: 'destructive' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.confirm-icon').exists()).toBe(true);
  });

  it('does not show icon for default variant', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...defaultProps, variant: 'default' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.confirm-icon').exists()).toBe(false);
  });
});
