import { prisma } from '../../lib/prisma.js';
import type { Page, Favorite } from '@prisma/client';

// ===========================================
// TYPES
// ===========================================

export interface CreatePageInput {
  title?: string;
  parentId?: string | null;
  icon?: string | null;
}

export interface UpdatePageInput {
  title?: string;
  icon?: string | null;
  coverUrl?: string | null;
  isPublic?: boolean;
  publicSlug?: string | null;
}

export interface MovePageInput {
  parentId?: string | null;
  position?: number;
}

export interface PageWithChildren extends Page {
  children: PageWithChildren[];
}

export interface FavoriteWithPage extends Favorite {
  page: Page;
}

// ===========================================
// PAGE CRUD
// ===========================================

/**
 * Get the next position for a sibling page
 */
export async function getNextPosition(orgId: string, parentId: string | null): Promise<number> {
  const maxPosition = await prisma.page.aggregate({
    where: {
      organizationId: orgId,
      parentId: parentId ?? null,
      trashedAt: null,
    },
    _max: {
      position: true,
    },
  });

  return (maxPosition._max.position ?? -1) + 1;
}

/**
 * Create a new page
 */
export async function createPage(
  orgId: string,
  userId: string,
  input: CreatePageInput
): Promise<Page> {
  // Validate parent exists in same org if provided
  if (input.parentId) {
    const parent = await prisma.page.findFirst({
      where: {
        id: input.parentId,
        organizationId: orgId,
        trashedAt: null,
      },
    });

    if (!parent) {
      throw new Error('INVALID_PARENT');
    }
  }

  const position = await getNextPosition(orgId, input.parentId ?? null);

  return prisma.page.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      title: input.title ?? 'Untitled',
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
      position,
    },
  });
}

/**
 * Build a tree structure from flat pages array
 */
export function buildPageTree(pages: Page[]): PageWithChildren[] {
  // Create a map for O(1) lookups
  const pageMap = new Map<string, PageWithChildren>();
  const rootPages: PageWithChildren[] = [];

  // First pass: create PageWithChildren objects
  for (const page of pages) {
    pageMap.set(page.id, { ...page, children: [] });
  }

  // Second pass: build the tree
  for (const page of pages) {
    const pageWithChildren = pageMap.get(page.id)!;

    if (page.parentId && pageMap.has(page.parentId)) {
      // Add to parent's children
      pageMap.get(page.parentId)!.children.push(pageWithChildren);
    } else {
      // Root page (no parent or parent not in list)
      rootPages.push(pageWithChildren);
    }
  }

  // Sort children by position at each level
  const sortByPosition = (a: PageWithChildren, b: PageWithChildren) => a.position - b.position;

  function sortTree(nodes: PageWithChildren[]): void {
    nodes.sort(sortByPosition);
    for (const node of nodes) {
      sortTree(node.children);
    }
  }

  sortTree(rootPages);

  return rootPages;
}

/**
 * Get page tree for an organization
 */
export async function getPageTree(orgId: string): Promise<PageWithChildren[]> {
  const pages = await prisma.page.findMany({
    where: {
      organizationId: orgId,
      trashedAt: null,
    },
    orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
  });

  return buildPageTree(pages);
}

/**
 * Get a single page by ID
 */
export async function getPage(orgId: string, pageId: string): Promise<Page | null> {
  return prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });
}

/**
 * Update a page
 */
export async function updatePage(
  orgId: string,
  pageId: string,
  userId: string,
  input: UpdatePageInput
): Promise<Page> {
  // Verify page exists and belongs to org
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (page.trashedAt) {
    throw new Error('PAGE_IN_TRASH');
  }

  // Validate public slug uniqueness if provided
  if (input.publicSlug !== undefined && input.publicSlug !== null) {
    const existingSlug = await prisma.page.findFirst({
      where: {
        publicSlug: input.publicSlug,
        id: { not: pageId },
      },
    });

    if (existingSlug) {
      throw new Error('SLUG_ALREADY_EXISTS');
    }
  }

  return prisma.page.update({
    where: { id: pageId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
      ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      ...(input.publicSlug !== undefined && { publicSlug: input.publicSlug }),
      updatedById: userId,
    },
  });
}

/**
 * Soft delete a page (move to trash)
 */
