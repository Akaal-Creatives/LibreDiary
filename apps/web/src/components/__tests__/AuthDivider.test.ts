import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AuthDivider from '../AuthDivider.vue';

describe('AuthDivider', () => {
  it('renders with default "or" text', () => {
    const wrapper = mount(AuthDivider);

    expect(wrapper.text()).toContain('or');
  });

  it('renders with custom text', () => {
    const wrapper = mount(AuthDivider, {
      props: { text: 'continue with' },
    });

    expect(wrapper.text()).toContain('continue with');
  });

  it('has role="separator"', () => {
    const wrapper = mount(AuthDivider);

    const divider = wrapper.find('.auth-divider');
    expect(divider.attributes('role')).toBe('separator');
  });
});
