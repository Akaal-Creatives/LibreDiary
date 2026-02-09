import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import type { NotificationPreferences } from '@/services/notifications.service';

// Hoist mocks so they are available before module imports
const { mockNotificationsService } = vi.hoisted(() => ({
  mockNotificationsService: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

vi.mock('@/services/notifications.service', () => ({
  notificationsService: mockNotificationsService,
}));

import NotificationSettingsPage from '../NotificationSettingsPage.vue';

function mountPage() {
  return mount(NotificationSettingsPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

const defaultPreferences: NotificationPreferences = {
  emailMention: true,
  emailCommentReply: true,
  emailPageShared: true,
  emailCommentResolved: true,
  emailInvitation: true,
};

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    mockNotificationsService.getPreferences.mockResolvedValue({ ...defaultPreferences });
    mockNotificationsService.updatePreferences.mockResolvedValue({ ...defaultPreferences });
  });

  // ---- Page Header ----

  describe('page header', () => {
    it('renders the page title "Notifications"', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-title').text()).toBe('Notifications');
    });

    it('renders the page description', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Choose which events trigger email notifications');
    });
  });

  // ---- Loading State ----

  describe('loading state', () => {
    it('shows loading state while preferences are being fetched', () => {
      mockNotificationsService.getPreferences.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(defaultPreferences), 100))
      );
      const wrapper = mountPage();

      expect(wrapper.find('.loading-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading preferences...');
    });

    it('hides loading state after preferences load', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.loading-state').exists()).toBe(false);
    });
  });

  // ---- Preferences Display ----

  describe('preferences display', () => {
    it('renders all five toggle rows', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const toggleRows = wrapper.findAll('.toggle-row');
      expect(toggleRows).toHaveLength(5);
    });

    it('displays the correct labels for each preference', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const labels = wrapper.findAll('.toggle-label');
      expect(labels[0].text()).toBe('Mentions');
      expect(labels[1].text()).toBe('Comment replies');
      expect(labels[2].text()).toBe('Page sharing');
      expect(labels[3].text()).toBe('Comment resolved');
      expect(labels[4].text()).toBe('Invitations');
    });

    it('shows descriptions for each preference', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('When someone mentions you in a comment with @');
      expect(wrapper.text()).toContain('When someone replies to one of your comments');
      expect(wrapper.text()).toContain('When someone shares a page with you');
      expect(wrapper.text()).toContain('When someone resolves a comment you authored');
      expect(wrapper.text()).toContain('When you are invited to join an organisation');
    });

    it('sets checkboxes to checked state matching preferences', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(5);

      // All should be checked since defaultPreferences has all true
      checkboxes.forEach((checkbox) => {
        expect((checkbox.element as HTMLInputElement).checked).toBe(true);
      });
    });

    it('sets checkboxes to unchecked state for disabled preferences', async () => {
      mockNotificationsService.getPreferences.mockResolvedValue({
        ...defaultPreferences,
        emailMention: false,
        emailPageShared: false,
      });
      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(false); // emailMention
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true); // emailCommentReply
      expect((checkboxes[2].element as HTMLInputElement).checked).toBe(false); // emailPageShared
    });
  });

  // ---- Toggle Behaviour ----

  describe('toggle behaviour', () => {
    it('calls updatePreferences when a toggle is changed', async () => {
      mockNotificationsService.updatePreferences.mockResolvedValue({
        ...defaultPreferences,
        emailMention: false,
      });

      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].trigger('change');
      await flushPromises();

      expect(mockNotificationsService.updatePreferences).toHaveBeenCalledWith({
        emailMention: false,
      });
    });

    it('shows success message after updating preferences', async () => {
      mockNotificationsService.updatePreferences.mockResolvedValue({
        ...defaultPreferences,
        emailMention: false,
      });

      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].trigger('change');
      await flushPromises();

      expect(wrapper.find('.notification--success').exists()).toBe(true);
      expect(wrapper.text()).toContain('Preferences updated');
    });

    it('reverts toggle on failure and shows error', async () => {
      mockNotificationsService.updatePreferences.mockRejectedValue(new Error('Server error'));

      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      // Initially checked (true), toggle to false, but revert on failure
      await checkboxes[0].trigger('change');
      await flushPromises();

      expect(wrapper.find('.notification--error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to update preferences');

      // The checkbox should be reverted back to checked
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true);
    });

    it('can dismiss the error notification', async () => {
      mockNotificationsService.updatePreferences.mockRejectedValue(new Error('Server error'));

      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      await checkboxes[0].trigger('change');
      await flushPromises();

      expect(wrapper.find('.notification--error').exists()).toBe(true);

      // Click close button on error notification
      await wrapper.find('.notification--error .notification-close').trigger('click');
      await flushPromises();

      expect(wrapper.find('.notification--error').exists()).toBe(false);
    });
  });

  // ---- Error Handling ----

  describe('error handling', () => {
    it('fetches preferences on mount', async () => {
      mountPage();
      await flushPromises();

      expect(mockNotificationsService.getPreferences).toHaveBeenCalledTimes(1);
    });

    it('shows error when loading preferences fails', async () => {
      mockNotificationsService.getPreferences.mockRejectedValue(new Error('Network error'));
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.notification--error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load notification preferences');
    });
  });

  // ---- Section Header ----

  describe('email notifications section', () => {
    it('shows the "Email notifications" section title', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.section-title').text()).toBe('Email notifications');
    });

    it('shows the section description', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Receive email alerts for activity that involves you');
    });
  });
});
