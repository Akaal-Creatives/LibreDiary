import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    post: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { translateText, SUPPORTED_LANGUAGES } from '../translation.service';

describe('Translation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // translateText
  // ===========================================

  describe('translateText', () => {
    it('should call api.post with correct endpoint and body', async () => {
      mockApi.post.mockResolvedValue({ translatedText: 'Hola, mundo!' });

      await translateText('org-123', 'Hello, world!', 'Spanish');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-123/ai/translate', {
        text: 'Hello, world!',
        targetLanguage: 'Spanish',
      });
    });

    it('should return translatedText from response', async () => {
      mockApi.post.mockResolvedValue({ translatedText: 'Bonjour le monde!' });

      const result = await translateText('org-123', 'Hello world!', 'French');

      expect(result).toEqual({ translatedText: 'Bonjour le monde!' });
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));

      await expect(translateText('org-123', 'Hello', 'Spanish')).rejects.toThrow('Network error');
    });

    it('should construct URL with the given orgId', async () => {
      mockApi.post.mockResolvedValue({ translatedText: 'Hallo' });

      await translateText('org-xyz-999', 'Hello', 'German');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-xyz-999/ai/translate', {
        text: 'Hello',
        targetLanguage: 'German',
      });
    });
  });

  // ===========================================
  // SUPPORTED_LANGUAGES
  // ===========================================

  describe('SUPPORTED_LANGUAGES', () => {
    it('should export the SUPPORTED_LANGUAGES array', () => {
      expect(SUPPORTED_LANGUAGES).toBeDefined();
      expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
    });

    it('should contain common languages', () => {
      expect(SUPPORTED_LANGUAGES).toContain('English');
      expect(SUPPORTED_LANGUAGES).toContain('Spanish');
      expect(SUPPORTED_LANGUAGES).toContain('French');
      expect(SUPPORTED_LANGUAGES).toContain('German');
      expect(SUPPORTED_LANGUAGES).toContain('Punjabi');
    });

    it('should contain at least 30 languages', () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(30);
    });
  });
});
