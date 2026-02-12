import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    toasts: [
      { id: '1', type: 'success', message: 'Done!' },
      { id: '2', type: 'error', message: 'Failed!' },
    ],
    removeToast: vi.fn(),
  }),
}));

import ToastContainer from '../ToastContainer.vue';

describe('ToastContainer accessibility', () => {
  function mountToastContainer() {
    return mount(ToastContainer, {
      global: {
        stubs: {
          teleport: true,
          TransitionGroup: true,
        },
      },
    });
  }

  it('container has role="region"', () => {
    const wrapper = mountToastContainer();
    const container = wrapper.find('.toast-container');
    expect(container.attributes('role')).toBe('region');
  });

  it('container has aria-label', () => {
    const wrapper = mountToastContainer();
    const container = wrapper.find('.toast-container');
    expect(container.attributes('aria-label')).toBeTruthy();
  });

  it('container has aria-live="polite"', () => {
    const wrapper = mountToastContainer();
    const container = wrapper.find('.toast-container');
    expect(container.attributes('aria-live')).toBe('polite');
  });

  it('each toast has role="alert"', () => {
    const wrapper = mountToastContainer();
    const toasts = wrapper.findAll('[role="alert"]');
    expect(toasts.length).toBe(2);
    toasts.forEach((toast) => {
      expect(toast.attributes('role')).toBe('alert');
    });
  });

  it('close buttons have aria-label', () => {
    const wrapper = mountToastContainer();
    const closeButtons = wrapper.findAll('button');
    expect(closeButtons.length).toBeGreaterThan(0);
    closeButtons.forEach((button) => {
      expect(button.attributes('aria-label')).toBeTruthy();
    });
  });
});
