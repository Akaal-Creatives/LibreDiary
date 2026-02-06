import { api } from './api';
import type { Notification, NotificationType } from '@librediary/shared';

export interface NotificationResponse {
  notifications: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationSingleResponse {
  notification: Notification;
}

export interface MarkAllReadResponse {
  count: number;
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export const notificationsService = {
  /**
   * Get notifications for the current user
   */
  async getNotifications(options: GetNotificationsOptions = {}): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.unreadOnly) params.set('unreadOnly', 'true');

    const query = params.toString();
    const response = await api.get<NotificationResponse>(
      `/notifications${query ? `?${query}` : ''}`
    );
    return response.notifications;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
    return response.count;
  },

  /**
   * Get a specific notification
   */
  async getNotification(notificationId: string): Promise<Notification> {
    const response = await api.get<NotificationSingleResponse>(`/notifications/${notificationId}`);
    return response.notification;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await api.patch<NotificationSingleResponse>(
      `/notifications/${notificationId}/read`
    );
    return response.notification;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const response = await api.patch<MarkAllReadResponse>('/notifications/read-all');
    return response.count;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },
};

// Re-export types for convenience
export type { Notification, NotificationType };
