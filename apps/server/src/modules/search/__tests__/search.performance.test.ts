import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    $queryRawUnsafe: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Switchable Meilisearch mock
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

import { searchPages } from '../search.service.js';

// ===========================================
// DATA GENERATORS
// ===========================================

function generatePgFtsResults(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `page-${i}`,
    title: `Test Page ${i}`,
    icon: i % 3 === 0 ? `icon-${i}` : null,
    createdById: `user-${i % 5}`,
    createdByName: `User ${i % 5}`,
    createdAt: new Date(Date.now() - i * 86400000),
    updatedAt: new Date(Date.now() - i * 3600000),
    titleHighlight: `<mark>Test</mark> Page ${i}`,
    contentHighlight: `Some <mark>test</mark> content for page ${i}...`,
    rank: Math.max(0.01, 1 - i * 0.01),
    totalCount: count * 2, // Simulate more results than returned
  }));
}

function generateMeiliHits(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `page-${i}`,
    title: `Test Page ${i}`,
    plainContent: `Some test content for page ${i} with various words`,
    orgId: 'org-1',
    createdById: `user-${i % 5}`,
    createdAt: Math.floor((Date.now() - i * 86400000) / 1000),
    updatedAt: Math.floor((Date.now() - i * 3600000) / 1000),
    _formatted: {
      title: `<mark>Test</mark> Page ${i}`,
      plainContent: `Some <mark>test</mark> content for page ${i}...`,
    },
  }));
}

function generatePgMetadata(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `page-${i}`,
    icon: i % 3 === 0 ? `icon-${i}` : null,
    createdByName: `User ${i % 5}`,
    createdAt: new Date(Date.now() - i * 86400000),
    updatedAt: new Date(Date.now() - i * 3600000),
  }));
}

/**
 * Measure the average execution time of a function over N iterations.
 */
async function measureMs(fn: () => Promise<void>, iterations = 100): Promise<number> {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  return (performance.now() - start) / iterations;
}

