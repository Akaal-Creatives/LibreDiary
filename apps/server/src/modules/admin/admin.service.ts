import { prisma } from '../../lib/prisma.js';
import type { User, Organization, Prisma } from '../../generated/prisma/client.js';
import * as filesService from '../files/files.service.js';
import { getHocuspocusServer } from '../collaboration/hocuspocus.js';
import { maskApiKey } from '../ai/ai.service.js';
import { TtlCache } from '../../utils/ttl-cache.js';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// USER MANAGEMENT
// ============================================

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  organizationCount: number;
}

export async function listUsers(
  params: PaginationParams
): Promise<PaginatedResult<AdminUserListItem>> {
  const { page = 1, limit = 20, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isSuperAdmin: true,
        emailVerified: true,
        createdAt: true,
        deletedAt: true,
        _count: {
          select: { memberships: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
      organizationCount: user._count.memberships,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  memberships: {
    id: string;
    role: string;
    createdAt: Date;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

export async function getUserById(userId: string): Promise<AdminUserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    isSuperAdmin: user.isSuperAdmin,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    memberships: user.memberships.map((m) => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
      organization: m.organization,
    })),
  };
}

export interface UpdateUserData {
  name?: string;
  isSuperAdmin?: boolean;
}

export async function updateUser(userId: string, data: UpdateUserData): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function softDeleteUser(userId: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function restoreUser(userId: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: null,
    },
  });
}

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

export interface AdminOrgListItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  memberCount: number;
}

export async function listOrganizations(
  params: PaginationParams
): Promise<PaginatedResult<AdminOrgListItem>> {
  const { page = 1, limit = 20, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.OrganizationWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        accentColor: true,
        createdAt: true,
        deletedAt: true,
        _count: {
          select: { members: true },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    items: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      accentColor: org.accentColor,
      createdAt: org.createdAt,
      deletedAt: org.deletedAt,
      memberCount: org._count.members,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export interface AdminOrgDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string | null;
  allowedDomains: string[];
  aiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  members: {
    id: string;
    role: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }[];
}

export async function getOrganizationById(orgId: string): Promise<AdminOrgDetail | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    accentColor: org.accentColor,
    allowedDomains: org.allowedDomains,
    aiEnabled: org.aiEnabled,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    deletedAt: org.deletedAt,
    members: org.members.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
    })),
  };
}

export interface UpdateOrgData {
  name?: string;
  slug?: string;
  aiEnabled?: boolean;
}

export async function updateOrganization(
  orgId: string,
  data: UpdateOrgData
): Promise<Organization | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) return null;

  return prisma.organization.update({
    where: { id: orgId },
    data,
  });
}

export async function softDeleteOrganization(orgId: string): Promise<Organization | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) return null;

  return prisma.organization.update({
    where: { id: orgId },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function restoreOrganization(orgId: string): Promise<Organization | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) return null;

  return prisma.organization.update({
    where: { id: orgId },
    data: {
      deletedAt: null,
    },
  });
}

// ============================================
// SYSTEM SETTINGS
// ============================================

export interface SystemSettingsResponse {
  siteName: string;
  allowSignups: boolean;
  requireEmailVerification: boolean;
  sessionMaxAge: number;
  maxOrganisationsPerUser: number;
  defaultUserLocale: string;
  aiEnabled: boolean;
  openrouterApiKey: string | null;
  openrouterModel: string;
  updatedAt: Date;
}

function curateSettings(settings: {
  siteName: string;
  allowSignups: boolean;
  requireEmailVerification: boolean;
  sessionMaxAge: number;
  maxOrganisationsPerUser: number;
  defaultUserLocale: string;
  aiEnabled: boolean;
  openrouterApiKey: string | null;
  openrouterModel: string;
  updatedAt: Date;
}): SystemSettingsResponse {
  return {
    siteName: settings.siteName,
    allowSignups: settings.allowSignups,
    requireEmailVerification: settings.requireEmailVerification,
    sessionMaxAge: settings.sessionMaxAge,
    maxOrganisationsPerUser: settings.maxOrganisationsPerUser,
    defaultUserLocale: settings.defaultUserLocale,
    aiEnabled: settings.aiEnabled,
    openrouterApiKey: settings.openrouterApiKey ? maskApiKey(settings.openrouterApiKey) : null,
    openrouterModel: settings.openrouterModel,
    updatedAt: settings.updatedAt,
  };
}

