import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import OfflineIndicator from '../OfflineIndicator.vue';

describe('OfflineIndicator accessibility', () => {
  it('has role="alert" when visible', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const wrapper = mount(OfflineIndicator, {
      global: { stubs: { Transition: true } },
    });
    const indicator = wrapper.find('.offline-indicator');
    expect(indicator.attributes('role')).toBe('alert');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('has aria-live="assertive"', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const wrapper = mount(OfflineIndicator, {
      global: { stubs: { Transition: true } },
    });
    expect(wrapper.find('.offline-indicator').attributes('aria-live')).toBe('assertive');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('icon has aria-hidden="true"', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const wrapper = mount(OfflineIndicator, {
      global: { stubs: { Transition: true } },
    });
    expect(wrapper.find('.offline-indicator__icon').attributes('aria-hidden')).toBe('true');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});
