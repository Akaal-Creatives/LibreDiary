import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CellRenderer from '../CellRenderer.vue';

describe('CellRenderer', () => {
  it('renders text value', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 'Hello world', type: 'TEXT' },
    });
    expect(wrapper.text()).toBe('Hello world');
  });

  it('renders empty string for null value', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: null, type: 'TEXT' },
    });
    expect(wrapper.text()).toBe('');
  });

  it('renders number value', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 42, type: 'NUMBER' },
    });
    expect(wrapper.text()).toBe('42');
  });

  it('renders number with percent format', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 85, type: 'NUMBER', config: { format: 'percent' } },
    });
    expect(wrapper.text()).toBe('85%');
  });

  it('renders checkbox unchecked', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: false, type: 'CHECKBOX' },
    });
    const checkbox = wrapper.find('.checkbox-display');
    expect(checkbox.exists()).toBe(true);
    expect(checkbox.classes()).not.toContain('checked');
  });

  it('renders checkbox checked', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: true, type: 'CHECKBOX' },
    });
    const checkbox = wrapper.find('.checkbox-display');
    expect(checkbox.classes()).toContain('checked');
  });

  it('renders select tag', () => {
    const wrapper = mount(CellRenderer, {
      props: {
        value: 'Done',
        type: 'SELECT',
        config: { options: [{ label: 'Done', colour: '#22c55e' }] },
      },
    });
    const tag = wrapper.find('.select-tag');
    expect(tag.exists()).toBe(true);
    expect(tag.text()).toBe('Done');
  });

  it('renders multi-select tags', () => {
    const wrapper = mount(CellRenderer, {
      props: {
        value: ['Tag A', 'Tag B'],
        type: 'MULTI_SELECT',
        config: { options: [{ label: 'Tag A' }, { label: 'Tag B' }] },
      },
    });
    const tags = wrapper.findAll('.select-tag');
    expect(tags).toHaveLength(2);
    expect(tags[0]!.text()).toBe('Tag A');
    expect(tags[1]!.text()).toBe('Tag B');
  });

  it('renders URL as a link', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 'https://example.com', type: 'URL' },
    });
    const link = wrapper.find('.url-link');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('https://example.com');
  });

  it('renders email as mailto link', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 'test@example.com', type: 'EMAIL' },
    });
    const link = wrapper.find('.email-link');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('mailto:test@example.com');
  });

  it('renders date in UK format', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: '2024-06-15', type: 'DATE' },
    });
    expect(wrapper.text()).toContain('Jun');
    expect(wrapper.text()).toContain('2024');
  });

  it('renders number with currency format', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 1500, type: 'NUMBER', config: { format: 'currency', currency: 'GBP' } },
    });
    expect(wrapper.text()).toContain('1,500');
  });

  it('renders phone value as text', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: '+44 7700 900000', type: 'PHONE' },
    });
    expect(wrapper.text()).toBe('+44 7700 900000');
  });

  it('renders empty string for NaN number', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 'not-a-number', type: 'NUMBER' },
    });
    expect(wrapper.text()).toBe('');
  });

  it('renders created_time in UK format', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: '2024-03-15T10:30:00Z', type: 'CREATED_TIME' },
    });
    expect(wrapper.text()).toContain('Mar');
    expect(wrapper.text()).toContain('2024');
  });

  it('renders updated_time in UK format', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: '2024-12-25T00:00:00Z', type: 'UPDATED_TIME' },
    });
    expect(wrapper.text()).toContain('Dec');
    expect(wrapper.text()).toContain('2024');
  });

  it('renders select tag with default colour when no config match', () => {
    const wrapper = mount(CellRenderer, {
      props: {
        value: 'Unknown',
        type: 'SELECT',
        config: { options: [{ label: 'Done', colour: '#22c55e' }] },
      },
    });
    const tag = wrapper.find('.select-tag');
    expect(tag.exists()).toBe(true);
    expect(tag.text()).toBe('Unknown');
  });

  it('renders nothing for empty select value', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: null, type: 'SELECT', config: { options: [] } },
    });
    expect(wrapper.find('.select-tag').exists()).toBe(false);
  });

  it('renders nothing for empty multi-select array', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: [], type: 'MULTI_SELECT', config: { options: [] } },
    });
    expect(wrapper.findAll('.select-tag')).toHaveLength(0);
  });

  it('renders invalid date string as-is', () => {
    const wrapper = mount(CellRenderer, {
      props: { value: 'not-a-date', type: 'DATE' },
    });
    expect(wrapper.text()).toBe('not-a-date');
  });
});
