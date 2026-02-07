import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const {
  mockPrisma,
  resetMocks,
  mockNotification,
  mockUser,
  mockSendMentionNotificationEmail,
  mockSendCommentReplyNotificationEmail,
  mockSendPageSharedNotificationEmail,
  mockSendCommentResolvedNotificationEmail,
  mockShouldSendEmail,
} = vi.hoisted(() => {
  const mockPrismaNotification = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaUser = {
    findUnique: vi.fn(),
  };

  const mockPrisma = {
    notification: mockPrismaNotification,
    user: mockPrismaUser,
  };

  const mockSendMentionNotificationEmail = vi.fn().mockResolvedValue(undefined);
  const mockSendCommentReplyNotificationEmail = vi.fn().mockResolvedValue(undefined);
  const mockSendPageSharedNotificationEmail = vi.fn().mockResolvedValue(undefined);
  const mockSendCommentResolvedNotificationEmail = vi.fn().mockResolvedValue(undefined);
  const mockShouldSendEmail = vi.fn().mockResolvedValue(true);

  function resetMocks() {
    Object.values(mockPrismaNotification).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
    mockSendMentionNotificationEmail.mockReset().mockResolvedValue(undefined);
    mockSendCommentReplyNotificationEmail.mockReset().mockResolvedValue(undefined);
    mockSendPageSharedNotificationEmail.mockReset().mockResolvedValue(undefined);
    mockSendCommentResolvedNotificationEmail.mockReset().mockResolvedValue(undefined);
    mockShouldSendEmail.mockReset().mockResolvedValue(true);
  }

  const now = new Date();

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
  };

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    type: 'MENTION',
    title: 'You were mentioned',
    message: 'Test User mentioned you in a comment',
    data: { pageId: 'page-123', commentId: 'comment-456' },
    isRead: false,
    readAt: null,
    emailSent: false,
    emailSentAt: null,
    createdAt: now,
  };

  return {
    mockPrisma,
    resetMocks,
    mockNotification,
    mockUser,
    mockSendMentionNotificationEmail,
    mockSendCommentReplyNotificationEmail,
    mockSendPageSharedNotificationEmail,
    mockSendCommentResolvedNotificationEmail,
    mockShouldSendEmail,
  };
});

// Mock the prisma module BEFORE importing notifications.service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock email service
vi.mock('../../../services/email.service.js', () => ({
  sendMentionNotificationEmail: mockSendMentionNotificationEmail,
  sendCommentReplyNotificationEmail: mockSendCommentReplyNotificationEmail,
  sendPageSharedNotificationEmail: mockSendPageSharedNotificationEmail,
  sendCommentResolvedNotificationEmail: mockSendCommentResolvedNotificationEmail,
}));

// Mock notification preferences service
vi.mock('../notifications.prefs.service.js', () => ({
  shouldSendEmail: mockShouldSendEmail,
}));

// Mock env config
vi.mock('../../../config/index.js', () => ({
  env: {
    APP_URL: 'http://localhost:5173',
  },
}));

// Import service AFTER mocking
import * as notificationsService from '../notifications.service.js';
import type { NotificationType } from '@prisma/client';

