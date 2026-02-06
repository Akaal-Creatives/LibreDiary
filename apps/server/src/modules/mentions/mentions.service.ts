import { prisma } from '../../lib/prisma.js';
import { createMentionNotification } from '../notifications/notifications.service.js';

const mentionInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
};

const mentionWithCommentInclude = {
  ...mentionInclude,
  comment: {
    include: {
      page: {
        select: {
          id: true,
          organizationId: true,
          title: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
};

/**
 * Extract @mentions from content
 * Returns unique usernames mentioned (without the @ symbol)
 */
export function extractMentions(content: string): string[] {
  // Match @username at word boundary (start of string or after whitespace)
  // Username can contain letters, numbers, underscores
  // Don't match email addresses (@ preceded by word characters)
  const regex = /(?:^|(?<=\s))@([a-zA-Z0-9_]+)/g;
  const matches = content.matchAll(regex);
  const usernames = new Set<string>();

  for (const match of matches) {
    usernames.add(match[1]);
  }

  return Array.from(usernames);
}

/**
 * Create mention records for a comment
 */
export async function createMentions(commentId: string, userIds: string[]) {
  // Verify comment exists and get context for notifications
  const comment = await prisma.comment.findFirst({
    where: { id: commentId },
    include: {
      page: {
        select: {
          id: true,
          title: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error('COMMENT_NOT_FOUND');
  }

  // No user IDs to create mentions for
  if (userIds.length === 0) {
    return [];
  }

  // Create mentions in bulk
  await prisma.mention.createMany({
    data: userIds.map((userId) => ({
      commentId,
      userId,
    })),
    skipDuplicates: true,
  });

  // Create notifications for each mentioned user (excluding self-mentions)
  const actorId = comment.createdBy.id;
  const actorName = comment.createdBy.name || 'Someone';
  const pageId = comment.page.id;
  const pageTitle = comment.page.title;

  for (const userId of userIds) {
    // Don't notify users who mention themselves
    if (userId !== actorId) {
      try {
        await createMentionNotification({
          recipientId: userId,
          actorId,
          actorName,
          pageId,
          pageTitle,
          commentId,
        });
      } catch (error) {
        // Log but don't fail the mention creation if notification fails
        console.error(`Failed to create mention notification for user ${userId}:`, error);
      }
    }
  }

  // Return created mentions with user info
  const mentions = await prisma.mention.findMany({
    where: { commentId },
    include: mentionInclude,
  });

  return mentions;
}

/**
 * Get mentions for a specific comment
 */
export async function getMentionsForComment(commentId: string) {
  const mentions = await prisma.mention.findMany({
    where: { commentId },
    include: mentionInclude,
  });

  return mentions;
}

/**
 * Get all mentions for a user in an organization
 * Used for notifications/inbox
 */
export async function getMentionsForUser(userId: string, organizationId: string) {
  const mentions = await prisma.mention.findMany({
    where: {
      userId,
      comment: {
        page: {
          organizationId,
        },
      },
    },
    include: mentionWithCommentInclude,
    orderBy: { createdAt: 'desc' },
  });

  return mentions;
}

/**
 * Search organization members for @mention autocomplete
 */
export async function searchUsersForMention(
  organizationId: string,
  query: string,
  excludeUserId?: string
) {
  const whereClause: {
    organizationId: string;
    userId?: { not: string };
    user?: {
      OR: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    };
  } = {
    organizationId,
  };

  // Exclude current user if specified
  if (excludeUserId) {
    whereClause.userId = { not: excludeUserId };
  }

  // Search by name or email
  if (query) {
    whereClause.user = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };
  }

  const members = await prisma.organizationMember.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    take: 10,
  });

  return members.map((member) => member.user);
}

/**
 * Resolve user IDs from mention usernames
 * Used when creating a comment to find which users were mentioned
 */
export async function resolveUserIdsFromMentions(
  organizationId: string,
  mentionUsernames: string[]
): Promise<string[]> {
  if (mentionUsernames.length === 0) {
    return [];
  }

  // Find members whose name or email username matches any of the mention usernames
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      user: {
        OR: [
          // Match by name (case insensitive)
          ...mentionUsernames.map((username) => ({
            name: { equals: username, mode: 'insensitive' as const },
          })),
          // Match by email username part (before @)
          ...mentionUsernames.map((username) => ({
            email: { startsWith: `${username}@`, mode: 'insensitive' as const },
          })),
        ],
      },
    },
    include: {
      user: {
        select: { id: true },
      },
    },
  });

  return members.map((member) => member.user.id);
}

/**
 * Delete all mentions for a comment
 * Used when a comment is deleted (handled by cascade) or updated
 */
export async function deleteMentionsForComment(commentId: string) {
  await prisma.mention.deleteMany({
    where: { commentId },
  });
}
