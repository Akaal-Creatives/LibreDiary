import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const { mockAuthService, mockTheme } = vi.hoisted(() => ({
  mockAuthService: {
    forgotPassword: vi.fn(),
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

import ForgotPasswordPage from '../ForgotPasswordPage.vue';
import { ApiError } from '@/services';

function mountPage() {
  return mount(ForgotPasswordPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.forgotPassword.mockReset();
  });

  it('renders the forgot password form', () => {
    const wrapper = mountPage();

    expect(wrapper.find('h1').text()).toBe('Forgot password?');
    expect(wrapper.find('#email').exists()).toBe(true);
    expect(wrapper.find('.submit-btn').text()).toBe('Send Reset Link');
  });

  it('shows success state after submitting email', async () => {
    mockAuthService.forgotPassword.mockResolvedValue({ message: 'Email sent' });
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('.forgot-form').trigger('submit');
    await flushPromises();

    expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(wrapper.find('.success-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('Check your email');
    expect(wrapper.text()).toContain('user@example.com');
  });

  it('displays API error when request fails', async () => {
    mockAuthService.forgotPassword.mockRejectedValue(new ApiError('User not found', 'NOT_FOUND'));
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('nobody@example.com');
    await wrapper.find('.forgot-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('User not found');
    expect(wrapper.find('.success-state').exists()).toBe(false);
  });

  it('displays generic error for unexpected exceptions', async () => {
    mockAuthService.forgotPassword.mockRejectedValue(new Error('Network failure'));
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('.forgot-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('An unexpected error occurred');
  });

  it('disables submit button while loading', async () => {
    mockAuthService.forgotPassword.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('.forgot-form').trigger('submit');

    expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined();
  });

  it('navigates to login when Back to Login link is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.find('.link-btn').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('navigates home when brand button is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.find('.brand').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('navigates home when back-link is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.find('.back-link').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('navigates to login from success state Back to Login button', async () => {
    mockAuthService.forgotPassword.mockResolvedValue({ message: 'sent' });
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('user@example.com');
    await wrapper.find('.forgot-form').trigger('submit');
    await flushPromises();

    await wrapper.find('.secondary-btn').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('calls toggleTheme when theme button is clicked', async () => {
    const wrapper = mountPage();

    await wrapper.find('.theme-toggle').trigger('click');

    expect(mockTheme.toggleTheme).toHaveBeenCalled();
  });
});
