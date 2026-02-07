import { prisma } from '../../lib/prisma.js';

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
// SEARCH
// ===========================================

/**
 * Search pages within an organisation using PostgreSQL full-text search.
 * Returns results with highlighted title and content snippets.
 */
export async function searchPages(options: SearchOptions): Promise<SearchServiceResult> {
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

  // Count total matching results
  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM "Page" p
    WHERE ${whereClause}
  `;

  const countResult = await prisma.$queryRawUnsafe<[{ total: number }]>(countQuery, ...params);
  const total = countResult[0]?.total ?? 0;

  if (total === 0) {
    return { results: [], total: 0 };
  }

  // Fetch results with highlights and ranking
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
      ts_rank(p."search_vector", to_tsquery('english', $2)) as "rank"
    FROM "Page" p
    LEFT JOIN "User" u ON u."id" = p."createdById"
    WHERE ${whereClause}
    ORDER BY "rank" DESC, p."updatedAt" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const results = await prisma.$queryRawUnsafe<SearchResultRow[]>(searchQuery, ...params);

  return { results, total };
}
