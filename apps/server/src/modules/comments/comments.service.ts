import { prisma } from '../../lib/prisma.js';

interface CreateCommentOptions {
  parentId?: string;
  blockId?: string;
}

interface GetCommentCountOptions {
  unresolvedOnly?: boolean;
}

const commentInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
  resolvedBy: {
    select: {
      id: true,
      name: true,
    },
  },
};

const commentWithRepliesInclude = {
  ...commentInclude,
  replies: {
    include: commentInclude,
    orderBy: { createdAt: 'asc' as const },
  },
};

/**
 * Create a new comment on a page
 */
export async function createComment(
  organizationId: string,
  pageId: string,
  userId: string,
  content: string,
  options: CreateCommentOptions = {}
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

  // If parentId is provided, verify parent comment exists
  if (options.parentId) {
    const parentComment = await prisma.comment.findFirst({
      where: {
        id: options.parentId,
        pageId,
      },
    });

    if (!parentComment) {
      throw new Error('PARENT_COMMENT_NOT_FOUND');
    }
  }

  const comment = await prisma.comment.create({
    data: {
      pageId,
      content,
      createdById: userId,
      parentId: options.parentId,
      blockId: options.blockId,
    },
    include: commentInclude,
  });

  return comment;
}

/**
 * Get all comments for a page
 */
export async function getComments(organizationId: string, pageId: string, blockId?: string) {
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

  const whereClause: {
    pageId: string;
    parentId: null;
    blockId?: string;
  } = {
    pageId,
    parentId: null, // Only get top-level comments, replies are included via relation
  };

  if (blockId) {
    whereClause.blockId = blockId;
  }

  const comments = await prisma.comment.findMany({
    where: whereClause,
    include: commentWithRepliesInclude,
    orderBy: { createdAt: 'desc' },
  });

  return comments;
}

/**
 * Update a comment's content
 */
export async function updateComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error('COMMENT_NOT_FOUND');
  }

  if (comment.createdById !== userId) {
    throw new Error('NOT_COMMENT_AUTHOR');
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: commentInclude,
  });

  return updatedComment;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error('COMMENT_NOT_FOUND');
  }

  if (comment.createdById !== userId) {
    throw new Error('NOT_COMMENT_AUTHOR');
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });
}

/**
 * Resolve or unresolve a comment
 */
export async function resolveComment(commentId: string, userId: string, resolve: boolean) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error('COMMENT_NOT_FOUND');
  }

  // Only top-level comments can be resolved
  if (comment.parentId) {
    throw new Error('CANNOT_RESOLVE_REPLY');
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: {
      isResolved: resolve,
      resolvedAt: resolve ? new Date() : null,
      resolvedById: resolve ? userId : null,
    },
    include: commentInclude,
  });

  return updatedComment;
}

/**
 * Get count of comments for a page
 */
export async function getCommentCount(pageId: string, options: GetCommentCountOptions = {}) {
  const whereClause: {
    pageId: string;
    isResolved?: boolean;
    parentId?: null;
  } = { pageId };

  if (options.unresolvedOnly) {
    whereClause.isResolved = false;
    whereClause.parentId = null; // Only count top-level unresolved
  }

  const count = await prisma.comment.count({
    where: whereClause,
  });

  return count;
}
