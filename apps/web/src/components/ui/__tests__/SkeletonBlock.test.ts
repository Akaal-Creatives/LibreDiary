import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SkeletonBlock from '../SkeletonBlock.vue';
import { i18n } from '@/i18n';

describe('SkeletonBlock', () => {
  function mountComponent(props = {}) {
    return mount(SkeletonBlock, {
      props,
      global: {
        plugins: [i18n],
      },
    });
  }

  it('should render with default props', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('.skeleton-block').exists()).toBe(true);
  });

  it('should have role="status" for accessibility', () => {
    const wrapper = mountComponent();
    expect(wrapper.attributes('role')).toBe('status');
  });

  it('should have an aria-label', () => {
    const wrapper = mountComponent();
    expect(wrapper.attributes('aria-label')).toBeTruthy();
  });

  it('should apply width and height styles', () => {
    const wrapper = mountComponent({ width: '200px', height: '24px' });
    const style = wrapper.attributes('style');
    expect(style).toContain('width: 200px');
    expect(style).toContain('height: 24px');
  });

  it('should apply custom borderRadius', () => {
    const wrapper = mountComponent({ borderRadius: '8px' });
    const style = wrapper.attributes('style');
    expect(style).toContain('border-radius: 8px');
  });

  it('should apply rect variant class by default', () => {
    const wrapper = mountComponent();
    expect(wrapper.classes()).toContain('skeleton-rect');
  });

  it('should apply circle variant class', () => {
    const wrapper = mountComponent({ variant: 'circle' });
    expect(wrapper.classes()).toContain('skeleton-circle');
  });

  it('should apply line variant class', () => {
    const wrapper = mountComponent({ variant: 'line' });
    expect(wrapper.classes()).toContain('skeleton-line');
  });

  it('should make circle variant equal width and height', () => {
    const wrapper = mountComponent({ variant: 'circle', height: '48px' });
    const style = wrapper.attributes('style');
    expect(style).toContain('width: 48px');
    expect(style).toContain('height: 48px');
  });
});