export async function trashPage(orgId: string, pageId: string): Promise<void> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (page.trashedAt) {
    throw new Error('PAGE_ALREADY_IN_TRASH');
  }

  // Trash the page and all its descendants
  await trashPageWithDescendants(orgId, pageId);
}

/**
 * Recursively trash a page and all its descendants
 */
async function trashPageWithDescendants(orgId: string, pageId: string): Promise<void> {
  const now = new Date();

  // Get all descendants (children, grandchildren, etc.)
  const descendants = await getDescendantIds(orgId, pageId);
  const allIds = [pageId, ...descendants];

  // Trash all pages in a single update
  await prisma.page.updateMany({
    where: {
      id: { in: allIds },
      organizationId: orgId,
    },
    data: {
      trashedAt: now,
    },
  });
}

/**
 * Get all descendant IDs of a page
 */
async function getDescendantIds(orgId: string, pageId: string): Promise<string[]> {
  const descendants: string[] = [];

  // Get direct children
  const children = await prisma.page.findMany({
    where: {
      organizationId: orgId,
      parentId: pageId,
      trashedAt: null,
    },
    select: { id: true },
  });

  for (const child of children) {
    descendants.push(child.id);
    // Recursively get grandchildren
    const grandchildren = await getDescendantIds(orgId, child.id);
    descendants.push(...grandchildren);
  }

  return descendants;
}

// ===========================================
// HIERARCHY OPERATIONS
// ===========================================

/**
 * Check if pageId is an ancestor of targetId
 */
async function isAncestor(orgId: string, pageId: string, targetId: string): Promise<boolean> {
  // Get ancestors of target
  const ancestors = await getPageAncestors(orgId, targetId);
  return ancestors.some((ancestor) => ancestor.id === pageId);
}

/**
 * Validate that a move operation won't create a circular reference
 */
export async function validateMove(
  orgId: string,
  pageId: string,
  newParentId: string | null
): Promise<void> {
  // Moving to root is always valid
  if (newParentId === null) {
    return;
  }

  // Cannot move page to itself
  if (pageId === newParentId) {
    throw new Error('INVALID_PARENT');
  }

  // Check if new parent exists in same org
  const newParent = await prisma.page.findFirst({
    where: {
      id: newParentId,
      organizationId: orgId,
      trashedAt: null,
    },
  });

  if (!newParent) {
    throw new Error('INVALID_PARENT');
  }

  // Check if new parent is a descendant of the page being moved
  const isDescendant = await isAncestor(orgId, pageId, newParentId);
  if (isDescendant) {
    throw new Error('INVALID_PARENT');
  }
}

/**
 * Move a page to a new parent and/or position
 */
export async function movePage(orgId: string, pageId: string, input: MovePageInput): Promise<Page> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (page.trashedAt) {
    throw new Error('PAGE_IN_TRASH');
  }

  const newParentId = input.parentId !== undefined ? input.parentId : page.parentId;

  // Validate move if parent is changing
  if (newParentId !== page.parentId) {
    await validateMove(orgId, pageId, newParentId);
  }

  // Calculate position
  let position: number;
  if (input.position !== undefined) {
    position = input.position;
  } else if (newParentId !== page.parentId) {
    // Moving to new parent, get next position
    position = await getNextPosition(orgId, newParentId);
  } else {
    // Keep current position
    position = page.position;
  }

  // Update positions of other siblings if needed
  if (input.position !== undefined) {
    // Shift siblings at or after the target position
    await prisma.page.updateMany({
      where: {
        organizationId: orgId,
        parentId: newParentId,
        position: { gte: position },
        id: { not: pageId },
        trashedAt: null,
      },
      data: {
        position: { increment: 1 },
      },
    });
  }

  return prisma.page.update({
    where: { id: pageId },
    data: {
      parentId: newParentId,
      position,
    },
  });
}

/**
 * Get ancestors of a page (for breadcrumbs)
 */
export async function getPageAncestors(orgId: string, pageId: string): Promise<Page[]> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  const ancestors: Page[] = [];
  let currentParentId = page.parentId;

  // Walk up the tree
  while (currentParentId) {
    const parent = await prisma.page.findFirst({
      where: {
        id: currentParentId,
        organizationId: orgId,
      },
    });

    if (!parent) break;

    ancestors.unshift(parent); // Add to beginning for correct order
    currentParentId = parent.parentId;
  }

  return ancestors;
}

