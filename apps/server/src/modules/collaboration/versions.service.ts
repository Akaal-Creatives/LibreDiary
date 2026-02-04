import { prisma } from '../../lib/prisma.js';

/**
 * Create a new version snapshot of a page
 */
export async function createVersion(organizationId: string, pageId: string, userId: string) {
  // Verify page exists and belongs to organization
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

  // Get current version count to determine next version number
  const versionCount = await prisma.pageVersion.count({
    where: { pageId },
  });

  const nextVersion = versionCount + 1;

  // Create the version snapshot
  const version = await prisma.pageVersion.create({
    data: {
      pageId,
      version: nextVersion,
      title: page.title,
      yjsState: page.yjsState,
      createdById: userId,
    },
  });

  return version;
}

/**
 * Get all versions for a page, ordered by version descending
 */
export async function getVersions(organizationId: string, pageId: string) {
  // Verify page exists and belongs to organization
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  const versions = await prisma.pageVersion.findMany({
    where: { pageId },
    orderBy: { version: 'desc' },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return versions;
}

/**
 * Get a specific version by ID
 */
export async function getVersion(organizationId: string, pageId: string, versionId: string) {
  // Verify page exists and belongs to organization
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  const version = await prisma.pageVersion.findFirst({
    where: {
      id: versionId,
      pageId,
    },
  });

  return version;
}

/**
 * Restore a page to a specific version
 */
export async function restoreVersion(
  organizationId: string,
  pageId: string,
  versionId: string,
  userId: string
) {
  // Verify page exists and belongs to organization
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

  // Get the version to restore
  const version = await prisma.pageVersion.findFirst({
    where: {
      id: versionId,
      pageId,
    },
  });

  if (!version) {
    throw new Error('VERSION_NOT_FOUND');
  }

  // Update the page with the version's state
  const updatedPage = await prisma.page.update({
    where: { id: pageId },
    data: {
      title: version.title,
      yjsState: version.yjsState,
      updatedById: userId,
    },
  });

  return updatedPage;
}
