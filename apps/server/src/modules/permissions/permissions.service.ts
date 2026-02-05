import { prisma } from '../../lib/prisma.js';
import type { PagePermission, PermissionLevel } from '@prisma/client';
import crypto from 'crypto';

// ===========================================
// TYPES
// ===========================================

export interface PageAccessResult {
  hasAccess: boolean;
  level: PermissionLevel | null;
  reason?: string;
}

export interface PagePermissionWithUser extends PagePermission {
  user?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  grantedBy?: {
    id: string;
    email: string;
    name: string | null;
  };
}

// Permission level hierarchy (higher index = more permissions)
const PERMISSION_HIERARCHY: PermissionLevel[] = ['VIEW', 'EDIT', 'FULL_ACCESS'];

/**
 * Check if a permission level meets the required level
 */
function meetsRequiredLevel(actualLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
  const actualIndex = PERMISSION_HIERARCHY.indexOf(actualLevel);
  const requiredIndex = PERMISSION_HIERARCHY.indexOf(requiredLevel);
  return actualIndex >= requiredIndex;
}

/**
 * Generate a secure share token
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// ===========================================
// ACCESS CHECK
// ===========================================

/**
 * Check if a user has the required permission level for a page
 */
export async function checkPageAccess(
  userId: string,
  pageId: string,
  requiredLevel: PermissionLevel
): Promise<PageAccessResult> {
  // Get the page with organization info
  const page = await prisma.page.findFirst({
    where: { id: pageId },
    select: {
      id: true,
      organizationId: true,
      createdById: true,
      isPublic: true,
      trashedAt: true,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  // Page creator always has full access
  if (page.createdById === userId) {
    return {
      hasAccess: meetsRequiredLevel('FULL_ACCESS', requiredLevel),
      level: 'FULL_ACCESS',
    };
  }

  // Check for explicit permission
  const explicitPermission = await prisma.pagePermission.findFirst({
    where: {
      pageId,
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (explicitPermission) {
    return {
      hasAccess: meetsRequiredLevel(explicitPermission.level, requiredLevel),
      level: explicitPermission.level,
    };
  }

  // Check organization membership (org members inherit VIEW access)
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: page.organizationId,
        userId,
      },
    },
  });

  if (membership) {
    // Org members get VIEW access by default
    // Owners and Admins could get higher access - customize as needed
    const inheritedLevel: PermissionLevel = 'VIEW';
    return {
      hasAccess: meetsRequiredLevel(inheritedLevel, requiredLevel),
      level: inheritedLevel,
    };
  }

  // No access
  return {
    hasAccess: false,
    level: null,
    reason: 'User is not a member of the organization and has no explicit permission',
  };
}

// ===========================================
// PERMISSION MANAGEMENT
// ===========================================

/**
 * Grant permission to a user for a page
 */
export async function grantPermission(
  pageId: string,
  userId: string,
  level: PermissionLevel,
  grantedById: string
): Promise<PagePermissionWithUser> {
  // Verify page exists
  const page = await prisma.page.findFirst({
    where: { id: pageId },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  // Check if permission already exists
  const existing = await prisma.pagePermission.findFirst({
    where: {
      pageId,
      userId,
    },
  });

  if (existing) {
    throw new Error('PERMISSION_EXISTS');
  }

  return prisma.pagePermission.create({
    data: {
      pageId,
      userId,
      level,
      grantedById,
    },
    include: { user: true },
  });
}

/**
 * Revoke a permission
 */
export async function revokePermission(permissionId: string): Promise<void> {
  const permission = await prisma.pagePermission.findUnique({
    where: { id: permissionId },
  });

  if (!permission) {
    throw new Error('PERMISSION_NOT_FOUND');
  }

  await prisma.pagePermission.delete({
    where: { id: permissionId },
  });
}

/**
 * List all permissions for a page
 */
export async function listPagePermissions(pageId: string): Promise<PagePermissionWithUser[]> {
  return prisma.pagePermission.findMany({
    where: { pageId },
    include: { user: true, grantedBy: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update permission level
 */
export async function updatePermissionLevel(
  permissionId: string,
  level: PermissionLevel
): Promise<PagePermissionWithUser> {
  const permission = await prisma.pagePermission.findUnique({
    where: { id: permissionId },
  });

  if (!permission) {
    throw new Error('PERMISSION_NOT_FOUND');
  }

  return prisma.pagePermission.update({
    where: { id: permissionId },
    data: { level },
    include: { user: true },
  });
}

// ===========================================
// SHARE LINKS
// ===========================================

/**
 * Create a shareable link for a page
 */
export async function createShareLink(
  pageId: string,
  level: PermissionLevel,
  grantedById: string,
  expiresAt?: Date
): Promise<PagePermission> {
  // Verify page exists
  const page = await prisma.page.findFirst({
    where: { id: pageId },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  const shareToken = generateShareToken();

  return prisma.pagePermission.create({
    data: {
      pageId,
      userId: null, // No specific user - anyone with the token
      level,
      shareToken,
      expiresAt: expiresAt ?? null,
      grantedById,
    },
  });
}

/**
 * Validate a share token and return the permission if valid
 */
export async function validateShareToken(token: string): Promise<PagePermission | null> {
  const permission = await prisma.pagePermission.findFirst({
    where: {
      shareToken: token,
    },
    include: {
      page: {
        select: {
          id: true,
          organizationId: true,
          title: true,
          trashedAt: true,
        },
      },
    },
  });

  if (!permission) {
    return null;
  }

  // Check expiration
  if (permission.expiresAt && permission.expiresAt < new Date()) {
    return null;
  }

  // Check if page is trashed
  if (permission.page?.trashedAt) {
    return null;
  }

  return permission;
}

/**
 * Delete a share link
 */
export async function deleteShareLink(permissionId: string): Promise<void> {
  const permission = await prisma.pagePermission.findUnique({
    where: { id: permissionId },
  });

  if (!permission || !permission.shareToken) {
    throw new Error('SHARE_LINK_NOT_FOUND');
  }

  await prisma.pagePermission.delete({
    where: { id: permissionId },
  });
}

/**
 * List all share links for a page
 */
export async function listShareLinks(pageId: string): Promise<PagePermission[]> {
  return prisma.pagePermission.findMany({
    where: {
      pageId,
      shareToken: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  });
}