export async function getSettings(): Promise<SystemSettingsResponse | null> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'system' },
  });

  if (!settings) return null;

  return curateSettings(settings);
}

export interface UpdateSettingsData {
  siteName?: string;
  allowSignups?: boolean;
  requireEmailVerification?: boolean;
  sessionMaxAge?: number;
  maxOrganisationsPerUser?: number;
  defaultUserLocale?: string;
  aiEnabled?: boolean;
  openrouterApiKey?: string | null;
  openrouterModel?: string;
}

export async function updateSettings(data: UpdateSettingsData): Promise<SystemSettingsResponse> {
  // Strip masked API key to prevent overwriting real key with masked value
  const updateData = { ...data };
  if (
    typeof updateData.openrouterApiKey === 'string' &&
    updateData.openrouterApiKey.startsWith('****')
  ) {
    delete updateData.openrouterApiKey;
  }

  const settings = await prisma.systemSettings.upsert({
    where: { id: 'system' },
    update: updateData,
    create: { id: 'system', ...updateData },
  });

  return curateSettings(settings);
}

// ============================================
// STATISTICS
// ============================================

export interface AdminStats {
  users: {
    total: number;
    verified: number;
    superAdmins: number;
  };
  organizations: {
    total: number;
    active: number;
  };
  pages: number;
  databases: number;
  files: {
    total: number;
    totalSize: number;
  };
  templates: number;
  backups: number;
}

// Cache admin stats for 5 minutes
const statsCache = new TtlCache<AdminStats>(5 * 60 * 1000);
const STATS_CACHE_KEY = 'admin:stats';

export function invalidateStatsCache(): void {
  statsCache.invalidate(STATS_CACHE_KEY);
}

/** Clear all stats caches (for testing) */
export function clearStatsCache(): void {
  statsCache.clear();
}

export async function getStats(): Promise<AdminStats> {
  const cached = statsCache.get(STATS_CACHE_KEY);
  if (cached) return cached;
  const [
    totalUsers,
    verifiedUsers,
    superAdmins,
    totalOrgs,
    activeOrgs,
    pages,
    databases,
    fileCount,
    fileAggregation,
    templates,
    backups,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, emailVerified: true } }),
    prisma.user.count({ where: { deletedAt: null, isSuperAdmin: true } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.page.count(),
    prisma.database.count(),
    prisma.file.count(),
    prisma.file.aggregate({ _sum: { size: true } }),
    prisma.template.count(),
    prisma.backup.count(),
  ]);

  const stats: AdminStats = {
    users: {
      total: totalUsers,
      verified: verifiedUsers,
      superAdmins,
    },
    organizations: {
      total: totalOrgs,
      active: activeOrgs,
    },
    pages,
    databases,
    files: {
      total: fileCount,
      totalSize: fileAggregation._sum.size ?? 0,
    },
    templates,
    backups,
  };

  statsCache.set(STATS_CACHE_KEY, stats);

  return stats;
}

// ============================================
// SYSTEM HEALTH
// ============================================

export interface SystemHealth {
  database: {
    status: 'connected' | 'disconnected';
    error?: string;
  };
  storage: {
    status: 'connected' | 'disconnected';
    error?: string;
  };
  collaboration: {
    status: 'connected' | 'disconnected';
  };
  server: {
    uptime: number;
    nodeVersion: string;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const [dbResult, storageResult] = await Promise.allSettled([
    prisma.user.count({ take: 1 }),
    filesService.testStorageConnection(),
  ]);

  // Database
  const database: SystemHealth['database'] =
    dbResult.status === 'fulfilled'
      ? { status: 'connected' }
      : { status: 'disconnected', error: dbResult.reason?.message ?? 'Unknown error' };

  // Storage
  let storage: SystemHealth['storage'];
  if (storageResult.status === 'fulfilled') {
    storage = storageResult.value.success
      ? { status: 'connected' }
      : { status: 'disconnected', error: storageResult.value.message };
  } else {
    storage = { status: 'disconnected', error: storageResult.reason?.message ?? 'Unknown error' };
  }

  // Collaboration
  let collaboration: SystemHealth['collaboration'];
  try {
    const server = getHocuspocusServer();
    collaboration = server ? { status: 'connected' } : { status: 'disconnected' };
  } catch {
    collaboration = { status: 'disconnected' };
  }

  // Server
  const mem = process.memoryUsage();
  const server: SystemHealth['server'] = {
    uptime: process.uptime(),
    nodeVersion: process.version,
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
    },
  };

  return { database, storage, collaboration, server };
}
