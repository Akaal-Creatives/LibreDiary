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

    it('should show default document icon when page has no icon', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ icon: null })],
        total: 1,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.result-page-icon').text()).toBe('📄');
    });

    it('should use singular "result" for count of 1', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult()],
        total: 1,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.search-section-title').text()).toBe('1 result');
    });

    it('should use plural "results" for count greater than 1', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'p1' }), createMockResult({ id: 'p2' })],
        total: 2,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.search-section-title').text()).toBe('2 results');
    });
  });

  // ===========================================
  // Keyboard navigation - extended
  // ===========================================

  describe('keyboard navigation - extended', () => {
    it('should navigate up with ArrowUp', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'page-1' }), createMockResult({ id: 'page-2' })],
        total: 2,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      const overlay = wrapper.find('.search-modal-overlay');
      // Move down first, then back up
      await overlay.trigger('keydown', { key: 'ArrowDown' });
      await overlay.trigger('keydown', { key: 'ArrowUp' });
      await flushPromises();

      const items = wrapper.findAll('.search-result-item');
      expect(items[0]!.classes()).toContain('selected');
    });

    it('should not go below last item with ArrowDown', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'page-1' }), createMockResult({ id: 'page-2' })],
        total: 2,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      const overlay = wrapper.find('.search-modal-overlay');
      // Press ArrowDown 5 times (more than items)
      for (let i = 0; i < 5; i++) {
        await overlay.trigger('keydown', { key: 'ArrowDown' });
      }
      await flushPromises();

      const items = wrapper.findAll('.search-result-item');
      expect(items[1]!.classes()).toContain('selected'); // stays at last (index 1)
    });

    it('should not go above first item with ArrowUp', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'page-1' }), createMockResult({ id: 'page-2' })],
        total: 2,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      const overlay = wrapper.find('.search-modal-overlay');
      // Press ArrowUp at start
      await overlay.trigger('keydown', { key: 'ArrowUp' });
      await flushPromises();

      const items = wrapper.findAll('.search-result-item');
      expect(items[0]!.classes()).toContain('selected'); // stays at first
    });

    it('should select recent search with Enter key', async () => {
      mockGetRecentSearches.mockReturnValue(['previous search']);
      const wrapper = mountModal();
      await flushPromises();

      await wrapper.find('.search-modal-overlay').trigger('keydown', { key: 'Enter' });

      const input = wrapper.find('.search-modal-input');
      expect((input.element as HTMLInputElement).value).toBe('previous search');
    });

    it('should do nothing on Enter when no results and no recent searches', async () => {
      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      await wrapper.find('.search-modal-overlay').trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('navigate')).toBeFalsy();
    });
  });

  // ===========================================
  // Search error handling
  // ===========================================

  describe('search error handling', () => {
    it('should clear results and stop loading on API error', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Network error'));

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(wrapper.find('.search-loading').exists()).toBe(false);
      expect(wrapper.find('.search-results').exists()).toBe(false);
    });

    it('should show empty state after error (not loading state)', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Server error'));

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      // Should show empty state since results are [] and loading is false
      expect(wrapper.find('.search-empty').exists()).toBe(true);
    });
  });

  // ===========================================
  // Debounce behaviour
  // ===========================================

  describe('debounce behaviour', () => {
    it('should cancel previous debounce when typing rapidly', async () => {
      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');

      await input.setValue('t');
      vi.advanceTimersByTime(100);
      await input.setValue('te');
      vi.advanceTimersByTime(100);
      await input.setValue('tes');
      vi.advanceTimersByTime(100);
      await input.setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      // Should only have searched once with final value
      expect(mockSearchService.search).toHaveBeenCalledTimes(1);
      expect(mockSearchService.search).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ q: 'test' })
      );
    });

    it('should cancel debounce when query is cleared', async () => {
      const wrapper = mountModal();
      const input = wrapper.find('.search-modal-input');

      await input.setValue('test');
      vi.advanceTimersByTime(100); // mid-debounce
      await input.setValue(''); // clear
      vi.advanceTimersByTime(300);
      await flushPromises();

      expect(mockSearchService.search).not.toHaveBeenCalled();
    });

    it('should reset selected index when results change', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'p1' }), createMockResult({ id: 'p2' })],
        total: 2,
        query: 'first',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('first');
      vi.advanceTimersByTime(300);
      await flushPromises();

      // Navigate to second item
      await wrapper.find('.search-modal-overlay').trigger('keydown', { key: 'ArrowDown' });

      // New search
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult({ id: 'p3' })],
        total: 1,
        query: 'second',
      });

      await wrapper.find('.search-modal-input').setValue('second');
      vi.advanceTimersByTime(300);
      await flushPromises();

      // First item should be selected again
      const items = wrapper.findAll('.search-result-item');
      expect(items[0]!.classes()).toContain('selected');
    });
  });

  // ===========================================
  // State reset on close
  // ===========================================

  describe('state management', () => {
    it('should reset all state when modal becomes hidden', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [createMockResult()],
        total: 1,
        query: 'test',
      });

      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');
      vi.advanceTimersByTime(300);
      await flushPromises();

      // Toggle filters
      await wrapper.find('.search-filter-toggle').trigger('click');

      // Now hide
      await wrapper.setProps({ visible: false });
      await flushPromises();

      // Re-show
      mockGetRecentSearches.mockReturnValue([]);
      await wrapper.setProps({ visible: true });
      await flushPromises();

      // Everything should be reset
      const input = wrapper.find('.search-modal-input');
      expect((input.element as HTMLInputElement).value).toBe('');
      expect(wrapper.find('.search-results').exists()).toBe(false);
      expect(wrapper.find('.search-filters').exists()).toBe(false);
    });

    it('should show initial state text when no query and no recent searches', () => {
      mockGetRecentSearches.mockReturnValue([]);
      const wrapper = mountModal();

      expect(wrapper.find('.search-initial').exists()).toBe(true);
      expect(wrapper.find('.search-initial-text').text()).toContain('Type to search');
    });
  });

  // ===========================================
  // Accessibility
  // ===========================================

  describe('accessibility', () => {
    it('should have role="dialog" on overlay', () => {
      const wrapper = mountModal();
      const overlay = wrapper.find('.search-modal-overlay');
      expect(overlay.attributes('role')).toBe('dialog');
    });

    it('should have aria-modal="true"', () => {
      const wrapper = mountModal();
      const overlay = wrapper.find('.search-modal-overlay');
      expect(overlay.attributes('aria-modal')).toBe('true');
    });

    it('should have aria-label for search', () => {
      const wrapper = mountModal();
      const overlay = wrapper.find('.search-modal-overlay');
      expect(overlay.attributes('aria-label')).toBe('Search pages');
    });

    it('should have aria-label on clear button', async () => {
      const wrapper = mountModal();
      await wrapper.find('.search-modal-input').setValue('test');

      expect(wrapper.find('.search-clear-btn').attributes('aria-label')).toBe('Clear search');
    });

    it('should have aria-label on filter toggle', () => {
      const wrapper = mountModal();
      expect(wrapper.find('.search-filter-toggle').attributes('aria-label')).toBe('Toggle filters');
    });

    it('should have autocomplete="off" on input', () => {
      const wrapper = mountModal();
      expect(wrapper.find('.search-modal-input').attributes('autocomplete')).toBe('off');
    });
  });
});
