import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const { mockSetupService, mockResetSetupStatus, mockTheme } = vi.hoisted(() => ({
  mockSetupService: {
    complete: vi.fn(),
  },
  mockResetSetupStatus: vi.fn(),
  mockTheme: {
    theme: 'light',
    toggleTheme: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/composables', () => ({
  useTheme: () => mockTheme,
  useLocale: () => ({ currentLocale: ref('en-GB'), setLocale: vi.fn() }),
}));

vi.mock('@/services', () => ({
  setupService: mockSetupService,
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('@/router', () => ({
  resetSetupStatus: mockResetSetupStatus,
}));

import SetupWizardPage from '../SetupWizardPage.vue';
import { ApiError } from '@/services';

function mountPage() {
  return mount(SetupWizardPage, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  });
}

describe('SetupWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetupService.complete.mockReset();
  });

  // ---- Step 1: Site Name ----

  it('renders step 1 with site name field by default', () => {
    const wrapper = mountPage();

    expect(wrapper.find('h2').text()).toContain('Name your workspace');
    expect(wrapper.find('#siteName').exists()).toBe(true);
    // Default value should be LibreDiary
    expect((wrapper.find('#siteName').element as HTMLInputElement).value).toBe('LibreDiary');
  });

  it('shows progress steps with Site, Admin, Organization labels', () => {
    const wrapper = mountPage();

    const stepLabels = wrapper.findAll('.step-label');
    expect(stepLabels.map((s) => s.text())).toEqual(['Site', 'Admin', 'Organisation']);
  });

  it('disables Continue button when site name is empty', async () => {
    const wrapper = mountPage();

    await wrapper.find('#siteName').setValue('');

    const continueBtn = wrapper.find('.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeDefined();
  });

  it('advances to step 2 when Continue is clicked with valid site name', async () => {
    const wrapper = mountPage();

    await wrapper.find('#siteName').setValue('My Workspace');
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.find('h2').text()).toContain('Create your admin account');
  });

  // ---- Step 2: Admin Account ----

  it('renders step 2 with admin account fields', async () => {
    const wrapper = mountPage();

    // Advance to step 2
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.find('#adminName').exists()).toBe(true);
    expect(wrapper.find('#adminEmail').exists()).toBe(true);
    expect(wrapper.find('#adminPassword').exists()).toBe(true);
    expect(wrapper.find('#adminPasswordConfirm').exists()).toBe(true);
  });

  it('disables Continue on step 2 when email is invalid', async () => {
    const wrapper = mountPage();
    await wrapper.find('.btn-primary').trigger('click');

    await wrapper.find('#adminEmail').setValue('not-an-email');
    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('password123');

    const continueBtn = wrapper.find('.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeDefined();
  });

  it('disables Continue on step 2 when passwords do not match', async () => {
    const wrapper = mountPage();
    await wrapper.find('.btn-primary').trigger('click');

    await wrapper.find('#adminEmail').setValue('admin@example.com');
    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('different');

    const continueBtn = wrapper.find('.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeDefined();
  });

  it('shows password mismatch message when confirm differs', async () => {
    const wrapper = mountPage();
    await wrapper.find('.btn-primary').trigger('click');

    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('different');

    expect(wrapper.find('.field-error').text()).toContain("Passwords don't match");
  });

  it('shows password strength indicator', async () => {
    const wrapper = mountPage();
    await wrapper.find('.btn-primary').trigger('click');

    await wrapper.find('#adminPassword').setValue('Ab1!secure99');

    expect(wrapper.find('.password-strength').exists()).toBe(true);
    expect(wrapper.find('.strength-label').text()).not.toBe('');
  });

  it('navigates back to step 1 when Back button is clicked on step 2', async () => {
    const wrapper = mountPage();

    // Go to step 2
    await wrapper.find('.btn-primary').trigger('click');
    expect(wrapper.find('h2').text()).toContain('admin account');

    // Go back
    await wrapper.find('.btn-secondary').trigger('click');
    expect(wrapper.find('h2').text()).toContain('Name your workspace');
  });

  // ---- Step 3: Organisation ----

  it('advances to step 3 and shows organisation fields', async () => {
    const wrapper = mountPage();

    // Step 1 -> 2
    await wrapper.find('.btn-primary').trigger('click');

    // Fill step 2
    await wrapper.find('#adminEmail').setValue('admin@example.com');
    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('password123');

    // Step 2 -> 3
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.find('h2').text()).toContain('Create your first organisation');
    expect(wrapper.find('#orgName').exists()).toBe(true);
    expect(wrapper.find('#orgSlug').exists()).toBe(true);
  });

  it('auto-generates slug from organisation name', async () => {
    const wrapper = mountPage();

    // Advance to step 3
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('#adminEmail').setValue('admin@example.com');
    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('password123');
    await wrapper.find('.btn-primary').trigger('click');

    await wrapper.find('#orgName').setValue('Acme Corp');

    expect((wrapper.find('#orgSlug').element as HTMLInputElement).value).toBe('acme-corp');
  });

  // ---- Complete Setup ----

  it('completes setup and shows success step', async () => {
    mockSetupService.complete.mockResolvedValue({
      user: { id: 'u1', email: 'admin@example.com', name: 'Admin', isSuperAdmin: true },
      organization: { id: 'o1', name: 'Acme Corp', slug: 'acme-corp' },
    });

    const wrapper = mountPage();

    // Step 1 -> 2
    await wrapper.find('#siteName').setValue('My Site');
    await wrapper.find('.btn-primary').trigger('click');

    // Step 2 -> 3
    await wrapper.find('#adminEmail').setValue('admin@example.com');
    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('password123');
    await wrapper.find('.btn-primary').trigger('click');

    // Fill step 3 and submit
    await wrapper.find('#orgName').setValue('Acme Corp');
    // Wait for the slug to auto-generate
    await flushPromises();

    await wrapper.find('.btn-primary').trigger('click');
    await flushPromises();

    expect(mockSetupService.complete).toHaveBeenCalledWith({
      siteName: 'My Site',
      admin: {
        email: 'admin@example.com',
        password: 'password123',
        name: undefined,
      },
      organization: {
        name: 'Acme Corp',
        slug: 'acme-corp',
      },
    });

    expect(mockResetSetupStatus).toHaveBeenCalled();
    expect(wrapper.text()).toContain("You're all set!");
    expect(wrapper.text()).toContain('admin@example.com');
    expect(wrapper.text()).toContain('Acme Corp');
  });

  it('shows error when setup fails with API error', async () => {
    mockSetupService.complete.mockRejectedValue(
      new ApiError('Email already registered', 'DUPLICATE')
    );

    const wrapper = mountPage();

    // Navigate through to step 3
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('#adminEmail').setValue('admin@example.com');
    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('password123');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('#orgName').setValue('Acme');
    await flushPromises();

    await wrapper.find('.btn-primary').trigger('click');
    await flushPromises();

    expect(wrapper.find('.error-banner').text()).toContain('Email already registered');
  });

  it('navigates to login from success step', async () => {
    mockSetupService.complete.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: null, isSuperAdmin: true },
      organization: { id: 'o1', name: 'Org', slug: 'org' },
    });

    const wrapper = mountPage();

    // Navigate through all steps
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('#adminEmail').setValue('a@b.com');
    await wrapper.find('#adminPassword').setValue('password123');
    await wrapper.find('#adminPasswordConfirm').setValue('password123');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('#orgName').setValue('Org');
    await flushPromises();
    await wrapper.find('.btn-primary').trigger('click');
    await flushPromises();

    // Click Sign In button on success step
    await wrapper.find('.btn-primary').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('renders developer attribution in footer', () => {
    const wrapper = mountPage();

    expect(wrapper.find('.setup-footer').text()).toContain('Akaal Creatives');
  });
});
