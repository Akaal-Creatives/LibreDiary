import { prisma } from '../../lib/prisma.js';
import { getMeilisearchClient, PAGES_INDEX } from '../../lib/meilisearch.js';
import { isMeilisearchAvailable } from './meilisearch.init.js';

// ===========================================
// TYPES
// ===========================================

export interface SearchOptions {
  query: string;
  organizationId: string;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  createdById?: string;
}

export interface SearchResultRow {
  id: string;
  title: string;
  icon: string | null;
  createdById: string;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  titleHighlight: string;
  contentHighlight: string;
  rank: number;
}

export interface SearchServiceResult {
  results: SearchResultRow[];
  total: number;
}

// ===========================================
// QUERY PARSING
// ===========================================

/**
 * Sanitise user input and convert to PostgreSQL tsquery format.
 * - Strips special tsquery characters
 * - Joins words with & (AND)
 * - Adds :* prefix matching on the last term for as-you-type results
 */
export function parseSearchQuery(rawQuery: string): string {
  const cleaned = rawQuery
    .replace(/[&|!<>():*\\'"]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!cleaned) return '';

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 0) return '';

  return words
    .map((word, index) => {
      if (index === words.length - 1) {
        return `${word}:*`;
      }
      return word;
    })
    .join(' & ');
}

// ===========================================
// MEILISEARCH SEARCH
// ===========================================

/**
 * Search pages using Meilisearch.
 * Returns results in the same shape as PG FTS for seamless fallback.
 */
async function searchWithMeilisearch(options: SearchOptions): Promise<SearchServiceResult> {
  const { query, organizationId, limit = 20, offset = 0, dateFrom, dateTo, createdById } = options;

  const client = getMeilisearchClient();
  if (!client) throw new Error('Meilisearch client not available');

  // Build filter array
  const filters: string[] = [`orgId = "${organizationId}"`];

  if (createdById) {
    filters.push(`createdById = "${createdById}"`);
  }
  if (dateFrom) {
    filters.push(`createdAt >= ${Math.floor(new Date(dateFrom).getTime() / 1000)}`);
  }
  if (dateTo) {
    // End of day for dateTo
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    filters.push(`createdAt <= ${Math.floor(endOfDay.getTime() / 1000)}`);
  }

  const result = await client.index(PAGES_INDEX).search(query, {
    filter: filters,
    limit,
    offset,
    attributesToHighlight: ['title', 'plainContent'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
    attributesToCrop: ['plainContent'],
    cropLength: 60,
  });

  // Fetch page metadata (icon, createdByName) from PG for the matching IDs
  const pageIds = result.hits.map((hit) => hit.id as string);
  const pageMetaMap = new Map<
    string,
    { icon: string | null; createdByName: string | null; createdAt: Date; updatedAt: Date }
  >();

  if (pageIds.length > 0) {
    const pages = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        icon: string | null;
        createdByName: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(
      `SELECT p."id", p."icon", u."name" as "createdByName", p."createdAt", p."updatedAt"
       FROM "Page" p
       LEFT JOIN "User" u ON u."id" = p."createdById"
       WHERE p."id" = ANY($1)`,
      pageIds
    );

    for (const page of pages) {
      pageMetaMap.set(page.id, page);
    }
  }

  const results: SearchResultRow[] = result.hits.map((hit, index) => {
    const meta = pageMetaMap.get(hit.id as string);
    const formatted = hit._formatted || {};

    return {
      id: hit.id as string,
      title: hit.title as string,
      icon: meta?.icon ?? null,
      createdById: hit.createdById as string,
      createdByName: meta?.createdByName ?? null,
      createdAt: meta?.createdAt ?? new Date((hit.createdAt as number) * 1000),
      updatedAt: meta?.updatedAt ?? new Date((hit.updatedAt as number) * 1000),
      titleHighlight: (formatted.title as string) || (hit.title as string),
      contentHighlight: (formatted.plainContent as string) || '',
      rank: 1 - index * 0.01, // Preserve Meilisearch relevance order
    };
  });

  return {
    results,
    total: result.estimatedTotalHits ?? result.hits.length,
  };
}

// ===========================================
// POSTGRESQL FTS SEARCH
// ===========================================

/**
 * Search pages using PostgreSQL full-text search.
 * Returns results with highlighted title and content snippets.
 */
async function searchWithPostgres(options: SearchOptions): Promise<SearchServiceResult> {
  const { query, organizationId, limit = 20, offset = 0, dateFrom, dateTo, createdById } = options;

  const tsquery = parseSearchQuery(query);
  if (!tsquery) {
    return { results: [], total: 0 };
  }

  // Build WHERE conditions and parameters
  const conditions: string[] = [
    `p."organizationId" = $1`,
    `p."trashedAt" IS NULL`,
    `p."search_vector" @@ to_tsquery('english', $2)`,
  ];
  const params: unknown[] = [organizationId, tsquery];
  let paramIndex = 3;

  if (dateFrom) {
    conditions.push(`p."createdAt" >= $${paramIndex}::timestamp`);
    params.push(dateFrom);
    paramIndex++;
  }

  if (dateTo) {
    conditions.push(`p."createdAt" <= $${paramIndex}::timestamp`);
    params.push(dateTo);
    paramIndex++;
  }

  if (createdById) {
    conditions.push(`p."createdById" = $${paramIndex}`);
    params.push(createdById);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Single query with window function for total count
  const searchQuery = `
    SELECT
      p."id",
      p."title",
      p."icon",
      p."createdById",
      u."name" as "createdByName",
      p."createdAt",
      p."updatedAt",
      ts_headline('english', p."title", to_tsquery('english', $2),
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=50'
      ) as "titleHighlight",
      ts_headline('english', COALESCE(p."plainContent", ''), to_tsquery('english', $2),
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=30, MinWords=15'
      ) as "contentHighlight",
      ts_rank(p."search_vector", to_tsquery('english', $2)) as "rank",
      COUNT(*)::int OVER() as "totalCount"
    FROM "Page" p
    LEFT JOIN "User" u ON u."id" = p."createdById"
    WHERE ${whereClause}
    ORDER BY "rank" DESC, p."updatedAt" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const rows = await prisma.$queryRawUnsafe<(SearchResultRow & { totalCount: number })[]>(
    searchQuery,
    ...params
  );

  if (rows.length === 0) {
    return { results: [], total: 0 };
  }

  const total = rows[0]!.totalCount;
  const results: SearchResultRow[] = rows.map(({ totalCount: _, ...row }) => row);

  return { results, total };
}

// ===========================================
// HYBRID SEARCH (public API)
// ===========================================

/**
 * Search pages within an organisation using Meilisearch with PG FTS fallback.
 * Tries Meilisearch first when available, falls back to PostgreSQL FTS on failure.
 * Returns results in the same SearchServiceResult shape regardless of backend.
 */
export async function searchPages(options: SearchOptions): Promise<SearchServiceResult> {
  const { query } = options;

  if (!query.trim()) {
    return { results: [], total: 0 };
  }

  // Try Meilisearch first when available
  if (isMeilisearchAvailable()) {
    try {
      return await searchWithMeilisearch(options);
    } catch (err) {
      console.warn('[search] Meilisearch query failed, falling back to PG FTS:', err);
    }
  }

  // Fall back to PostgreSQL full-text search
  return searchWithPostgres(options);
}
