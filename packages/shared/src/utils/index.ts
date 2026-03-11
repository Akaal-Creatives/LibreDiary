/**
 * Shared utility functions
 */

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  // Limit input length to prevent ReDoS on untrusted data
  const safe = text.slice(0, 500);
  return safe
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Format a date to ISO string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Format a date to a human-readable relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString();
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate a random color for user avatars based on a seed string
 */
export function generateAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Get initials from a name (max 2 characters)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Deep clone an object using JSON serialization
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a hex color string and return RGB values
 */
export function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const hexMatch = color.match(/^#([0-9A-Fa-f]{6})$/);
  if (!hexMatch || !hexMatch[1]) return null;

  const hex = hexMatch[1];
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Check if a color is light (for determining text contrast)
 */
export function isLightColor(color: string): boolean {
  const rgb = parseHexColor(color);
  if (!rgb) return true;

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Generate a random string of specified length
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ===========================================
// DURATION FORMATTING
// ===========================================

export type DurationPrecision = 'seconds' | 'minutes' | 'hours';
export type DurationFormat = 'hms' | 'decimal';

export interface DurationConfig {
  precision?: DurationPrecision;
  format?: DurationFormat;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 *
 * With `format: 'hms'` (default):
 *   - 0 → "0s" / "0m" / "0h" (depends on precision)
 *   - 5025000 → "1h 23m 45s" (seconds precision)
 *   - 5025000 → "1h 23m" (minutes precision)
 *   - 5025000 → "1h" (hours precision)
 *
 * With `format: 'decimal'`:
 *   - 5025000 → "1.40h"
 */
export function formatDuration(ms: number, config?: DurationConfig): string {
  const precision = config?.precision ?? 'seconds';
  const format = config?.format ?? 'hms';

  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (format === 'decimal') {
    const decimalHours = totalSeconds / 3600;
    return `${decimalHours.toFixed(2)}h`;
  }

  // HMS format
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours}h`);

  if (precision === 'seconds' || precision === 'minutes') {
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  }

  if (precision === 'seconds') {
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  }

  if (parts.length === 0) {
    return precision === 'hours' ? '0h' : precision === 'minutes' ? '0m' : '0s';
  }

  return parts.join(' ');
}

/**
 * Parse a duration string (e.g. "1h 23m 45s", "1:23:45", "1.5h") to milliseconds.
 * Returns null if the string cannot be parsed.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try "Xh Ym Zs" format
  const hmsMatch = trimmed.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/i);
  if (hmsMatch && (hmsMatch[1] || hmsMatch[2] || hmsMatch[3])) {
    const h = parseInt(hmsMatch[1] || '0', 10);
    const m = parseInt(hmsMatch[2] || '0', 10);
    const s = parseInt(hmsMatch[3] || '0', 10);
    return (h * 3600 + m * 60 + s) * 1000;
  }

  // Try "H:MM:SS" or "H:MM" format
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1] || '0', 10);
    const m = parseInt(colonMatch[2] || '0', 10);
    const s = parseInt(colonMatch[3] || '0', 10);
    return (h * 3600 + m * 60 + s) * 1000;
  }

  // Try decimal hours "1.5h"
  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)h$/i);
  if (decimalMatch && decimalMatch[1]) {
    return Math.round(parseFloat(decimalMatch[1]) * 3600 * 1000);
  }

  // Try plain minutes "90m"
  const minMatch = trimmed.match(/^(\d+)m$/i);
  if (minMatch && minMatch[1]) {
    return parseInt(minMatch[1], 10) * 60 * 1000;
  }

  // Try plain seconds "45s"
  const secMatch = trimmed.match(/^(\d+)s$/i);
  if (secMatch && secMatch[1]) {
    return parseInt(secMatch[1], 10) * 1000;
  }

  return null;
}

/**
 * Omit specified keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick specified keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
