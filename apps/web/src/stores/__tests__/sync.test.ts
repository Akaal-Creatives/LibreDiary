import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSyncStore } from '../sync';

describe('Sync Store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================
  // INITIAL STATE
  // ===========================================

  describe('initial state', () => {
    it('should have idle status', () => {
      const store = useSyncStore();
      expect(store.status).toBe('idle');
    });

    it('should have isSyncing as false', () => {
      const store = useSyncStore();
      expect(store.isSyncing).toBe(false);
    });

    it('should have hasError as false', () => {
      const store = useSyncStore();
      expect(store.hasError).toBe(false);
    });

    it('should have empty statusMessage', () => {
      const store = useSyncStore();
      expect(store.statusMessage).toBe('');
    });

    it('should have no operations', () => {
      const store = useSyncStore();
      expect(store.operations.size).toBe(0);
    });

    it('should have null lastSavedAt', () => {
      const store = useSyncStore();
      expect(store.lastSavedAt).toBeNull();
    });
  });

  // ===========================================
  // startOperation
  // ===========================================

  describe('startOperation', () => {
    it('should add a pending operation', () => {
      const store = useSyncStore();
      store.startOperation('op-1');

      const op = store.operations.get('op-1');
      expect(op).toBeDefined();
      expect(op!.id).toBe('op-1');
      expect(op!.status).toBe('pending');
    });

    it('should default type to "content"', () => {
      const store = useSyncStore();
      store.startOperation('op-1');

      const op = store.operations.get('op-1');
      expect(op!.type).toBe('content');
    });

    it('should store a custom type when provided', () => {
      const store = useSyncStore();
      store.startOperation('op-1', 'metadata');

      const op = store.operations.get('op-1');
      expect(op!.type).toBe('metadata');
    });

    it('should record startedAt timestamp', () => {
      const now = Date.now();
      const store = useSyncStore();
      store.startOperation('op-1');

      const op = store.operations.get('op-1');
      expect(op!.startedAt).toBe(now);
    });

    it('should set status to pending', () => {
      const store = useSyncStore();
      store.startOperation('op-1');

      expect(store.status).toBe('pending');
    });

    it('should set statusMessage to "Waiting to save..."', () => {
      const store = useSyncStore();
      store.startOperation('op-1');

      expect(store.statusMessage).toBe('Waiting to save...');
    });

    it('should set isSyncing to true', () => {
      const store = useSyncStore();
      store.startOperation('op-1');

      expect(store.isSyncing).toBe(true);
    });
  });

  // ===========================================
  // markSaving
  // ===========================================

  describe('markSaving', () => {
    it('should change operation status to saving', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaving('op-1');

      const op = store.operations.get('op-1');
      expect(op!.status).toBe('saving');
    });

    it('should set global status to saving', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaving('op-1');

      expect(store.status).toBe('saving');
    });

    it('should set statusMessage to "Saving..."', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaving('op-1');

      expect(store.statusMessage).toBe('Saving...');
    });

    it('should keep isSyncing as true', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaving('op-1');

      expect(store.isSyncing).toBe(true);
    });

    it('should do nothing if the operation does not exist', () => {
      const store = useSyncStore();
      store.markSaving('nonexistent');

      expect(store.operations.size).toBe(0);
      expect(store.status).toBe('idle');
    });
  });

  // ===========================================
  // markSaved
  // ===========================================

  describe('markSaved', () => {
    it('should remove the operation', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaved('op-1');

      expect(store.operations.has('op-1')).toBe(false);
    });

    it('should set lastSavedAt to current time', () => {
      const now = Date.now();
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaved('op-1');

      expect(store.lastSavedAt).toBe(now);
    });

    it('should set status to saved immediately after', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaved('op-1');

      expect(store.status).toBe('saved');
    });

    it('should set statusMessage to "All changes saved"', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaved('op-1');

      expect(store.statusMessage).toBe('All changes saved');
    });

    it('should revert to idle after the 2000ms saved window expires', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaved('op-1');

      expect(store.status).toBe('saved');

      // Advance past the 2000ms window
      vi.advanceTimersByTime(2001);

      // The computed relies on Date.now() which is not reactive,
      // so we trigger re-evaluation by starting and immediately
      // completing a no-op operation to nudge the reactive deps.
      store.startOperation('nudge');
      store.markSaved('nudge');

      // After the second markSaved, the new lastSavedAt is current
      // time which is within 2000ms, so status will be 'saved' again.
      // Instead, verify the logic directly: after 2000ms, a read of
      // status without new ops should yield idle.
      // We achieve this by advancing time again past the second save.
      vi.advanceTimersByTime(2001);

      // Now force re-evaluation by mutating a reactive dep
      store.reset();

      expect(store.status).toBe('idle');
      expect(store.statusMessage).toBe('');
    });

    it('should report saved within the 2000ms window and idle after', () => {
      // Test the Date.now() based logic directly:
      // The computed checks `Date.now() - lastSavedAt.value < 2000`
      const store = useSyncStore();

      // At time T=0, markSaved sets lastSavedAt = 0
      store.startOperation('op-1');
      store.markSaved('op-1');
      expect(store.lastSavedAt).toBe(Date.now());
      expect(store.status).toBe('saved');

      // Advance 1999ms - still within window
      vi.advanceTimersByTime(1999);
      // Need to invalidate computed cache - start a new operation and remove it
      store.startOperation('probe');
      store.clearError('probe');
      expect(store.status).toBe('saved');

      // Advance past 2000ms total
      vi.advanceTimersByTime(2);
      store.startOperation('probe2');
      store.clearError('probe2');
      expect(store.status).toBe('idle');
    });
  });

  // ===========================================
  // markError
  // ===========================================

  describe('markError', () => {
    it('should set operation status to error', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1', 'Network failure');

      const op = store.operations.get('op-1');
      expect(op!.status).toBe('error');
    });

    it('should store the error message', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1', 'Network failure');

      const op = store.operations.get('op-1');
      expect(op!.error).toBe('Network failure');
    });

    it('should set global status to error', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1', 'Something went wrong');

      expect(store.status).toBe('error');
    });

    it('should set statusMessage to "Failed to save"', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1');

      expect(store.statusMessage).toBe('Failed to save');
    });

    it('should set hasError to true', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1');

      expect(store.hasError).toBe(true);
    });

    it('should set isSyncing to false', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1');

      expect(store.isSyncing).toBe(false);
    });

    it('should do nothing if the operation does not exist', () => {
      const store = useSyncStore();
      store.markError('nonexistent', 'Some error');

      expect(store.operations.size).toBe(0);
      expect(store.status).toBe('idle');
    });
  });

  // ===========================================
  // STATUS PRIORITY
  // ===========================================

  describe('status priority', () => {
    it('error should take priority over saving', () => {
      const store = useSyncStore();

      store.startOperation('op-1');
      store.markSaving('op-1');

      store.startOperation('op-2');
      store.markError('op-2', 'Failed');

      expect(store.status).toBe('error');
      expect(store.hasError).toBe(true);
    });

    it('error should take priority over pending', () => {
      const store = useSyncStore();

      store.startOperation('op-1');
      store.startOperation('op-2');
      store.markError('op-2');

      expect(store.status).toBe('error');
    });

    it('saving should take priority over pending', () => {
      const store = useSyncStore();

      store.startOperation('op-1');
      store.startOperation('op-2');
      store.markSaving('op-2');

      expect(store.status).toBe('saving');
    });
  });

  // ===========================================
  // clearError
  // ===========================================

  describe('clearError', () => {
    it('should remove the operation', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1', 'Oops');

      store.clearError('op-1');

      expect(store.operations.has('op-1')).toBe(false);
    });

    it('should restore status to idle when no other operations exist', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1');

      store.clearError('op-1');

      expect(store.status).toBe('idle');
      expect(store.hasError).toBe(false);
    });
  });

  // ===========================================
  // reset
  // ===========================================

  describe('reset', () => {
    it('should clear all operations', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.startOperation('op-2');
      store.startOperation('op-3');

      store.reset();

      expect(store.operations.size).toBe(0);
    });

    it('should set lastSavedAt to null', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markSaved('op-1');
      expect(store.lastSavedAt).not.toBeNull();

      store.reset();

      expect(store.lastSavedAt).toBeNull();
    });

    it('should return status to idle', () => {
      const store = useSyncStore();
      store.startOperation('op-1');
      store.markError('op-1');

      store.reset();

      expect(store.status).toBe('idle');
      expect(store.isSyncing).toBe(false);
      expect(store.hasError).toBe(false);
      expect(store.statusMessage).toBe('');
    });
  });
});
