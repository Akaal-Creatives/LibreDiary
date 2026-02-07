import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import {
  searchService,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../search.service';

describe('Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ===========================================
  // searchService.search
  // ===========================================

  describe('searchService.search', () => {
    const mockResponse = {
      results: [
        {
          id: 'page-1',
          title: 'Test Page',
          titleHighlight: '<mark>Test</mark> Page',
          contentHighlight: 'Some <mark>test</mark> content...',
          icon: null,
          createdById: 'user-1',
          createdByName: 'Test User',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          rank: 0.5,
        },
      ],
      total: 1,
      query: 'test',
    };

    it('should call API with correct query parameters', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await searchService.search('org-123', { q: 'test' });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/organizations/org-123/search?q=test')
      );
    });

    it('should pass all filter parameters', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await searchService.search('org-123', {
        q: 'hello',
        limit: 10,
        offset: 5,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        createdById: 'user-456',
      });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('q=hello');
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=5');
      expect(url).toContain('dateFrom=2024-01-01');
      expect(url).toContain('dateTo=2024-12-31');
      expect(url).toContain('createdById=user-456');
    });

    it('should return the response', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await searchService.search('org-123', { q: 'test' });

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.query).toBe('test');
    });

    it('should auto-save query to recent searches', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await searchService.search('org-123', { q: 'test query' });

      const recent = getRecentSearches();
      expect(recent).toContain('test query');
    });
  });

  // ===========================================
  // Recent searches (localStorage)
  // ===========================================

  describe('getRecentSearches', () => {
    it('should return empty array when no searches stored', () => {
      expect(getRecentSearches()).toEqual([]);
    });

    it('should return stored searches', () => {
      localStorage.setItem('librediary:recent-searches', JSON.stringify(['hello', 'world']));
      expect(getRecentSearches()).toEqual(['hello', 'world']);
    });

    it('should return empty array for invalid JSON', () => {
      localStorage.setItem('librediary:recent-searches', 'invalid');
      expect(getRecentSearches()).toEqual([]);
    });

    it('should return empty array for non-array JSON', () => {
      localStorage.setItem('librediary:recent-searches', '{"foo":"bar"}');
      expect(getRecentSearches()).toEqual([]);
    });
  });

  describe('saveRecentSearch', () => {
    it('should save a search query', () => {
      saveRecentSearch('hello');
      expect(getRecentSearches()).toEqual(['hello']);
    });

    it('should deduplicate queries', () => {
      saveRecentSearch('hello');
      saveRecentSearch('world');
      saveRecentSearch('hello');
      expect(getRecentSearches()).toEqual(['hello', 'world']);
    });

    it('should put most recent search first', () => {
      saveRecentSearch('first');
      saveRecentSearch('second');
      saveRecentSearch('third');
      expect(getRecentSearches()[0]).toBe('third');
    });

    it('should limit to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        saveRecentSearch(`query-${i}`);
      }
      expect(getRecentSearches()).toHaveLength(10);
    });

    it('should not save empty or whitespace-only queries', () => {
      saveRecentSearch('');
      saveRecentSearch('   ');
      expect(getRecentSearches()).toEqual([]);
    });

    it('should trim queries before saving', () => {
      saveRecentSearch('  hello  ');
      expect(getRecentSearches()).toEqual(['hello']);
    });
  });

  describe('removeRecentSearch', () => {
    it('should remove a specific search', () => {
      saveRecentSearch('hello');
      saveRecentSearch('world');
      removeRecentSearch('hello');
      expect(getRecentSearches()).toEqual(['world']);
    });

    it('should handle removing non-existent search', () => {
      saveRecentSearch('hello');
      removeRecentSearch('nonexistent');
      expect(getRecentSearches()).toEqual(['hello']);
    });
  });

  describe('clearRecentSearches', () => {
    it('should clear all recent searches', () => {
      saveRecentSearch('hello');
      saveRecentSearch('world');
      clearRecentSearches();
      expect(getRecentSearches()).toEqual([]);
    });
  });
});
