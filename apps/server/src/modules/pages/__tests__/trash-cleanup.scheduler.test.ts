import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSchedule, mockValidate } = vi.hoisted(() => {
  const mockSchedule = vi.fn();
  const mockValidate = vi.fn();

  return { mockSchedule, mockValidate };
});

vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
    validate: mockValidate,
  },
}));

vi.mock('../trash-cleanup.service.js', () => ({
  cleanupExpiredTrash: vi.fn().mockResolvedValue(0),
}));

import {
  startTrashCleanupScheduler,
  stopTrashCleanupScheduler,
} from '../trash-cleanup.scheduler.js';
import { cleanupExpiredTrash } from '../trash-cleanup.service.js';

describe('Trash Cleanup Scheduler', () => {
  let mockTask: { stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTask = { stop: vi.fn() };
    mockSchedule.mockReturnValue(mockTask);
    mockValidate.mockReturnValue(true);
  });

  afterEach(() => {
    stopTrashCleanupScheduler();
  });

  // ===========================================
  // startTrashCleanupScheduler
  // ===========================================

  describe('startTrashCleanupScheduler', () => {
    it('should validate and schedule a cron job at 02:00 daily', () => {
      startTrashCleanupScheduler();

      expect(mockValidate).toHaveBeenCalledWith('0 2 * * *');
      expect(mockSchedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
    });

    it('should not schedule when cron expression is invalid', () => {
      mockValidate.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      startTrashCleanupScheduler();

      expect(mockSchedule).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log a startup message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      startTrashCleanupScheduler();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[trash-cleanup] Trash cleanup scheduler started')
      );

      consoleSpy.mockRestore();
    });

    it('should call cleanupExpiredTrash when the cron job fires', async () => {
      startTrashCleanupScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(cleanupExpiredTrash).toHaveBeenCalledTimes(1);
    });

    it('should log count when pages are cleaned up', async () => {
      vi.mocked(cleanupExpiredTrash).mockResolvedValue(7);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      startTrashCleanupScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permanently deleted 7 expired trashed page(s)')
      );

      consoleSpy.mockRestore();
    });

    it('should not log count when no pages are cleaned up', async () => {
      vi.mocked(cleanupExpiredTrash).mockResolvedValue(0);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      startTrashCleanupScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await callback();

      const countLogs = consoleSpy.mock.calls.filter((call) =>
        String(call[0]).includes('Permanently deleted')
      );
      expect(countLogs).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it('should handle errors in the cron callback without throwing', async () => {
      vi.mocked(cleanupExpiredTrash).mockRejectedValue(new Error('Cleanup failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      startTrashCleanupScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;

      await expect(callback()).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[trash-cleanup] Scheduled trash cleanup failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  // ===========================================
  // stopTrashCleanupScheduler
  // ===========================================

  describe('stopTrashCleanupScheduler', () => {
    it('should stop the scheduled task', () => {
      startTrashCleanupScheduler();
      stopTrashCleanupScheduler();

      expect(mockTask.stop).toHaveBeenCalledTimes(1);
    });

    it('should not throw when stopping without starting', () => {
      expect(() => stopTrashCleanupScheduler()).not.toThrow();
    });

    it('should not throw when called multiple times', () => {
      startTrashCleanupScheduler();
      stopTrashCleanupScheduler();

      expect(() => stopTrashCleanupScheduler()).not.toThrow();
    });

    it('should set task to null so subsequent stop calls are no-ops', () => {
      startTrashCleanupScheduler();
      stopTrashCleanupScheduler();
      stopTrashCleanupScheduler();

      expect(mockTask.stop).toHaveBeenCalledTimes(1);
    });
  });
});
