import { prisma } from '../../lib/prisma.js';
import type { User, Organization, Prisma } from '../../generated/prisma/client.js';

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
}

export async function getStats(): Promise<AdminStats> {
  const [totalUsers, verifiedUsers, superAdmins, totalOrgs, activeOrgs] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, emailVerified: true } }),
    prisma.user.count({ where: { deletedAt: null, isSuperAdmin: true } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { deletedAt: null } }),
  ]);

  return {
    users: {
      total: totalUsers,
      verified: verifiedUsers,
      superAdmins,
    },
    organizations: {
      total: totalOrgs,
      active: activeOrgs,
    },
  };
}
