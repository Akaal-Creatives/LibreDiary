import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlertDialog from '../AlertDialog.vue';

describe('AlertDialog accessibility', () => {
  const defaultProps = {
    open: true,
    message: 'Something happened',
    title: 'Alert Title',
  };

  it('title element has an id for aria-labelledby', () => {
    const wrapper = mount(AlertDialog, {
      props: defaultProps,
      global: { stubs: { teleport: true } },
    });

    const title = wrapper.find('#alert-dialog-title');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('Alert Title');
  });

  it('dialog has aria-labelledby pointing to the title', () => {
    const wrapper = mount(AlertDialog, {
      props: defaultProps,
      global: { stubs: { teleport: true } },
    });

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-labelledby')).toBe('alert-dialog-title');
  });

  it('confirm button is focusable', () => {
    const wrapper = mount(AlertDialog, {
      props: defaultProps,
      global: { stubs: { teleport: true } },
    });

    const btn = wrapper.find('.btn-primary');
    expect(btn.exists()).toBe(true);
    expect(btn.element.tagName).toBe('BUTTON');
  });
});
