import { prisma } from '../../lib/prisma.js';
import type { AuditAction } from '../../generated/prisma/client.js';
import type { Prisma } from '../../generated/prisma/client.js';

// ===========================================
// TYPES
// ===========================================

export interface AuditLogInput {
  action: AuditAction;
  userId?: string | null;
  organizationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogFilters {
  action?: AuditAction;
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface EnrichedAuditLog {
  id: string;
  action: AuditAction;
  userId: string | null;
  organizationId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: { email: string; name: string | null } | null;
  organization: { name: string; slug: string } | null;
}

// ===========================================
// LOGGING
// ===========================================

/**
 * Log an audit event (fire-and-forget).
 * Never throws — errors are caught and logged to console.
 */
export function logAudit(input: AuditLogInput): void {
  prisma.auditLog
    .create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        organizationId: input.organizationId ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
    .catch((err) => console.error('[audit] logging failed:', err));
}

// ===========================================
// QUERYING
// ===========================================

/**
 * List audit logs with pagination and optional filters.
 * Enriches results with user and organisation details.
 */
export async function listAuditLogs(filters: AuditLogFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = filters.userId;
  if (filters.organizationId) where.organizationId = filters.organizationId;
  if (filters.resourceType) where.resourceType = filters.resourceType;
  if (filters.startDate || filters.endDate) {
    const createdAt: Record<string, Date> = {};
    if (filters.startDate) createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) createdAt.lte = new Date(filters.endDate);
    where.createdAt = createdAt;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Batch-fetch user and org details for enrichment
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const orgIds = [...new Set(logs.map((l) => l.organizationId).filter(Boolean))] as string[];

  const [users, orgs] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [],
    orgIds.length > 0
      ? prisma.organization.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true, slug: true },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, { email: u.email, name: u.name }]));
  const orgMap = new Map(orgs.map((o) => [o.id, { name: o.name, slug: o.slug }]));

  const items: EnrichedAuditLog[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    organizationId: log.organizationId,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    user: log.userId ? (userMap.get(log.userId) ?? null) : null,
    organization: log.organizationId ? (orgMap.get(log.organizationId) ?? null) : null,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get distinct action types that have been logged.
 */
export async function getDistinctActions(): Promise<AuditAction[]> {
  const result = await prisma.auditLog.groupBy({
    by: ['action'],
  });

  return result.map((r) => r.action);
}

/**
 * Delete audit logs older than the given date.
 * Returns the number of deleted records.
 */
export async function purgeAuditLogs(olderThan: Date): Promise<number> {
  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: olderThan },
    },
  });

  return result.count;
}
