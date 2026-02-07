import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import type { SearchResult } from '@librediary/shared';

const {
  mockSearchService,
  mockGetRecentSearches,
  mockRemoveRecentSearch,
  mockClearRecentSearches,
} = vi.hoisted(() => ({
  mockSearchService: {
    search: vi.fn(),
  },
  mockGetRecentSearches: vi.fn(),
  mockRemoveRecentSearch: vi.fn(),
  mockClearRecentSearches: vi.fn(),
}));

vi.mock('@/services', () => ({
  searchService: mockSearchService,
  getRecentSearches: mockGetRecentSearches,
  removeRecentSearch: mockRemoveRecentSearch,
  clearRecentSearches: mockClearRecentSearches,
}));

import SearchModal from '../SearchModal.vue';

function createMockResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'page-1',
    title: 'Test Page',
    titleHighlight: '<mark>Test</mark> Page',
    contentHighlight: 'Some <mark>test</mark> content...',
    icon: null,
    createdById: 'user-1',
    createdByName: 'Test User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rank: 0.5,
    ...overrides,
  };
}

describe('SearchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.setUser({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      locale: 'en',
      isSuperAdmin: false,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    authStore.setOrganizations(
      [
        {
          id: 'org-123',
          name: 'Test Org',
          slug: 'test-org',
          logoUrl: null,
          accentColor: null,
          allowedDomains: [],
          aiEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [
        {
          organizationId: 'org-123',
          role: 'OWNER' as const,
        },
      ]
    );

    mockGetRecentSearches.mockReturnValue([]);
    mockSearchService.search.mockResolvedValue({
      results: [],
      total: 0,
      query: '',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountModal(props = {}) {
    return mount(SearchModal, {
      props: { visible: true, ...props },
      global: {
        stubs: {
          Teleport: true,
          Transition: true,
        },
      },
    });
  }

  describe('rendering', () => {
    it('should render when visible is true', () => {
      const wrapper = mountModal();
      expect(wrapper.find('.search-modal').exists()).toBe(true);
    });

    it('should not render content when visible is false', () => {
      const wrapper = mountModal({ visible: false });
      expect(wrapper.find('.search-modal').exists()).toBe(false);
    });

    it('should render search input with placeholder', () => {
      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');
      expect(input.exists()).toBe(true);
      expect(input.attributes('placeholder')).toBe('Search pages...');
    });

    it('should render keyboard hints in footer', () => {
      const wrapper = mountModal();
      const footer = wrapper.find('.search-footer');
      expect(footer.exists()).toBe(true);
      expect(footer.text()).toContain('Navigate');
      expect(footer.text()).toContain('Open');
      expect(footer.text()).toContain('Close');
    });

    it('should render filter toggle button', () => {
      const wrapper = mountModal();
      expect(wrapper.find('.search-filter-toggle').exists()).toBe(true);
    });
  });

  describe('recent searches', () => {
    it('should show recent searches when query is empty', async () => {
      mockGetRecentSearches.mockReturnValue(['hello', 'world']);
      const wrapper = mountModal();
      await flushPromises();

      expect(wrapper.find('.search-recent').exists()).toBe(true);
      const items = wrapper.findAll('.recent-item');
      expect(items).toHaveLength(2);
    });

    it('should populate query when clicking a recent search', async () => {
      mockGetRecentSearches.mockReturnValue(['hello']);
      const wrapper = mountModal();
      await flushPromises();

      await wrapper.find('.recent-item').trigger('click');
      const input = wrapper.find('.search-modal-input');
      expect((input.element as HTMLInputElement).value).toBe('hello');
    });

    it('should remove a recent search when clicking remove button', async () => {
      mockGetRecentSearches.mockReturnValue(['hello', 'world']);
      const wrapper = mountModal();
      await flushPromises();

      const removeBtn = wrapper.find('.remove-recent-btn');
      await removeBtn.trigger('click');
      expect(mockRemoveRecentSearch).toHaveBeenCalledWith('hello');
    });

    it('should clear all recent searches', async () => {
      mockGetRecentSearches.mockReturnValue(['hello']);
      const wrapper = mountModal();
      await flushPromises();

      await wrapper.find('.search-section-action').trigger('click');
      expect(mockClearRecentSearches).toHaveBeenCalled();
    });
  });

  describe('searching', () => {
    it('should debounce search by 300ms', async () => {
      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');

      await input.setValue('test');
      expect(mockSearchService.search).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(mockSearchService.search).toHaveBeenCalledTimes(1);
    });

    it('should show loading state while searching', async () => {
      mockSearchService.search.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ results: [], total: 0, query: 'test' }), 500)
          )
      );

      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');
      await input.setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.search-loading').exists()).toBe(true);
    });

    it('should display results after search completes', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult()],
        total: 1,
        query: 'test',
      });

      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');
      await input.setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.search-results').exists()).toBe(true);
      const items = wrapper.findAll('.search-result-item');
      expect(items).toHaveLength(1);
    });

    it('should show empty state when no results found', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [],
        total: 0,
        query: 'nonexistent',
      });

      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');
      await input.setValue('nonexistent');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.search-empty').exists()).toBe(true);
      expect(wrapper.find('.search-empty-text').text()).toContain('nonexistent');
    });

    it('should show clear button when query has content', async () => {
      const wrapper = mountModal();
      expect(wrapper.find('.search-clear-btn').exists()).toBe(false);

      const input = wrapper.find('.search-modal-input');
      await input.setValue('test');

      expect(wrapper.find('.search-clear-btn').exists()).toBe(true);
    });

    it('should clear query when clear button is clicked', async () => {
      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');
      await input.setValue('test');

      await wrapper.find('.search-clear-btn').trigger('click');
      expect((input.element as HTMLInputElement).value).toBe('');
    });
  });

  describe('keyboard navigation', () => {
    it('should emit close on Escape', async () => {
      const wrapper = mountModal();
      await wrapper.find('.search-modal-overlay').trigger('keydown', { key: 'Escape' });
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit navigate on Enter when a result is selected', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'page-42' })],
        total: 1,
        query: 'test',
      });

      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');
      await input.setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      await wrapper.find('.search-modal-overlay').trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('navigate')).toBeTruthy();
      expect(wrapper.emitted('navigate')![0]).toEqual(['page-42']);
    });

    it('should navigate down with ArrowDown', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'page-1' }), createMockResult({ id: 'page-2' })],
        total: 2,
        query: 'test',
      });

      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');
      await input.setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      const overlay = wrapper.find('.search-modal-overlay');
      await overlay.trigger('keydown', { key: 'ArrowDown' });
      await flushPromises();

      const items = wrapper.findAll('.search-result-item');
      expect(items[1]!.classes()).toContain('selected');
    });
  });

  describe('overlay', () => {
    it('should emit close when clicking overlay', async () => {
      const wrapper = mountModal();
      const overlay = wrapper.find('.search-modal-overlay');
      // Simulate click on overlay itself (not child)
      await overlay.trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  describe('filters', () => {
    it('should toggle filter visibility', async () => {
      const wrapper = mountModal();
      expect(wrapper.find('.search-filters').exists()).toBe(false);

      await wrapper.find('.search-filter-toggle').trigger('click');
      expect(wrapper.find('.search-filters').exists()).toBe(true);

      await wrapper.find('.search-filter-toggle').trigger('click');
      expect(wrapper.find('.search-filters').exists()).toBe(false);
    });

    it('should show filter inputs when filters are visible', async () => {
      const wrapper = mountModal();
      await wrapper.find('.search-filter-toggle').trigger('click');

      const filterInputs = wrapper.findAll('.filter-input');
      expect(filterInputs.length).toBe(3); // dateFrom, dateTo, createdById
    });
  });

  describe('result display', () => {
    it('should show page icon or default emoji', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ icon: '🚀' })],
        total: 1,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.result-page-icon').text()).toBe('🚀');
    });

    it('should show total result count', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult()],
        total: 42,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.search-section-title').text()).toContain('42');
    });

    it('should emit navigate when clicking a result', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'page-99' })],
        total: 1,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      await wrapper.find('.search-result-item').trigger('click');
      expect(wrapper.emitted('navigate')![0]).toEqual(['page-99']);
    });
  });
});
