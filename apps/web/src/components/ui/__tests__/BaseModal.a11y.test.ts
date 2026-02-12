import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseModal from '../BaseModal.vue';

describe('BaseModal accessibility', () => {
  it('passes aria-labelledby to the dialog element', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, ariaLabelledby: 'my-title' },
      slots: { default: '<p>Content</p>' },
      global: { stubs: { teleport: true } },
    });

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-labelledby')).toBe('my-title');
  });

  it('passes aria-label to the dialog element', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, ariaLabel: 'My dialog' },
      slots: { default: '<p>Content</p>' },
      global: { stubs: { teleport: true } },
    });

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-label')).toBe('My dialog');
  });

  it('has role="dialog" and aria-modal="true"', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true },
      slots: { default: '<p>Content</p>' },
      global: { stubs: { teleport: true } },
    });

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes('aria-modal')).toBe('true');
  });
});
