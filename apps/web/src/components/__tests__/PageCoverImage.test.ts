import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PageCoverImage from '../PageCoverImage.vue';
import { usePagesStore } from '@/stores/pages';
import { useAuthStore } from '@/stores/auth';

// Mock the toast composable
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('PageCoverImage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');
    setupStores();
  });

  function setupStores() {
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      emailVerified: true,
      isSuperAdmin: false,
      locale: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl: null,
    });
    authStore.setOrganizations(
      [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          logoUrl: null,
          accentColor: null,
          allowedDomains: [],
          aiEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [{ organizationId: 'org-1', role: 'OWNER' }]
    );

    const pagesStore = usePagesStore();
    pagesStore.updatePageData = vi.fn().mockResolvedValue({});

    return { authStore, pagesStore };
  }

  function mountComponent(coverUrl: string | null = null, pageId = 'page-1') {
    return mount(PageCoverImage, {
      props: { coverUrl, pageId },
      global: {
        stubs: { teleport: true },
      },
    });
  }

  describe('when no cover image', () => {
    it('does not show cover image container', () => {
      const wrapper = mountComponent(null);
      expect(wrapper.find('.cover-image').exists()).toBe(false);
    });

    it('shows add cover button on hover area', () => {
      const wrapper = mountComponent(null);
      expect(wrapper.find('.add-cover-btn').exists()).toBe(true);
    });

    it('shows "Add cover" text', () => {
      const wrapper = mountComponent(null);
      expect(wrapper.text()).toContain('Add cover');
    });
  });

  describe('when cover image exists', () => {
    const testCoverUrl = 'https://example.com/cover.jpg';

    it('shows cover image container', () => {
      const wrapper = mountComponent(testCoverUrl);
      expect(wrapper.find('.cover-image').exists()).toBe(true);
    });

    it('displays cover image with correct URL', () => {
      const wrapper = mountComponent(testCoverUrl);
      const coverDiv = wrapper.find('.cover-image');
      expect(coverDiv.attributes('style')).toContain(testCoverUrl);
    });

    it('shows change and remove buttons on hover', () => {
      const wrapper = mountComponent(testCoverUrl);
      expect(wrapper.find('.cover-actions').exists()).toBe(true);
      expect(wrapper.text()).toContain('Change cover');
      expect(wrapper.text()).toContain('Remove');
    });
  });

  describe('URL input modal', () => {
    it('opens modal when Add cover is clicked', async () => {
      const wrapper = mountComponent(null);
      await wrapper.find('.add-cover-btn').trigger('click');
      expect(wrapper.find('.cover-modal').exists()).toBe(true);
    });

    it('opens modal when Change cover is clicked', async () => {
      const wrapper = mountComponent('https://example.com/cover.jpg');
      await wrapper.find('.change-cover-btn').trigger('click');
      expect(wrapper.find('.cover-modal').exists()).toBe(true);
    });

    it('has URL input field', async () => {
      const wrapper = mountComponent(null);
      await wrapper.find('.add-cover-btn').trigger('click');
      expect(wrapper.find('input[type="url"]').exists()).toBe(true);
    });

    it('closes modal on cancel', async () => {
      const wrapper = mountComponent(null);
      await wrapper.find('.add-cover-btn').trigger('click');
      expect(wrapper.find('.cover-modal').exists()).toBe(true);

      await wrapper.find('.cancel-btn').trigger('click');
      expect(wrapper.find('.cover-modal').exists()).toBe(false);
    });

    it('calls updatePageData when submitting URL', async () => {
      const { pagesStore } = setupStores();
      const wrapper = mountComponent(null);

      await wrapper.find('.add-cover-btn').trigger('click');
      await wrapper.find('input[type="url"]').setValue('https://example.com/new-cover.jpg');
      await wrapper.find('.submit-btn').trigger('click');
      await flushPromises();

      expect(pagesStore.updatePageData).toHaveBeenCalledWith('page-1', {
        coverUrl: 'https://example.com/new-cover.jpg',
      });
    });

    it('shows error for invalid URL', async () => {
      const wrapper = mountComponent(null);

      await wrapper.find('.add-cover-btn').trigger('click');
      await wrapper.find('input[type="url"]').setValue('not-a-valid-url');
      await wrapper.find('.submit-btn').trigger('click');

      expect(wrapper.text()).toContain('enter a valid URL');
    });

    it('pre-fills input with current cover URL when changing', async () => {
      const currentUrl = 'https://example.com/current.jpg';
      const wrapper = mountComponent(currentUrl);

      await wrapper.find('.change-cover-btn').trigger('click');

      const input = wrapper.find('input[type="url"]');
      expect((input.element as HTMLInputElement).value).toBe(currentUrl);
    });
  });

  describe('remove cover', () => {
    it('calls updatePageData with null when removing', async () => {
      const { pagesStore } = setupStores();
      const wrapper = mountComponent('https://example.com/cover.jpg');

      await wrapper.find('.remove-cover-btn').trigger('click');
      await flushPromises();

      expect(pagesStore.updatePageData).toHaveBeenCalledWith('page-1', {
        coverUrl: null,
      });
    });

    it('emits update event after removing', async () => {
      const wrapper = mountComponent('https://example.com/cover.jpg');
      await wrapper.find('.remove-cover-btn').trigger('click');
      await flushPromises();

      expect(wrapper.emitted('update')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('add cover button has aria-label', () => {
      const wrapper = mountComponent(null);
      expect(wrapper.find('.add-cover-btn').attributes('aria-label')).toBe('Add cover image');
    });

    it('remove button has aria-label', () => {
      const wrapper = mountComponent('https://example.com/cover.jpg');
      expect(wrapper.find('.remove-cover-btn').attributes('aria-label')).toBe('Remove cover image');
    });

    it('modal has proper dialog role', async () => {
      const wrapper = mountComponent(null);
      await wrapper.find('.add-cover-btn').trigger('click');

      const modal = wrapper.find('.cover-modal');
      expect(modal.attributes('role')).toBe('dialog');
      expect(modal.attributes('aria-modal')).toBe('true');
    });
  });
});
