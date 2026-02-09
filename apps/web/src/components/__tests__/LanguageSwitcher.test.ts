import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { i18n } from '@/i18n';

const mockSetLocale = vi.fn();
const mockCurrentLocale = ref('en-GB');

vi.mock('@/composables', () => ({
  useLocale: () => ({
    currentLocale: mockCurrentLocale,
    setLocale: mockSetLocale,
  }),
  useTheme: () => ({
    theme: ref('light'),
    resolvedTheme: ref('light'),
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import LanguageSwitcher from '../LanguageSwitcher.vue';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockSetLocale.mockClear();
    mockCurrentLocale.value = 'en-GB';
  });

  function mountComponent() {
    return mount(LanguageSwitcher, {
      global: { plugins: [i18n] },
    });
  }

  // ===========================================
  // RENDERING
  // ===========================================

  describe('rendering', () => {
    it('should render toggle button with globe icon', () => {
      const wrapper = mountComponent();

      const button = wrapper.find('.language-toggle');
      expect(button.exists()).toBe(true);
      expect(button.find('svg').exists()).toBe(true);
    });

    it('should not show menu by default', () => {
      const wrapper = mountComponent();

      expect(wrapper.find('.language-menu').exists()).toBe(false);
    });
  });

  // ===========================================
  // MENU INTERACTION
  // ===========================================

  describe('menu interaction', () => {
    it('should show menu on click', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      expect(wrapper.find('.language-menu').exists()).toBe(true);
    });

    it('should display all supported locales', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const items = wrapper.findAll('.language-option');
      expect(items.length).toBe(2);
      expect(items[0].text()).toContain('English (UK)');
      expect(items[1].text()).toContain('English (US)');
    });

    it('should highlight current locale with active class', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const activeItem = wrapper.find('.language-option.active');
      expect(activeItem.exists()).toBe(true);
      expect(activeItem.text()).toContain('English (UK)');
    });

    it('should call setLocale on selection', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const items = wrapper.findAll('.language-option');
      await items[1].trigger('click');

      expect(mockSetLocale).toHaveBeenCalledWith('en-US');
    });

    it('should close menu after selection', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');
      expect(wrapper.find('.language-menu').exists()).toBe(true);

      const items = wrapper.findAll('.language-option');
      await items[1].trigger('click');

      expect(wrapper.find('.language-menu').exists()).toBe(false);
    });
  });
});
