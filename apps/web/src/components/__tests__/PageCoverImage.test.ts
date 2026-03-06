import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PageCoverImage from '../PageCoverImage.vue';
import { usePagesStore } from '@/stores/pages';
import { useAuthStore } from '@/stores/auth';

// Mock the toast composable
const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => mockToast,
}));

// Mock filesService
const mockFilesService = vi.hoisted(() => ({
  uploadFile: vi.fn(),
}));

vi.mock('@/services/files.service', () => ({
  filesService: mockFilesService,
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
          isEncrypted: false,
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

  function mountComponent(coverUrl: string | null = null, pageId = 'page-1', orgId = 'org-1') {
    return mount(PageCoverImage, {
      props: { coverUrl, pageId, orgId },
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

  describe('file upload', () => {
    it('has a hidden file input with accept="image/*"', () => {
      const wrapper = mountComponent(null);
      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('accept')).toBe('image/*');
    });

    it('triggers file input when "Add cover" is clicked', async () => {
      const wrapper = mountComponent(null);
      const fileInput = wrapper.find('input[type="file"]');
      const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, 'click');

      await wrapper.find('.add-cover-btn').trigger('click');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('triggers file input when "Change cover" is clicked', async () => {
      const wrapper = mountComponent('https://example.com/cover.jpg');
      const fileInput = wrapper.find('input[type="file"]');
      const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, 'click');

      await wrapper.find('.change-cover-btn').trigger('click');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('calls filesService.uploadFile with orgId and selected file', async () => {
      const testFile = new File(['image-data'], 'cover.jpg', { type: 'image/jpeg' });
      mockFilesService.uploadFile.mockResolvedValue({
        file: { url: 'https://cdn.example.com/uploaded-cover.jpg' },
      });

      setupStores();
      const wrapper = mountComponent(null);

      const fileInput = wrapper.find('input[type="file"]');
      // Simulate file selection
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(mockFilesService.uploadFile).toHaveBeenCalledWith(
        'org-1',
        testFile,
        {},
        expect.any(Function)
      );
    });

    it('calls pagesStore.updatePageData with returned file URL', async () => {
      const testFile = new File(['image-data'], 'cover.jpg', { type: 'image/jpeg' });
      mockFilesService.uploadFile.mockResolvedValue({
        file: { url: 'https://cdn.example.com/uploaded-cover.jpg' },
      });

      const { pagesStore } = setupStores();
      const wrapper = mountComponent(null);

      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(pagesStore.updatePageData).toHaveBeenCalledWith('page-1', {
        coverUrl: 'https://cdn.example.com/uploaded-cover.jpg',
      });
    });

    it('emits update after successful upload', async () => {
      const testFile = new File(['image-data'], 'cover.jpg', { type: 'image/jpeg' });
      mockFilesService.uploadFile.mockResolvedValue({
        file: { url: 'https://cdn.example.com/uploaded-cover.jpg' },
      });

      setupStores();
      const wrapper = mountComponent(null);

      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(wrapper.emitted('update')).toBeTruthy();
    });

    it('shows uploading state during upload', async () => {
      let resolveUpload: (value: { file: { url: string } }) => void;
      mockFilesService.uploadFile.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve;
          })
      );

      const testFile = new File(['image-data'], 'cover.jpg', { type: 'image/jpeg' });
      setupStores();
      const wrapper = mountComponent(null);

      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      // Should show uploading indicator
      expect(wrapper.find('.cover-upload-progress').exists()).toBe(true);

      // Resolve upload
      resolveUpload!({ file: { url: 'https://cdn.example.com/cover.jpg' } });
      await flushPromises();
    });

    it('shows error toast when upload fails', async () => {
      const testFile = new File(['image-data'], 'cover.jpg', { type: 'image/jpeg' });
      mockFilesService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      setupStores();
      const wrapper = mountComponent(null);

      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload cover image');
    });

    it('shows error toast when page update fails', async () => {
      const testFile = new File(['image-data'], 'cover.jpg', { type: 'image/jpeg' });
      mockFilesService.uploadFile.mockResolvedValue({
        file: { url: 'https://cdn.example.com/uploaded-cover.jpg' },
      });

      const { pagesStore } = setupStores();
      (pagesStore.updatePageData as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Update failed')
      );
      const wrapper = mountComponent(null);

      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(mockToast.error).toHaveBeenCalledWith('Failed to update cover image');
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

    it('file input is visually hidden', () => {
      const wrapper = mountComponent(null);
      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      // Check it has the sr-only/hidden class
      expect(fileInput.classes()).toContain('sr-only');
    });
  });
});
