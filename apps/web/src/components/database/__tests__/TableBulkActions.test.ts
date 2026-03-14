import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TableBulkActions from '../TableBulkActions.vue';

describe('TableBulkActions', () => {
  it('renders the selected count', () => {
    const wrapper = mount(TableBulkActions, {
      props: { selectedCount: 5 },
    });
    expect(wrapper.find('.bulk-count').text()).toBe('5 selected');
  });

  it('emits delete when delete button is clicked', async () => {
    const wrapper = mount(TableBulkActions, {
      props: { selectedCount: 3 },
    });
    await wrapper.find('.delete-btn').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });

  it('is hidden when selectedCount is 0', () => {
    const wrapper = mount(TableBulkActions, {
      props: { selectedCount: 0 },
    });
    expect(wrapper.find('.bulk-actions').exists()).toBe(false);
  });

  it('is visible when selectedCount is greater than 0', () => {
    const wrapper = mount(TableBulkActions, {
      props: { selectedCount: 1 },
    });
    expect(wrapper.find('.bulk-actions').exists()).toBe(true);
  });

  it('updates the count when selectedCount prop changes', async () => {
    const wrapper = mount(TableBulkActions, {
      props: { selectedCount: 2 },
    });
    expect(wrapper.find('.bulk-count').text()).toBe('2 selected');

    await wrapper.setProps({ selectedCount: 7 });
    expect(wrapper.find('.bulk-count').text()).toBe('7 selected');
  });
});
