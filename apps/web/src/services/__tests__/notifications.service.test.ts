import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { notificationsService } from '../notifications.service';

describe('Notifications Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // getNotifications
  // ===========================================

  describe('getNotifications', () => {
    const mockNotifications = [
      { id: 'notif-1', type: 'mention', read: false },
      { id: 'notif-2', type: 'comment_reply', read: true },
    ];

    it('should call GET /notifications with no query string when no options provided', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      const result = await notificationsService.getNotifications();

      expect(mockApi.get).toHaveBeenCalledWith('/notifications');
      expect(result).toEqual(mockNotifications);
    });

    it('should call GET /notifications with no query string when empty options provided', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      const result = await notificationsService.getNotifications({});

      expect(mockApi.get).toHaveBeenCalledWith('/notifications');
      expect(result).toEqual(mockNotifications);
    });

    it('should append limit query param when provided', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      await notificationsService.getNotifications({ limit: 20 });

      expect(mockApi.get).toHaveBeenCalledWith('/notifications?limit=20');
    });

    it('should append offset query param when provided', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      await notificationsService.getNotifications({ offset: 10 });

      expect(mockApi.get).toHaveBeenCalledWith('/notifications?offset=10');
    });

    it('should append unreadOnly query param when true', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      await notificationsService.getNotifications({ unreadOnly: true });

      expect(mockApi.get).toHaveBeenCalledWith('/notifications?unreadOnly=true');
    });

    it('should append all query params when all options provided', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      await notificationsService.getNotifications({ limit: 25, offset: 5, unreadOnly: true });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('limit=25');
      expect(url).toContain('offset=5');
      expect(url).toContain('unreadOnly=true');
    });

    it('should not append falsy params (offset=0, unreadOnly=false)', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      await notificationsService.getNotifications({ limit: 10, offset: 0, unreadOnly: false });

      // offset=0 is falsy, unreadOnly=false is falsy, so only limit should appear
      expect(mockApi.get).toHaveBeenCalledWith('/notifications?limit=10');
    });

    it('should return response.notifications', async () => {
      mockApi.get.mockResolvedValue({ notifications: mockNotifications });

      const result = await notificationsService.getNotifications();

      expect(result).toEqual(mockNotifications);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await expect(notificationsService.getNotifications()).rejects.toThrow('Network error');
    });
  });

  // ===========================================
  // getUnreadCount
  // ===========================================

  describe('getUnreadCount', () => {
    it('should call GET /notifications/unread-count', async () => {
      mockApi.get.mockResolvedValue({ count: 5 });

      const result = await notificationsService.getUnreadCount();

      expect(mockApi.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toBe(5);
    });

    it('should return zero count', async () => {
      mockApi.get.mockResolvedValue({ count: 0 });

      const result = await notificationsService.getUnreadCount();

      expect(result).toBe(0);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Server error'));

      await expect(notificationsService.getUnreadCount()).rejects.toThrow('Server error');
    });
  });

  // ===========================================
  // getNotification
  // ===========================================

  describe('getNotification', () => {
    const mockNotification = { id: 'notif-1', type: 'mention', read: false };

    it('should call GET /notifications/{notificationId}', async () => {
      mockApi.get.mockResolvedValue({ notification: mockNotification });

      const result = await notificationsService.getNotification('notif-1');

      expect(mockApi.get).toHaveBeenCalledWith('/notifications/notif-1');
      expect(result).toEqual(mockNotification);
    });

    it('should return response.notification', async () => {
      mockApi.get.mockResolvedValue({ notification: mockNotification });

      const result = await notificationsService.getNotification('notif-abc');

      expect(result).toEqual(mockNotification);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(notificationsService.getNotification('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // markAsRead
  // ===========================================

  describe('markAsRead', () => {
    const mockNotification = { id: 'notif-1', type: 'mention', read: true };

    it('should call PATCH /notifications/{notificationId}/read', async () => {
      mockApi.patch.mockResolvedValue({ notification: mockNotification });

      const result = await notificationsService.markAsRead('notif-1');

      expect(mockApi.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
      expect(result).toEqual(mockNotification);
    });

    it('should return response.notification', async () => {
      mockApi.patch.mockResolvedValue({ notification: mockNotification });

      const result = await notificationsService.markAsRead('notif-xyz');

      expect(result).toEqual(mockNotification);
    });

    it('should propagate API errors', async () => {
      mockApi.patch.mockRejectedValue(new Error('Forbidden'));

      await expect(notificationsService.markAsRead('notif-1')).rejects.toThrow('Forbidden');
    });
  });

  // ===========================================
  // markAllAsRead
  // ===========================================

  describe('markAllAsRead', () => {
    it('should call PATCH /notifications/read-all', async () => {
      mockApi.patch.mockResolvedValue({ count: 12 });

      const result = await notificationsService.markAllAsRead();

      expect(mockApi.patch).toHaveBeenCalledWith('/notifications/read-all');
      expect(result).toBe(12);
    });

    it('should return zero when no notifications to mark', async () => {
      mockApi.patch.mockResolvedValue({ count: 0 });

      const result = await notificationsService.markAllAsRead();

      expect(result).toBe(0);
    });

    it('should propagate API errors', async () => {
      mockApi.patch.mockRejectedValue(new Error('Server error'));

      await expect(notificationsService.markAllAsRead()).rejects.toThrow('Server error');
    });
  });

  // ===========================================
  // deleteNotification
  // ===========================================

  describe('deleteNotification', () => {
    it('should call DELETE /notifications/{notificationId}', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await notificationsService.deleteNotification('notif-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/notifications/notif-1');
    });

    it('should not return a value', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      const result = await notificationsService.deleteNotification('notif-1');

      expect(result).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApi.delete.mockRejectedValue(new Error('Not found'));

      await expect(notificationsService.deleteNotification('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // getPreferences
  // ===========================================

  describe('getPreferences', () => {
    const mockPreferences = {
      emailMention: true,
      emailCommentReply: true,
      emailPageShared: false,
      emailCommentResolved: true,
      emailInvitation: false,
    };

    it('should call GET /notifications/preferences', async () => {
      mockApi.get.mockResolvedValue({ preferences: mockPreferences });

      const result = await notificationsService.getPreferences();

      expect(mockApi.get).toHaveBeenCalledWith('/notifications/preferences');
      expect(result).toEqual(mockPreferences);
    });

    it('should return response.preferences', async () => {
      mockApi.get.mockResolvedValue({ preferences: mockPreferences });

      const result = await notificationsService.getPreferences();

      expect(result).toEqual(mockPreferences);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Unauthorised'));

      await expect(notificationsService.getPreferences()).rejects.toThrow('Unauthorised');
    });
  });

  // ===========================================
  // updatePreferences
  // ===========================================

  describe('updatePreferences', () => {
    const mockPreferences = {
      emailMention: false,
      emailCommentReply: true,
      emailPageShared: false,
      emailCommentResolved: true,
      emailInvitation: true,
    };

    it('should call PATCH /notifications/preferences with updates body', async () => {
      const updates = { emailMention: false, emailInvitation: true };
      mockApi.patch.mockResolvedValue({ preferences: mockPreferences });

      const result = await notificationsService.updatePreferences(updates);

      expect(mockApi.patch).toHaveBeenCalledWith('/notifications/preferences', updates);
      expect(result).toEqual(mockPreferences);
    });

    it('should return response.preferences', async () => {
      const updates = { emailPageShared: false };
      mockApi.patch.mockResolvedValue({ preferences: mockPreferences });

      const result = await notificationsService.updatePreferences(updates);

      expect(result).toEqual(mockPreferences);
    });

    it('should propagate API errors', async () => {
      mockApi.patch.mockRejectedValue(new Error('Bad request'));

      await expect(notificationsService.updatePreferences({ emailMention: false })).rejects.toThrow(
        'Bad request'
      );
    });
  });
});
