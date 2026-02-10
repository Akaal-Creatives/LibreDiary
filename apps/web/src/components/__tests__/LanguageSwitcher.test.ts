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

    it('should display all 17 supported locales', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const items = wrapper.findAll('.language-option');
      expect(items.length).toBe(17);
    });

    it('should show native names', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const nativeNames = wrapper.findAll('.locale-native-name');
      const nativeTexts = nativeNames.map((n) => n.text());

      expect(nativeTexts).toContain('English (UK)');
      expect(nativeTexts).toContain('Deutsch');
      expect(nativeTexts).toContain('Français');
      expect(nativeTexts).toContain('日本語');
      expect(nativeTexts).toContain('العربية');
    });

    it('should show English name as secondary label for non-English locales', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const englishNames = wrapper.findAll('.locale-english-name');
      const englishTexts = englishNames.map((n) => n.text());

      expect(englishTexts).toContain('French');
      expect(englishTexts).toContain('German');
      expect(englishTexts).toContain('Japanese');
    });

    it('should not show secondary English name when native and English are the same', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      // English (UK) has nativeName === name, so no secondary label
      const firstOption = wrapper.findAll('.language-option')[0];
      expect(firstOption.find('.locale-english-name').exists()).toBe(false);
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

  // ===========================================
  // ACCESSIBILITY
  // ===========================================

  describe('accessibility', () => {
    it('should have role="listbox" on menu', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const menu = wrapper.find('.language-menu');
      expect(menu.attributes('role')).toBe('listbox');
    });

    it('should have role="option" on items', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const items = wrapper.findAll('.language-option');
      items.forEach((item) => {
        expect(item.attributes('role')).toBe('option');
      });
    });

    it('should have aria-selected on active item', async () => {
      const wrapper = mountComponent();

      await wrapper.find('.language-toggle').trigger('click');

      const activeItem = wrapper.find('.language-option.active');
      expect(activeItem.attributes('aria-selected')).toBe('true');
    });

    it('should have aria-haspopup on toggle button', () => {
      const wrapper = mountComponent();

      const toggle = wrapper.find('.language-toggle');
      expect(toggle.attributes('aria-haspopup')).toBe('listbox');
    });
  });
});
