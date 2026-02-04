import { prisma } from '../../lib/prisma.js';

/**
 * Result type for page access validation
 */
export interface PageAccessResult {
  hasAccess: boolean;
  organizationId: string | null;
  pageId: string;
}

/**
 * Page info result type
 */
export interface PageInfo {
  id: string;
  title: string;
  organizationId: string;
}

/**
 * Load Yjs document state for a page
 * Used by Hocuspocus onLoadDocument hook
 */
export async function loadDocument(organizationId: string, pageId: string): Promise<Buffer | null> {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId,
      trashedAt: null,
    },
    select: {
      yjsState: true,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  return page.yjsState;
}

/**
 * Store Yjs document state for a page
 * Used by Hocuspocus onStoreDocument hook
 */
export async function storeDocument(
  organizationId: string,
  pageId: string,
  yjsState: Buffer,
  userId: string
): Promise<void> {
  // Verify page exists and is not trashed
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  if (page.trashedAt) {
    throw new Error('PAGE_IN_TRASH');
  }

  await prisma.page.update({
    where: { id: pageId },
    data: {
      yjsState,
      updatedById: userId,
    },
  });
}

/**
 * Validate if a user has access to a page
 * Used by Hocuspocus onAuthenticate hook
 */
export async function validatePageAccess(
  pageId: string,
  userId: string
): Promise<PageAccessResult> {
  // Find the page first
  const page = await prisma.page.findFirst({
    where: { id: pageId },
    select: {
      id: true,
      organizationId: true,
      trashedAt: true,
    },
  });

  if (!page) {
    return {
      hasAccess: false,
      organizationId: null,
      pageId,
    };
  }

  // Page exists but is trashed
  if (page.trashedAt) {
    return {
      hasAccess: false,
      organizationId: page.organizationId,
      pageId,
    };
  }

  // Check if user is a member of the organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: page.organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    return {
      hasAccess: false,
      organizationId: page.organizationId,
      pageId,
    };
  }

  return {
    hasAccess: true,
    organizationId: page.organizationId,
    pageId,
  };
}

/**
 * Get basic page info for collaboration context
 */
export async function getPageInfo(pageId: string): Promise<PageInfo | null> {
  const page = await prisma.page.findFirst({
    where: { id: pageId },
    select: {
      id: true,
      title: true,
      organizationId: true,
    },
  });

  if (!page) {
    return null;
  }

  return {
    id: page.id,
    title: page.title,
    organizationId: page.organizationId,
  };
}
