import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

const { mockOrgsStore } = vi.hoisted(() => ({
  mockOrgsStore: {
    createOrganization: vi.fn(),
  },
}));

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => mockOrgsStore,
}));

// Import ApiError separately so we can use the real class in throw assertions
const { MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
    }
  }
  return { MockApiError };
});

vi.mock('@/services', () => ({
  ApiError: MockApiError,
}));

import CreateOrganizationPage from '../CreateOrganizationPage.vue';

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

function mountPage() {
  return mount(CreateOrganizationPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateOrganizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockOrgsStore.createOrganization.mockReset();
  });

  // =========================================================================
  // Rendering
  // =========================================================================

  describe('rendering', () => {
    it('should render the page title and subtitle', () => {
      const wrapper = mountPage();

      expect(wrapper.find('.page-title').text()).toBe('Create Organisation');
      expect(wrapper.find('.page-subtitle').text()).toContain(
        'Create a new organisation to collaborate with your team.'
      );
    });

    it('should render name and slug form inputs', () => {
      const wrapper = mountPage();

      expect(wrapper.find('#org-name').exists()).toBe(true);
      expect(wrapper.find('#org-slug').exists()).toBe(true);
    });

    it('should render Cancel and Create Organization buttons', () => {
      const wrapper = mountPage();

      const buttons = wrapper.findAll('.btn');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].text()).toBe('Cancel');
      expect(buttons[1].text()).toBe('Create Organisation');
    });

    it('should display URL prefix with current host before the slug input', () => {
      const wrapper = mountPage();

      expect(wrapper.find('.input-prefix').text()).toBe(`${window.location.host}/`);
    });
  });

  // =========================================================================
  // Slug auto-generation
  // =========================================================================

  describe('slug auto-generation', () => {
    it('should auto-generate a slug from the organisation name on input', async () => {
      const wrapper = mountPage();
      const nameInput = wrapper.find('#org-name');

      await nameInput.setValue('My Cool Organization');
      await nameInput.trigger('input');

      const slugInput = wrapper.find('#org-slug');
      expect((slugInput.element as HTMLInputElement).value).toBe('my-cool-organization');
    });

    it('should strip special characters and collapse hyphens in the slug', async () => {
      const wrapper = mountPage();
      const nameInput = wrapper.find('#org-name');

      await nameInput.setValue('Hello!!  World---Test');
      await nameInput.trigger('input');

      const slugInput = wrapper.find('#org-slug');
      expect((slugInput.element as HTMLInputElement).value).toBe('hello-world-test');
    });

    it('should truncate slug to 50 characters', async () => {
      const wrapper = mountPage();
      const nameInput = wrapper.find('#org-name');

      const longName = 'a'.repeat(60);
      await nameInput.setValue(longName);
      await nameInput.trigger('input');

      const slugInput = wrapper.find('#org-slug');
      expect((slugInput.element as HTMLInputElement).value.length).toBeLessThanOrEqual(50);
    });
  });

  // =========================================================================
  // Validation
  // =========================================================================

  describe('validation', () => {
    it('should show an error when submitting with an empty name', async () => {
      const wrapper = mountPage();

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.find('.alert-error').text()).toBe('Organization name is required');
      expect(mockOrgsStore.createOrganization).not.toHaveBeenCalled();
    });

    it('should show an error when name contains only whitespace', async () => {
      const wrapper = mountPage();
      await wrapper.find('#org-name').setValue('   ');

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.find('.alert-error').text()).toBe('Organization name is required');
    });
  });

  // =========================================================================
  // Successful submission
  // =========================================================================

  describe('successful submission', () => {
    it('should call createOrganization with trimmed name and slug, then navigate to dashboard', async () => {
      mockOrgsStore.createOrganization.mockResolvedValue({ id: 'org-1', name: 'Test Org' });

      const wrapper = mountPage();
      await wrapper.find('#org-name').setValue('  Test Org  ');
      await wrapper.find('#org-name').trigger('input');
      // Slug will be auto-generated

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(mockOrgsStore.createOrganization).toHaveBeenCalledWith({
        name: 'Test Org',
        slug: 'test-org',
      });
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'dashboard' });
    });

    it('should show "Creating..." text on the submit button whilst loading', async () => {
      mockOrgsStore.createOrganization.mockReturnValue(new Promise(() => {}));

      const wrapper = mountPage();
      await wrapper.find('#org-name').setValue('Test Org');

      await wrapper.find('form').trigger('submit');
      // Do NOT flush promises so loading stays true
      await wrapper.vm.$nextTick();

      const submitBtn = wrapper.find('.btn-primary');
      expect(submitBtn.text()).toBe('Creating...');
    });

    it('should disable inputs and buttons whilst loading', async () => {
      mockOrgsStore.createOrganization.mockReturnValue(new Promise(() => {}));

      const wrapper = mountPage();
      await wrapper.find('#org-name').setValue('Test Org');

      await wrapper.find('form').trigger('submit');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('#org-name').attributes('disabled')).toBeDefined();
      expect(wrapper.find('#org-slug').attributes('disabled')).toBeDefined();
      expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined();
      expect(wrapper.find('.btn-secondary').attributes('disabled')).toBeDefined();
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('should display ApiError message when createOrganization throws ApiError', async () => {
      mockOrgsStore.createOrganization.mockRejectedValue(
        new MockApiError('SLUG_TAKEN', 'This slug is already in use')
      );

      const wrapper = mountPage();
      await wrapper.find('#org-name').setValue('Test Org');

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.find('.alert-error').text()).toBe('This slug is already in use');
    });

    it('should display generic error message when createOrganization throws a non-ApiError', async () => {
      mockOrgsStore.createOrganization.mockRejectedValue(new Error('Network failure'));

      const wrapper = mountPage();
      await wrapper.find('#org-name').setValue('Test Org');

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
      expect(wrapper.find('.alert-error').text()).toBe('Failed to create organization');
    });

    it('should re-enable the form after an error', async () => {
      mockOrgsStore.createOrganization.mockRejectedValue(new Error('fail'));

      const wrapper = mountPage();
      await wrapper.find('#org-name').setValue('Test Org');

      await wrapper.find('form').trigger('submit');
      await flushPromises();

      const submitBtn = wrapper.find('.btn-primary');
      expect(submitBtn.text()).toBe('Create Organisation');
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });
  });

  // =========================================================================
  // Cancel button
  // =========================================================================

  describe('cancel button', () => {
    it('should call router.back() when cancel button is clicked', async () => {
      const wrapper = mountPage();

      await wrapper.find('.btn-secondary').trigger('click');

      expect(mockRouter.back).toHaveBeenCalledOnce();
    });
  });
});
