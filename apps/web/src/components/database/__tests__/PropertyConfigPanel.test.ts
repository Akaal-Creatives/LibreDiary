import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const { mockDatabasesService } = vi.hoisted(() => ({
  mockDatabasesService: {
    listDatabases: vi.fn(),
    getDatabase: vi.fn(),
    createDatabase: vi.fn(),
    updateDatabase: vi.fn(),
    deleteDatabase: vi.fn(),
    createProperty: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
    reorderProperties: vi.fn(),
    createRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    reorderRows: vi.fn(),
    bulkDeleteRows: vi.fn(),
    createView: vi.fn(),
    updateView: vi.fn(),
    deleteView: vi.fn(),
    reorderViews: vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  databasesService: mockDatabasesService,
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentOrganizationId: 'org-1',
  }),
}));

import PropertyConfigPanel from '../PropertyConfigPanel.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('PropertyConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  function setupStore() {
    const store = useDatabasesStore();
    store.currentDatabaseId = 'db-1';
    store.properties = [
      {
        id: 'prop-1',
        databaseId: 'db-1',
        name: 'Title',
        type: 'TEXT',
        position: 0,
        config: null,
      },
    ];
    store.views = [
      {
        id: 'view-1',
        databaseId: 'db-1',
        name: 'Table view',
        type: 'TABLE',
        position: 0,
        config: null,
      },
    ];
    store.activeViewId = 'view-1';
    return store;
  }

  const textProperty = {
    id: 'prop-1',
    databaseId: 'db-1',
    name: 'Title',
    type: 'TEXT' as const,
    position: 0,
    config: null,
  };

  const selectProperty = {
    id: 'prop-2',
    databaseId: 'db-1',
    name: 'Status',
    type: 'SELECT' as const,
    position: 1,
    config: { options: [{ label: 'Done', colour: '#22c55e' }, { label: 'Todo' }] },
  };

  const numberProperty = {
    id: 'prop-3',
    databaseId: 'db-1',
    name: 'Score',
    type: 'NUMBER' as const,
    position: 2,
    config: { format: 'number' },
  };

  it('renders property name input', () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: textProperty },
    });
    const input = wrapper.find('.config-name-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('Title');
  });

  it('renders property type selector', () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: textProperty },
    });
    const select = wrapper.find('.config-type-select');
    expect(select.exists()).toBe(true);
    expect((select.element as HTMLSelectElement).value).toBe('TEXT');
  });

  it('saves name on blur', async () => {
    setupStore();
    mockDatabasesService.updateProperty.mockResolvedValue({
      property: { ...textProperty, name: 'New Name' },
    });

    const wrapper = mount(PropertyConfigPanel, {
      props: { property: textProperty },
    });

    const input = wrapper.find('.config-name-input');
    await input.setValue('New Name');
    await input.trigger('blur');
    await flushPromises();

    expect(mockDatabasesService.updateProperty).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      'prop-1',
      expect.objectContaining({ name: 'New Name' })
    );
  });

  it('shows SELECT options editor for SELECT type', () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: selectProperty },
    });
    expect(wrapper.find('.select-options-editor').exists()).toBe(true);
    expect(wrapper.findAll('.option-row')).toHaveLength(2);
  });

  it('adds a new option to SELECT', async () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: selectProperty },
    });

    const addBtn = wrapper.find('.add-option-btn');
    await addBtn.trigger('click');

    expect(wrapper.findAll('.option-row')).toHaveLength(3);
  });

  it('removes an option from SELECT', async () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: selectProperty },
    });

    expect(wrapper.findAll('.option-row')).toHaveLength(2);

    const removeBtns = wrapper.findAll('.remove-option-btn');
    await removeBtns[0]!.trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.option-row')).toHaveLength(1);
  });

  it('shows NUMBER format selector for NUMBER type', () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: numberProperty },
    });
    expect(wrapper.find('.number-format-select').exists()).toBe(true);
  });

  it('emits close when clicking close button', async () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: textProperty },
    });

    const closeBtn = wrapper.find('.config-close-btn');
    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not show options editor for non-SELECT types', () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: textProperty },
    });
    expect(wrapper.find('.select-options-editor').exists()).toBe(false);
  });

  it('does not show number format for non-NUMBER types', () => {
    setupStore();
    const wrapper = mount(PropertyConfigPanel, {
      props: { property: textProperty },
    });
    expect(wrapper.find('.number-format-select').exists()).toBe(false);
  });
});
