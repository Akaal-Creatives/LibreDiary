import { prisma } from '../../lib/prisma.js';
import type { Notification, NotificationType } from '../../generated/prisma/client.js';

// ===========================================
// TYPES
// ===========================================

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface MentionNotificationInput {
  recipientId: string;
  actorId: string;
  actorName: string;
  pageId: string;
  pageTitle: string;
  commentId: string;
}

export interface CommentReplyNotificationInput {
  recipientId: string;
  actorId: string;
  actorName: string;
  pageId: string;
  pageTitle: string;
  commentId: string;
}

export interface PageSharedNotificationInput {
  recipientId: string;
  actorId: string;
  actorName: string;
  pageId: string;
  pageTitle: string;
  permissionLevel: string;
}

export interface CommentResolvedNotificationInput {
  recipientId: string;
  actorId: string;
  actorName: string;
  pageId: string;
  pageTitle: string;
  commentId: string;
}

export interface InvitationNotificationInput {
  recipientId: string;
  actorId: string;
  actorName: string;
  organizationId: string;
  organizationName: string;
}

// ===========================================
// BASIC CRUD OPERATIONS
// ===========================================

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      data: input.data ?? null,
    },
  });
}

/**
 * Get notifications for a user with optional filtering and pagination
 */
export async function getNotifications(
  userId: string,
  options: GetNotificationsOptions = {}
): Promise<Notification[]> {
  const { limit = 50, offset = 0, unreadOnly = false } = options;

  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get a notification by ID (for a specific user)
 */
export async function getNotificationById(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<Notification> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new Error('NOTIFICATION_NOT_FOUND');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return { count: result.count };
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new Error('NOTIFICATION_NOT_FOUND');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ===========================================
// SPECIALIZED NOTIFICATION CREATORS
// ===========================================

/**
 * Create a notification when someone mentions a user
 */
export async function createMentionNotification(
  input: MentionNotificationInput
): Promise<Notification> {
  return createNotification({
    userId: input.recipientId,
    type: 'MENTION',
    title: `${input.actorName} mentioned you`,
    message: `in "${input.pageTitle}"`,
    data: {
      pageId: input.pageId,
      pageTitle: input.pageTitle,
      commentId: input.commentId,
      actorId: input.actorId,
      actorName: input.actorName,
    },
  });
}

/**
 * Create a notification when someone replies to a user's comment
 */
export async function createCommentReplyNotification(
  input: CommentReplyNotificationInput
): Promise<Notification> {
  return createNotification({
    userId: input.recipientId,
    type: 'COMMENT_REPLY',
    title: `${input.actorName} replied to your comment`,
    message: `in "${input.pageTitle}"`,
    data: {
      pageId: input.pageId,
      pageTitle: input.pageTitle,
      commentId: input.commentId,
      actorId: input.actorId,
      actorName: input.actorName,
    },
  });
}

/**
 * Create a notification when someone shares a page with a user
 */
export async function createPageSharedNotification(
  input: PageSharedNotificationInput
): Promise<Notification> {
  return createNotification({
    userId: input.recipientId,
    type: 'PAGE_SHARED',
    title: `${input.actorName} shared a page with you`,
    message: `"${input.pageTitle}" with ${input.permissionLevel.toLowerCase()} access`,
    data: {
      pageId: input.pageId,
      pageTitle: input.pageTitle,
      permissionLevel: input.permissionLevel,
      actorId: input.actorId,
      actorName: input.actorName,
    },
  });
}

/**
 * Create a notification when someone resolves a user's comment
 */
export async function createCommentResolvedNotification(
  input: CommentResolvedNotificationInput
): Promise<Notification> {
  return createNotification({
    userId: input.recipientId,
    type: 'COMMENT_RESOLVED',
    title: `${input.actorName} resolved your comment`,
    message: `in "${input.pageTitle}"`,
    data: {
      pageId: input.pageId,
      pageTitle: input.pageTitle,
      commentId: input.commentId,
      actorId: input.actorId,
      actorName: input.actorName,
    },
  });
}

/**
 * Create a notification when someone invites a user to an organization
 */
export async function createInvitationNotification(
  input: InvitationNotificationInput
): Promise<Notification> {
  return createNotification({
    userId: input.recipientId,
    type: 'INVITATION',
    title: `${input.actorName} invited you to ${input.organizationName}`,
    message: null,
    data: {
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      actorId: input.actorId,
      actorName: input.actorName,
    },
  });
}
