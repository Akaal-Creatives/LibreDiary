import { prisma } from '../../lib/prisma.js';
import { diffLines } from 'diff';
import { yjsStateToText } from '../../utils/yjs-to-text.js';

// ===========================================
// TYPES
// ===========================================

export interface DiffChange {
  type: 'added' | 'removed' | 'equal';
  value: string;
}

export interface DiffResult {
  from: {
    versionId: string;
    version: number;
    title: string;
    createdAt: Date;
  };
  to: {
    versionId: string;
    version: number | null;
    title: string;
    createdAt: Date;
  };
  titleChanged: boolean;
  changes: DiffChange[];
  stats: {
    additions: number;
    deletions: number;
  };
}

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

/**
 * Compare two versions and return a structured diff.
 * If `toVersionId` is "current", compares against the live page state.
 */
export async function diffVersions(
  organizationId: string,
  pageId: string,
  fromVersionId: string,
  toVersionId: string
): Promise<DiffResult> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, organizationId },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  // Fetch the "from" version
  const fromVersion = await prisma.pageVersion.findFirst({
    where: { id: fromVersionId, pageId },
  });

  if (!fromVersion) {
    throw new Error('VERSION_NOT_FOUND');
  }

  // Determine "to" side: either a specific version or the current page state
  let toTitle: string;
  let toYjsState: Uint8Array | Buffer | null;
  let toVersionNumber: number | null;
  let toCreatedAt: Date;
  let toId: string;

  if (toVersionId === 'current') {
    toTitle = page.title;
    toYjsState = page.yjsState;
    toVersionNumber = null;
    toCreatedAt = page.updatedAt;
    toId = 'current';
  } else {
    const toVersion = await prisma.pageVersion.findFirst({
      where: { id: toVersionId, pageId },
    });

    if (!toVersion) {
      throw new Error('VERSION_NOT_FOUND');
    }

    toTitle = toVersion.title;
    toYjsState = toVersion.yjsState;
    toVersionNumber = toVersion.version;
    toCreatedAt = toVersion.createdAt;
    toId = toVersion.id;
  }

  // Extract plain text from Yjs states
  const fromText = fromVersion.yjsState ? yjsStateToText(fromVersion.yjsState as Uint8Array) : '';
  const toText = toYjsState ? yjsStateToText(toYjsState as Uint8Array) : '';

  // Compute line-level diff
  const diffs = diffLines(fromText, toText);

  const changes: DiffChange[] = diffs.map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'equal',
    value: part.value,
  }));

  const stats = {
    additions: diffs.filter((p) => p.added).reduce((sum, p) => sum + (p.count ?? 0), 0),
    deletions: diffs.filter((p) => p.removed).reduce((sum, p) => sum + (p.count ?? 0), 0),
  };

  return {
    from: {
      versionId: fromVersion.id,
      version: fromVersion.version,
      title: fromVersion.title,
      createdAt: fromVersion.createdAt,
    },
    to: {
      versionId: toId,
      version: toVersionNumber,
      title: toTitle,
      createdAt: toCreatedAt,
    },
    titleChanged: fromVersion.title !== toTitle,
    changes,
    stats,
  };
}
