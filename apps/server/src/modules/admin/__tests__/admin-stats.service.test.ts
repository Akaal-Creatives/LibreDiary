import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  user: {
    count: vi.fn(),
  },
  organization: {
    count: vi.fn(),
  },
  page: {
    count: vi.fn(),
  },
  database: {
    count: vi.fn(),
  },
  file: {
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  template: {
    count: vi.fn(),
  },
  backup: {
    count: vi.fn(),
  },
}));

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { getStats } from '../admin.service.js';

describe('getStats — extended content counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return users, organisations, pages, databases, files, templates, and backups', async () => {
    mockPrisma.user.count.mockResolvedValue(10);
    mockPrisma.organization.count.mockResolvedValue(5);
    mockPrisma.page.count.mockResolvedValue(100);
    mockPrisma.database.count.mockResolvedValue(8);
    mockPrisma.file.count.mockResolvedValue(50);
    mockPrisma.file.aggregate.mockResolvedValue({ _sum: { size: 52428800 } });
    mockPrisma.template.count.mockResolvedValue(12);
    mockPrisma.backup.count.mockResolvedValue(3);

    const stats = await getStats();

    expect(stats.users).toBeDefined();
    expect(stats.organizations).toBeDefined();
    expect(stats.pages).toBe(100);
    expect(stats.databases).toBe(8);
    expect(stats.files.total).toBe(50);
    expect(stats.files.totalSize).toBe(52428800);
    expect(stats.templates).toBe(12);
    expect(stats.backups).toBe(3);
  });

  it('should return files.totalSize as 0 when _sum.size is null (no files)', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.organization.count.mockResolvedValue(0);
    mockPrisma.page.count.mockResolvedValue(0);
    mockPrisma.database.count.mockResolvedValue(0);
    mockPrisma.file.count.mockResolvedValue(0);
    mockPrisma.file.aggregate.mockResolvedValue({ _sum: { size: null } });
    mockPrisma.template.count.mockResolvedValue(0);
    mockPrisma.backup.count.mockResolvedValue(0);

    const stats = await getStats();

    expect(stats.files.totalSize).toBe(0);
  });

  it('should run all queries in parallel (all mocks called exactly once)', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.organization.count.mockResolvedValue(1);
    mockPrisma.page.count.mockResolvedValue(1);
    mockPrisma.database.count.mockResolvedValue(1);
    mockPrisma.file.count.mockResolvedValue(1);
    mockPrisma.file.aggregate.mockResolvedValue({ _sum: { size: 100 } });
    mockPrisma.template.count.mockResolvedValue(1);
    mockPrisma.backup.count.mockResolvedValue(1);

    await getStats();

    // user.count is called 3 times (total, verified, superAdmins)
    expect(mockPrisma.user.count).toHaveBeenCalledTimes(3);
    // organization.count is called 2 times (total, active)
    expect(mockPrisma.organization.count).toHaveBeenCalledTimes(2);
    expect(mockPrisma.page.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.database.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.file.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.file.aggregate).toHaveBeenCalledTimes(1);
    expect(mockPrisma.template.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.backup.count).toHaveBeenCalledTimes(1);
  });
});
