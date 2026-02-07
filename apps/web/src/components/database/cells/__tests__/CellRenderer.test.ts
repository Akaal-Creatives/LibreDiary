import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => ({
    members: [
      {
        id: 'member-1',
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'MEMBER',
        createdAt: '2024-01-01',
        user: { id: 'user-1', email: 'alice@example.com', name: 'Alice Smith', avatarUrl: null },
      },
      {
        id: 'member-2',
        userId: 'user-2',
        organizationId: 'org-1',
        role: 'ADMIN',
        createdAt: '2024-01-01',
        user: {
          id: 'user-2',
          email: 'bob@example.com',
          name: 'Bob Jones',
          avatarUrl: 'https://example.com/bob.jpg',
        },
      },
    ],
  }),
}));

vi.mock('@/stores/databases', () => ({
  useDatabasesStore: () => ({
    relatedDatabases: new Map([
      [
        'target-db-1',
        {
          id: 'target-db-1',
          name: 'Projects',
          properties: [
            {
              id: 'tp-1',
              databaseId: 'target-db-1',
              name: 'Name',
              type: 'TEXT',
              position: 0,
              config: null,
            },
          ],
          rows: [
            {
              id: 'trow-1',
              databaseId: 'target-db-1',
              position: 0,
              cells: { 'tp-1': 'Alpha Project' },
              createdById: 'user-1',
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
            {
              id: 'trow-2',
              databaseId: 'target-db-1',
              position: 1,
              cells: { 'tp-1': 'Beta Project' },
              createdById: 'user-1',
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
          ],
          views: [],
        },
      ],
    ]),
  }),
}));

import CellRenderer from '../CellRenderer.vue';

describe('CellRenderer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

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

  // Person property type
  describe('PERSON type', () => {
    it('renders user name for a valid user ID', () => {
      const wrapper = mount(CellRenderer, {
        props: { value: 'user-1', type: 'PERSON' },
      });
      expect(wrapper.text()).toContain('Alice Smith');
    });

    it('renders person badge with initials when no avatar', () => {
      const wrapper = mount(CellRenderer, {
        props: { value: 'user-1', type: 'PERSON' },
      });
      const badge = wrapper.find('.person-badge');
      expect(badge.exists()).toBe(true);
      expect(badge.find('.person-initials').text()).toBe('AS');
    });

    it('renders person avatar when avatarUrl exists', () => {
      const wrapper = mount(CellRenderer, {
        props: { value: 'user-2', type: 'PERSON' },
      });
      const img = wrapper.find('.person-avatar');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://example.com/bob.jpg');
    });

    it('renders empty for null person value', () => {
      const wrapper = mount(CellRenderer, {
        props: { value: null, type: 'PERSON' },
      });
      expect(wrapper.find('.person-badge').exists()).toBe(false);
      expect(wrapper.text()).toBe('');
    });

    it('renders user ID when member not found', () => {
      const wrapper = mount(CellRenderer, {
        props: { value: 'unknown-user-id', type: 'PERSON' },
      });
      expect(wrapper.text()).toContain('unknown-user-id');
    });
  });

  // Relation property type
  describe('RELATION type', () => {
    it('renders related row titles as pills', () => {
      const wrapper = mount(CellRenderer, {
        props: {
          value: ['trow-1', 'trow-2'],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      const pills = wrapper.findAll('.relation-pill');
      expect(pills).toHaveLength(2);
      expect(pills[0]!.text()).toBe('Alpha Project');
      expect(pills[1]!.text()).toBe('Beta Project');
    });

    it('renders empty for null relation value', () => {
      const wrapper = mount(CellRenderer, {
        props: {
          value: null,
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      expect(wrapper.find('.relation-pill').exists()).toBe(false);
      expect(wrapper.text()).toBe('');
    });

    it('renders empty for empty array', () => {
      const wrapper = mount(CellRenderer, {
        props: {
          value: [],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      expect(wrapper.findAll('.relation-pill')).toHaveLength(0);
    });

    it('renders row IDs when related database not loaded', () => {
      const wrapper = mount(CellRenderer, {
        props: {
          value: ['unknown-row-1'],
          type: 'RELATION',
          config: { targetDatabaseId: 'nonexistent-db' },
        },
      });
      const pills = wrapper.findAll('.relation-pill');
      expect(pills).toHaveLength(1);
      expect(pills[0]!.text()).toContain('unknown-row-1');
    });

    it('renders single relation row title', () => {
      const wrapper = mount(CellRenderer, {
        props: {
          value: ['trow-1'],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      const pills = wrapper.findAll('.relation-pill');
      expect(pills).toHaveLength(1);
      expect(pills[0]!.text()).toBe('Alpha Project');
    });
  });
});
