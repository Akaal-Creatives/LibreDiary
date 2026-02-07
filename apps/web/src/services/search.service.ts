import { api } from './api';
import type { SearchResult, SearchFilters, SearchResponse } from '@librediary/shared';

const RECENT_SEARCHES_KEY = 'librediary:recent-searches';
const MAX_RECENT_SEARCHES = 10;

export interface SearchServiceResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export const searchService = {
  /**
   * Search pages within an organisation
   */
  async search(orgId: string, filters: SearchFilters): Promise<SearchServiceResponse> {
    const params = new URLSearchParams();
    params.set('q', filters.q);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.createdById) params.set('createdById', filters.createdById);

    const query = params.toString();
    const response = await api.get<SearchResponse>(
      `/organizations/${orgId}/search${query ? `?${query}` : ''}`
    );

    // Auto-save to recent searches
    saveRecentSearch(filters.q);

    return response;
  },
};

/**
 * Get recent searches from localStorage
 */
export function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a search query to recent searches (deduplicates, max 10)
 */
export function saveRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;

  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((s) => s !== trimmed);
    filtered.unshift(trimmed);
    const limited = filtered.slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(limited));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Remove a specific search from recent searches
 */
export function removeRecentSearch(query: string): void {
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((s) => s !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Clear all recent searches
 */
export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // localStorage may be unavailable
  }
}

// Re-export types
export type { SearchResult, SearchFilters, SearchResponse };
