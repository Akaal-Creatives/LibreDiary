import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear existing toasts by removing them
    const { toasts, removeToast } = useToast();
    toasts.value.forEach((t) => removeToast(t.id));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return toasts as readonly ref', () => {
    const { toasts } = useToast();
    expect(toasts.value).toEqual([]);
  });

  describe('addToast', () => {
    it('should add a toast with generated id', () => {
      const { addToast, toasts } = useToast();

      const id = addToast({ message: 'Hello', type: 'info' });

      expect(id).toMatch(/^toast-\d+$/);
      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0]).toEqual(
        expect.objectContaining({
          id,
          message: 'Hello',
          type: 'info',
        })
      );
    });

    it('should auto-remove toast after default duration (4000ms)', () => {
      const { addToast, toasts } = useToast();

      addToast({ message: 'Temp', type: 'info' });
      expect(toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(4000);
      expect(toasts.value).toHaveLength(0);
    });

    it('should use custom duration when specified', () => {
      const { addToast, toasts } = useToast();

      addToast({ message: 'Custom', type: 'info', duration: 2000 });
      expect(toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(1999);
      expect(toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(toasts.value).toHaveLength(0);
    });

    it('should not auto-remove when duration is 0', () => {
      const { addToast, toasts } = useToast();

      addToast({ message: 'Permanent', type: 'info', duration: 0 });

      vi.advanceTimersByTime(100000);
      expect(toasts.value).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('should remove a specific toast by id', () => {
      const { addToast, removeToast, toasts } = useToast();

      const id1 = addToast({ message: 'First', type: 'info', duration: 0 });
      addToast({ message: 'Second', type: 'info', duration: 0 });
      expect(toasts.value).toHaveLength(2);

      removeToast(id1);
      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0]!.message).toBe('Second');
    });

    it('should do nothing for non-existent id', () => {
      const { addToast, removeToast, toasts } = useToast();

      addToast({ message: 'Test', type: 'info', duration: 0 });
      removeToast('non-existent');

      expect(toasts.value).toHaveLength(1);
    });
  });

  describe('convenience methods', () => {
    it('success() should create a success toast', () => {
      const { success, toasts } = useToast();

      success('Operation completed');

      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0]!.type).toBe('success');
      expect(toasts.value[0]!.message).toBe('Operation completed');
    });

    it('error() should create an error toast with 6000ms default duration', () => {
      const { error, toasts } = useToast();

      error('Something failed');

      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0]!.type).toBe('error');

      // Should still be visible at 5999ms
      vi.advanceTimersByTime(5999);
      expect(toasts.value).toHaveLength(1);

      // Should be gone at 6000ms
      vi.advanceTimersByTime(1);
      expect(toasts.value).toHaveLength(0);
    });

    it('info() should create an info toast', () => {
      const { info, toasts } = useToast();

      info('FYI');

      expect(toasts.value[0]!.type).toBe('info');
    });

    it('warning() should create a warning toast', () => {
      const { warning, toasts } = useToast();

      warning('Be careful');

      expect(toasts.value[0]!.type).toBe('warning');
    });

    it('should accept custom duration on convenience methods', () => {
      const { success, toasts } = useToast();

      success('Quick', 1000);

      vi.advanceTimersByTime(1000);
      expect(toasts.value).toHaveLength(0);
    });
  });

  describe('shared state', () => {
    it('should share toasts across multiple useToast() calls', () => {
      const toast1 = useToast();
      const toast2 = useToast();

      toast1.addToast({ message: 'Shared', type: 'info', duration: 0 });

      expect(toast2.toasts.value).toHaveLength(1);
      expect(toast2.toasts.value[0]!.message).toBe('Shared');
    });
  });
});
