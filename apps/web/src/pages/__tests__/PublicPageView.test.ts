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

// Stub the TiptapEditor component to avoid rendering the full editor
vi.mock('@/components/editor', () => ({
  TiptapEditor: {
    name: 'TiptapEditor',
    template: '<div class="stub-tiptap-editor" />',
    props: ['modelValue', 'editable'],
  },
}));

// Stub router-link to avoid vue-router dependency in this page component
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {} }),
}));

import PublicPageView from '../PublicPageView.vue';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makePublicPage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'page-1',
    title: 'My Public Page',
    htmlContent: '<p>Hello world</p>',
    isPublic: true,
    publicSlug: 'my-public-page',
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2024-06-20T14:30:00Z',
    createdBy: {
      id: 'user-1',
      name: 'Alice Smith',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

function mountPage(props: Record<string, unknown> = {}) {
  return mount(PublicPageView, {
    props: {
      slug: 'my-public-page',
      ...props,
    },
    global: {
      stubs: {
        Teleport: true,
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

describe('PublicPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error from the component's catch blocks
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // =========================================================================
  // Loading state
  // =========================================================================

  describe('loading state', () => {
    it('should show loading state when page is being fetched', async () => {
      mockApi.get.mockReturnValue(new Promise(() => {}));

      const wrapper = mountPage();
      // Do not flush promises so loading remains true
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.page-loading').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading page...');
    });
  });

  // =========================================================================
  // Successful rendering
  // =========================================================================

  describe('successful page load', () => {
    it('should display the page title', async () => {
      mockApi.get.mockResolvedValue({ page: makePublicPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.article-title').text()).toBe('My Public Page');
    });

    it('should display the author name', async () => {
      mockApi.get.mockResolvedValue({ page: makePublicPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.meta-author').text()).toContain('By Alice Smith');
    });

    it('should not display author section when createdBy is null', async () => {
      mockApi.get.mockResolvedValue({ page: makePublicPage({ createdBy: null }) });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.meta-author').exists()).toBe(false);
    });

    it('should not display author section when createdBy.name is null', async () => {
      mockApi.get.mockResolvedValue({
        page: makePublicPage({ createdBy: { id: 'u-1', name: null } }),
      });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.meta-author').exists()).toBe(false);
    });

    it('should display formatted date from updatedAt', async () => {
      mockApi.get.mockResolvedValue({ page: makePublicPage() });

      const wrapper = mountPage();
      await flushPromises();

      const dateText = wrapper.find('.meta-date').text();
      // Should contain "June" and "20" from the updatedAt date
      expect(dateText).toContain('June');
      expect(dateText).toContain('20');
    });

    it('should render the TiptapEditor stub with read-only content', async () => {
      mockApi.get.mockResolvedValue({
        page: makePublicPage({ htmlContent: '<p>Test content</p>' }),
      });

      const wrapper = mountPage();
      await flushPromises();

      const editor = wrapper.find('.stub-tiptap-editor');
      expect(editor.exists()).toBe(true);
    });

    it('should display "LibreDiary" brand in the header', async () => {
      mockApi.get.mockResolvedValue({ page: makePublicPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.brand-name').text()).toBe('LibreDiary');
    });

    it('should display "Public Page" badge in the header', async () => {
      mockApi.get.mockResolvedValue({ page: makePublicPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.header-badge').text()).toContain('Public Page');
    });

    it('should call the correct API endpoint using the slug prop', async () => {
      mockApi.get.mockResolvedValue({ page: makePublicPage() });

      mountPage({ slug: 'my-test-slug' });
      await flushPromises();

      expect(mockApi.get).toHaveBeenCalledWith('/public/pages/my-test-slug');
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('should display "Page not found" for PAGE_NOT_FOUND error code', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('PAGE_NOT_FOUND', 'Not found'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-error').exists()).toBe(true);
      expect(wrapper.find('.error-title').text()).toBe('Page not found');
    });

    it('should display "This page is no longer public" for PAGE_NOT_PUBLIC error code', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('PAGE_NOT_PUBLIC', 'Not public'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-error').exists()).toBe(true);
      expect(wrapper.find('.error-title').text()).toBe('This page is no longer public');
    });

    it('should display API error message for other ApiError codes', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('UNKNOWN_CODE', 'Something custom'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.error-title').text()).toBe('Something custom');
    });

    it('should display generic error for non-ApiError exceptions', async () => {
      mockApi.get.mockRejectedValue(new Error('Network failure'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.error-title').text()).toBe('Failed to load page');
    });

    it('should display a "Return home" link in the error state', async () => {
      mockApi.get.mockRejectedValue(new MockApiError('PAGE_NOT_FOUND', 'Not found'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.home-link').exists()).toBe(true);
      expect(wrapper.find('.home-link').text()).toContain('Return home');
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
      mockApi.get.mockResolvedValue({ page: makePublicPage() });

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.public-footer').text()).toContain('Shared via');
      expect(wrapper.find('.public-footer').text()).toContain('LibreDiary');
    });
  });
});
