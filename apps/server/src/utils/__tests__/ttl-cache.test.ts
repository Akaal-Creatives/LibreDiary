import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TtlCache } from '../ttl-cache.js';

describe('TtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve values', () => {
    const cache = new TtlCache<string>(60_000);
    cache.set('key1', 'value1');

    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    const cache = new TtlCache<string>(60_000);

    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should expire entries after TTL', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('key1', 'value1');

    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(1001);

    expect(cache.get('key1')).toBeUndefined();
  });

  it('should support custom TTL per entry', () => {
    const cache = new TtlCache<string>(60_000);
    cache.set('short', 'value', 500);
    cache.set('long', 'value', 5000);

    vi.advanceTimersByTime(600);

    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('value');
  });

  it('should invalidate a specific key', () => {
    const cache = new TtlCache<string>(60_000);
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.invalidate('key1');

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should invalidate by prefix', () => {
    const cache = new TtlCache<string>(60_000);
    cache.set('org:123:tree', 'tree1');
    cache.set('org:123:stats', 'stats1');
    cache.set('org:456:tree', 'tree2');

    cache.invalidateByPrefix('org:123:');

    expect(cache.get('org:123:tree')).toBeUndefined();
    expect(cache.get('org:123:stats')).toBeUndefined();
    expect(cache.get('org:456:tree')).toBe('tree2');
  });

  it('should clear all entries', () => {
    const cache = new TtlCache<string>(60_000);
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.clear();

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('should report correct size excluding expired entries', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('short', 'value', 500);
    cache.set('long', 'value', 5000);

    expect(cache.size).toBe(2);

    vi.advanceTimersByTime(600);

    expect(cache.size).toBe(1);
  });

  it('should overwrite existing entries', () => {
    const cache = new TtlCache<string>(60_000);
    cache.set('key1', 'old');
    cache.set('key1', 'new');

    expect(cache.get('key1')).toBe('new');
  });
});
