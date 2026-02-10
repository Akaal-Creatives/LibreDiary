import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dynamic imports for locale files
vi.mock('../../locales/fr.json', () => ({ default: { common: { save: 'Enregistrer' } } }));
vi.mock('../../locales/ar.json', () => ({ default: { common: { save: 'حفظ' } } }));

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, loadLocaleMessages, i18n } from '../index';
import type { LocaleCode } from '../index';

describe('i18n config', () => {
  beforeEach(() => {
    // Reset loaded locales cache between tests
    // We need to re-import to reset the Set, but since we can't easily,
    // we'll test behaviour that doesn't depend on reset
  });

  // ===========================================
  // SUPPORTED_LOCALES
  // ===========================================

  describe('SUPPORTED_LOCALES', () => {
    it('should have 17 entries', () => {
      const codes = Object.keys(SUPPORTED_LOCALES);
      expect(codes.length).toBe(17);
    });

    it('should include en-GB with correct metadata', () => {
      expect(SUPPORTED_LOCALES['en-GB']).toEqual({
        name: 'English (UK)',
        nativeName: 'English (UK)',
        dir: 'ltr',
      });
    });

    it('should include en-US with correct metadata', () => {
      expect(SUPPORTED_LOCALES['en-US']).toEqual({
        name: 'English (US)',
        nativeName: 'English (US)',
        dir: 'ltr',
      });
    });

    it('should include Arabic with RTL direction', () => {
      expect(SUPPORTED_LOCALES['ar']).toEqual({
        name: 'Arabic',
        nativeName: 'العربية',
        dir: 'rtl',
      });
    });

    it('should include all expected locale codes', () => {
      const expectedCodes: LocaleCode[] = [
        'en-GB',
        'en-US',
        'fr',
        'es',
        'de',
        'it',
        'pt-BR',
        'ja',
        'zh-CN',
        'ko',
        'ar',
        'hi',
        'ru',
        'nl',
        'tr',
        'pl',
        'sv',
      ];
      const actualCodes = Object.keys(SUPPORTED_LOCALES);
      expect(actualCodes).toEqual(expect.arrayContaining(expectedCodes));
      expect(actualCodes.length).toBe(expectedCodes.length);
    });

    it('should have name, nativeName, and dir for every locale', () => {
      for (const [_code, meta] of Object.entries(SUPPORTED_LOCALES)) {
        expect(meta).toHaveProperty('name');
        expect(meta).toHaveProperty('nativeName');
        expect(meta).toHaveProperty('dir');
        expect(['ltr', 'rtl']).toContain(meta.dir);
      }
    });
  });

  // ===========================================
  // DEFAULT_LOCALE
  // ===========================================

  describe('DEFAULT_LOCALE', () => {
    it('should be en-GB', () => {
      expect(DEFAULT_LOCALE).toBe('en-GB');
    });
  });

  // ===========================================
  // i18n instance
  // ===========================================

  describe('i18n instance', () => {
    it('should have en-GB messages loaded statically', () => {
      const messages = i18n.global.getLocaleMessage('en-GB');
      expect(messages).toBeDefined();
      expect(messages.common).toBeDefined();
    });

    it('should use en-GB as fallback locale', () => {
      expect(i18n.global.fallbackLocale.value).toBe('en-GB');
    });
  });

  // ===========================================
  // loadLocaleMessages
  // ===========================================

  describe('loadLocaleMessages', () => {
    it('should resolve immediately for en-GB (already loaded)', async () => {
      await expect(loadLocaleMessages('en-GB')).resolves.toBeUndefined();
    });

    it('should load and register messages for a new locale', async () => {
      await loadLocaleMessages('fr');
      const messages = i18n.global.getLocaleMessage('fr');
      expect(messages).toBeDefined();
      expect((messages as Record<string, Record<string, string>>).common?.save).toBe('Enregistrer');
    });

    it('should not re-import a locale that has already been loaded', async () => {
      // fr was loaded in the previous test — the import should be cached
      // This test verifies no error is thrown on double-load
      await expect(loadLocaleMessages('fr')).resolves.toBeUndefined();
    });
  });
});
