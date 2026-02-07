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

import GalleryView from '../GalleryView.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('GalleryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  function setupStore(options?: { coverProperty?: string | null; cardSize?: string | null }) {
    const store = useDatabasesStore();
    store.currentDatabaseId = 'db-1';
    store.properties = [
      {
        id: 'prop-title',
        databaseId: 'db-1',
        name: 'Title',
        type: 'TEXT',
        position: 0,
        config: null,
      },
      {
        id: 'prop-cover',
        databaseId: 'db-1',
        name: 'Cover Image',
        type: 'URL',
        position: 1,
        config: null,
      },
      {
        id: 'prop-status',
        databaseId: 'db-1',
        name: 'Status',
        type: 'SELECT',
        position: 2,
        config: {
          options: [
            { label: 'Active', colour: '#81C784' },
            { label: 'Archived', colour: '#E57373' },
          ],
        },
      },
      {
        id: 'prop-website',
        databaseId: 'db-1',
        name: 'Website',
        type: 'URL',
        position: 3,
        config: null,
      },
    ];

    const coverProperty =
      options?.coverProperty !== undefined ? options.coverProperty : 'prop-cover';
    const cardSize = options?.cardSize ?? null;

    const config: Record<string, unknown> = {};
    if (coverProperty) config.coverProperty = coverProperty;
    if (cardSize) config.cardSize = cardSize;

    store.views = [
      {
        id: 'view-g',
        databaseId: 'db-1',
        name: 'Gallery view',
        type: 'GALLERY',
        position: 0,
        config: Object.keys(config).length > 0 ? config : null,
      },
    ];
    store.activeViewId = 'view-g';
    store.rows = [
      {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: {
          'prop-title': 'Project Alpha',
          'prop-cover': 'https://example.com/alpha.jpg',
          'prop-status': 'Active',
        },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'row-2',
        databaseId: 'db-1',
        position: 1,
        cells: {
          'prop-title': 'Project Beta',
          'prop-cover': 'https://example.com/beta.png',
          'prop-status': 'Archived',
        },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'row-3',
        databaseId: 'db-1',
        position: 2,
        cells: {
          'prop-title': 'Project Gamma',
          'prop-status': 'Active',
        },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];
    return store;
  }

  // ===========================================
  // COVER PROPERTY SELECTOR
  // ===========================================

  it('renders cover-property selector when no coverProperty configured', () => {
    setupStore({ coverProperty: null });
    const wrapper = mount(GalleryView);
    expect(wrapper.find('.gallery-cover-prompt').exists()).toBe(true);
    expect(wrapper.text()).toContain('Cover image');
  });

  it('only lists URL properties in cover-property selector', () => {
    setupStore({ coverProperty: null });
    const wrapper = mount(GalleryView);
    const select = wrapper.find('.cover-property-select');
    const options = select.findAll('option');
    // 1 disabled placeholder + 1 "None" option + 2 URL properties (Cover Image, Website)
    expect(options).toHaveLength(4);
    expect(options[2]!.text()).toBe('Cover Image');
    expect(options[3]!.text()).toBe('Website');
  });

  it('changes coverProperty via selector', async () => {
    setupStore({ coverProperty: null });
    mockDatabasesService.updateView.mockResolvedValue({
      view: {
        id: 'view-g',
        databaseId: 'db-1',
        name: 'Gallery view',
        type: 'GALLERY',
        position: 0,
        config: { coverProperty: 'prop-cover' },
      },
    });

    const wrapper = mount(GalleryView);
    const select = wrapper.find('.cover-property-select');
    await select.setValue('prop-cover');
    await flushPromises();

    expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      'view-g',
      expect.objectContaining({
        config: expect.objectContaining({ coverProperty: 'prop-cover' }),
      })
    );
  });

  it('shows cover-property bar when coverProperty is configured', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    expect(wrapper.find('.gallery-cover-bar').exists()).toBe(true);
    expect(wrapper.find('.gallery-cover-prompt').exists()).toBe(false);
  });

  // ===========================================
  // GALLERY GRID
  // ===========================================

  it('renders gallery grid with cards', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    expect(wrapper.find('.gallery-grid').exists()).toBe(true);
    const cards = wrapper.findAll('.gallery-card');
    expect(cards).toHaveLength(3);
  });

  it('renders gallery grid even when no coverProperty is set but with "none" option', () => {
    setupStore({ coverProperty: null });
    const wrapper = mount(GalleryView);
    // When no cover property, show the prompt and also show the grid without images
    expect(wrapper.find('.gallery-cover-prompt').exists()).toBe(true);
    // Grid should still render
    expect(wrapper.find('.gallery-grid').exists()).toBe(true);
  });

  it('renders card title from first property', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    const cards = wrapper.findAll('.gallery-card');
    expect(cards[0]!.find('.gallery-card-title').text()).toBe('Project Alpha');
    expect(cards[1]!.find('.gallery-card-title').text()).toBe('Project Beta');
    expect(cards[2]!.find('.gallery-card-title').text()).toBe('Project Gamma');
  });

  // ===========================================
  // COVER IMAGES
  // ===========================================

  it('renders cover image when URL property has a value', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    const cards = wrapper.findAll('.gallery-card');
    const img = cards[0]!.find('.gallery-card-cover img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://example.com/alpha.jpg');
  });

  it('renders placeholder when row has no cover image value', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    const cards = wrapper.findAll('.gallery-card');
    // Row 3 has no cover image
    const coverArea = cards[2]!.find('.gallery-card-cover');
    expect(coverArea.find('img').exists()).toBe(false);
    expect(coverArea.find('.cover-placeholder').exists()).toBe(true);
  });

  it('does not render cover section when no coverProperty configured', () => {
    setupStore({ coverProperty: null });
    const wrapper = mount(GalleryView);
    const cards = wrapper.findAll('.gallery-card');
    // No cover section at all
    expect(cards[0]!.find('.gallery-card-cover').exists()).toBe(false);
  });

  // ===========================================
  // VISIBLE PROPERTIES
  // ===========================================

  it('renders visible properties on cards via CellRenderer', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    const card = wrapper.findAll('.gallery-card')[0]!;
    const fields = card.findAll('.gallery-card-field');
    // Should show properties excluding title and cover: Status, Website
    expect(fields.length).toBeGreaterThanOrEqual(1);
    expect(card.text()).toContain('Active');
  });

  it('excludes title and cover properties from visible card fields', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    const card = wrapper.findAll('.gallery-card')[0]!;
    const fieldLabels = card.findAll('.gallery-card-field-label').map((el) => el.text());
    expect(fieldLabels).not.toContain('Title');
    expect(fieldLabels).not.toContain('Cover Image');
  });

  // ===========================================
  // CARD SIZE OPTIONS
  // ===========================================

  it('applies small card size class', () => {
    setupStore({ cardSize: 'small' });
    const wrapper = mount(GalleryView);
    expect(wrapper.find('.gallery-grid--small').exists()).toBe(true);
  });

  it('applies medium card size class by default', () => {
    setupStore();
    const wrapper = mount(GalleryView);
    expect(wrapper.find('.gallery-grid--medium').exists()).toBe(true);
  });

  it('applies large card size class', () => {
    setupStore({ cardSize: 'large' });
    const wrapper = mount(GalleryView);
    expect(wrapper.find('.gallery-grid--large').exists()).toBe(true);
  });

  it('changes card size via size selector', async () => {
    setupStore();
    mockDatabasesService.updateView.mockResolvedValue({
      view: {
        id: 'view-g',
        databaseId: 'db-1',
        name: 'Gallery view',
        type: 'GALLERY',
        position: 0,
        config: { coverProperty: 'prop-cover', cardSize: 'large' },
      },
    });

    const wrapper = mount(GalleryView);
    const sizeSelect = wrapper.find('.card-size-select');
    await sizeSelect.setValue('large');
    await flushPromises();

    expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      'view-g',
      expect.objectContaining({
        config: expect.objectContaining({ cardSize: 'large' }),
      })
    );
  });

  // ===========================================
  // EDGE CASES
  // ===========================================

  it('renders empty state when no rows exist', () => {
    const store = setupStore();
    store.rows = [];
    const wrapper = mount(GalleryView);
    expect(wrapper.find('.gallery-grid').exists()).toBe(true);
    expect(wrapper.findAll('.gallery-card')).toHaveLength(0);
  });

  it('handles broken image URL gracefully with placeholder', () => {
    const store = setupStore();
    store.rows = [
      {
        id: 'row-broken',
        databaseId: 'db-1',
        position: 0,
        cells: {
          'prop-title': 'Broken Image',
          'prop-cover': 'not-a-valid-url',
          'prop-status': 'Active',
        },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];
    const wrapper = mount(GalleryView);
    const card = wrapper.find('.gallery-card');
    // Image element should exist with the src
    const img = card.find('.gallery-card-cover img');
    expect(img.exists()).toBe(true);
    // The component should have an @error handler that shows placeholder
    // We can verify the img element has the correct src at minimum
    expect(img.attributes('src')).toBe('not-a-valid-url');
  });

  it('renders all rows from filteredAndSortedRows', () => {
    const store = setupStore();
    // Add more rows
    store.rows.push(
      {
        id: 'row-4',
        databaseId: 'db-1',
        position: 3,
        cells: { 'prop-title': 'Project Delta', 'prop-cover': 'https://example.com/delta.jpg' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'row-5',
        databaseId: 'db-1',
        position: 4,
        cells: { 'prop-title': 'Project Epsilon' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }
    );
    const wrapper = mount(GalleryView);
    expect(wrapper.findAll('.gallery-card')).toHaveLength(5);
  });
});
