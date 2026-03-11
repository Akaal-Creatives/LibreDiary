import { describe, it, expect } from 'vitest';
import { generateOtp, hashToken, EXPIRATION } from '../tokens.js';

describe('generateOtp', () => {
  it('should return a 6-digit numeric code and its hash', () => {
    const result = generateOtp();

    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('hash');
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.hash).toBe(hashToken(result.code));
  });

  it('should generate different codes on successive calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(generateOtp().code);
    }
    // At least 10 unique codes out of 20 (statistical guarantee with 6-digit range)
    expect(results.size).toBeGreaterThanOrEqual(10);
  });
});

describe('EXPIRATION', () => {
  it('should have OTP expiration of 10 minutes', () => {
    expect(EXPIRATION.OTP).toBe(10 * 60 * 1000);
  });

  it('should have encryption grace period of 7 days', () => {
    expect(EXPIRATION.ENCRYPTION_GRACE_PERIOD).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
