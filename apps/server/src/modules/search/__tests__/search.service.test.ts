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

// Import after mocking
import { parseSearchQuery, searchPages } from '../search.service.js';

describe('Search Service', () => {
  beforeEach(() => {
    resetMocks();
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
  });

  // ===========================================
  // searchPages
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

    it('should return empty results when count is 0', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 0 }]);

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
        },
      ];

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: 1 }]) // count query
        .mockResolvedValueOnce(mockResults); // search query

      const result = await searchPages(baseOptions);

      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].titleHighlight).toContain('<mark>');
      expect(result.results[0].rank).toBe(0.5);
    });

    it('should pass correct parameters for basic search', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 0 }]);

      await searchPages(baseOptions);

      const countCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(countCall[1]).toBe('org-123'); // organizationId
      expect(countCall[2]).toBe('test & query:*'); // parsed tsquery
    });

    it('should apply limit and offset', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 50 }]).mockResolvedValueOnce([]);

      await searchPages({
        ...baseOptions,
        limit: 10,
        offset: 20,
      });

      const searchCall = mockPrisma.$queryRawUnsafe.mock.calls[1];
      // limit and offset are the last two params
      const params = searchCall.slice(1);
      expect(params).toContain(10);
      expect(params).toContain(20);
    });

    it('should apply dateFrom filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 0 }]);

      await searchPages({
        ...baseOptions,
        dateFrom: '2024-01-01',
      });

      const countCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = countCall[0] as string;
      expect(sql).toContain('"createdAt" >=');
      expect(countCall[3]).toBe('2024-01-01');
    });

    it('should apply dateTo filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 0 }]);

      await searchPages({
        ...baseOptions,
        dateTo: '2024-12-31',
      });

      const countCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = countCall[0] as string;
      expect(sql).toContain('"createdAt" <=');
      expect(countCall[3]).toBe('2024-12-31');
    });

    it('should apply createdById filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 0 }]);

      await searchPages({
        ...baseOptions,
        createdById: 'user-456',
      });

      const countCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = countCall[0] as string;
      expect(sql).toContain('"createdById" =');
      expect(countCall[3]).toBe('user-456');
    });

    it('should apply all filters together', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 0 }]);

      await searchPages({
        ...baseOptions,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        createdById: 'user-456',
      });

      const countCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = countCall[0] as string;
      expect(sql).toContain('"createdAt" >=');
      expect(sql).toContain('"createdAt" <=');
      expect(sql).toContain('"createdById" =');
      expect(countCall[3]).toBe('2024-01-01');
      expect(countCall[4]).toBe('2024-12-31');
      expect(countCall[5]).toBe('user-456');
    });

    it('should use default limit of 20 and offset of 0', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([]);

      await searchPages(baseOptions);

      const searchCall = mockPrisma.$queryRawUnsafe.mock.calls[1];
      const params = searchCall.slice(1);
      expect(params).toContain(20); // default limit
      expect(params).toContain(0); // default offset
    });

    it('should exclude trashed pages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ total: 0 }]);

      await searchPages(baseOptions);

      const countCall = mockPrisma.$queryRawUnsafe.mock.calls[0];
      const sql = countCall[0] as string;
      expect(sql).toContain('"trashedAt" IS NULL');
    });
  });
});
