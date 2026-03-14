import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import type { DatabaseProperty } from '@librediary/shared';

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

import TableColumnHeader from '../TableColumnHeader.vue';

describe('TableColumnHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  const testProperty: DatabaseProperty = {
    id: 'prop-1',
    databaseId: 'db-1',
    name: 'Status',
    type: 'SELECT',
    position: 1,
    config: null,
  };

  function mountHeader(
    propsOverrides: Partial<{
      property: DatabaseProperty;
      width: number;
      isDragOver: boolean;
      isDragging: boolean;
    }> = {}
  ) {
    return mount(TableColumnHeader, {
      props: {
        property: testProperty,
        width: 200,
        isDragOver: false,
        isDragging: false,
        ...propsOverrides,
      },
      // Stub child components to isolate unit tests
      global: {
        stubs: {
          ColumnHeaderMenu: {
            name: 'ColumnHeaderMenu',
            template: '<div class="stub-column-header-menu" />',
            props: ['property'],
            emits: ['close', 'configure'],
          },
          PropertyConfigPanel: {
            name: 'PropertyConfigPanel',
            template: '<div class="stub-property-config-panel" />',
            props: ['property'],
            emits: ['close'],
          },
        },
      },
    });
  }

  // ========================================
  // Rendering
  // ========================================

  it('renders the property name', () => {
    const wrapper = mountHeader();
    expect(wrapper.find('.col-name').text()).toBe('Status');
  });

  it('applies the correct width style', () => {
    const wrapper = mountHeader({ width: 250 });
    expect(wrapper.attributes('style')).toContain('width: 250px');
  });

  it('shows a menu button on the header', () => {
    const wrapper = mountHeader();
    expect(wrapper.find('.col-menu-btn').exists()).toBe(true);
  });

  // ========================================
  // CSS classes for drag state
  // ========================================

  it('applies drag-over class when isDragOver is true', () => {
    const wrapper = mountHeader({ isDragOver: true });
    expect(wrapper.classes()).toContain('drag-over');
  });

  it('applies dragging class when isDragging is true', () => {
    const wrapper = mountHeader({ isDragging: true });
    expect(wrapper.classes()).toContain('dragging');
  });

  it('does not apply drag classes when both are false', () => {
    const wrapper = mountHeader();
    expect(wrapper.classes()).not.toContain('drag-over');
    expect(wrapper.classes()).not.toContain('dragging');
  });

  // ========================================
  // Resize events
  // ========================================

  it('emits resize-start when resize handle receives mousedown', async () => {
    const wrapper = mountHeader();
    const handle = wrapper.find('.col-resize-handle');
    await handle.trigger('mousedown');
    expect(wrapper.emitted('resize-start')).toBeTruthy();
    expect(wrapper.emitted('resize-start')![0]![0]).toBeInstanceOf(MouseEvent);
  });

  it('emits resize-dblclick when resize handle is double-clicked', async () => {
    const wrapper = mountHeader();
    const handle = wrapper.find('.col-resize-handle');
    await handle.trigger('dblclick');
    expect(wrapper.emitted('resize-dblclick')).toBeTruthy();
    expect(wrapper.emitted('resize-dblclick')![0]![0]).toBeInstanceOf(MouseEvent);
  });

  // ========================================
  // Column drag events
  // ========================================

  it('emits col-dragstart on dragstart', async () => {
    const wrapper = mountHeader();
    await wrapper.trigger('dragstart');
    expect(wrapper.emitted('col-dragstart')).toBeTruthy();
  });

  it('emits col-dragover on dragover', async () => {
    const wrapper = mountHeader();
    await wrapper.trigger('dragover');
    expect(wrapper.emitted('col-dragover')).toBeTruthy();
  });

  it('emits col-dragleave on dragleave', async () => {
    const wrapper = mountHeader();
    await wrapper.trigger('dragleave');
    expect(wrapper.emitted('col-dragleave')).toBeTruthy();
  });

  it('emits col-drop on drop', async () => {
    const wrapper = mountHeader();
    await wrapper.trigger('drop');
    expect(wrapper.emitted('col-drop')).toBeTruthy();
  });

  it('emits col-dragend on dragend', async () => {
    const wrapper = mountHeader();
    await wrapper.trigger('dragend');
    expect(wrapper.emitted('col-dragend')).toBeTruthy();
  });

  // ========================================
  // Column menu visibility
  // ========================================

  it('does not show column menu by default', () => {
    const wrapper = mountHeader();
    expect(wrapper.find('.stub-column-header-menu').exists()).toBe(false);
  });

  it('toggles column menu visibility on menu button click', async () => {
    const wrapper = mountHeader();
    const menuBtn = wrapper.find('.col-menu-btn');

    // Open menu
    await menuBtn.trigger('click');
    expect(wrapper.find('.stub-column-header-menu').exists()).toBe(true);

    // Close menu by clicking again
    await menuBtn.trigger('click');
    expect(wrapper.find('.stub-column-header-menu').exists()).toBe(false);
  });

  it('closes column menu when ColumnHeaderMenu emits close', async () => {
    const wrapper = mountHeader();

    // Open menu
    await wrapper.find('.col-menu-btn').trigger('click');
    expect(wrapper.find('.stub-column-header-menu').exists()).toBe(true);

    // Emit close from the stub
    const menu = wrapper.findComponent({ name: 'ColumnHeaderMenu' });
    menu.vm.$emit('close');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.stub-column-header-menu').exists()).toBe(false);
  });

  // ========================================
  // Configure panel
  // ========================================

  it('does not show configure panel by default', () => {
    const wrapper = mountHeader();
    expect(wrapper.find('.stub-property-config-panel').exists()).toBe(false);
  });

  it('shows configure panel when ColumnHeaderMenu emits configure', async () => {
    const wrapper = mountHeader();

    // Open menu first
    await wrapper.find('.col-menu-btn').trigger('click');

    // Emit configure from the menu stub
    const menu = wrapper.findComponent({ name: 'ColumnHeaderMenu' });
    menu.vm.$emit('configure');
    await wrapper.vm.$nextTick();

    // Menu should close, configure panel should open
    expect(wrapper.find('.stub-column-header-menu').exists()).toBe(false);
    expect(wrapper.find('.stub-property-config-panel').exists()).toBe(true);
  });

  it('closes configure panel when PropertyConfigPanel emits close', async () => {
    const wrapper = mountHeader();

    // Open menu, then configure
    await wrapper.find('.col-menu-btn').trigger('click');
    const menu = wrapper.findComponent({ name: 'ColumnHeaderMenu' });
    menu.vm.$emit('configure');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.stub-property-config-panel').exists()).toBe(true);

    // Emit close from configure panel
    const panel = wrapper.findComponent({ name: 'PropertyConfigPanel' });
    panel.vm.$emit('close');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.stub-property-config-panel').exists()).toBe(false);
  });

  // ========================================
  // Element attributes
  // ========================================

  it('renders as a <th> element', () => {
    const wrapper = mountHeader();
    expect(wrapper.element.tagName).toBe('TH');
  });

  it('has draggable attribute set to true', () => {
    const wrapper = mountHeader();
    expect(wrapper.attributes('draggable')).toBe('true');
  });
});
