import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const { mockTemplatesStore } = vi.hoisted(() => ({
  mockTemplatesStore: {
    fetchTemplates: vi.fn(),
    loading: false,
    filteredTemplates: [] as Record<string, unknown>[],
    searchQuery: '',
    categoryFilter: null as string | null,
  },
}));

vi.mock('@/stores/templates', () => ({
  useTemplatesStore: () => mockTemplatesStore,
}));

import TemplateLibrary from '../TemplateLibrary.vue';

const sampleTemplates = [
  {
    id: 'tpl-1',
    name: 'Meeting Notes',
    description: 'Track meeting outcomes',
    icon: null,
    category: 'Meeting',
    isBuiltIn: true,
    organizationId: 'org-1',
    createdById: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'tpl-2',
    name: 'Project Plan',
    description: null,
    icon: '📋',
    category: 'Project',
    isBuiltIn: false,
    organizationId: 'org-1',
    createdById: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

describe('TemplateLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset mock store to defaults
    mockTemplatesStore.fetchTemplates = vi.fn();
    mockTemplatesStore.loading = false;
    mockTemplatesStore.filteredTemplates = [];
    mockTemplatesStore.searchQuery = '';
    mockTemplatesStore.categoryFilter = null;
  });

  function mountComponent() {
    return mount(TemplateLibrary);
  }

  // =========================================
  // Lifecycle
  // =========================================

  describe('lifecycle', () => {
    it('should call fetchTemplates on mount', () => {
      mountComponent();
      expect(mockTemplatesStore.fetchTemplates).toHaveBeenCalledOnce();
    });
  });

  // =========================================
  // Loading state
  // =========================================

  describe('loading state', () => {
    it('should show loading state when loading is true', () => {
      mockTemplatesStore.loading = true;
      const wrapper = mountComponent();

      const loadingState = wrapper.find('.loading-state');
      expect(loadingState.exists()).toBe(true);
      expect(loadingState.text()).toContain('Loading templates...');
    });
  });

  // =========================================
  // Empty state
  // =========================================

  describe('empty state', () => {
    it('should show empty state when filteredTemplates is empty and not loading', () => {
      mockTemplatesStore.loading = false;
      mockTemplatesStore.filteredTemplates = [];
      const wrapper = mountComponent();

      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.text()).toContain('No templates found');
    });
  });

  // =========================================
  // Template cards
  // =========================================

  describe('template cards', () => {
    it('should render template cards when templates exist', () => {
      mockTemplatesStore.filteredTemplates = sampleTemplates;
      const wrapper = mountComponent();

      const cards = wrapper.findAll('.template-card');
      expect(cards).toHaveLength(2);
    });

    it('should show template name and description', () => {
      mockTemplatesStore.filteredTemplates = [sampleTemplates[0]];
      const wrapper = mountComponent();

      expect(wrapper.find('.template-name').text()).toBe('Meeting Notes');
      expect(wrapper.find('.template-description').text()).toBe('Track meeting outcomes');
    });

    it('should show category badge for templates with a category', () => {
      mockTemplatesStore.filteredTemplates = [sampleTemplates[0]];
      const wrapper = mountComponent();

      const badge = wrapper.find('.category-badge');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('Meeting');
    });

    it('should show built-in badge for built-in templates', () => {
      mockTemplatesStore.filteredTemplates = [sampleTemplates[0]];
      const wrapper = mountComponent();

      const badge = wrapper.find('.builtin-badge');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('Built-in');
    });

    it('should not show built-in badge for non-built-in templates', () => {
      mockTemplatesStore.filteredTemplates = [sampleTemplates[1]];
      const wrapper = mountComponent();

      expect(wrapper.find('.builtin-badge').exists()).toBe(false);
    });

    it('should not show description when template has no description', () => {
      mockTemplatesStore.filteredTemplates = [sampleTemplates[1]];
      const wrapper = mountComponent();

      expect(wrapper.find('.template-description').exists()).toBe(false);
    });
  });

  // =========================================
  // Events
  // =========================================

  describe('events', () => {
    it('should emit useTemplate with template when card is clicked', async () => {
      mockTemplatesStore.filteredTemplates = [sampleTemplates[0]];
      const wrapper = mountComponent();

      await wrapper.find('.template-card').trigger('click');

      expect(wrapper.emitted('useTemplate')).toHaveLength(1);
      expect(wrapper.emitted('useTemplate')![0]).toEqual([sampleTemplates[0]]);
    });

    it('should emit close when close button is clicked', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.close-btn').trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  // =========================================
  // Category tabs
  // =========================================

  describe('category tabs', () => {
    it('should render all category tabs', () => {
      const wrapper = mountComponent();

      const tabs = wrapper.findAll('.category-tab');
      const tabTexts = tabs.map((t) => t.text());
      expect(tabTexts).toEqual(['All', 'Meeting', 'Project', 'Personal', 'Team', 'Other']);
    });

    it('should set categoryFilter to null when clicking "All" tab', async () => {
      const wrapper = mountComponent();

      // Click a different category first, then click "All"
      const tabs = wrapper.findAll('.category-tab');
      await tabs[1].trigger('click'); // Meeting
      await flushPromises();

      await tabs[0].trigger('click'); // All
      await flushPromises();

      expect(mockTemplatesStore.categoryFilter).toBeNull();
    });

    it('should set categoryFilter when clicking a category tab', async () => {
      const wrapper = mountComponent();

      const tabs = wrapper.findAll('.category-tab');
      await tabs[1].trigger('click'); // Meeting
      await flushPromises();

      expect(mockTemplatesStore.categoryFilter).toBe('Meeting');
    });
  });

  // =========================================
  // Search
  // =========================================

  describe('search', () => {
    it('should update searchQuery on search input', async () => {
      const wrapper = mountComponent();

      const input = wrapper.find('.search-input');
      await input.setValue('meeting');

      expect(mockTemplatesStore.searchQuery).toBe('meeting');
    });
  });
});
