import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const { mockAuthStore, mockAuthService, mockTheme } = vi.hoisted(() => ({
  mockAuthStore: {
    register: vi.fn(),
  },
  mockAuthService: {
    getInvite: vi.fn(),
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
  authService: mockAuthService,
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

import RegisterPage from '../RegisterPage.vue';
import { ApiError } from '@/services';

function mountRegister(token = 'valid-invite-token') {
  return mount(RegisterPage, {
    props: { token },
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockAuthService.getInvite.mockResolvedValue({
      email: 'invited@example.com',
      organization: { name: 'Test Org' },
    });
    mockAuthStore.register.mockReset();
  });

  it('shows loading state initially while fetching invite', () => {
    // Do not resolve the invite promise yet
    mockAuthService.getInvite.mockReturnValue(new Promise(() => {}));
    const wrapper = mountRegister();

    expect(wrapper.find('.state-container').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading invite');
  });

  it('displays registration form after invite loads successfully', async () => {
    const wrapper = mountRegister();
    await flushPromises();

    expect(wrapper.find('.state-container').exists()).toBe(false);
    expect(wrapper.find('h1').text()).toContain('Join Test Org');
    expect(wrapper.find('#email').element.value).toBe('invited@example.com');
  });

  it('shows invite error when invite token is invalid', async () => {
    mockAuthService.getInvite.mockRejectedValue(
      new ApiError('Invite has expired', 'INVITE_EXPIRED')
    );
    const wrapper = mountRegister('expired-token');
    await flushPromises();

    expect(wrapper.find('.state-container').exists()).toBe(true);
    expect(wrapper.text()).toContain('Invalid Invite');
    expect(wrapper.text()).toContain('Invite has expired');
  });

  it('shows generic invite error for non-API errors', async () => {
    mockAuthService.getInvite.mockRejectedValue(new Error('Network fail'));
    const wrapper = mountRegister();
    await flushPromises();

    expect(wrapper.find('.state-container').exists()).toBe(true);
    expect(wrapper.text()).toContain('Invalid or expired invite link');
  });

  it('navigates to login when Go to Login is clicked on error state', async () => {
    mockAuthService.getInvite.mockRejectedValue(new Error('fail'));
    const wrapper = mountRegister();
    await flushPromises();

    await wrapper.find('.secondary-btn').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('shows error when passwords do not match', async () => {
    const wrapper = mountRegister();
    await flushPromises();

    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm-password').setValue('different456');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('Passwords do not match');
    expect(mockAuthStore.register).not.toHaveBeenCalled();
  });

  it('shows error when password is too short', async () => {
    const wrapper = mountRegister();
    await flushPromises();

    await wrapper.find('#password').setValue('short');
    await wrapper.find('#confirm-password').setValue('short');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('at least 8 characters');
    expect(mockAuthStore.register).not.toHaveBeenCalled();
  });

  it('submits registration and navigates to /app on success', async () => {
    mockAuthStore.register.mockResolvedValue(undefined);
    const wrapper = mountRegister();
    await flushPromises();

    await wrapper.find('#name').setValue('Test User');
    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm-password').setValue('password123');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(mockAuthStore.register).toHaveBeenCalledWith(
      'invited@example.com',
      'password123',
      'valid-invite-token',
      'Test User'
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/app');
  });

  it('displays API error when registration fails', async () => {
    mockAuthStore.register.mockRejectedValue(new ApiError('Email already in use', 'DUPLICATE'));
    const wrapper = mountRegister();
    await flushPromises();

    await wrapper.find('#password').setValue('password123');
    await wrapper.find('#confirm-password').setValue('password123');
    await wrapper.find('.auth-form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-message').text()).toContain('Email already in use');
  });

  it('navigates to login when Sign in link is clicked', async () => {
    const wrapper = mountRegister();
    await flushPromises();

    await wrapper.find('.link-btn').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });
});
