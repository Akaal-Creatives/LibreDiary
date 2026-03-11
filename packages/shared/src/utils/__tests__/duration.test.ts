import { describe, it, expect } from 'vitest';
import { formatDuration, parseDuration } from '../index';

describe('formatDuration', () => {
  describe('HMS format (default)', () => {
    it('formats 0ms as "0s" with seconds precision', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('formats 0ms as "0m" with minutes precision', () => {
      expect(formatDuration(0, { precision: 'minutes' })).toBe('0m');
    });

    it('formats 0ms as "0h" with hours precision', () => {
      expect(formatDuration(0, { precision: 'hours' })).toBe('0h');
    });

    it('formats seconds only', () => {
      expect(formatDuration(45_000)).toBe('45s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(90_000)).toBe('1m 30s');
    });

    it('formats hours, minutes, and seconds', () => {
      expect(formatDuration(5_025_000)).toBe('1h 23m 45s');
    });

    it('formats with minutes precision (drops seconds)', () => {
      expect(formatDuration(5_025_000, { precision: 'minutes' })).toBe('1h 23m');
    });

    it('formats with hours precision (drops minutes and seconds)', () => {
      expect(formatDuration(5_025_000, { precision: 'hours' })).toBe('1h');
    });

    it('includes 0m when hours present and minutes precision', () => {
      expect(formatDuration(3_600_000, { precision: 'minutes' })).toBe('1h 0m');
    });

    it('handles negative values (uses absolute value)', () => {
      expect(formatDuration(-5_025_000)).toBe('1h 23m 45s');
    });

    it('formats exactly 1 hour (omits 0s)', () => {
      expect(formatDuration(3_600_000)).toBe('1h 0m');
    });

    it('formats large durations', () => {
      // 100 hours
      expect(formatDuration(360_000_000)).toBe('100h 0m');
    });
  });

  describe('decimal format', () => {
    it('formats 0ms as "0.00h"', () => {
      expect(formatDuration(0, { format: 'decimal' })).toBe('0.00h');
    });

    it('formats 1 hour as "1.00h"', () => {
      expect(formatDuration(3_600_000, { format: 'decimal' })).toBe('1.00h');
    });

    it('formats 1h 30m as "1.50h"', () => {
      expect(formatDuration(5_400_000, { format: 'decimal' })).toBe('1.50h');
    });

    it('formats fractional hours', () => {
      // 1h 23m 45s = 5025s = 1.395833...h
      expect(formatDuration(5_025_000, { format: 'decimal' })).toBe('1.40h');
    });
  });
});

describe('parseDuration', () => {
  describe('HMS string format', () => {
    it('parses "1h 23m 45s"', () => {
      expect(parseDuration('1h 23m 45s')).toBe(5_025_000);
    });

    it('parses hours only "2h"', () => {
      expect(parseDuration('2h')).toBe(7_200_000);
    });

    it('parses minutes only "90m"', () => {
      expect(parseDuration('90m')).toBe(5_400_000);
    });

    it('parses seconds only "45s"', () => {
      expect(parseDuration('45s')).toBe(45_000);
    });

    it('parses "1h 30m"', () => {
      expect(parseDuration('1h 30m')).toBe(5_400_000);
    });

    it('parses case-insensitively', () => {
      expect(parseDuration('1H 30M 15S')).toBe(5_415_000);
    });
  });

  describe('colon format', () => {
    it('parses "1:23:45"', () => {
      expect(parseDuration('1:23:45')).toBe(5_025_000);
    });

    it('parses "1:30" as 1h 30m', () => {
      expect(parseDuration('1:30')).toBe(5_400_000);
    });

    it('parses "0:05" as 5 minutes', () => {
      expect(parseDuration('0:05')).toBe(300_000);
    });
  });

  describe('decimal hours format', () => {
    it('parses "1.5h"', () => {
      expect(parseDuration('1.5h')).toBe(5_400_000);
    });

    it('parses "0.25h" as 15 minutes', () => {
      expect(parseDuration('0.25h')).toBe(900_000);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseDuration('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(parseDuration('   ')).toBeNull();
    });

    it('returns null for unparseable input', () => {
      expect(parseDuration('hello')).toBeNull();
    });

    it('returns null for plain numbers without unit', () => {
      expect(parseDuration('123')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(parseDuration('  1h 30m  ')).toBe(5_400_000);
    });
  });
});
