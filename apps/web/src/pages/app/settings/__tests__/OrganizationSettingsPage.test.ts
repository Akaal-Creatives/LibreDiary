import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => mockToast,
}));

const mockFilesService = vi.hoisted(() => ({
  uploadFile: vi.fn(),
}));

vi.mock('@/services/files.service', () => ({
  filesService: mockFilesService,
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

const { mockAuthStore, mockOrgsStore } = vi.hoisted(() => ({
  mockAuthStore: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: { id: 'user-1', name: 'Test User' } as any,
    currentOrganizationId: 'org-1',
    currentOrganization: {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      allowedDomains: ['example.com'],
      aiEnabled: true,
      accentColor: '#3b82f6',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  },
  mockOrgsStore: {
    isOwner: false,
    isAdmin: false,
    canManageSettings: false,
    fetchOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
  },
}));

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStore,
}));

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => mockOrgsStore,
}));

vi.mock('@/services', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import OrganizationSettingsPage from '../OrganizationSettingsPage.vue';

function mountPage() {
  return mount(OrganizationSettingsPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('OrganizationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset store defaults
    mockAuthStore.currentOrganizationId = 'org-1';
    mockAuthStore.currentOrganization = {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      logoUrl: null,
      allowedDomains: ['example.com'],
      aiEnabled: true,
      accentColor: '#3b82f6',
    };

    mockOrgsStore.isOwner = false;
    mockOrgsStore.isAdmin = false;
    mockOrgsStore.canManageSettings = false;

    mockOrgsStore.fetchOrganization.mockResolvedValue(undefined);
    mockOrgsStore.updateOrganization.mockResolvedValue(undefined);
    mockOrgsStore.deleteOrganization.mockResolvedValue(undefined);

    mockFilesService.uploadFile.mockReset();
  });

  // ---- Page Header ----

  describe('page header', () => {
    it('renders the page title "Settings"', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-title').text()).toBe('Settings');
    });

    it('renders the page description', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain(
        "Manage your organization's profile, security, and features"
      );
    });

    it('displays the organisation badge with name and initial', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.org-badge').exists()).toBe(true);
      expect(wrapper.find('.org-avatar').text()).toContain('T');
      expect(wrapper.find('.org-name').text()).toBe('Test Org');
    });

    it('shows logo image in org badge when logoUrl exists', async () => {
      mockAuthStore.currentOrganization = {
        ...mockAuthStore.currentOrganization,
        logoUrl: 'https://example.com/badge-logo.png',
      };
      const wrapper = mountPage();
      await flushPromises();

      const badgeLogo = wrapper.find('.org-avatar img');
      expect(badgeLogo.exists()).toBe(true);
      expect(badgeLogo.attributes('src')).toBe('https://example.com/badge-logo.png');
    });
  });

  // ---- Loading State ----

  describe('loading state', () => {
    it('shows loading state while settings are being fetched', () => {
      mockOrgsStore.fetchOrganization.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      const wrapper = mountPage();

      expect(wrapper.find('.loading-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading settings...');
    });

    it('hides loading state after settings load', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.loading-state').exists()).toBe(false);
    });
  });

  // ---- General Settings ----

  describe('general settings section', () => {
    it('displays the "General" section', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('General');
      expect(wrapper.text()).toContain('Basic organization information');
    });

    it('pre-fills the name field with organisation name', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const nameInput = wrapper.find('#org-name');
      expect((nameInput.element as HTMLInputElement).value).toBe('Test Org');
    });

    it('pre-fills the slug field with organisation slug', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const slugInput = wrapper.find('#org-slug');
      expect((slugInput.element as HTMLInputElement).value).toBe('test-org');
    });

    it('disables form fields when user cannot manage settings', async () => {
      mockOrgsStore.canManageSettings = false;
      const wrapper = mountPage();
      await flushPromises();

      const nameInput = wrapper.find('#org-name');
      expect((nameInput.element as HTMLInputElement).disabled).toBe(true);
    });

    it('enables form fields when user can manage settings', async () => {
      mockOrgsStore.canManageSettings = true;
      const wrapper = mountPage();
      await flushPromises();

      const nameInput = wrapper.find('#org-name');
      expect((nameInput.element as HTMLInputElement).disabled).toBe(false);
    });
  });

  // ---- Security Settings ----

  describe('security settings section', () => {
    it('shows security section only for owners', async () => {
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Security');
      expect(wrapper.text()).toContain('Control who can join your organization');
    });

    it('hides security section for non-owners', async () => {
      mockOrgsStore.isOwner = false;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).not.toContain('Email domain restriction');
    });

    it('pre-fills allowed domains from organisation data', async () => {
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      const domainsInput = wrapper.find('#allowed-domains');
      expect((domainsInput.element as HTMLInputElement).value).toBe('example.com');
    });
  });

  // ---- Features Settings ----

  describe('features settings section', () => {
    it('displays the "Features" section', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Features');
      expect(wrapper.text()).toContain('Enable or disable capabilities');
    });

    it('shows AI toggle with correct initial state', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const aiCheckbox = wrapper.find('#ai-enabled');
      expect((aiCheckbox.element as HTMLInputElement).checked).toBe(true);
    });

    it('shows the AI toggle description', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('AI-powered writing');
    });
  });

  // ---- Save Settings ----

  describe('save settings', () => {
    it('shows save button when user can manage settings', async () => {
      mockOrgsStore.canManageSettings = true;
      const wrapper = mountPage();
      await flushPromises();

      const saveBtn = wrapper.find('.btn--primary');
      expect(saveBtn.exists()).toBe(true);
      expect(saveBtn.text()).toContain('Save changes');
    });

    it('hides save button when user cannot manage settings', async () => {
      mockOrgsStore.canManageSettings = false;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.form-actions').exists()).toBe(false);
    });

    it('calls updateOrganization when form is submitted', async () => {
      mockOrgsStore.canManageSettings = true;
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.settings-form').trigger('submit');
      await flushPromises();

      expect(mockOrgsStore.updateOrganization).toHaveBeenCalledWith({
        name: 'Test Org',
        slug: 'test-org',
        allowedDomains: ['example.com'],
        aiEnabled: true,
      });
    });

    it('shows success notification after saving', async () => {
      mockOrgsStore.canManageSettings = true;
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.settings-form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.notification--success').exists()).toBe(true);
      expect(wrapper.text()).toContain('Settings saved successfully');
    });

    it('shows error notification when saving fails', async () => {
      mockOrgsStore.canManageSettings = true;
      mockOrgsStore.updateOrganization.mockRejectedValue(new Error('Server error'));
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.settings-form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.notification--error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to save settings');
    });

    it('parses comma-separated domains into an array', async () => {
      mockOrgsStore.canManageSettings = true;
      mockOrgsStore.isOwner = true;
      mockAuthStore.currentOrganization = {
        ...mockAuthStore.currentOrganization,
        allowedDomains: [],
      };
      const wrapper = mountPage();
      await flushPromises();

      const domainsInput = wrapper.find('#allowed-domains');
      await domainsInput.setValue('example.com, company.org, test.io');

      await wrapper.find('.settings-form').trigger('submit');
      await flushPromises();

      expect(mockOrgsStore.updateOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedDomains: ['example.com', 'company.org', 'test.io'],
        })
      );
    });
  });

  // ---- Logo Upload ----

  describe('logo upload', () => {
    it('shows "Logo" subsection in General settings', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Logo');
    });

    it('shows letter avatar placeholder when no logoUrl', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.logo-placeholder').exists()).toBe(true);
      expect(wrapper.find('.logo-placeholder').text()).toBe('T');
    });

    it('shows current logo image when org has logoUrl', async () => {
      mockAuthStore.currentOrganization = {
        ...mockAuthStore.currentOrganization,
        logoUrl: 'https://example.com/logo.png',
      };
      const wrapper = mountPage();
      await flushPromises();

      const logoImg = wrapper.find('.logo-preview img');
      expect(logoImg.exists()).toBe(true);
      expect(logoImg.attributes('src')).toBe('https://example.com/logo.png');
    });

    it('shows "Upload logo" button', async () => {
      mockOrgsStore.canManageSettings = true;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.logo-upload-btn').exists()).toBe(true);
      expect(wrapper.find('.logo-upload-btn').text()).toContain('Upload logo');
    });

    it('file input accepts image/*', async () => {
      mockOrgsStore.canManageSettings = true;
      const wrapper = mountPage();
      await flushPromises();

      const fileInput = wrapper.find('.logo-upload input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('accept')).toBe('image/*');
    });

    it('calls filesService.uploadFile with selected file', async () => {
      mockOrgsStore.canManageSettings = true;
      mockFilesService.uploadFile.mockResolvedValue({
        file: { url: 'https://cdn.example.com/logo.png' },
      });
      const wrapper = mountPage();
      await flushPromises();

      const testFile = new File(['logo-data'], 'logo.png', { type: 'image/png' });
      const fileInput = wrapper.find('.logo-upload input[type="file"]');
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

    it('calls orgsStore.updateOrganization with logoUrl after upload', async () => {
      mockOrgsStore.canManageSettings = true;
      mockFilesService.uploadFile.mockResolvedValue({
        file: { url: 'https://cdn.example.com/logo.png' },
      });
      const wrapper = mountPage();
      await flushPromises();

      const testFile = new File(['logo-data'], 'logo.png', { type: 'image/png' });
      const fileInput = wrapper.find('.logo-upload input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(mockOrgsStore.updateOrganization).toHaveBeenCalledWith({
        logoUrl: 'https://cdn.example.com/logo.png',
      });
    });

    it('shows progress indicator during upload', async () => {
      let resolveUpload: (value: { file: { url: string } }) => void;
      mockFilesService.uploadFile.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve;
          })
      );
      mockOrgsStore.canManageSettings = true;
      const wrapper = mountPage();
      await flushPromises();

      const testFile = new File(['logo-data'], 'logo.png', { type: 'image/png' });
      const fileInput = wrapper.find('.logo-upload input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(wrapper.find('.logo-progress').exists()).toBe(true);

      resolveUpload!({ file: { url: 'https://cdn.example.com/logo.png' } });
      await flushPromises();
    });

    it('shows "Remove logo" button when logo exists', async () => {
      mockOrgsStore.canManageSettings = true;
      mockAuthStore.currentOrganization = {
        ...mockAuthStore.currentOrganization,
        logoUrl: 'https://example.com/logo.png',
      };
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.logo-remove-btn').exists()).toBe(true);
      expect(wrapper.find('.logo-remove-btn').text()).toContain('Remove logo');
    });

    it('calls orgsStore.updateOrganization with null logoUrl when removing', async () => {
      mockOrgsStore.canManageSettings = true;
      mockAuthStore.currentOrganization = {
        ...mockAuthStore.currentOrganization,
        logoUrl: 'https://example.com/logo.png',
      };
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.logo-remove-btn').trigger('click');
      await flushPromises();

      expect(mockOrgsStore.updateOrganization).toHaveBeenCalledWith({
        logoUrl: null,
      });
    });

    it('shows error notification on upload failure', async () => {
      mockOrgsStore.canManageSettings = true;
      mockFilesService.uploadFile.mockRejectedValue(new Error('Upload failed'));
      const wrapper = mountPage();
      await flushPromises();

      const testFile = new File(['logo-data'], 'logo.png', { type: 'image/png' });
      const fileInput = wrapper.find('.logo-upload input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [testFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await flushPromises();

      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload logo');
    });

    it('disables upload when cannot manage settings', async () => {
      mockOrgsStore.canManageSettings = false;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.logo-upload-btn').exists()).toBe(false);
    });
  });

  // ---- Danger Zone ----

  describe('danger zone', () => {
    it('shows danger zone only for owners', async () => {
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.danger-zone').exists()).toBe(true);
      expect(wrapper.text()).toContain('Danger Zone');
      expect(wrapper.text()).toContain('Delete this organization');
    });

    it('hides danger zone for non-owners', async () => {
      mockOrgsStore.isOwner = false;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.danger-zone').exists()).toBe(false);
    });

    it('opens delete confirmation modal when delete button is clicked', async () => {
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      const deleteBtn = wrapper.find('.danger-card .btn--danger');
      await deleteBtn.trigger('click');

      expect(wrapper.find('.modal-backdrop').exists()).toBe(true);
      expect(wrapper.text()).toContain('Delete Organization');
    });

    it('requires typing the organisation name to enable the delete button', async () => {
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      // Open delete modal
      const deleteBtn = wrapper.find('.danger-card .btn--danger');
      await deleteBtn.trigger('click');

      // The confirm delete button should be disabled initially
      const confirmBtn = wrapper.find('.modal-footer .btn--danger');
      expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(true);

      // Type the correct organisation name
      const confirmInput = wrapper.find('.modal-body .field-input');
      await confirmInput.setValue('Test Org');

      // The confirm button should now be enabled
      expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(false);
    });

    it('calls deleteOrganization and navigates to dashboard on confirm', async () => {
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      // Open delete modal
      await wrapper.find('.danger-card .btn--danger').trigger('click');

      // Type org name and confirm
      const confirmInput = wrapper.find('.modal-body .field-input');
      await confirmInput.setValue('Test Org');

      await wrapper.find('.modal-footer .btn--danger').trigger('click');
      await flushPromises();

      expect(mockOrgsStore.deleteOrganization).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'dashboard' });
    });

    it('shows error when deletion fails', async () => {
      mockOrgsStore.isOwner = true;
      mockOrgsStore.deleteOrganization.mockRejectedValue(new Error('Cannot delete'));
      const wrapper = mountPage();
      await flushPromises();

      // Open delete modal
      await wrapper.find('.danger-card .btn--danger').trigger('click');

      // Type org name and confirm
      const confirmInput = wrapper.find('.modal-body .field-input');
      await confirmInput.setValue('Test Org');

      await wrapper.find('.modal-footer .btn--danger').trigger('click');
      await flushPromises();

      expect(wrapper.find('.notification--error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to delete organization');
    });

    it('can close the delete confirmation modal with the cancel button', async () => {
      mockOrgsStore.isOwner = true;
      const wrapper = mountPage();
      await flushPromises();

      // Open delete modal
      await wrapper.find('.danger-card .btn--danger').trigger('click');
      expect(wrapper.find('.modal-backdrop').exists()).toBe(true);

      // Click cancel
      await wrapper.find('.modal-footer .btn--ghost').trigger('click');
      expect(wrapper.find('.modal-backdrop').exists()).toBe(false);
    });
  });

  // ---- Data Loading ----

  describe('data loading', () => {
    it('fetches organisation on mount', async () => {
      mountPage();
      await flushPromises();

      expect(mockOrgsStore.fetchOrganization).toHaveBeenCalledTimes(1);
    });

    it('shows error when loading fails', async () => {
      mockOrgsStore.fetchOrganization.mockRejectedValue(new Error('Network error'));
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.notification--error').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load organization settings');
    });
  });
});
