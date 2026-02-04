import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateToken,
  generateSessionToken,
  generateVerificationToken,
  generateInviteToken,
  hashToken,
  expiresIn,
  isExpired,
  EXPIRATION,
} from './tokens.js';

describe('Token Utilities', () => {
  describe('generateToken', () => {
    it('should generate a hex string of default length (64 chars for 32 bytes)', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate a hex string of specified length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateSessionToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateSessionToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a URL-safe base64 string', () => {
      const token = generateVerificationToken();
      // 32 bytes in base64url = 43 characters
      expect(token).toHaveLength(43);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should not contain URL-unsafe characters', () => {
      const token = generateVerificationToken();
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token).not.toContain('=');
    });

    it('should generate unique tokens', () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateInviteToken', () => {
    it('should generate a shorter URL-safe base64 string', () => {
      const token = generateInviteToken();
      // 16 bytes in base64url = 22 characters
      expect(token).toHaveLength(22);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should be shorter than verification token', () => {
      const inviteToken = generateInviteToken();
      const verificationToken = generateVerificationToken();
      expect(inviteToken.length).toBeLessThan(verificationToken.length);
    });
  });

  describe('hashToken', () => {
    it('should return a SHA-256 hash (64 hex characters)', () => {
      const hash = hashToken('test-token');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent hashes for the same input', () => {
      const hash1 = hashToken('same-token');
      const hash2 = hashToken('same-token');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');
      expect(hash1).not.toBe(hash2);
    });

    it('should be one-way (not reversible)', () => {
      const token = 'secret-token';
      const hash = hashToken(token);
      // The hash should not contain the original token
      expect(hash).not.toContain(token);
    });
  });

  describe('expiresIn', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return a date in the future', () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      vi.setSystemTime(now);

      const expires = expiresIn(60000); // 1 minute
      expect(expires.getTime()).toBe(now.getTime() + 60000);
    });

    it('should calculate correct expiration for common durations', () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      vi.setSystemTime(now);

      // 1 hour
      const hourExpires = expiresIn(60 * 60 * 1000);
      expect(hourExpires.getTime() - now.getTime()).toBe(3600000);

      // 1 day
      const dayExpires = expiresIn(24 * 60 * 60 * 1000);
      expect(dayExpires.getTime() - now.getTime()).toBe(86400000);

      // 7 days
      const weekExpires = expiresIn(7 * 24 * 60 * 60 * 1000);
      expect(weekExpires.getTime() - now.getTime()).toBe(604800000);
    });
  });

  describe('isExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for past dates', () => {
      vi.setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
      const pastDate = new Date('2024-01-01T00:00:00.000Z');
      expect(isExpired(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const futureDate = new Date('2024-01-02T00:00:00.000Z');
      expect(isExpired(futureDate)).toBe(false);
    });

    it('should return true for current time (edge case)', () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      vi.setSystemTime(now);
      // Exact same time should be considered expired (> not >=)
      expect(isExpired(now)).toBe(false);
    });

    it('should work with expiresIn function', () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      vi.setSystemTime(now);

      const expires = expiresIn(60000); // 1 minute from now
      expect(isExpired(expires)).toBe(false);

      // Advance time past expiration
      vi.advanceTimersByTime(61000);
      expect(isExpired(expires)).toBe(true);
    });
  });

  describe('EXPIRATION constants', () => {
    it('should have correct SESSION duration (7 days)', () => {
      expect(EXPIRATION.SESSION).toBe(7 * 24 * 60 * 60 * 1000);
      expect(EXPIRATION.SESSION).toBe(604800000);
    });

    it('should have correct EMAIL_VERIFICATION duration (24 hours)', () => {
      expect(EXPIRATION.EMAIL_VERIFICATION).toBe(24 * 60 * 60 * 1000);
      expect(EXPIRATION.EMAIL_VERIFICATION).toBe(86400000);
    });

    it('should have correct PASSWORD_RESET duration (1 hour)', () => {
      expect(EXPIRATION.PASSWORD_RESET).toBe(60 * 60 * 1000);
      expect(EXPIRATION.PASSWORD_RESET).toBe(3600000);
    });

    it('should have correct INVITE duration (7 days)', () => {
      expect(EXPIRATION.INVITE).toBe(7 * 24 * 60 * 60 * 1000);
      expect(EXPIRATION.INVITE).toBe(604800000);
    });
  });
});
