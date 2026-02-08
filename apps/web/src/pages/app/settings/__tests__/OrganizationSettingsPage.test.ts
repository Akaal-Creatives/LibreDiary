import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

const { mockAuthStore, mockOrgsStore } = vi.hoisted(() => ({
  mockAuthStore: {
    user: { id: 'user-1', name: 'Test User' } as any,
    currentOrganizationId: 'org-1',
    currentOrganization: {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      allowedDomains: ['example.com'],
      aiEnabled: true,
      accentColor: '#3b82f6',
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
      expect(wrapper.find('.org-avatar').text()).toBe('T');
      expect(wrapper.find('.org-name').text()).toBe('Test Org');
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
