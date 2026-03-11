import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSchedule, mockValidate, mockPurgeEncryptedData, mockPrisma } = vi.hoisted(() => {
  const mockSchedule = vi.fn();
  const mockValidate = vi.fn();
  const mockPurgeEncryptedData = vi.fn();
  const mockPrisma = {
    organization: {
      findMany: vi.fn(),
    },
  };

  return { mockSchedule, mockValidate, mockPurgeEncryptedData, mockPrisma };
});

vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
    validate: mockValidate,
  },
}));

vi.mock('../encryption.service.js', () => ({
  purgeEncryptedData: mockPurgeEncryptedData,
}));

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  startEncryptionPurgeScheduler,
  stopEncryptionPurgeScheduler,
} from '../encryption-purge.scheduler.js';

describe('Encryption Purge Scheduler', () => {
  let mockTask: { stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTask = { stop: vi.fn() };
    mockSchedule.mockReturnValue(mockTask);
    mockValidate.mockReturnValue(true);
  });

  afterEach(() => {
    stopEncryptionPurgeScheduler();
  });

  it('should start scheduler with daily schedule', () => {
    startEncryptionPurgeScheduler();

    expect(mockSchedule).toHaveBeenCalledWith('0 3 * * *', expect.any(Function));
  });

  it('should not start if cron expression is invalid', () => {
    mockValidate.mockReturnValue(false);

    startEncryptionPurgeScheduler();

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('should stop the scheduled task', () => {
    startEncryptionPurgeScheduler();
    stopEncryptionPurgeScheduler();

    expect(mockTask.stop).toHaveBeenCalledTimes(1);
  });

  it('should not throw when stopping without starting', () => {
    expect(() => stopEncryptionPurgeScheduler()).not.toThrow();
  });

  it('should purge data for organisations past grace period', async () => {
    const expiredOrgs = [{ id: 'org-1' }, { id: 'org-2' }];
    mockPrisma.organization.findMany.mockResolvedValue(expiredOrgs);
    mockPurgeEncryptedData.mockResolvedValue(undefined);

    startEncryptionPurgeScheduler();

    // Extract and call the scheduled callback
    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
      where: {
        isEncrypted: false,
        encryptionDisabledAt: {
          lte: expect.any(Date),
        },
      },
      select: { id: true },
    });
    expect(mockPurgeEncryptedData).toHaveBeenCalledWith('org-1');
    expect(mockPurgeEncryptedData).toHaveBeenCalledWith('org-2');
    expect(mockPurgeEncryptedData).toHaveBeenCalledTimes(2);
  });

  it('should skip purge when no expired organisations found', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([]);
    mockPurgeEncryptedData.mockResolvedValue(undefined);

    startEncryptionPurgeScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockPurgeEncryptedData).not.toHaveBeenCalled();
  });

  it('should continue purging other organisations if one fails', async () => {
    const expiredOrgs = [{ id: 'org-1' }, { id: 'org-2' }, { id: 'org-3' }];
    mockPrisma.organization.findMany.mockResolvedValue(expiredOrgs);
    mockPurgeEncryptedData
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined);

    startEncryptionPurgeScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(mockPurgeEncryptedData).toHaveBeenCalledTimes(3);
  });
});
