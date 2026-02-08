import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const { mockAuthStore, mockTheme } = vi.hoisted(() => ({
  mockAuthStore: {
    verifyEmail: vi.fn(),
    isAuthenticated: false,
  },
  mockTheme: {
    theme: 'light',
    toggleTheme: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
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
    constructor(message: string, code = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

import VerifyEmailPage from '../VerifyEmailPage.vue';
import { ApiError } from '@/services';

function mountPage(token = 'verify-token-123') {
  return mount(VerifyEmailPage, {
    props: { token },
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockAuthStore.verifyEmail.mockReset();
    mockAuthStore.isAuthenticated = false;
  });

  it('shows loading state initially while verifying', () => {
    mockAuthStore.verifyEmail.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();

    expect(wrapper.find('.loading-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Verifying your email');
  });

  it('shows success state after successful verification', async () => {
    mockAuthStore.verifyEmail.mockResolvedValue(undefined);
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.success-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Email verified!');
  });

  it('shows Sign In button when not authenticated after success', async () => {
    mockAuthStore.verifyEmail.mockResolvedValue(undefined);
    mockAuthStore.isAuthenticated = false;
    const wrapper = mountPage();
    await flushPromises();

    const button = wrapper.find('.success-state .submit-btn');
    expect(button.text()).toBe('Sign In');

    await button.trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('shows Go to App button when authenticated after success', async () => {
    mockAuthStore.verifyEmail.mockResolvedValue(undefined);
    mockAuthStore.isAuthenticated = true;
    const wrapper = mountPage();
    await flushPromises();

    const button = wrapper.find('.success-state .submit-btn');
    expect(button.text()).toBe('Go to App');

    await button.trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/app');
  });

  it('shows error state when verification fails with API error', async () => {
    mockAuthStore.verifyEmail.mockRejectedValue(
      new ApiError('Token is invalid or expired', 'INVALID_TOKEN')
    );
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.error-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Verification failed');
    expect(wrapper.text()).toContain('Token is invalid or expired');
  });

  it('shows generic error for non-API exceptions', async () => {
    mockAuthStore.verifyEmail.mockRejectedValue(new Error('Network error'));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.error-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to verify email');
  });

  it('shows Go to Login button on error state when not authenticated', async () => {
    mockAuthStore.verifyEmail.mockRejectedValue(new Error('fail'));
    mockAuthStore.isAuthenticated = false;
    const wrapper = mountPage();
    await flushPromises();

    const button = wrapper.find('.error-state .secondary-btn');
    expect(button.text()).toBe('Go to Login');

    await button.trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('shows Go to App button on error state when authenticated', async () => {
    mockAuthStore.verifyEmail.mockRejectedValue(new Error('fail'));
    mockAuthStore.isAuthenticated = true;
    const wrapper = mountPage();
    await flushPromises();

    const button = wrapper.find('.error-state .secondary-btn');
    expect(button.text()).toBe('Go to App');

    await button.trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/app');
  });

  it('navigates home when brand button is clicked', async () => {
    mockAuthStore.verifyEmail.mockResolvedValue(undefined);
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('.brand').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('passes the token prop to verifyEmail', async () => {
    mockAuthStore.verifyEmail.mockResolvedValue(undefined);
    mountPage('custom-token-xyz');
    await flushPromises();

    expect(mockAuthStore.verifyEmail).toHaveBeenCalledWith('custom-token-xyz');
  });
});
