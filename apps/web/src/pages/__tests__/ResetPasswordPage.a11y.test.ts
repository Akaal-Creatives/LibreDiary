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

function mountPage(token = 'test-token') {
  return mount(ResetPasswordPage, {
    props: { token },
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('ResetPasswordPage accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('password inputs have label associations', () => {
    const wrapper = mountPage();
    const pwLabel = wrapper.find('label[for="password"]');
    const pwInput = wrapper.find('#password');
    const confirmLabel = wrapper.find('label[for="confirm-password"]');
    const confirmInput = wrapper.find('#confirm-password');

    expect(pwLabel.exists()).toBe(true);
    expect(pwInput.exists()).toBe(true);
    expect(confirmLabel.exists()).toBe(true);
    expect(confirmInput.exists()).toBe(true);
  });

  it('theme toggle button has aria-label', () => {
    const wrapper = mountPage();
    const themeBtn = wrapper.find('.auth-layout__theme-toggle');
    expect(themeBtn.attributes('aria-label')).toBeTruthy();
  });

  it('sets aria-invalid on password inputs when error occurs', async () => {
    const wrapper = mountPage();

    // Trigger password mismatch error
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm-password').setValue('differentpw');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('#password').attributes('aria-invalid')).toBe('true');
    expect(wrapper.find('#confirm-password').attributes('aria-invalid')).toBe('true');
  });

  it('error message has role="alert" and aria-live', async () => {
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm-password').setValue('different');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const errorDiv = wrapper.find('#reset-password-error');
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.attributes('role')).toBe('alert');
    expect(errorDiv.attributes('aria-live')).toBe('polite');
  });

  it('password inputs have aria-describedby pointing to error when visible', async () => {
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm-password').setValue('different');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('#password').attributes('aria-describedby')).toBe('reset-password-error');
    expect(wrapper.find('#confirm-password').attributes('aria-describedby')).toBe(
      'reset-password-error'
    );
  });

  it('success state has role="alert" for screen reader announcement', async () => {
    mockAuthService.resetPassword.mockResolvedValue({});
    const wrapper = mountPage();

    await wrapper.find('#password').setValue('newpassword123');
    await wrapper.find('#confirm-password').setValue('newpassword123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const successState = wrapper.find('.success-state');
    expect(successState.exists()).toBe(true);
    expect(successState.attributes('role')).toBe('alert');
  });
});
