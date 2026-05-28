import { describe, it, expect } from 'vitest';
import { matchProvider, toEmbedUrl, getProviderLabel } from '../embed/embedProviders';

describe('embedProviders', () => {
  describe('matchProvider', () => {
    it('matches YouTube watch URL', () => {
      expect(matchProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    });
    it('matches YouTube short URL (youtu.be)', () => {
      expect(matchProvider('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    });
    it('matches Vimeo URL', () => {
      expect(matchProvider('https://vimeo.com/123456789')).toBe('vimeo');
    });
    it('matches Figma file URL', () => {
      expect(matchProvider('https://www.figma.com/file/ABC123/My-Design')).toBe('figma');
    });
    it('matches Figma proto URL', () => {
      expect(matchProvider('https://www.figma.com/proto/ABC123/Prototype')).toBe('figma');
    });
    it('matches Google Maps URL', () => {
      expect(matchProvider('https://www.google.com/maps/place/Eiffel+Tower')).toBe('maps');
    });
    it('returns null for an unknown URL', () => {
      expect(matchProvider('https://example.com/page')).toBeNull();
    });
    it('returns null for an invalid string', () => {
      expect(matchProvider('not a url')).toBeNull();
    });
  });

  describe('toEmbedUrl', () => {
    it('converts YouTube watch URL to youtube-nocookie embed', () => {
      expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
      );
    });
    it('converts youtu.be short URL to youtube-nocookie embed', () => {
      expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
      );
    });
    it('converts Vimeo URL to player URL', () => {
      expect(toEmbedUrl('https://vimeo.com/123456789')).toBe(
        'https://player.vimeo.com/video/123456789'
      );
    });
    it('converts Figma file URL to embed URL', () => {
      expect(toEmbedUrl('https://www.figma.com/file/ABC123/My-Design')).toBe(
        'https://www.figma.com/embed?embed_host=librediary&url=https%3A%2F%2Fwww.figma.com%2Ffile%2FABC123%2FMy-Design'
      );
    });
    it('converts Google Maps URL to embed URL', () => {
      expect(toEmbedUrl('https://www.google.com/maps/place/Eiffel+Tower')).toContain(
        'output=embed'
      );
    });
    it('returns null for an unknown URL', () => {
      expect(toEmbedUrl('https://example.com/page')).toBeNull();
    });
    it('returns null for an invalid string', () => {
      expect(toEmbedUrl('not a url')).toBeNull();
    });
  });

  describe('getProviderLabel', () => {
    it('returns YouTube for youtube', () => {
      expect(getProviderLabel('youtube')).toBe('YouTube');
    });
    it('returns Vimeo for vimeo', () => {
      expect(getProviderLabel('vimeo')).toBe('Vimeo');
    });
    it('returns Figma for figma', () => {
      expect(getProviderLabel('figma')).toBe('Figma');
    });
    it('returns Google Maps for maps', () => {
      expect(getProviderLabel('maps')).toBe('Google Maps');
    });
  });
});
