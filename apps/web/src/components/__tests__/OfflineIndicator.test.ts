import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import OfflineIndicator from '../OfflineIndicator.vue';

describe('OfflineIndicator', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it('should be hidden when online', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    const wrapper = mount(OfflineIndicator);
    expect(wrapper.find('.offline-indicator').exists()).toBe(false);
  });

  it('should be visible when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    const wrapper = mount(OfflineIndicator);
    expect(wrapper.find('.offline-indicator').exists()).toBe(true);
    expect(wrapper.text()).toContain('You are currently offline');
  });

  it('should respond to online/offline events', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    const wrapper = mount(OfflineIndicator);
    expect(wrapper.find('.offline-indicator').exists()).toBe(false);

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('offline'));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.offline-indicator').exists()).toBe(true);

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('online'));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.offline-indicator').exists()).toBe(false);
  });

  it('should have correct ARIA attributes', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    const wrapper = mount(OfflineIndicator);
    const indicator = wrapper.find('.offline-indicator');

    expect(indicator.attributes('role')).toBe('alert');
    expect(indicator.attributes('aria-live')).toBe('assertive');
  });

  it('should clean up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const wrapper = mount(OfflineIndicator);

    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    wrapper.unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
