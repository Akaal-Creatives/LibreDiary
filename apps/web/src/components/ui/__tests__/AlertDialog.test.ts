import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlertDialog from '../AlertDialog.vue';

describe('AlertDialog', () => {
  const defaultProps = {
    open: true,
    message: 'Test message',
  };

  it('renders the message', () => {
    const wrapper = mount(AlertDialog, {
      props: defaultProps,
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Test message');
  });

  it('renders the title when provided', () => {
    const wrapper = mount(AlertDialog, {
      props: { ...defaultProps, title: 'Test Title' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Test Title');
  });

  it('renders default confirm button text', () => {
    const wrapper = mount(AlertDialog, {
      props: defaultProps,
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('OK');
  });

  it('renders custom confirm button text', () => {
    const wrapper = mount(AlertDialog, {
      props: { ...defaultProps, confirmText: 'Got it!' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.text()).toContain('Got it!');
  });

  it('emits confirm and close events when confirm button is clicked', async () => {
    const wrapper = mount(AlertDialog, {
      props: defaultProps,
      global: {
        stubs: { teleport: true },
      },
    });

    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('applies correct icon class for info variant', () => {
    const wrapper = mount(AlertDialog, {
      props: { ...defaultProps, variant: 'info' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.icon-info').exists()).toBe(true);
  });

  it('applies correct icon class for success variant', () => {
    const wrapper = mount(AlertDialog, {
      props: { ...defaultProps, variant: 'success' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.icon-success').exists()).toBe(true);
  });

  it('applies correct icon class for warning variant', () => {
    const wrapper = mount(AlertDialog, {
      props: { ...defaultProps, variant: 'warning' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.icon-warning').exists()).toBe(true);
  });

  it('applies correct icon class for error variant', () => {
    const wrapper = mount(AlertDialog, {
      props: { ...defaultProps, variant: 'error' },
      global: {
        stubs: { teleport: true },
      },
    });

    expect(wrapper.find('.icon-error').exists()).toBe(true);
  });
});
