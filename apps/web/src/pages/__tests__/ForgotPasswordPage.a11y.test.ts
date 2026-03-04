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

describe('ForgotPasswordPage accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('email input has a label association', () => {
    const wrapper = mountPage();
    const label = wrapper.find('label[for="email"]');
    const input = wrapper.find('#email');
    expect(label.exists()).toBe(true);
    expect(input.exists()).toBe(true);
  });

  it('theme toggle button has aria-label', () => {
    const wrapper = mountPage();
    const themeBtn = wrapper.find('.auth-layout__theme-toggle');
    expect(themeBtn.attributes('aria-label')).toBeTruthy();
  });

  it('sets aria-invalid on email input when error is shown', async () => {
    mockAuthService.forgotPassword.mockRejectedValue(new ApiError('Invalid email'));
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('bad@email.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('#email').attributes('aria-invalid')).toBe('true');
  });

  it('error message has role="alert" and aria-live', async () => {
    mockAuthService.forgotPassword.mockRejectedValue(new ApiError('Something went wrong'));
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('test@test.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const errorDiv = wrapper.find('#forgot-password-error');
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.attributes('role')).toBe('alert');
    expect(errorDiv.attributes('aria-live')).toBe('polite');
  });

  it('email input has aria-describedby pointing to error when visible', async () => {
    mockAuthService.forgotPassword.mockRejectedValue(new ApiError('Error occurred'));
    const wrapper = mountPage();

    await wrapper.find('#email').setValue('test@test.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('#email').attributes('aria-describedby')).toBe('forgot-password-error');
  });
});
