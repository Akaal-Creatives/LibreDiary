import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { i18n } from '@/i18n';

// Mock auth service before importing composable
const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    updateProfile: vi.fn().mockResolvedValue({ user: {} }),
  },
}));

vi.mock('@/services/auth.service', () => ({
  authService: mockAuthService,
}));

// Mock auth store
const { mockAuthStoreState } = vi.hoisted(() => ({
  mockAuthStoreState: {
    user: null as { locale?: string | null } | null,
    isAuthenticated: false,
  },
}));

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStoreState,
}));

// Mock loadLocaleMessages
const { mockLoadLocaleMessages } = vi.hoisted(() => ({
  mockLoadLocaleMessages: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/i18n', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@/i18n')>();
  return {
    ...actual,
    loadLocaleMessages: mockLoadLocaleMessages,
  };
});

import { useLocale } from '../useLocale';

// Helper to run a composable inside a mounted component context
function withSetup<T>(composableFn: () => T): { result: T; unmount: () => void } {
  let result!: T;

  const TestComponent = defineComponent({
    setup() {
      result = composableFn();
      return () => h('div');
    },
  });

  const wrapper = mount(TestComponent, {
    global: { plugins: [i18n, createPinia()] },
  });

  return {
    result,
    unmount: () => wrapper.unmount(),
  };
}

