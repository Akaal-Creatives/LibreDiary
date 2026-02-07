import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ToastContainer from '../ToastContainer.vue';

const mockRemoveToast = vi.fn();

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    toasts: ref([
      { id: '1', type: 'success', message: 'Done!' },
      { id: '2', type: 'error', message: 'Failed!' },
    ]),
    removeToast: mockRemoveToast,
  }),
}));

function mountComponent() {
  return mount(ToastContainer, {
    global: {
      stubs: { teleport: true },
    },
  });
}

describe('ToastContainer', () => {
  it('renders toast messages', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('Done!');
    expect(wrapper.text()).toContain('Failed!');
  });

  it('applies correct CSS class per type', () => {
    const wrapper = mountComponent();

    const toasts = wrapper.findAll('.toast');
    expect(toasts[0].classes()).toContain('toast--success');
    expect(toasts[1].classes()).toContain('toast--error');
  });

  it('calls removeToast when clicking close button', async () => {
    const wrapper = mountComponent();

    const closeButtons = wrapper.findAll('.toast-close');
    await closeButtons[0].trigger('click');

    expect(mockRemoveToast).toHaveBeenCalledWith('1');
  });

  it('has role="alert" on each toast', () => {
    const wrapper = mountComponent();

    const toasts = wrapper.findAll('.toast');
    toasts.forEach((toast) => {
      expect(toast.attributes('role')).toBe('alert');
    });
  });

  it('has aria-label on container', () => {
    const wrapper = mountComponent();

    const container = wrapper.find('.toast-container');
    expect(container.attributes('aria-label')).toBe('Notifications');
  });
});
