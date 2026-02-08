import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const { mockAuthService, mockTheme } = vi.hoisted(() => ({
  mockAuthService: {
    resetPassword: vi.fn(),
  },
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
}));

vi.mock('@/services', () => ({
  authService: mockAuthService,
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

import ResetPasswordPage from '../ResetPasswordPage.vue';
import { ApiError } from '@/services';

function mountPage(token = 'reset-token-abc') {
  return mount(ResetPasswordPage, {
    props: { token },
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.resetPassword.mockReset();
  });

  it('renders the reset password form', () => {
    const wrapper = mountPage();

    expect(wrapper.find('h1').text()).toBe('Reset password');
    expect(wrapper.find('#password').exists()).toBe(true);
    expect(wrapper.find('#confirm-password').exists()).toBe(true);
    expect(wrapper.find('.submit-btn').text()).toBe('Reset Password');
  });

  it('shows error when passwords do not match', async () => {
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm-password').setValue('different456');
    await wrapper.find('.reset-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('Passwords do not match');
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
  });

  it('shows error when password is too short', async () => {
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('short');
    await wrapper.find('#confirm-password').setValue('short');
    await wrapper.find('.reset-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('at least 8 characters');
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
  });

  it('submits reset and shows success state', async () => {
    mockAuthService.resetPassword.mockResolvedValue({ message: 'Password reset' });
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm-password').setValue('newpassword123');
    await wrapper.find('.reset-form').trigger('submit');
    await flushPromises();

    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('reset-token-abc', 'newpassword123');
    expect(wrapper.find('.success-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Password reset!');
  });

  it('navigates to login from success state Sign In button', async () => {
    mockAuthService.resetPassword.mockResolvedValue({ message: 'ok' });
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm-password').setValue('newpassword123');
    await wrapper.find('.reset-form').trigger('submit');
    await flushPromises();

    await wrapper.find('.submit-btn').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('displays API error when reset fails', async () => {
    mockAuthService.resetPassword.mockRejectedValue(
      new ApiError('Token has expired', 'TOKEN_EXPIRED')
    );
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm-password').setValue('newpassword123');
    await wrapper.find('.reset-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('Token has expired');
    expect(wrapper.find('.success-state').exists()).toBe(false);
  });

  it('displays generic error for non-API exceptions', async () => {
    mockAuthService.resetPassword.mockRejectedValue(new Error('Connection lost'));
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm-password').setValue('newpassword123');
    await wrapper.find('.reset-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('Failed to reset password');
  });

  it('disables submit button while loading', async () => {
    mockAuthService.resetPassword.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm-password').setValue('newpassword123');
    await wrapper.find('.reset-form').trigger('submit');

    expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined();
  });

  it('navigates to login when Back to Login is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.find('.link-btn').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('navigates home when back-link is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.find('.back-link').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });
});