describe('useLocale', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(),
    });

    // Reset document attributes
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');

    // Default: user is not authenticated
    mockAuthStoreState.user = null;
    mockAuthStoreState.isAuthenticated = false;

    // Reset mocks — always return resolved promises
    mockAuthService.updateProfile.mockReset();
    mockAuthService.updateProfile.mockResolvedValue({ user: {} });
    mockLoadLocaleMessages.mockReset();
    mockLoadLocaleMessages.mockResolvedValue(undefined);

    // Pinia for the test
    setActivePinia(createPinia());

    // Reset the module-level singleton state
    const { result, unmount } = withSetup(() => useLocale());
    result.setLocale('en-GB');
    unmount();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // RETURNED API
  // ===========================================

  describe('returned API', () => {
    it('should return currentLocale and setLocale', () => {
      const { result, unmount } = withSetup(() => useLocale());

      expect(result).toHaveProperty('currentLocale');
      expect(result).toHaveProperty('setLocale');
      expect(typeof result.setLocale).toBe('function');

      unmount();
    });
  });

  // ===========================================
  // DEFAULT LOCALE
  // ===========================================

  describe('default locale', () => {
    it('should default to en-GB', () => {
      const { result, unmount } = withSetup(() => useLocale());

      expect(result.currentLocale.value).toBe('en-GB');

      unmount();
    });
  });

  // ===========================================
  // LOADING FROM localStorage
  // ===========================================

  describe('loading from localStorage', () => {
    it('should load saved locale on mount', async () => {
      localStorageMock['locale'] = 'en-US';

      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      expect(result.currentLocale.value).toBe('en-US');

      unmount();
    });

    it('should ignore invalid saved locale values', async () => {
      localStorageMock['locale'] = 'fr-FR';

      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      expect(result.currentLocale.value).toBe('en-GB');

      unmount();
    });

    it('should handle missing localStorage entry gracefully', async () => {
      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      expect(result.currentLocale.value).toBe('en-GB');

      unmount();
    });
  });

  // ===========================================
  // USER LOCALE PRIORITY
  // ===========================================

  describe('user locale priority', () => {
    it('should prioritise user.locale when authenticated', async () => {
      mockAuthStoreState.user = { locale: 'en-US' };
      mockAuthStoreState.isAuthenticated = true;

      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      expect(result.currentLocale.value).toBe('en-US');

      unmount();
    });

    it('should fall back to localStorage when user has no locale', async () => {
      localStorageMock['locale'] = 'en-US';
      mockAuthStoreState.user = { locale: null };
      mockAuthStoreState.isAuthenticated = true;

      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      expect(result.currentLocale.value).toBe('en-US');

      unmount();
    });
  });

  // ===========================================
  // setLocale
  // ===========================================

  describe('setLocale', () => {
    it('should change locale value', async () => {
      const { result, unmount } = withSetup(() => useLocale());

      result.setLocale('en-US');
      await nextTick();

      expect(result.currentLocale.value).toBe('en-US');

      unmount();
    });

    it('should save locale to localStorage', async () => {
      const { result, unmount } = withSetup(() => useLocale());

      result.setLocale('en-US');
      await nextTick();

      expect(localStorage.setItem).toHaveBeenCalledWith('locale', 'en-US');

      unmount();
    });

    it('should set document.documentElement.lang', async () => {
      const { result, unmount } = withSetup(() => useLocale());

      result.setLocale('en-US');
      await nextTick();

      expect(document.documentElement.lang).toBe('en-US');

      unmount();
    });

    it('should not accept invalid locale values', async () => {
      const { result, unmount } = withSetup(() => useLocale());

      result.setLocale('fr-FR' as 'en-GB');
      await nextTick();

      expect(result.currentLocale.value).toBe('en-GB');

      unmount();
    });
  });

  // ===========================================
  // BACKEND SYNC
  // ===========================================

  describe('backend sync', () => {
    it('should sync to backend when authenticated', async () => {
      mockAuthStoreState.user = { locale: 'en-GB' };
      mockAuthStoreState.isAuthenticated = true;

      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      mockAuthService.updateProfile.mockClear();
      result.setLocale('en-US');
      await nextTick();

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith({ locale: 'en-US' });

      unmount();
    });

    it('should skip sync when not authenticated', async () => {
      mockAuthStoreState.user = null;
      mockAuthStoreState.isAuthenticated = false;

      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      mockAuthService.updateProfile.mockClear();
      result.setLocale('en-US');
      await nextTick();

      expect(mockAuthService.updateProfile).not.toHaveBeenCalled();

      unmount();
    });

    it('should handle sync failure gracefully', async () => {
      mockAuthStoreState.user = { locale: 'en-GB' };
      mockAuthStoreState.isAuthenticated = true;
      mockAuthService.updateProfile.mockRejectedValue(new Error('Network error'));

      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      result.setLocale('en-US');
      await nextTick();

      // Locale should still be updated locally despite backend failure
      expect(result.currentLocale.value).toBe('en-US');

      unmount();
    });
  });

  // ===========================================
  // LAZY LOADING
  // ===========================================

  describe('lazy loading', () => {
    it('should call loadLocaleMessages when switching to a new locale', async () => {
      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      mockLoadLocaleMessages.mockClear();
      result.setLocale('fr' as 'en-GB');
      await nextTick();

      expect(mockLoadLocaleMessages).toHaveBeenCalledWith('fr');

      unmount();
    });

    it('should not call loadLocaleMessages for en-GB on mount', async () => {
      mockLoadLocaleMessages.mockClear();

      const { unmount } = withSetup(() => useLocale());
      await nextTick();

      // en-GB is the default locale and already loaded statically
      expect(mockLoadLocaleMessages).not.toHaveBeenCalledWith('en-GB');

      unmount();
    });
  });

  // ===========================================
  // RTL SUPPORT
  // ===========================================

  describe('RTL support', () => {
    it('should set dir to rtl when switching to Arabic', async () => {
      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      result.setLocale('ar' as 'en-GB');
      await nextTick();

      expect(document.documentElement.dir).toBe('rtl');

      unmount();
    });

    it('should set dir to ltr when switching to en-GB', async () => {
      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      // First switch to Arabic
      result.setLocale('ar' as 'en-GB');
      await nextTick();
      expect(document.documentElement.dir).toBe('rtl');

      // Then back to en-GB
      result.setLocale('en-GB');
      await nextTick();
      expect(document.documentElement.dir).toBe('ltr');

      unmount();
    });

    it('should set dir to ltr for French', async () => {
      const { result, unmount } = withSetup(() => useLocale());
      await nextTick();

      result.setLocale('fr' as 'en-GB');
      await nextTick();

      expect(document.documentElement.dir).toBe('ltr');

      unmount();
    });
  });
});
