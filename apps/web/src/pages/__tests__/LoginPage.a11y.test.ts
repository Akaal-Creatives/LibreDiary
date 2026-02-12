import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

const mockRoute = vi.hoisted(() => ({
  query: {} as Record<string, string>,
}));

const { mockAuthStore, mockOauthService, mockTheme } = vi.hoisted(() => ({
  mockAuthStore: {
    login: vi.fn(),
  },
  mockOauthService: {
    getConfiguredProviders: vi.fn().mockResolvedValue([]),
    initiateOAuth: vi.fn(),
  },
  mockTheme: {
    theme: 'light',
    toggleTheme: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute,
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

vi.mock('@/composables', () => ({
  useTheme: () => mockTheme,
}));

vi.mock('@/services', () => ({
  ApiError: class ApiError extends Error {
    code: string;
    details: unknown;
    constructor(message: string, code = 'UNKNOWN', details?: unknown) {
      super(message);
      this.code = code;
      this.details = details;
    }
  },
  oauthService: mockOauthService,
}));

vi.mock('@/components/OAuthButtons.vue', () => ({
  default: { template: '<div />' },
}));

vi.mock('@/components/AuthDivider.vue', () => ({
  default: { template: '<div />' },
}));

import LoginPage from '../LoginPage.vue';
import { ApiError } from '@/services';

function mountPage() {
  return mount(LoginPage, {
    global: { stubs: { Teleport: true } },
  });
}

describe('LoginPage Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('email input has a label association', () => {
    const wrapper = mountPage();

    const emailLabel = wrapper.find('label[for="email"]');
    const emailInput = wrapper.find('#email');

    expect(emailLabel.exists()).toBe(true);
    expect(emailInput.exists()).toBe(true);
  });

  it('password input has a label association', () => {
    const wrapper = mountPage();

    const passwordLabel = wrapper.find('label[for="password"]');
    const passwordInput = wrapper.find('#password');

    expect(passwordLabel.exists()).toBe(true);
    expect(passwordInput.exists()).toBe(true);
  });

  it('password toggle button has aria-label', () => {
    const wrapper = mountPage();

    const toggleButton = wrapper.find('.password-toggle-btn');

    expect(toggleButton.exists()).toBe(true);
    expect(toggleButton.attributes('aria-label')).toBeTruthy();
  });

  it('error message has role="alert" and aria-live', async () => {
    mockAuthStore.login.mockRejectedValue(new ApiError('Invalid credentials', 'LOGIN_ERROR'));

    const wrapper = mountPage();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const errorDiv = wrapper.find('[role="alert"]');

    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.attributes('role')).toBe('alert');
    expect(errorDiv.attributes('aria-live')).toBe('polite');
  });

  it('sets aria-invalid on inputs when error occurs', async () => {
    mockAuthStore.login.mockRejectedValue(new ApiError('Invalid credentials', 'LOGIN_ERROR'));

    const wrapper = mountPage();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const emailInput = wrapper.find('#email');
    const passwordInput = wrapper.find('#password');

    expect(emailInput.attributes('aria-invalid')).toBe('true');
    expect(passwordInput.attributes('aria-invalid')).toBe('true');
  });
});
