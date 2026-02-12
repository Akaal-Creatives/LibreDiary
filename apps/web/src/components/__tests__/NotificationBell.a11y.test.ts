import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
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
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/services', () => ({
  notificationsService: mockNotificationsService,
}));

import NotificationBell from '../NotificationBell.vue';

describe('NotificationBell accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockNotificationsService.getUnreadCount.mockResolvedValue(0);
    mockNotificationsService.getNotifications.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountBell() {
    return mount(NotificationBell, {
      props: { pollInterval: 60000 },
      global: {
        stubs: {
          Transition: true,
          TransitionGroup: true,
        },
      },
    });
  }

  it('bell button has aria-label', async () => {
    const wrapper = mountBell();
    await flushPromises();
    const bell = wrapper.find('.bell-button');
    expect(bell.attributes('aria-label')).toBeTruthy();
  });

  it('bell button has aria-expanded reflecting panel state', async () => {
    const wrapper = mountBell();
    await flushPromises();
    const bell = wrapper.find('.bell-button');
    expect(bell.attributes('aria-expanded')).toBe('false');
  });
});
