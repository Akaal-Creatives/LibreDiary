import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmDialog from '../ConfirmDialog.vue';

describe('ConfirmDialog accessibility', () => {
  const defaultProps = {
    open: true,
    message: 'Are you sure?',
    title: 'Confirm',
  };

  it('title element has an id for aria-labelledby', () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
      global: { stubs: { teleport: true } },
    });

    const title = wrapper.find('#confirm-dialog-title');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('Confirm');
  });

  it('dialog has aria-labelledby pointing to the title', () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
      global: { stubs: { teleport: true } },
    });

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-labelledby')).toBe('confirm-dialog-title');
  });

  it('both confirm and cancel buttons are focusable', () => {
    const wrapper = mount(ConfirmDialog, {
      props: defaultProps,
      global: { stubs: { teleport: true } },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons.forEach((btn) => {
      expect(btn.element.tagName).toBe('BUTTON');
    });
  });
});