describe('Search Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMeiliAvailable.value = false;
    mockMeiliSearch.mockReset();
    mockMeiliClient.index.mockReturnValue({ search: mockMeiliSearch });
    mockPrisma.$queryRawUnsafe.mockReset();
  });

  // ===========================================
  // PG FTS performance
  // ===========================================

  describe('PG FTS path', () => {
    it('processes 10 results within threshold', async () => {
      const results = generatePgFtsResults(10);
      mockPrisma.$queryRawUnsafe.mockResolvedValue(results);

      const avg = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      });

      expect(avg).toBeLessThan(1);
    });

    it('processes 100 results within threshold', async () => {
      const results = generatePgFtsResults(100);
      mockPrisma.$queryRawUnsafe.mockResolvedValue(results);

      const avg = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      });

      expect(avg).toBeLessThan(2);
    });

    it('processes 500 results within threshold', async () => {
      const results = generatePgFtsResults(500);
      mockPrisma.$queryRawUnsafe.mockResolvedValue(results);

      const avg = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      });

      expect(avg).toBeLessThan(5);
    });
  });

  // ===========================================
  // Meilisearch performance
  // ===========================================

  describe('Meilisearch path', () => {
    beforeEach(() => {
      mockMeiliAvailable.value = true;
    });

    it('processes 10 results within threshold', async () => {
      const hits = generateMeiliHits(10);
      const meta = generatePgMetadata(10);
      mockMeiliSearch.mockResolvedValue({ hits, estimatedTotalHits: 10 });
      mockPrisma.$queryRawUnsafe.mockResolvedValue(meta);

      const avg = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      });

      expect(avg).toBeLessThan(1);
    });

    it('processes 100 results within threshold', async () => {
      const hits = generateMeiliHits(100);
      const meta = generatePgMetadata(100);
      mockMeiliSearch.mockResolvedValue({ hits, estimatedTotalHits: 100 });
      mockPrisma.$queryRawUnsafe.mockResolvedValue(meta);

      const avg = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      });

      expect(avg).toBeLessThan(2);
    });

    it('processes 500 results within threshold', async () => {
      const hits = generateMeiliHits(500);
      const meta = generatePgMetadata(500);
      mockMeiliSearch.mockResolvedValue({ hits, estimatedTotalHits: 500 });
      mockPrisma.$queryRawUnsafe.mockResolvedValue(meta);

      const avg = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      });

      expect(avg).toBeLessThan(5);
    });
  });

  // ===========================================
  // Result quality
  // ===========================================

  describe('Result quality', () => {
    it('both produce valid highlight markup', async () => {
      // PG FTS path
      mockMeiliAvailable.value = false;
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(generatePgFtsResults(3));
      const pgResult = await searchPages({ query: 'test', organizationId: 'org-1' });

      // Meilisearch path
      mockMeiliAvailable.value = true;
      mockMeiliSearch.mockResolvedValueOnce({
        hits: generateMeiliHits(3),
        estimatedTotalHits: 3,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(generatePgMetadata(3));
      const meiliResult = await searchPages({ query: 'test', organizationId: 'org-1' });

      // Both should have <mark> tags
      for (const row of pgResult.results) {
        expect(row.titleHighlight).toContain('<mark>');
      }
      for (const row of meiliResult.results) {
        expect(row.titleHighlight).toContain('<mark>');
      }
    });

    it('Meilisearch results have descending rank', async () => {
      mockMeiliAvailable.value = true;
      mockMeiliSearch.mockResolvedValueOnce({
        hits: generateMeiliHits(5),
        estimatedTotalHits: 5,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(generatePgMetadata(5));

      const result = await searchPages({ query: 'test', organizationId: 'org-1' });

      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].rank).toBeLessThanOrEqual(result.results[i - 1].rank);
      }
    });

    it('PG FTS rank > 0', async () => {
      mockMeiliAvailable.value = false;
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(generatePgFtsResults(5));

      const result = await searchPages({ query: 'test', organizationId: 'org-1' });

      for (const row of result.results) {
        expect(row.rank).toBeGreaterThan(0);
      }
    });

    it('both return consistent shapes', async () => {
      const expectedFields = [
        'id',
        'title',
        'icon',
        'createdById',
        'createdByName',
        'createdAt',
        'updatedAt',
        'titleHighlight',
        'contentHighlight',
        'rank',
      ];

      // PG FTS
      mockMeiliAvailable.value = false;
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(generatePgFtsResults(1));
      const pgResult = await searchPages({ query: 'test', organizationId: 'org-1' });

      // Meilisearch
      mockMeiliAvailable.value = true;
      mockMeiliSearch.mockResolvedValueOnce({
        hits: generateMeiliHits(1),
        estimatedTotalHits: 1,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(generatePgMetadata(1));
      const meiliResult = await searchPages({ query: 'test', organizationId: 'org-1' });

      for (const field of expectedFields) {
        expect(pgResult.results[0]).toHaveProperty(field);
        expect(meiliResult.results[0]).toHaveProperty(field);
      }
    });
  });

  // ===========================================
  // Facet overhead
  // ===========================================

  describe('Facet overhead', () => {
    it('facets do not significantly increase time', async () => {
      mockMeiliAvailable.value = true;
      const hits = generateMeiliHits(50);
      const meta = generatePgMetadata(50);

      // Without facets
      mockMeiliSearch.mockResolvedValue({ hits, estimatedTotalHits: 50 });
      mockPrisma.$queryRawUnsafe.mockResolvedValue(meta);

      const withoutFacets = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      }, 50);

      // With facets
      mockMeiliSearch.mockResolvedValue({
        hits,
        estimatedTotalHits: 50,
        facetDistribution: {
          createdById: { 'user-0': 10, 'user-1': 10, 'user-2': 10, 'user-3': 10, 'user-4': 10 },
        },
      });

      const withFacets = await measureMs(async () => {
        await searchPages({
          query: 'test',
          organizationId: 'org-1',
          facets: ['createdById'],
        });
      }, 50);

      // Facets should not add more than 3x overhead
      expect(withFacets).toBeLessThan(withoutFacets * 3 + 0.5);
    });
  });

  // ===========================================
  // Scaling
  // ===========================================

  describe('Scaling', () => {
    it('neither path shows O(n^2) growth', async () => {
      // PG FTS — 10 results vs 100 results
      mockMeiliAvailable.value = false;

      mockPrisma.$queryRawUnsafe.mockResolvedValue(generatePgFtsResults(10));
      const pg10 = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      }, 50);

      mockPrisma.$queryRawUnsafe.mockResolvedValue(generatePgFtsResults(100));
      const pg100 = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      }, 50);

      // 10x data should be <10x time (linear or better, not quadratic)
      expect(pg100).toBeLessThan(pg10 * 10 + 1);

      // Meilisearch — 10 results vs 100 results
      mockMeiliAvailable.value = true;

      mockMeiliSearch.mockResolvedValue({
        hits: generateMeiliHits(10),
        estimatedTotalHits: 10,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue(generatePgMetadata(10));
      const meili10 = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      }, 50);

      mockMeiliSearch.mockResolvedValue({
        hits: generateMeiliHits(100),
        estimatedTotalHits: 100,
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue(generatePgMetadata(100));
      const meili100 = await measureMs(async () => {
        await searchPages({ query: 'test', organizationId: 'org-1' });
      }, 50);

      // 10x data should be <10x time
      expect(meili100).toBeLessThan(meili10 * 10 + 1);
    });
  });
});
