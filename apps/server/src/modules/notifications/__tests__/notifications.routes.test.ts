import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

// Mock services using vi.hoisted
const { mockNotificationsService, mockNotification, resetMocks } = vi.hoisted(() => {
  const mockNotificationsService = {
    getNotifications: vi.fn(),
    getNotificationById: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    getUnreadCount: vi.fn(),
  };

  const now = new Date();

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    type: 'MENTION',
    title: 'Test User mentioned you',
    message: 'in "Test Page"',
    data: { pageId: 'page-123', commentId: 'comment-456' },
    isRead: false,
    readAt: null,
    createdAt: now,
  };

  function resetMocks() {
    Object.values(mockNotificationsService).forEach((mock) => mock.mockReset());
  }

  return { mockNotificationsService, mockNotification, resetMocks };
});

// Mock the services
vi.mock('../notifications.service.js', () => mockNotificationsService);

// Import after mocking
import Fastify from 'fastify';
import notificationsRoutes from '../notifications.routes.js';

describe('Notifications Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();

    // Mock auth decorator
    app.decorateRequest('user', null);

    await app.register(notificationsRoutes, { prefix: '/notifications' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /notifications', () => {
    it('should return notifications for the authenticated user', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue([mockNotification]);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.notifications).toHaveLength(1);
      expect(body.data.notifications[0].id).toBe('notif-123');
    });

    it('should support pagination', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue([mockNotification]);

      await app.inject({
        method: 'GET',
        url: '/notifications?limit=10&offset=20',
      });

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith('user-123', {
        limit: 10,
        offset: 20,
        unreadOnly: false,
      });
    });

    it('should filter by unread only', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue([mockNotification]);

      await app.inject({
        method: 'GET',
        url: '/notifications?unreadOnly=true',
      });

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith('user-123', {
        limit: 50,
        offset: 0,
        unreadOnly: true,
      });
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread notification count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(7);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/unread-count',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.count).toBe(7);
    });
  });

  describe('GET /notifications/:notificationId', () => {
    it('should return a notification by ID', async () => {
      mockNotificationsService.getNotificationById.mockResolvedValue(mockNotification);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/notif-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.notification.id).toBe('notif-123');
    });

    it('should return 404 for non-existent notification', async () => {
      mockNotificationsService.getNotificationById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('PATCH /notifications/:notificationId/read', () => {
    it('should mark a notification as read', async () => {
      const readAt = new Date();
      mockNotificationsService.markAsRead.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/notif-123/read',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.notification.isRead).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      mockNotificationsService.markAsRead.mockRejectedValue(new Error('NOTIFICATION_NOT_FOUND'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/nonexistent/read',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ count: 5 });

      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/read-all',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.count).toBe(5);
    });
  });

  describe('DELETE /notifications/:notificationId', () => {
    it('should delete a notification', async () => {
      mockNotificationsService.deleteNotification.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/notifications/notif-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      mockNotificationsService.deleteNotification.mockRejectedValue(
        new Error('NOTIFICATION_NOT_FOUND')
      );

      const response = await app.inject({
        method: 'DELETE',
        url: '/notifications/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });
});
