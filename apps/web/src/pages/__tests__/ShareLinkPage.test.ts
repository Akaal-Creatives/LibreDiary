import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

// Hoist mock definitions so they are available before module imports
const { mockApi, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
    }
  }
  return {
    mockApi: {
      get: vi.fn(),
    },
    MockApiError,
  };
});

vi.mock('@/services', () => ({
  api: mockApi,
  ApiError: MockApiError,
}));

// Stub the TiptapEditor component
vi.mock('@/components/editor', () => ({
  TiptapEditor: {
    name: 'TiptapEditor',
    template: '<div class="stub-tiptap-editor" />',
    props: ['modelValue', 'editable', 'placeholder'],
    emits: ['update:modelValue'],
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {} }),
}));

import ShareLinkPage from '../ShareLinkPage.vue';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeSharedPage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'page-1',
    title: 'Shared Test Page',
    htmlContent: '<p>Shared content</p>',
    icon: null,
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2024-06-20T14:30:00Z',
    createdBy: {
      id: 'user-1',
      name: 'Alice Smith',
    },
    permission: {
      level: 'VIEW' as const,
      expiresAt: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

function mountPage(props: Record<string, unknown> = {}) {
  return mount(ShareLinkPage, {
    props: {
      token: 'test-share-token-123',
      ...props,
    },
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
        'router-link': {
          template: '<a><slot /></a>',
          props: ['to'],
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShareLinkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // =========================================================================
  // Loading state
  // =========================================================================

  describe('loading state', () => {
    it('should show loading state whilst page is being fetched', async () => {
      mockApi.get.mockReturnValue(new Promise(() => {}));

      const wrapper = mountPage();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.page-loading').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading shared page...');
    });
  });

  // =========================================================================
  // Successful page load
  // =========================================================================

  describe('successful page load', () => {
    it('should display the page title', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.article-title').text()).toBe('Shared Test Page');
    });

    it('should display the author name', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.meta-author').text()).toContain('By Alice Smith');
    });

    it('should not display author section when createdBy.name is null', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ createdBy: { id: 'u-1', name: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.meta-author').exists()).toBe(false);
    });

    it('should display the page icon when provided', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage({ icon: '\u{1F4D6}' }) });

      const wrapper = mountPage();
      await flushPromises();

      const iconEl = wrapper.find('.article-icon');
      expect(iconEl.exists()).toBe(true);
      expect(iconEl.text()).toBe('\u{1F4D6}');
    });

    it('should not display the icon element when icon is null', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage({ icon: null }) });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.article-icon').exists()).toBe(false);
    });

    it('should display formatted date from updatedAt', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage() });

      const wrapper = mountPage();
      await flushPromises();

      const dateText = wrapper.find('.meta-date').text();
      expect(dateText).toContain('June');
      expect(dateText).toContain('20');
    });

    it('should call the correct API endpoint using the token prop', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage() });

      mountPage({ token: 'abc-token-xyz' });
      await flushPromises();

      expect(mockApi.get).toHaveBeenCalledWith('/public/pages/share/abc-token-xyz');
    });

    it('should display "Shared Link" badge in the header', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.header-badge.shared').text()).toContain('Shared Link');
    });
  });

  // =========================================================================
  // Permission levels
  // =========================================================================

  describe('permission levels', () => {
    it('should display "View only" permission badge for VIEW level', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'VIEW', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      const badge = wrapper.find('.header-badge.permission');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toContain('View only');
    });

    it('should display "Can edit" permission badge for EDIT level', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'EDIT', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      const badge = wrapper.find('.header-badge.permission');
      expect(badge.text()).toContain('Can edit');
    });

    it('should display "Full access" permission badge for FULL_ACCESS level', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'FULL_ACCESS', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      const badge = wrapper.find('.header-badge.permission');
      expect(badge.text()).toContain('Full access');
    });

    it('should show edit notice when permission level is EDIT', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'EDIT', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.edit-notice').exists()).toBe(true);
      expect(wrapper.find('.edit-notice').text()).toContain('You can edit this page');
    });

    it('should show edit notice when permission level is FULL_ACCESS', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'FULL_ACCESS', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.edit-notice').exists()).toBe(true);
    });

    it('should not show edit notice when permission level is VIEW', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'VIEW', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.edit-notice').exists()).toBe(false);
    });

    it('should add "editable" class to article body when user can edit', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'EDIT', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.article-body').classes()).toContain('editable');
    });

    it('should not add "editable" class to article body when VIEW permission', async () => {
      mockApi.get.mockResolvedValue({
        page: makeSharedPage({ permission: { level: 'VIEW', expiresAt: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.article-body').classes()).not.toContain('editable');
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('should show "Page not found" error for PAGE_NOT_FOUND code', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('PAGE_NOT_FOUND', 'Not found'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-error.not-found').exists()).toBe(true);
      expect(wrapper.find('.error-title').text()).toBe('Page not found');
    });

    it('should show "Invalid share link" error for INVALID_SHARE_TOKEN code', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('INVALID_SHARE_TOKEN', 'Invalid token'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-error.not-found').exists()).toBe(true);
      expect(wrapper.find('.error-title').text()).toBe('Invalid share link');
    });

    it('should show "Link expired" error for SHARE_TOKEN_EXPIRED code', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('SHARE_TOKEN_EXPIRED', 'Token expired'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-error.expired').exists()).toBe(true);
      expect(wrapper.find('.error-title').text()).toBe('Link expired');
    });

    it('should show generic error for other ApiError codes', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('SERVER_ERROR', 'Internal error occurred'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.error-title').text()).toBe('Internal error occurred');
    });

    it('should show generic error for non-ApiError exceptions', async () => {
      mockApi.get.mockRejectedValue(new Error('Network failure'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.error-title').text()).toBe('Failed to load page');
    });

    it('should show retry button for generic errors', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('SERVER_ERROR', 'Something went wrong'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.retry-btn').exists()).toBe(true);
      expect(wrapper.find('.retry-btn').text()).toContain('Try again');
    });

    it('should reload page when retry button is clicked', async () => {
      mockApi.get.mockRejectedValueOnce(new MockApiError('SERVER_ERROR', 'Something went wrong'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.retry-btn').exists()).toBe(true);

      // Now make next call succeed
      mockApi.get.mockResolvedValue({ page: makeSharedPage() });
      await wrapper.find('.retry-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.article-title').text()).toBe('Shared Test Page');
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    it('should show "Go to LibreDiary" link for expired errors', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('SHARE_TOKEN_EXPIRED', 'Expired'));

      const wrapper = mountPage();
      await flushPromises();

      const homeLink = wrapper.find('.home-link');
      expect(homeLink.exists()).toBe(true);
      expect(homeLink.text()).toContain('Go to LibreDiary');
    });

    it('should hide loading state after an error', async () => {
      mockApi.get.mockRejectedValue(new Error('fail'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-loading').exists()).toBe(false);
    });
  });

  // =========================================================================
  // Footer
  // =========================================================================

  describe('footer', () => {
    it('should display footer with "Shared via LibreDiary"', async () => {
      mockApi.get.mockResolvedValue({ page: makeSharedPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.share-footer').text()).toContain('Shared via');
      expect(wrapper.find('.share-footer').text()).toContain('LibreDiary');
    });
  });
});
