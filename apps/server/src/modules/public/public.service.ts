import { prisma } from '../../lib/prisma.js';
import type { PermissionLevel } from '@prisma/client';
import crypto from 'crypto';

// ===========================================
// TYPES
// ===========================================

export interface PublicPage {
  id: string;
  title: string;
  htmlContent: string | null;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string | null;
  } | null;
}

export interface SharedPage {
  id: string;
  title: string;
  htmlContent: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string | null;
  } | null;
  permission: {
    level: PermissionLevel;
    expiresAt: Date | null;
  };
}

// ===========================================
// PUBLIC PAGE ACCESS
// ===========================================

/**
 * Get a public page by its slug
 */
export async function getPublicPage(slug: string): Promise<PublicPage> {
  const page = await prisma.page.findFirst({
    where: {
      publicSlug: slug,
      trashedAt: null,
    },
    select: {
      id: true,
      title: true,
      htmlContent: true,
      isPublic: true,
      publicSlug: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (!page.isPublic) {
    throw new Error('PAGE_NOT_PUBLIC');
  }

  return page;
}

/**
 * Toggle public access for a page
 */
export async function togglePublicAccess(
  pageId: string,
  isPublic: boolean
): Promise<{ id: string; isPublic: boolean; publicSlug: string | null }> {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, title: true, isPublic: true, publicSlug: true },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  // If enabling public access and no slug exists, generate one
  let publicSlug = page.publicSlug;
  if (isPublic && !publicSlug) {
    publicSlug = await generatePublicSlug(page.title);
  }

  const updated = await prisma.page.update({
    where: { id: pageId },
    data: {
      isPublic,
      ...(isPublic && !page.publicSlug ? { publicSlug } : {}),
    },
  });

  return {
    id: updated.id,
    isPublic: updated.isPublic,
    publicSlug: updated.publicSlug,
  };
}

/**
 * Generate a unique URL-safe slug from a title
 */
export async function generatePublicSlug(title: string): Promise<string> {
  // Convert to lowercase and replace non-alphanumeric with hyphens
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Try generating a unique slug (with collision detection)
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const slug = `${baseSlug}-${randomSuffix}`;

    // Check for collisions
    const existing = await prisma.page.findFirst({
      where: { publicSlug: slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    attempts++;
  }

  // Fallback: use timestamp + random for guaranteed uniqueness
  return `${baseSlug}-${Date.now().toString(36)}`;
}

// ===========================================
// SHARE TOKEN ACCESS
// ===========================================

/**
 * Get a page by its share token
 */
export async function getPageByShareToken(token: string): Promise<SharedPage> {
  // Find the permission with this share token
  const permission = await prisma.pagePermission.findFirst({
    where: {
      shareToken: token,
    },
    include: {
      page: {
        select: {
          id: true,
          title: true,
          htmlContent: true,
          icon: true,
          trashedAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!permission) {
    throw new Error('INVALID_SHARE_TOKEN');
  }

  // Check if token is expired
  if (permission.expiresAt && permission.expiresAt < new Date()) {
    throw new Error('SHARE_TOKEN_EXPIRED');
  }

  // Check if page is trashed
  if (!permission.page || permission.page.trashedAt) {
    throw new Error('PAGE_NOT_FOUND');
  }

  return {
    id: permission.page.id,
    title: permission.page.title,
    htmlContent: permission.page.htmlContent,
    icon: permission.page.icon,
    createdAt: permission.page.createdAt,
    updatedAt: permission.page.updatedAt,
    createdBy: permission.page.createdBy,
    permission: {
      level: permission.level,
      expiresAt: permission.expiresAt,
    },
  };
}
