import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { Notification } from '@librediary/shared';

const { mockPush, mockNotificationsService } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockNotificationsService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/services', () => ({
  notificationsService: mockNotificationsService,
}));

import NotificationBell from '../NotificationBell.vue';

const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  userId: 'u1',
  type: 'MENTION',
  title: 'You were mentioned',
  message: 'Someone mentioned you in a comment',
  data: { pageId: 'page-1' },
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockNotificationsService.getUnreadCount.mockResolvedValue(0);
    mockNotificationsService.getNotifications.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountBell(props = {}) {
    return mount(NotificationBell, {
      props: { pollInterval: 60000, ...props },
      global: {
        stubs: {
          // Stub transitions so leave transitions complete immediately in happy-dom
          Transition: true,
          TransitionGroup: true,
        },
      },
    });
  }

  describe('rendering', () => {
    it('should render bell button with aria label', async () => {
      const wrapper = mountBell();
      await flushPromises();

      const button = wrapper.find('.bell-button');
      expect(button.exists()).toBe(true);
      expect(button.attributes('aria-label')).toBe('Notifications');
    });

    it('should not show badge when unread count is 0', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(0);
      const wrapper = mountBell();
      await flushPromises();

      expect(wrapper.find('.unread-badge').exists()).toBe(false);
    });

    it('should show badge with unread count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);
      const wrapper = mountBell();
      await flushPromises();

      expect(wrapper.find('.badge-count').text()).toBe('5');
    });

    it('should display 99+ for counts above 99', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(150);
      const wrapper = mountBell();
      await flushPromises();

      expect(wrapper.find('.badge-count').text()).toBe('99+');
    });
  });

  describe('panel toggle', () => {
    it('should open panel on bell click', async () => {
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');

      expect(wrapper.find('.notification-panel').exists()).toBe(true);
    });

    it('should close panel on second click', async () => {
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();
      expect(wrapper.find('.notification-panel').exists()).toBe(true);

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();
      expect(wrapper.find('.notification-panel').exists()).toBe(false);
    });

    it('should show panel title when open', async () => {
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');

      expect(wrapper.find('.panel-title').text()).toBe('Notifications');
    });
  });

  describe('notifications list', () => {
    it('should show empty state when no notifications', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue([]);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('All caught up!');
    });

    it('should render notification items', async () => {
      const notifications = [
        createNotification({ id: 'n1', title: 'First' }),
        createNotification({ id: 'n2', title: 'Second', type: 'COMMENT_REPLY' }),
      ];
      mockNotificationsService.getNotifications.mockResolvedValue(notifications);
      mockNotificationsService.getUnreadCount.mockResolvedValue(2);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      const items = wrapper.findAll('.notification-item');
      expect(items).toHaveLength(2);
      expect(items[0]!.text()).toContain('First');
    });

    it('should mark unread notifications with unread class', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue([
        createNotification({ isRead: false }),
      ]);
      mockNotificationsService.getUnreadCount.mockResolvedValue(1);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      expect(wrapper.find('.notification-item').classes()).toContain('unread');
    });

    it('should show unread indicator count in header', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue([createNotification()]);
      mockNotificationsService.getUnreadCount.mockResolvedValue(3);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      expect(wrapper.find('.unread-indicator').text()).toContain('3 new');
    });
  });

  describe('mark as read', () => {
    it('should call markAsRead when clicking an unread notification', async () => {
      const notification = createNotification({ isRead: false });
      mockNotificationsService.getNotifications.mockResolvedValue([notification]);
      mockNotificationsService.getUnreadCount.mockResolvedValue(1);
      mockNotificationsService.markAsRead.mockResolvedValue({
        ...notification,
        isRead: true,
      });
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      await wrapper.find('.notification-item').trigger('click');
      await flushPromises();

      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith('n1');
    });

    it('should not call markAsRead for already-read notifications', async () => {
      const notification = createNotification({ isRead: true });
      mockNotificationsService.getNotifications.mockResolvedValue([notification]);
      mockNotificationsService.getUnreadCount.mockResolvedValue(0);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      await wrapper.find('.notification-item').trigger('click');
      await flushPromises();

      expect(mockNotificationsService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('mark all as read', () => {
    it('should call markAllAsRead when clicking mark all button', async () => {
      mockNotificationsService.getNotifications.mockResolvedValue([
        createNotification({ isRead: false }),
      ]);
      mockNotificationsService.getUnreadCount.mockResolvedValue(1);
      mockNotificationsService.markAllAsRead.mockResolvedValue(1);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      await wrapper.find('.mark-all-btn').trigger('click');
      await flushPromises();

      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('delete notification', () => {
    it('should call deleteNotification and remove from list', async () => {
      const notification = createNotification();
      mockNotificationsService.getNotifications.mockResolvedValue([notification]);
      mockNotificationsService.getUnreadCount.mockResolvedValue(1);
      mockNotificationsService.deleteNotification.mockResolvedValue(undefined);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      await wrapper.find('.delete-btn').trigger('click');
      await flushPromises();

      expect(mockNotificationsService.deleteNotification).toHaveBeenCalledWith('n1');
    });
  });

  describe('navigation', () => {
    it('should navigate to page when notification has pageId', async () => {
      const notification = createNotification({ data: { pageId: 'page-123' } });
      mockNotificationsService.getNotifications.mockResolvedValue([notification]);
      mockNotificationsService.getUnreadCount.mockResolvedValue(1);
      mockNotificationsService.markAsRead.mockResolvedValue({
        ...notification,
        isRead: true,
      });
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      await wrapper.find('.notification-item').trigger('click');
      await flushPromises();

      expect(mockPush).toHaveBeenCalledWith('/app/page/page-123');
    });

    it('should navigate to settings for notification settings button', async () => {
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      await wrapper.find('.settings-btn').trigger('click');
      await flushPromises();

      expect(mockPush).toHaveBeenCalledWith({ name: 'notification-settings' });
    });
  });

  describe('polling', () => {
    it('should fetch unread count on mount', async () => {
      mountBell();
      await flushPromises();

      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalled();
    });

    it('should poll for unread count at specified interval', async () => {
      mountBell({ pollInterval: 5000 });
      await flushPromises();

      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      await flushPromises();

      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should show error state when fetch fails', async () => {
      mockNotificationsService.getNotifications.mockRejectedValue(new Error('Network error'));
      mockNotificationsService.getUnreadCount.mockResolvedValue(0);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      expect(wrapper.find('.error-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load notifications');
    });

    it('should retry on clicking try again button', async () => {
      // Reject both calls that happen on open (togglePanel + watcher)
      mockNotificationsService.getNotifications.mockRejectedValue(new Error('Fail'));
      mockNotificationsService.getUnreadCount.mockResolvedValue(0);
      const wrapper = mountBell();
      await flushPromises();

      await wrapper.find('.bell-button').trigger('click');
      await flushPromises();

      expect(wrapper.find('.error-state').exists()).toBe(true);

      // Now make it succeed for the retry
      mockNotificationsService.getNotifications.mockResolvedValue([]);
      await wrapper.find('.retry-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.error-state').exists()).toBe(false);
    });
  });
});
