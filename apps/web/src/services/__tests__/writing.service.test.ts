import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    post: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { writeText, WRITING_ACTIONS } from '../writing.service';

describe('Writing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // writeText
  // ===========================================

  describe('writeText', () => {
    it('should call api.post with correct endpoint and body for generate action', async () => {
      mockApi.post.mockResolvedValue({ content: 'Generated content' });

      await writeText('org-123', 'generate', 'Write about cats');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-123/ai/write', {
        action: 'generate',
        text: 'Write about cats',
      });
    });

    it('should call api.post with correct endpoint and body for expand action', async () => {
      mockApi.post.mockResolvedValue({ content: 'Expanded content' });

      await writeText('org-123', 'expand', 'Short text');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-123/ai/write', {
        action: 'expand',
        text: 'Short text',
      });
    });

    it('should call api.post with correct endpoint and body for summarise action', async () => {
      mockApi.post.mockResolvedValue({ content: 'Summary' });

      await writeText('org-123', 'summarise', 'Long text here');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-123/ai/write', {
        action: 'summarise',
        text: 'Long text here',
      });
    });

    it('should call api.post with correct endpoint and body for improve action', async () => {
      mockApi.post.mockResolvedValue({ content: 'Improved content' });

      await writeText('org-123', 'improve', 'Bad grammer text');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-123/ai/write', {
        action: 'improve',
        text: 'Bad grammer text',
      });
    });

    it('should return content from response', async () => {
      mockApi.post.mockResolvedValue({ content: 'AI generated content' });

      const result = await writeText('org-123', 'generate', 'Write about dogs');

      expect(result).toEqual({ content: 'AI generated content' });
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));

      await expect(writeText('org-123', 'expand', 'Hello')).rejects.toThrow('Network error');
    });

    it('should construct URL with different orgId values', async () => {
      mockApi.post.mockResolvedValue({ content: 'Content' });

      await writeText('org-xyz-999', 'summarise', 'Hello');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-xyz-999/ai/write', {
        action: 'summarise',
        text: 'Hello',
      });
    });
  });

  // ===========================================
  // WRITING_ACTIONS
  // ===========================================

  describe('WRITING_ACTIONS', () => {
    it('should export the WRITING_ACTIONS array', () => {
      expect(WRITING_ACTIONS).toBeDefined();
      expect(Array.isArray(WRITING_ACTIONS)).toBe(true);
    });

    it('should contain all four actions', () => {
      expect(WRITING_ACTIONS).toContain('generate');
      expect(WRITING_ACTIONS).toContain('expand');
      expect(WRITING_ACTIONS).toContain('summarise');
      expect(WRITING_ACTIONS).toContain('improve');
      expect(WRITING_ACTIONS.length).toBe(4);
    });
  });
});