/**
 * Duplicate a page (without children)
 */
export async function duplicatePage(orgId: string, pageId: string, userId: string): Promise<Page> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (page.trashedAt) {
    throw new Error('PAGE_IN_TRASH');
  }

  const position = await getNextPosition(orgId, page.parentId);

  return prisma.page.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      parentId: page.parentId,
      title: `${page.title} (copy)`,
      icon: page.icon,
      coverUrl: page.coverUrl,
      position,
      // Note: yjsState is NOT copied - content is deferred to Phase 5
    },
  });
}

// ===========================================
// TRASH OPERATIONS
// ===========================================

/**
 * Get trashed pages for an organization
 */
export async function getTrashedPages(orgId: string): Promise<Page[]> {
  return prisma.page.findMany({
    where: {
      organizationId: orgId,
      trashedAt: { not: null },
    },
    orderBy: { trashedAt: 'desc' },
  });
}

/**
 * Restore a page from trash
 */
export async function restorePage(orgId: string, pageId: string): Promise<Page> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (!page.trashedAt) {
    throw new Error('PAGE_NOT_IN_TRASH');
  }

  // Check if parent still exists and is not trashed
  let parentId = page.parentId;
  if (parentId) {
    const parent = await prisma.page.findFirst({
      where: {
        id: parentId,
        organizationId: orgId,
        trashedAt: null,
      },
    });

    // If parent is trashed or deleted, restore to root
    if (!parent) {
      parentId = null;
    }
  }

  const position = await getNextPosition(orgId, parentId);

  // Restore the page (but not descendants - they remain in trash)
  return prisma.page.update({
    where: { id: pageId },
    data: {
      trashedAt: null,
      parentId,
      position,
    },
  });
}

/**
 * Permanently delete a page from trash
 */
export async function permanentlyDeletePage(orgId: string, pageId: string): Promise<void> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (!page.trashedAt) {
    throw new Error('PAGE_NOT_IN_TRASH');
  }

  // Delete the page (Prisma will cascade to favorites)
  await prisma.page.delete({
    where: { id: pageId },
  });
}

// ===========================================
// FAVORITES
// ===========================================

/**
 * Get next position for a user's favorite
 */
async function getNextFavoritePosition(userId: string): Promise<number> {
  const maxPosition = await prisma.favorite.aggregate({
    where: { userId },
    _max: {
      position: true,
    },
  });

  return (maxPosition._max.position ?? -1) + 1;
}

/**
 * Get user's favorites for an organization
 */
export async function getUserFavorites(orgId: string, userId: string): Promise<FavoriteWithPage[]> {
  return prisma.favorite.findMany({
    where: {
      userId,
      page: {
        organizationId: orgId,
        trashedAt: null,
      },
    },
    include: {
      page: true,
    },
    orderBy: { position: 'asc' },
  });
}

/**
 * Add a page to favorites
 */
export async function addFavorite(
  userId: string,
  pageId: string,
  orgId: string
): Promise<Favorite> {
  // Verify page exists in the org
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
      trashedAt: null,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  // Check if already favorited
  const existing = await prisma.favorite.findUnique({
    where: {
      userId_pageId: {
        userId,
        pageId,
      },
    },
  });

  if (existing) {
    throw new Error('FAVORITE_EXISTS');
  }

  const position = await getNextFavoritePosition(userId);

  return prisma.favorite.create({
    data: {
      userId,
      pageId,
      position,
    },
  });
}

/**
 * Remove a page from favorites
 */
export async function removeFavorite(userId: string, pageId: string): Promise<void> {
  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_pageId: {
        userId,
        pageId,
      },
    },
  });

  if (!favorite) {
    throw new Error('FAVORITE_NOT_FOUND');
  }

  await prisma.favorite.delete({
    where: { id: favorite.id },
  });
}

/**
 * Reorder favorites
 */
export async function reorderFavorites(userId: string, orderedIds: string[]): Promise<void> {
  // Verify all favorites belong to the user
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: { id: true },
  });

  const favoriteIdSet = new Set(favorites.map((f) => f.id));

  for (const id of orderedIds) {
    if (!favoriteIdSet.has(id)) {
      throw new Error('FAVORITE_NOT_FOUND');
    }
  }

  // Update positions
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.favorite.update({
        where: { id },
        data: { position: index },
      })
    )
  );
}
