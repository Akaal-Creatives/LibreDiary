import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSchedule, mockValidate, mockEnvRef } = vi.hoisted(() => {
  const mockSchedule = vi.fn();
  const mockValidate = vi.fn();
  const mockEnvRef = {
    value: {
      BACKUP_ENABLED: true,
      BACKUP_SCHEDULE: '0 2 * * *',
    },
  };

  return { mockSchedule, mockValidate, mockEnvRef };
});

vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
    validate: mockValidate,
  },
}));

vi.mock('../system-backup.service.js', () => ({
  createSystemBackup: vi.fn().mockResolvedValue({ id: 'backup-1' }),
}));

vi.mock('../backup.service.js', () => ({
  cleanupOldBackups: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../../config/index.js', () => ({
  get env() {
    return mockEnvRef.value;
  },
}));

import { startBackupScheduler, stopBackupScheduler } from '../backup-scheduler.js';

describe('Backup Scheduler', () => {
  let mockTask: { stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTask = { stop: vi.fn() };
    mockSchedule.mockReturnValue(mockTask);
    mockValidate.mockReturnValue(true);
    mockEnvRef.value = {
      BACKUP_ENABLED: true,
      BACKUP_SCHEDULE: '0 2 * * *',
    };
  });

  afterEach(() => {
    stopBackupScheduler();
  });

  it('should start scheduler when BACKUP_ENABLED is true', () => {
    startBackupScheduler();

    expect(mockSchedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
  });

  it('should not start scheduler when BACKUP_ENABLED is false', () => {
    mockEnvRef.value.BACKUP_ENABLED = false;

    startBackupScheduler();

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('should use the configured cron expression', () => {
    mockEnvRef.value.BACKUP_SCHEDULE = '30 3 * * 0';

    startBackupScheduler();

    expect(mockSchedule).toHaveBeenCalledWith('30 3 * * 0', expect.any(Function));
  });

  it('should stop the scheduled task', () => {
    startBackupScheduler();
    stopBackupScheduler();

    expect(mockTask.stop).toHaveBeenCalledTimes(1);
  });

  it('should not throw when stopping without starting', () => {
    expect(() => stopBackupScheduler()).not.toThrow();
  });

  it('should not start if cron expression is invalid', () => {
    mockValidate.mockReturnValue(false);

    startBackupScheduler();

    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
