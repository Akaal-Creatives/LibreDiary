import { describe, it, expect } from 'vitest';
import { handleToolError } from '../../tools/index.js';
import { LibreDiaryApiError } from '../../client/api-client.js';

describe('handleToolError', () => {
  describe('with LibreDiaryApiError', () => {
    it('should return isError: true', () => {
      const error = new LibreDiaryApiError(404, 'PAGE_NOT_FOUND', 'Page not found');
      const result = handleToolError(error);

      expect(result.isError).toBe(true);
    });

    it('should include error code in response', () => {
      const error = new LibreDiaryApiError(404, 'PAGE_NOT_FOUND', 'Page not found');
      const result = handleToolError(error);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.error).toBe('PAGE_NOT_FOUND');
    });

    it('should include message in response', () => {
      const error = new LibreDiaryApiError(404, 'PAGE_NOT_FOUND', 'Page not found');
      const result = handleToolError(error);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.message).toBe('Page not found');
    });

    it('should include status in response', () => {
      const error = new LibreDiaryApiError(404, 'PAGE_NOT_FOUND', 'Page not found');
      const result = handleToolError(error);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.status).toBe(404);
    });

    it('should include details when present', () => {
      const details = { title: ['Required'] };
      const error = new LibreDiaryApiError(400, 'VALIDATION_ERROR', 'Invalid', details);
      const result = handleToolError(error);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.details).toEqual(details);
    });

    it('should omit details when not present', () => {
      const error = new LibreDiaryApiError(404, 'NOT_FOUND', 'Not found');
      const result = handleToolError(error);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed).not.toHaveProperty('details');
    });

    it('should return single text content item', () => {
      const error = new LibreDiaryApiError(404, 'NOT_FOUND', 'Not found');
      const result = handleToolError(error);

      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe('text');
    });
  });

  describe('with standard Error', () => {
    it('should return isError: true', () => {
      const result = handleToolError(new Error('Network failure'));
      expect(result.isError).toBe(true);
    });

    it('should include the error message', () => {
      const result = handleToolError(new Error('Network failure'));
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.error).toBe('Network failure');
    });

    it('should return single text content item', () => {
      const result = handleToolError(new Error('test'));

      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe('text');
    });
  });

  describe('with unknown error types', () => {
    it('should handle string errors', () => {
      const result = handleToolError('something broke');
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.error).toBe('An unexpected error occurred');
      expect(result.isError).toBe(true);
    });

    it('should handle null', () => {
      const result = handleToolError(null);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.error).toBe('An unexpected error occurred');
    });

    it('should handle undefined', () => {
      const result = handleToolError(undefined);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.error).toBe('An unexpected error occurred');
    });

    it('should handle number errors', () => {
      const result = handleToolError(42);
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.error).toBe('An unexpected error occurred');
    });
  });

  describe('response format', () => {
    it('should produce valid JSON', () => {
      const error = new LibreDiaryApiError(500, 'SERVER_ERROR', 'Internal error');
      const result = handleToolError(error);

      expect(() => JSON.parse(result.content[0]!.text)).not.toThrow();
    });

    it('should produce pretty-printed JSON', () => {
      const error = new LibreDiaryApiError(500, 'SERVER_ERROR', 'Internal error');
      const result = handleToolError(error);

      expect(result.content[0]!.text).toContain('\n');
    });
  });
});