describe('Notifications Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await notificationsService.createNotification({
        userId: 'user-123',
        type: 'MENTION' as NotificationType,
        title: 'You were mentioned',
        message: 'Test User mentioned you in a comment',
        data: { pageId: 'page-123', commentId: 'comment-456' },
      });

      expect(result.id).toBe('notif-123');
      expect(result.type).toBe('MENTION');
      expect(result.isRead).toBe(false);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'MENTION',
          title: 'You were mentioned',
          message: 'Test User mentioned you in a comment',
          data: { pageId: 'page-123', commentId: 'comment-456' },
        },
      });
    });

    it('should create a notification without message', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        message: null,
      });

      const result = await notificationsService.createNotification({
        userId: 'user-123',
        type: 'PAGE_SHARED' as NotificationType,
        title: 'Page shared with you',
      });

      expect(result.message).toBeNull();
    });

    it('should create a notification with all notification types', async () => {
      const types: NotificationType[] = [
        'MENTION',
        'COMMENT_REPLY',
        'PAGE_SHARED',
        'COMMENT_RESOLVED',
        'INVITATION',
      ];

      for (const type of types) {
        mockPrisma.notification.create.mockResolvedValue({
          ...mockNotification,
          type,
        });

        const result = await notificationsService.createNotification({
          userId: 'user-123',
          type,
          title: `Test ${type}`,
        });

        expect(result.type).toBe(type);
      }
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for a user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await notificationsService.getNotifications('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-123');
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      await notificationsService.getNotifications('user-123', { limit: 10, offset: 20 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });

    it('should filter by unread only', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      await notificationsService.getNotifications('user-123', { unreadOnly: true });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getNotificationById', () => {
    it('should return a notification by ID', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);

      const result = await notificationsService.getNotificationById('notif-123', 'user-123');

      expect(result?.id).toBe('notif-123');
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
      });
    });

    it('should return null for non-existent notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      const result = await notificationsService.getNotificationById('nonexistent', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const readAt = new Date();
      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt,
      });

      const result = await notificationsService.markAsRead('notif-123', 'user-123');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBe(readAt);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should throw NOTIFICATION_NOT_FOUND for non-existent notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(notificationsService.markAsRead('nonexistent', 'user-123')).rejects.toThrow(
        'NOTIFICATION_NOT_FOUND'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await notificationsService.markAllAsRead('user-123');

      expect(result.count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.notification.delete.mockResolvedValue(mockNotification);

      await notificationsService.deleteNotification('notif-123', 'user-123');

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
      });
    });

    it('should throw NOTIFICATION_NOT_FOUND for non-existent notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        notificationsService.deleteNotification('nonexistent', 'user-123')
      ).rejects.toThrow('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const result = await notificationsService.getUnreadCount('user-123');

      expect(result).toBe(7);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
      });
    });
  });

  describe('createMentionNotification', () => {
    it('should create a mention notification with proper context', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'MENTION',
        title: 'Test Author mentioned you',
        message: 'in "Test Page"',
        data: {
          pageId: 'page-123',
          pageTitle: 'Test Page',
          commentId: 'comment-456',
          actorId: 'actor-123',
          actorName: 'Test Author',
        },
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
        emailSentAt: new Date(),
      });

      const result = await notificationsService.createMentionNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(result.type).toBe('MENTION');
      expect(result.title).toBe('Test Author mentioned you');
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should send email notification for mentions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        id: 'notif-456',
        type: 'MENTION',
        title: 'Test Author mentioned you',
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
        emailSentAt: new Date(),
      });

      await notificationsService.createMentionNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(mockSendMentionNotificationEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        recipientName: 'Test User',
        actorName: 'Test Author',
        pageTitle: 'Test Page',
        pageUrl: expect.stringContaining('page-123'),
      });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-456' },
        data: { emailSent: true, emailSentAt: expect.any(Date) },
      });
    });

    it('should not send email if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'MENTION',
      });

      await notificationsService.createMentionNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(mockSendMentionNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('createCommentReplyNotification', () => {
    it('should create a comment reply notification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'COMMENT_REPLY',
        title: 'Test Author replied to your comment',
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
      });

      const result = await notificationsService.createCommentReplyNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(result.type).toBe('COMMENT_REPLY');
      expect(result.title).toBe('Test Author replied to your comment');
    });

    it('should send email notification for comment replies', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        id: 'notif-789',
        type: 'COMMENT_REPLY',
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
      });

      await notificationsService.createCommentReplyNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(mockSendCommentReplyNotificationEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        recipientName: 'Test User',
        actorName: 'Test Author',
        pageTitle: 'Test Page',
        pageUrl: expect.stringContaining('page-123'),
      });
    });

    it('should not send email when preference is disabled', async () => {
      mockShouldSendEmail.mockResolvedValue(false);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        id: 'notif-789',
        type: 'COMMENT_REPLY',
      });

      await notificationsService.createCommentReplyNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(mockShouldSendEmail).toHaveBeenCalledWith('user-123', 'COMMENT_REPLY');
      expect(mockSendCommentReplyNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('createPageSharedNotification', () => {
    it('should create a page shared notification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'PAGE_SHARED',
        title: 'Test Author shared a page with you',
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
      });

      const result = await notificationsService.createPageSharedNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        permissionLevel: 'EDIT',
      });

      expect(result.type).toBe('PAGE_SHARED');
      expect(result.title).toBe('Test Author shared a page with you');
    });

    it('should send email notification for page sharing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        id: 'notif-shared',
        type: 'PAGE_SHARED',
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
      });

      await notificationsService.createPageSharedNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        permissionLevel: 'EDIT',
      });

      expect(mockSendPageSharedNotificationEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        recipientName: 'Test User',
        actorName: 'Test Author',
        pageTitle: 'Test Page',
        pageUrl: expect.stringContaining('page-123'),
        permissionLevel: 'EDIT',
      });
    });

    it('should not send email when preference is disabled', async () => {
      mockShouldSendEmail.mockResolvedValue(false);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        id: 'notif-shared',
        type: 'PAGE_SHARED',
      });

      await notificationsService.createPageSharedNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        permissionLevel: 'EDIT',
      });

      expect(mockShouldSendEmail).toHaveBeenCalledWith('user-123', 'PAGE_SHARED');
      expect(mockSendPageSharedNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('createCommentResolvedNotification', () => {
    it('should create a comment resolved notification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'COMMENT_RESOLVED',
        title: 'Test Author resolved your comment',
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
      });

      const result = await notificationsService.createCommentResolvedNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(result.type).toBe('COMMENT_RESOLVED');
      expect(result.title).toBe('Test Author resolved your comment');
    });

    it('should send email notification for comment resolution', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        id: 'notif-resolved',
        type: 'COMMENT_RESOLVED',
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        emailSent: true,
      });

      await notificationsService.createCommentResolvedNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(mockSendCommentResolvedNotificationEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        recipientName: 'Test User',
        actorName: 'Test Author',
        pageTitle: 'Test Page',
        pageUrl: expect.stringContaining('page-123'),
      });
    });

    it('should not send email when preference is disabled', async () => {
      mockShouldSendEmail.mockResolvedValue(false);
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        id: 'notif-resolved',
        type: 'COMMENT_RESOLVED',
      });

      await notificationsService.createCommentResolvedNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-456',
      });

      expect(mockShouldSendEmail).toHaveBeenCalledWith('user-123', 'COMMENT_RESOLVED');
      expect(mockSendCommentResolvedNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('createInvitationNotification', () => {
    it('should create an invitation notification', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'INVITATION',
        title: 'Test Author invited you to Test Org',
      });

      const result = await notificationsService.createInvitationNotification({
        recipientId: 'user-123',
        actorId: 'actor-123',
        actorName: 'Test Author',
        organizationId: 'org-123',
        organizationName: 'Test Org',
      });

      expect(result.type).toBe('INVITATION');
      expect(result.title).toBe('Test Author invited you to Test Org');
    });
  });
});
