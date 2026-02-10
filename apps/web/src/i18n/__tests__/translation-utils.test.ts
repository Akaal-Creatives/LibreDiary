import { describe, it, expect } from 'vitest';
import { flattenKeys, computeTranslationStats } from '../translation-utils';

describe('translation-utils', () => {
  // ===========================================
  // flattenKeys
  // ===========================================

  describe('flattenKeys', () => {
    it('should return empty array for empty object', () => {
      expect(flattenKeys({})).toEqual([]);
    });

    it('should flatten single-level object', () => {
      const result = flattenKeys({ save: 'Save', cancel: 'Cancel' });
      expect(result).toEqual(['save', 'cancel']);
    });

    it('should flatten nested object with dot notation', () => {
      const result = flattenKeys({
        common: { save: 'Save', cancel: 'Cancel' },
        auth: { login: 'Login' },
      });
      expect(result).toEqual(['common.save', 'common.cancel', 'auth.login']);
    });

    it('should handle deeply nested objects', () => {
      const result = flattenKeys({
        a: { b: { c: { d: 'deep' } } },
      });
      expect(result).toEqual(['a.b.c.d']);
    });

    it('should use provided prefix', () => {
      const result = flattenKeys({ save: 'Save' }, 'common');
      expect(result).toEqual(['common.save']);
    });

    it('should handle mixed nesting levels', () => {
      const result = flattenKeys({
        title: 'Title',
        nested: { key: 'Value' },
      });
      expect(result).toEqual(['title', 'nested.key']);
    });
  });

  // ===========================================
  // computeTranslationStats
  // ===========================================

  describe('computeTranslationStats', () => {
    const masterKeys = ['common.save', 'common.cancel', 'auth.login', 'auth.logout'];
    const meta = { name: 'French', nativeName: 'Français', dir: 'ltr' as const };

    it('should return skeleton status for empty locale', () => {
      const stats = computeTranslationStats(masterKeys, {}, 'fr', meta);

      expect(stats.locale).toBe('fr');
      expect(stats.name).toBe('French');
      expect(stats.nativeName).toBe('Français');
      expect(stats.totalKeys).toBe(4);
      expect(stats.translatedKeys).toBe(0);
      expect(stats.missingKeys).toEqual(masterKeys);
      expect(stats.percentage).toBe(0);
      expect(stats.status).toBe('skeleton');
    });

    it('should return complete status for fully translated locale', () => {
      const messages = {
        common: { save: 'Enregistrer', cancel: 'Annuler' },
        auth: { login: 'Connexion', logout: 'Déconnexion' },
      };
      const stats = computeTranslationStats(masterKeys, messages, 'fr', meta);

      expect(stats.translatedKeys).toBe(4);
      expect(stats.missingKeys).toEqual([]);
      expect(stats.percentage).toBe(100);
      expect(stats.status).toBe('complete');
    });

    it('should return partial status for partially translated locale', () => {
      const messages = {
        common: { save: 'Enregistrer' },
      };
      const stats = computeTranslationStats(masterKeys, messages, 'fr', meta);

      expect(stats.translatedKeys).toBe(1);
      expect(stats.missingKeys).toEqual(['common.cancel', 'auth.login', 'auth.logout']);
      expect(stats.percentage).toBe(25);
      expect(stats.status).toBe('partial');
    });

    it('should calculate percentage correctly with rounding', () => {
      const threeKeys = ['a', 'b', 'c'];
      const messages = { a: 'A' };
      const stats = computeTranslationStats(threeKeys, messages, 'fr', meta);

      expect(stats.percentage).toBe(33); // Math.round(1/3 * 100) = 33
    });

    it('should handle zero master keys', () => {
      const stats = computeTranslationStats([], {}, 'fr', meta);

      expect(stats.totalKeys).toBe(0);
      expect(stats.translatedKeys).toBe(0);
      expect(stats.percentage).toBe(100);
      expect(stats.status).toBe('complete');
    });
  });
});
