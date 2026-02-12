import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    $queryRawUnsafe: vi.fn(),
  };

  function resetMocks() {
    mockPrisma.$queryRawUnsafe.mockReset();
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock Meilisearch — default to unavailable so existing PG FTS tests pass unchanged
const { mockMeiliAvailable, mockMeiliSearch, mockMeiliClient } = vi.hoisted(() => {
  const mockMeiliSearch = vi.fn();
  const mockMeiliClient = {
    index: vi.fn().mockReturnValue({ search: mockMeiliSearch }),
  };
  return {
    mockMeiliAvailable: { value: false },
    mockMeiliSearch,
    mockMeiliClient,
  };
});

vi.mock('../meilisearch.init.js', () => ({
  isMeilisearchAvailable: () => mockMeiliAvailable.value,
}));

vi.mock('../../../lib/meilisearch.js', () => ({
  getMeilisearchClient: () => (mockMeiliAvailable.value ? mockMeiliClient : null),
  PAGES_INDEX: 'test_pages',
}));

// Import after mocking
import { parseSearchQuery, searchPages } from '../search.service.js';

describe('Search Service', () => {
  beforeEach(() => {
    resetMocks();
    mockMeiliAvailable.value = false; // Default to PG FTS path
    mockMeiliSearch.mockReset();
    mockMeiliClient.index.mockReturnValue({ search: mockMeiliSearch });
  });

  // ===========================================
  // parseSearchQuery
  // ===========================================

  describe('parseSearchQuery', () => {
    it('should convert a single word to prefix matching', () => {
      expect(parseSearchQuery('hello')).toBe('hello:*');
    });

    it('should join multiple words with AND and add prefix on last term', () => {
      expect(parseSearchQuery('hello world')).toBe('hello & world:*');
    });

    it('should strip special tsquery characters', () => {
      expect(parseSearchQuery('hello & world | test!')).toBe('hello & world & test:*');
    });

    it('should handle parentheses and quotes', () => {
      expect(parseSearchQuery('(hello) "world"')).toBe('hello & world:*');
    });

    it('should handle extra whitespace', () => {
      expect(parseSearchQuery('  hello   world  ')).toBe('hello & world:*');
    });

    it('should return empty string for empty input', () => {
      expect(parseSearchQuery('')).toBe('');
    });

    it('should return empty string for input with only special characters', () => {
      expect(parseSearchQuery('&|!<>()')).toBe('');
    });

    it('should handle single character input', () => {
      expect(parseSearchQuery('a')).toBe('a:*');
    });

    it('should handle colons and asterisks', () => {
      expect(parseSearchQuery('test:* foo')).toBe('test & foo:*');
    });

    it('should handle unicode and emoji input', () => {
      const result = parseSearchQuery('日本語 テスト');
      expect(result).toBe('日本語 & テスト:*');
    });

    it('should handle backslash characters', () => {
      // Backslashes are replaced with spaces by the regex, splitting the words
      expect(parseSearchQuery('hello\\world')).toBe('hello & world:*');
    });

    it('should handle tab and newline characters in input', () => {
      const result = parseSearchQuery('hello\tworld\nfoo');
      // Tabs and newlines become whitespace, collapsed into single spaces
      expect(result).toBe('hello & world & foo:*');
    });

    it('should handle mixed special characters and valid words', () => {
      const result = parseSearchQuery('&&hello||world!!');
      expect(result).toBe('hello & world:*');
    });
  });

  // ===========================================
  // searchPages (PG FTS path)
  // ===========================================

  describe('searchPages', () => {
    const baseOptions = {
      query: 'test query',
      organizationId: 'org-123',
    };

    it('should return empty results for empty query', async () => {
      const result = await searchPages({
        query: '',
        organizationId: 'org-123',
      });

      expect(result).toEqual({ results: [], total: 0 });
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('should return empty results when query returns no rows', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await searchPages(baseOptions);

      expect(result).toEqual({ results: [], total: 0 });
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    });

    it('should return results with highlights and rank', async () => {
      const mockResults = [
        {
          id: 'page-1',
          title: 'Test Page',
          icon: null,
          createdById: 'user-1',
          createdByName: 'Test User',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          titleHighlight: '<mark>Test</mark> Page',
          contentHighlight: 'Some <mark>test</mark> content...',
          rank: 0.5,
          totalCount: 1,
        },
      ];

      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(mockResults);

      const result = await searchPages(baseOptions);

      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].titleHighlight).toContain('<mark>');
      expect(result.results[0].rank).toBe(0.5);
    });

    it('should pass correct parameters for basic search', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages(baseOptions);

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(call[1]).toBe('org-123'); // organizationId
      expect(call[2]).toBe('test & query:*'); // parsed tsquery
    });

    it('should apply limit and offset', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages({
        ...baseOptions,
        limit: 10,
        offset: 20,
      });

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const params = call.slice(1);
      expect(params).toContain(10);
      expect(params).toContain(20);
    });

    it('should apply dateFrom filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages({
        ...baseOptions,
        dateFrom: '2024-01-01',
      });

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('"createdAt" >=');
      expect(call[3]).toBe('2024-01-01');
    });

    it('should apply dateTo filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages({
        ...baseOptions,
        dateTo: '2024-12-31',
      });

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('"createdAt" <=');
      expect(call[3]).toBe('2024-12-31');
    });

    it('should apply createdById filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages({
        ...baseOptions,
        createdById: 'user-456',
      });

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('"createdById" =');
      expect(call[3]).toBe('user-456');
    });

    it('should apply all filters together', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages({
        ...baseOptions,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        createdById: 'user-456',
      });

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('"createdAt" >=');
      expect(sql).toContain('"createdAt" <=');
      expect(sql).toContain('"createdById" =');
      expect(call[3]).toBe('2024-01-01');
      expect(call[4]).toBe('2024-12-31');
      expect(call[5]).toBe('user-456');
    });

    it('should use default limit of 20 and offset of 0', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages(baseOptions);

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const params = call.slice(1);
      expect(params).toContain(20); // default limit
      expect(params).toContain(0); // default offset
    });

    it('should exclude trashed pages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages(baseOptions);

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('"trashedAt" IS NULL');
    });

    it('should throw when the database query fails', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('connection refused'));

      await expect(searchPages(baseOptions)).rejects.toThrow('connection refused');
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    });

    it('should use COALESCE for plainContent to handle null values', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 'page-null-content',
          title: 'Untitled',
          icon: null,
          createdById: 'user-1',
          createdByName: 'Test User',
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-06-02'),
          titleHighlight: 'Untitled',
          contentHighlight: '',
          rank: 0.1,
          totalCount: 1,
        },
      ]);

      const result = await searchPages(baseOptions);

      // Verify the search SQL contains the COALESCE wrapper for plainContent
      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('COALESCE(p."plainContent"');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].contentHighlight).toBe('');
    });

    it('should handle LEFT JOIN returning null user (createdByName is null)', async () => {
      const mockResults = [
        {
          id: 'page-orphan',
          title: 'Orphan Page',
          icon: null,
          createdById: 'deleted-user',
          createdByName: null,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-02'),
          titleHighlight: '<mark>Orphan</mark> Page',
          contentHighlight: 'Some content...',
          rank: 0.3,
          totalCount: 1,
        },
      ];

      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(mockResults);

      const result = await searchPages(baseOptions);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].createdByName).toBeNull();
      // Verify the query uses LEFT JOIN so missing users do not exclude pages
      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('LEFT JOIN');
    });

    it('should return empty results array for large offset beyond total', async () => {
      // With window function approach, when offset is beyond all results,
      // the query returns no rows — so total is 0
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await searchPages({
        ...baseOptions,
        limit: 20,
        offset: 1000,
      });

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);

      // Verify the large offset was passed through
      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const params = call.slice(1);
      expect(params).toContain(1000);
    });

    it('should apply dateFrom and dateTo at exact boundary (same date)', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages({
        ...baseOptions,
        dateFrom: '2024-06-15',
        dateTo: '2024-06-15',
      });

      const call = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = call[0] as string;
      expect(sql).toContain('"createdAt" >=');
      expect(sql).toContain('"createdAt" <=');
      // Both date params should be the same value
      expect(call[3]).toBe('2024-06-15');
      expect(call[4]).toBe('2024-06-15');
    });

    it('should extract totalCount from window function and exclude it from results', async () => {
      const mockResults = [
        {
          id: 'page-1',
          title: 'Page 1',
          icon: null,
          createdById: 'user-1',
          createdByName: 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
          titleHighlight: 'Page 1',
          contentHighlight: '',
          rank: 0.8,
          totalCount: 25,
        },
        {
          id: 'page-2',
          title: 'Page 2',
          icon: null,
          createdById: 'user-1',
          createdByName: 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
          titleHighlight: 'Page 2',
          contentHighlight: '',
          rank: 0.6,
          totalCount: 25,
        },
      ];

      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(mockResults);

      const result = await searchPages(baseOptions);

      expect(result.total).toBe(25);
      expect(result.results).toHaveLength(2);
      // totalCount should not appear in result rows
      for (const row of result.results) {
        expect(row).not.toHaveProperty('totalCount');
      }
    });

    it('should use a single query with COUNT(*) OVER() window function', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages(baseOptions);

      // Only one query should be made (not two separate COUNT + SELECT)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('COUNT(*)::int OVER()');
    });
  });

  // ===========================================
  // searchWithMeilisearch path
  // ===========================================

  describe('searchWithMeilisearch path', () => {
    const baseOptions = {
      query: 'test query',
      organizationId: 'org-123',
    };

    const makeMeiliResponse = (overrides: Record<string, unknown> = {}) => ({
      hits: [
        {
          id: 'page-1',
          title: 'Test Page',
          plainContent: 'Some test content for searching',
          orgId: 'org-123',
          createdById: 'user-1',
          createdAt: 1700000000,
          updatedAt: 1700001000,
          _formatted: {
            title: '<mark>Test</mark> Page',
            plainContent: 'Some <mark>test</mark> content...',
          },
        },
      ],
      estimatedTotalHits: 1,
      ...overrides,
    });

    beforeEach(() => {
      mockMeiliAvailable.value = true;
    });

    it('uses Meilisearch when available', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse());
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 'page-1',
          icon: null,
          createdByName: 'Test User',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ]);

      await searchPages(baseOptions);

      expect(mockMeiliClient.index).toHaveBeenCalledWith('test_pages');
      expect(mockMeiliSearch).toHaveBeenCalled();
    });

    it('builds orgId filter', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages(baseOptions);

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      expect(searchOpts.filter).toEqual(
        expect.arrayContaining([expect.stringContaining('orgId = "org-123"')])
      );
    });

    it('builds createdById filter', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages({ ...baseOptions, createdById: 'user-1' });

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      expect(searchOpts.filter).toEqual(
        expect.arrayContaining([expect.stringContaining('createdById = "user-1"')])
      );
    });

    it('builds dateFrom filter as Unix timestamp', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages({ ...baseOptions, dateFrom: '2024-01-01' });

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      const dateFromFilter = searchOpts.filter.find((f: string) => f.includes('createdAt >='));
      expect(dateFromFilter).toBeDefined();
      const timestamp = Math.floor(new Date('2024-01-01').getTime() / 1000);
      expect(dateFromFilter).toContain(`${timestamp}`);
    });

    it('builds dateTo filter as end-of-day timestamp', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages({ ...baseOptions, dateTo: '2024-12-31' });

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      const dateToFilter = searchOpts.filter.find((f: string) => f.includes('createdAt <='));
      expect(dateToFilter).toBeDefined();
      // End of day should be 23:59:59
      const endOfDay = new Date('2024-12-31');
      endOfDay.setHours(23, 59, 59, 999);
      const timestamp = Math.floor(endOfDay.getTime() / 1000);
      expect(dateToFilter).toContain(`${timestamp}`);
    });

    it('passes limit and offset', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages({ ...baseOptions, limit: 10, offset: 5 });

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      expect(searchOpts.limit).toBe(10);
      expect(searchOpts.offset).toBe(5);
    });

    it('requests highlights for title and plainContent', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages(baseOptions);

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      expect(searchOpts.attributesToHighlight).toEqual(['title', 'plainContent']);
    });

    it('maps hits to SearchResultRow format', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse());
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 'page-1',
          icon: 'icon-1',
          createdByName: 'Test User',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ]);

      const result = await searchPages(baseOptions);

      expect(result.results).toHaveLength(1);
      const row = result.results[0];
      expect(row.id).toBe('page-1');
      expect(row.title).toBe('Test Page');
      expect(row.icon).toBe('icon-1');
      expect(row.createdById).toBe('user-1');
      expect(row.createdByName).toBe('Test User');
      expect(row.titleHighlight).toBe('<mark>Test</mark> Page');
      expect(row.contentHighlight).toBe('Some <mark>test</mark> content...');
      expect(typeof row.rank).toBe('number');
    });

    it('fetches page metadata from PG for matched IDs', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse());
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 'page-1',
          icon: null,
          createdByName: 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await searchPages(baseOptions);

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
        'page-1',
      ]);
    });

    it('handles missing metadata gracefully', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse());
      // PG returns no matching rows
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await searchPages(baseOptions);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].icon).toBeNull();
      expect(result.results[0].createdByName).toBeNull();
    });

    it('returns estimatedTotalHits as total', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ estimatedTotalHits: 42 }));
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await searchPages(baseOptions);

      expect(result.total).toBe(42);
    });

    it('returns hits.length when estimatedTotalHits undefined', async () => {
      const response = makeMeiliResponse();
      delete (response as any).estimatedTotalHits;
      mockMeiliSearch.mockResolvedValueOnce(response);
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await searchPages(baseOptions);

      expect(result.total).toBe(1); // hits.length
    });

    it('skips metadata fetch when no hits', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages(baseOptions);

      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('falls back to PG FTS when Meilisearch throws', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockMeiliSearch.mockRejectedValueOnce(new Error('connection refused'));
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages(baseOptions);

      // PG FTS was used as fallback
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[search] Meilisearch query failed'),
        expect.anything()
      );
      warnSpy.mockRestore();
    });

    it('passes facets to Meilisearch when provided', async () => {
      mockMeiliSearch.mockResolvedValueOnce(
        makeMeiliResponse({
          hits: [],
          facetDistribution: { createdById: { 'user-1': 5 } },
        })
      );

      await searchPages({ ...baseOptions, facets: ['createdById'] });

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      expect(searchOpts.facets).toEqual(['createdById']);
    });

    it('does not pass facets when not provided', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      await searchPages(baseOptions);

      const searchOpts = mockMeiliSearch.mock.calls[0][1];
      expect(searchOpts.facets).toBeUndefined();
    });

    it('returns facetDistribution in result', async () => {
      const facetDistribution = { createdById: { 'user-1': 5, 'user-2': 3 } };
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [], facetDistribution }));

      const result = await searchPages({ ...baseOptions, facets: ['createdById'] });

      expect(result.facets).toEqual(facetDistribution);
    });

    it('returns no facets field when not requested', async () => {
      mockMeiliSearch.mockResolvedValueOnce(makeMeiliResponse({ hits: [] }));

      const result = await searchPages(baseOptions);

      expect(result.facets).toBeUndefined();
    });
  });

  // ===========================================
  // Hybrid fallback behaviour
  // ===========================================

  describe('hybrid fallback', () => {
    it('should use PG FTS when Meilisearch is not available', async () => {
      mockMeiliAvailable.value = false;
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await searchPages({ query: 'test', organizationId: 'org-1' });

      // PG FTS was used (at least one raw query)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should return empty results for whitespace-only query', async () => {
      const result = await searchPages({ query: '   ', organizationId: 'org-1' });
      expect(result).toEqual({ results: [], total: 0 });
    });
  });
});
