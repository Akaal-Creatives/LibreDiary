import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveUploadUrl } from '../uploadUrl';

describe('resolveUploadUrl', () => {
  const originalLocation = window.location;

  function mockLocation(origin: string) {
    Object.defineProperty(window, 'location', {
      value: { origin },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  it('should return empty string for null input', () => {
    expect(resolveUploadUrl(null)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(resolveUploadUrl(undefined)).toBe('');
  });

  it('should return empty string for empty string input', () => {
    expect(resolveUploadUrl('')).toBe('');
  });

  it('should pass through absolute http URLs unchanged', () => {
    const url = 'http://cdn.example.com/uploads/org-1/file.png';
    expect(resolveUploadUrl(url)).toBe(url);
  });

  it('should pass through absolute https URLs unchanged', () => {
    const url = 'https://s3.amazonaws.com/bucket/file.pdf';
    expect(resolveUploadUrl(url)).toBe(url);
  });

  describe('same-origin deployment', () => {
    beforeEach(() => {
      mockLocation('http://localhost:5173');
      vi.stubEnv('VITE_API_URL', '/api/v1');
    });

    it('should return relative path as-is', () => {
      expect(resolveUploadUrl('/uploads/org-1/file.png')).toBe('/uploads/org-1/file.png');
    });
  });

  describe('cross-origin deployment', () => {
    beforeEach(() => {
      mockLocation('https://app.example.com');
      vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/v1');
    });

    it('should prefix relative path with API origin', () => {
      expect(resolveUploadUrl('/uploads/org-1/file.png')).toBe(
        'https://api.example.com/uploads/org-1/file.png'
      );
    });

    it('should handle deeply nested paths', () => {
      expect(resolveUploadUrl('/uploads/org-1/sub/deep/photo.jpg')).toBe(
        'https://api.example.com/uploads/org-1/sub/deep/photo.jpg'
      );
    });
  });

  describe('fallback when VITE_API_URL is not set', () => {
    beforeEach(() => {
      mockLocation('http://localhost:5173');
      vi.stubEnv('VITE_API_URL', '');
    });

    it('should return relative path as-is (same origin fallback)', () => {
      expect(resolveUploadUrl('/uploads/org-1/file.png')).toBe('/uploads/org-1/file.png');
    });
  });
});
