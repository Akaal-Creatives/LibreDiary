import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param length - Length in bytes (will be hex-encoded, so output is 2x length)
 */
export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return generateToken(32);
}

/**
 * Generate a verification/reset token (URL-safe)
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate an invite token (shorter, URL-safe)
 */
export function generateInviteToken(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Hash a token for storage (one-way)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate expiration date from now
 * @param ms - Milliseconds from now
 */
export function expiresIn(ms: number): Date {
  return new Date(Date.now() + ms);
}

/**
 * Check if a date is expired
 */
export function isExpired(date: Date): boolean {
  return new Date() > date;
}

// Common expiration times
export const EXPIRATION = {
  SESSION: 7 * 24 * 60 * 60 * 1000, // 7 days
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 days
  WS_TOKEN: 5 * 60 * 1000, // 5 minutes - short-lived for WebSocket auth
} as const;

/**
 * Generate a WebSocket authentication token
 * This is a signed token containing userId and expiration
 */
export function generateWsToken(userId: string, secret: string): string {
  const expiresAt = Date.now() + EXPIRATION.WS_TOKEN;
  const payload = `${userId}:${expiresAt}`;
  const signature = createHash('sha256').update(`${payload}:${secret}`).digest('base64url');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Validate and decode a WebSocket token
 * Returns userId if valid, null if invalid or expired
 */
export function validateWsToken(token: string, secret: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [userId, expiresAtStr, signature] = decoded.split(':');

    if (!userId || !expiresAtStr || !signature) {
      return null;
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHash('sha256')
      .update(`${userId}:${expiresAtStr}:${secret}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}
