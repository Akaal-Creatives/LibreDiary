import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SkeletonText from '../SkeletonText.vue';
import { i18n } from '@/i18n';

describe('SkeletonText', () => {
  function mountComponent(props = {}) {
    return mount(SkeletonText, {
      props,
      global: {
        plugins: [i18n],
      },
    });
  }

  it('should render the correct number of lines', () => {
    const wrapper = mountComponent({ lines: 5 });
    const blocks = wrapper.findAll('.skeleton-block');
    expect(blocks.length).toBe(5);
  });

  it('should default to 3 lines', () => {
    const wrapper = mountComponent();
    const blocks = wrapper.findAll('.skeleton-block');
    expect(blocks.length).toBe(3);
  });

  it('should have role="status" for accessibility', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('.skeleton-text').attributes('role')).toBe('status');
  });

  it('should render last line shorter than other lines', () => {
    const wrapper = mountComponent({ lines: 4 });
    const blocks = wrapper.findAll('.skeleton-block');
    const lastBlock = blocks[blocks.length - 1];
    const firstBlock = blocks[0];

    const lastWidth = parseInt(
      lastBlock.attributes('style')?.match(/width:\s*(\d+)%/)?.[1] ?? '100'
    );
    const firstWidth = parseInt(
      firstBlock.attributes('style')?.match(/width:\s*(\d+)%/)?.[1] ?? '0'
    );

    // Last line should be shorter (40-64%) than first line (75-99%)
    expect(lastWidth).toBeLessThan(firstWidth);
  });
});
