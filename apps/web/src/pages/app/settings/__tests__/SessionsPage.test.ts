import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SessionsPage from '../SessionsPage.vue';
import { authService } from '@/services/auth.service';
import type { SessionInfo } from '@/services/auth.service';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    getSessions: vi.fn(),
    revokeSession: vi.fn(),
  },
}));

// Mock the toast composable
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock('@/composables/useToast', () => ({
  useToast: () => mockToast,
}));

// Mock the confirm dialog
vi.mock('@/composables/useConfirm', () => ({
  useConfirm: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

describe('SessionsPage', () => {
  const mockSessions: SessionInfo[] = [
    {
      id: 'session-1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      ipAddress: '192.168.1.1',
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      isCurrent: true,
    },
    {
      id: 'session-2',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
      ipAddress: '10.0.0.5',
      lastActiveAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      isCurrent: false,
    },
    {
      id: 'session-3',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      ipAddress: null,
      lastActiveAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
      isCurrent: false,
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(authService.getSessions).mockResolvedValue({ sessions: mockSessions });
    vi.mocked(authService.revokeSession).mockResolvedValue({ message: 'Session revoked' });
  });

  function mountPage() {
    return mount(SessionsPage, {
      global: {
        stubs: { teleport: true },
      },
    });
  }

  describe('loading state', () => {
    it('shows loading spinner while fetching sessions', () => {
      vi.mocked(authService.getSessions).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ sessions: [] }), 100))
      );
      const wrapper = mountPage();
      expect(wrapper.find('.loading-state').exists()).toBe(true);
    });

    it('hides loading spinner after sessions load', async () => {
      const wrapper = mountPage();
      await flushPromises();
      expect(wrapper.find('.loading-state').exists()).toBe(false);
    });
  });

  describe('session list', () => {
    it('displays all sessions', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const sessionItems = wrapper.findAll('.session-item');
      expect(sessionItems).toHaveLength(3);
    });

    it('shows "Current session" badge for current session', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Current session');
    });

    it('parses and displays device info from user agent', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Mac');
      expect(wrapper.text()).toContain('iPhone');
      expect(wrapper.text()).toContain('Windows');
    });

    it('displays IP address when available', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('192.168.1.1');
      expect(wrapper.text()).toContain('10.0.0.5');
    });

    it('shows "Unknown" for missing IP address', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Unknown');
    });

    it('formats last active time as relative', async () => {
      const wrapper = mountPage();
      await flushPromises();

      // Current session should show "Active now" or similar
      expect(wrapper.text()).toMatch(/just now|minute|hour/i);
    });
  });

  describe('revoke session', () => {
    it('shows revoke button for non-current sessions', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const revokeButtons = wrapper.findAll('.revoke-btn');
      // Only 2 non-current sessions should have revoke buttons
      expect(revokeButtons).toHaveLength(2);
    });

    it('does not show revoke button for current session', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const currentSession = wrapper.findAll('.session-item')[0];
      expect(currentSession?.find('.revoke-btn').exists()).toBe(false);
    });

    it('calls revokeSession when revoke button is clicked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const revokeButton = wrapper.find('.revoke-btn');
      await revokeButton.trigger('click');
      await flushPromises();

      expect(authService.revokeSession).toHaveBeenCalled();
    });

    it('removes session from list after revoking', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.findAll('.session-item')).toHaveLength(3);

      await wrapper.find('.revoke-btn').trigger('click');
      await flushPromises();

      expect(wrapper.findAll('.session-item')).toHaveLength(2);
    });

    it('shows success toast after revoking session', async () => {
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.revoke-btn').trigger('click');
      await flushPromises();

      expect(mockToast.success).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('shows error message when loading fails', async () => {
      vi.mocked(authService.getSessions).mockRejectedValue(new Error('Network error'));
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Failed to load sessions');
    });

    it('shows error toast when revoke fails', async () => {
      vi.mocked(authService.revokeSession).mockRejectedValue(new Error('Failed'));
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.revoke-btn').trigger('click');
      await flushPromises();

      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('page header', () => {
    it('shows page title "Sessions"', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('h1').text()).toBe('Sessions');
    });

    it('shows description text', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('manage your active sessions');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no sessions', async () => {
      vi.mocked(authService.getSessions).mockResolvedValue({ sessions: [] });
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('No active sessions');
    });
  });
});
