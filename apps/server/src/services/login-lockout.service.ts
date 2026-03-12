import { logger } from '../lib/logger.js';

interface FailedAttempt {
  count: number;
  firstFailedAt: number;
  lockedUntil: number | null;
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window for counting failures
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Clean stale entries every 10 minutes

const failedAttempts = new Map<string, FailedAttempt>();

/**
 * Clean up stale entries to prevent unbounded memory growth.
 */
setInterval(() => {
  const now = Date.now();
  for (const [email, attempt] of failedAttempts) {
    const isLockExpired = attempt.lockedUntil && now > attempt.lockedUntil;
    const isWindowExpired = now - attempt.firstFailedAt > WINDOW_MS;
    if (isLockExpired || (isWindowExpired && !attempt.lockedUntil)) {
      failedAttempts.delete(email);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Check whether an account is currently locked out.
 * Returns the number of seconds remaining if locked, or 0 if not locked.
 */
export function getAccountLockoutRemaining(email: string): number {
  const normalised = email.toLowerCase().trim();
  const attempt = failedAttempts.get(normalised);
  if (!attempt?.lockedUntil) return 0;

  const remaining = attempt.lockedUntil - Date.now();
  if (remaining <= 0) {
    failedAttempts.delete(normalised);
    return 0;
  }
  return Math.ceil(remaining / 1000);
}

/**
 * Record a failed login attempt. Returns the progressive delay in ms
 * that should be applied before responding (0 = no delay).
 */
export function recordFailedLogin(
  email: string,
  meta: { ipAddress?: string; userAgent?: string }
): number {
  const normalised = email.toLowerCase().trim();
  const now = Date.now();

  let attempt = failedAttempts.get(normalised);

  if (!attempt || now - attempt.firstFailedAt > WINDOW_MS) {
    attempt = { count: 0, firstFailedAt: now, lockedUntil: null };
  }

  attempt.count += 1;

  logger.warn(
    { email: normalised, ip: meta.ipAddress, userAgent: meta.userAgent, failCount: attempt.count },
    'Failed login attempt'
  );

  // Lock account after threshold
  if (attempt.count >= LOCKOUT_THRESHOLD) {
    attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
    failedAttempts.set(normalised, attempt);
    logger.warn(
      { email: normalised, lockedUntilMs: LOCKOUT_DURATION_MS },
      'Account locked due to excessive failed login attempts'
    );
    return 0; // No delay — return locked error immediately
  }

  failedAttempts.set(normalised, attempt);

  // Progressive delay: 1s after 3 failures, 3s after 4
  if (attempt.count >= 4) return 3000;
  if (attempt.count >= 3) return 1000;
  return 0;
}

/**
 * Clear failed login attempts on successful login.
 */
export function clearFailedLogins(email: string): void {
  failedAttempts.delete(email.toLowerCase().trim());
}

/**
 * Expose for testing — reset all state.
 */
export function _resetForTesting(): void {
  failedAttempts.clear();
}
