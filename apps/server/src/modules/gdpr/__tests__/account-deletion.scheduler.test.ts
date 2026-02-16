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

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../../lib/logger.js', () => ({
  logger: mockLogger,
}));

vi.mock('../account-deletion.service.js', () => ({
  processScheduledDeletions: vi.fn().mockResolvedValue(0),
}));

vi.mock('../data-export.service.js', () => ({
  cleanupExpiredExports: vi.fn().mockResolvedValue(0),
}));

import { startGdprScheduler, stopGdprScheduler } from '../account-deletion.scheduler.js';
import { processScheduledDeletions } from '../account-deletion.service.js';
import { cleanupExpiredExports } from '../data-export.service.js';

describe('GDPR Scheduler', () => {
  let mockTask: { stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTask = { stop: vi.fn() };
    mockSchedule.mockReturnValue(mockTask);
    mockValidate.mockReturnValue(true);
  });

  afterEach(() => {
    stopGdprScheduler();
  });

  // ===========================================
  // startGdprScheduler
  // ===========================================

  describe('startGdprScheduler', () => {
    it('should validate and schedule a cron job with the correct expression', () => {
      startGdprScheduler();

      expect(mockValidate).toHaveBeenCalledWith('0 3 * * *');
      expect(mockSchedule).toHaveBeenCalledWith('0 3 * * *', expect.any(Function));
    });

    it('should not schedule when cron expression is invalid', () => {
      mockValidate.mockReturnValue(false);

      startGdprScheduler();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should log a startup message', () => {
      startGdprScheduler();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[gdpr] GDPR scheduler started')
      );
    });

    it('should call processScheduledDeletions when the cron job fires', async () => {
      startGdprScheduler();

      // Extract the callback passed to cron.schedule and invoke it
      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(processScheduledDeletions).toHaveBeenCalledTimes(1);
    });

    it('should call cleanupExpiredExports when the cron job fires', async () => {
      startGdprScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(cleanupExpiredExports).toHaveBeenCalledTimes(1);
    });

    it('should log counts when deletions or cleanups are made', async () => {
      vi.mocked(processScheduledDeletions).mockResolvedValue(3);
      vi.mocked(cleanupExpiredExports).mockResolvedValue(5);

      startGdprScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Permanently deleted 3 account(s)')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 5 expired export(s)')
      );
    });

    it('should not log counts when there are no deletions or cleanups', async () => {
      vi.mocked(processScheduledDeletions).mockResolvedValue(0);
      vi.mocked(cleanupExpiredExports).mockResolvedValue(0);

      startGdprScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await callback();

      // Should log the start/end messages but not the count messages
      const countLogs = mockLogger.info.mock.calls.filter(
        (call: unknown[]) =>
          String(call[0]).includes('deleted') || String(call[0]).includes('Cleaned up')
      );
      expect(countLogs).toHaveLength(0);
    });

    it('should handle errors in the cron callback without throwing', async () => {
      vi.mocked(processScheduledDeletions).mockRejectedValue(new Error('Scheduler error'));

      startGdprScheduler();

      const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;

      // Should not throw
      await expect(callback()).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.stringContaining('[gdpr] Scheduled GDPR maintenance failed')
      );
    });
  });

  // ===========================================
  // stopGdprScheduler
  // ===========================================

  describe('stopGdprScheduler', () => {
    it('should stop the scheduled task', () => {
      startGdprScheduler();
      stopGdprScheduler();

      expect(mockTask.stop).toHaveBeenCalledTimes(1);
    });

    it('should not throw when stopping without starting', () => {
      expect(() => stopGdprScheduler()).not.toThrow();
    });

    it('should not throw when called multiple times', () => {
      startGdprScheduler();
      stopGdprScheduler();

      // Second call should be a no-op (task is already null)
      expect(() => stopGdprScheduler()).not.toThrow();
    });

    it('should set task to null so subsequent stop calls are no-ops', () => {
      startGdprScheduler();
      stopGdprScheduler();
      stopGdprScheduler();

      // stop should only be called once on the task
      expect(mockTask.stop).toHaveBeenCalledTimes(1);
    });
  });
});
