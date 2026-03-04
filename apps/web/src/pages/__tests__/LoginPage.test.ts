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

// Stub child components that are not under test
vi.mock('@/components/OAuthButtons.vue', () => ({
  default: {
    name: 'OAuthButtons',
    template: '<div class="stub-oauth-buttons" />',
    props: ['mode', 'availableProviders', 'loadingProvider'],
    emits: ['click'],
  },
}));

vi.mock('@/components/AuthDivider.vue', () => ({
  default: {
    name: 'AuthDivider',
    template: '<div class="stub-auth-divider" />',
    props: ['text'],
  },
}));

import LoginPage from '../LoginPage.vue';
// Import the mocked ApiError so we can construct instances with correct prototype chain
import { ApiError } from '@/services';

function mountLogin() {
  return mount(LoginPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockRoute.query = {};
    mockAuthStore.login.mockReset();
    mockOauthService.getConfiguredProviders.mockResolvedValue([]);
    mockOauthService.initiateOAuth.mockReset();
  });

  it('renders login form with email and password fields', () => {
    const wrapper = mountLogin();

    expect(wrapper.find('h1').text()).toBe('Welcome back');
    expect(wrapper.find('#email').exists()).toBe(true);
    expect(wrapper.find('#password').exists()).toBe(true);
    expect(wrapper.find('.submit-btn').text()).toBe('Sign In');
  });

  it('navigates to /forgot-password when forgot link is clicked', async () => {
    const wrapper = mountLogin();

    await wrapper.find('.forgot-link').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/forgot-password');
  });

  it('submits login and navigates to /app on success', async () => {
    mockAuthStore.login.mockResolvedValue(undefined);
    const wrapper = mountLogin();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(mockAuthStore.login).toHaveBeenCalledWith('user@example.com', 'password123');
    expect(mockRouter.push).toHaveBeenCalledWith('/app');
  });

  it('redirects to query redirect param after successful login', async () => {
    mockRoute.query = { redirect: '/app/settings' };
    mockAuthStore.login.mockResolvedValue(undefined);
    const wrapper = mountLogin();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(mockRouter.push).toHaveBeenCalledWith('/app/settings');
  });

  it('displays error for invalid credentials (LOGIN_ERROR)', async () => {
    const apiError = new ApiError('Invalid', 'LOGIN_ERROR');
    mockAuthStore.login.mockRejectedValue(apiError);
    const wrapper = mountLogin();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('#password').setValue('wrongpw');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('Invalid email or password');
  });

  it('displays validation errors from API', async () => {
    const apiError = new ApiError('Validation failed', 'VALIDATION_ERROR', {
      email: ['Email is required'],
    });
    mockAuthStore.login.mockRejectedValue(apiError);
    const wrapper = mountLogin();

    await wrapper.find('#email').setValue('bad');
    await wrapper.find('#password').setValue('pw');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('email: Email is required');
  });

  it('displays generic error for unexpected exceptions', async () => {
    mockAuthStore.login.mockRejectedValue(new Error('Network down'));
    const wrapper = mountLogin();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('An unexpected error occurred');
  });

  it('disables submit button while loading', async () => {
    mockAuthStore.login.mockReturnValue(new Promise(() => {}));
    const wrapper = mountLogin();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('.auth-form').trigger('submit');

    // Button should be disabled while waiting
    expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined();
  });

  it('shows OAuth error from query param on mount', async () => {
    mockRoute.query = { error: 'OAuth provider rejected request' };
    const wrapper = mountLogin();
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('OAuth provider rejected request');
    expect(mockRouter.replace).toHaveBeenCalledWith({ query: {} });
  });
});
