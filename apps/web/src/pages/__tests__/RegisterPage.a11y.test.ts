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

function mountPage(token = 'valid-invite-token') {
  mockAuthService.getInvite.mockResolvedValue({
    email: 'test@example.com',
    organization: { name: 'Test Org' },
  });
  return mount(RegisterPage, {
    props: { token },
    global: { stubs: { Teleport: true } },
  });
}

describe('RegisterPage - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('password toggle buttons have aria-label', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const toggleButtons = wrapper.findAll('button').filter((button) => {
      const ariaLabel = button.attributes('aria-label');
      return ariaLabel && ariaLabel.toLowerCase().includes('password');
    });

    expect(toggleButtons.length).toBeGreaterThan(0);
    toggleButtons.forEach((button) => {
      expect(button.attributes('aria-label')).toBeTruthy();
    });
  });

  it('error message has role="alert" when shown', async () => {
    const wrapper = mountPage();
    await flushPromises();

    // Enter different passwords to trigger mismatch error
    const nameInput = wrapper.find('input[type="text"]');
    const passwordInput = wrapper.find('input#password');
    const confirmPasswordInput = wrapper.find('input#confirm-password');

    await nameInput.setValue('Test User');
    await passwordInput.setValue('Password123!');
    await confirmPasswordInput.setValue('DifferentPassword123!');

    // Submit the form
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    // Check for error div with role="alert" and aria-live="polite"
    const errorDiv = wrapper.find('[role="alert"]');
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.attributes('aria-live')).toBe('polite');
  });

  it('form inputs have labels', async () => {
    const wrapper = mountPage();
    await flushPromises();

    // Check name input has associated label
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.exists()).toBe(true);
    const nameInputId = nameInput.attributes('id');
    if (nameInputId) {
      const nameLabel = wrapper.find(`label[for="${nameInputId}"]`);
      expect(nameLabel.exists()).toBe(true);
    }

    // Check password input has associated label
    const passwordInput = wrapper.find('input#password');
    expect(passwordInput.exists()).toBe(true);
    const passwordLabel = wrapper.find('label[for="password"]');
    expect(passwordLabel.exists()).toBe(true);

    // Check confirm-password input has associated label
    const confirmPasswordInput = wrapper.find('input#confirm-password');
    expect(confirmPasswordInput.exists()).toBe(true);
    const confirmPasswordLabel = wrapper.find('label[for="confirm-password"]');
    expect(confirmPasswordLabel.exists()).toBe(true);
  });
});
