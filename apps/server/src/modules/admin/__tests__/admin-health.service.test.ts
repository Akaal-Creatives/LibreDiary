import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  user: { count: vi.fn() },
  organization: { count: vi.fn() },
  page: { count: vi.fn() },
  database: { count: vi.fn() },
  file: { count: vi.fn(), aggregate: vi.fn() },
  template: { count: vi.fn() },
  backup: { count: vi.fn() },
}));

const mockFilesService = vi.hoisted(() => ({
  testStorageConnection: vi.fn(),
}));

const mockHocuspocus = vi.hoisted(() => ({
  getHocuspocusServer: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../files/files.service.js', () => mockFilesService);

vi.mock('../../collaboration/hocuspocus.js', () => mockHocuspocus);

import { getSystemHealth } from '../admin.service.js';

describe('getSystemHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return database.status as connected when prisma query succeeds', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(health.database.status).toBe('connected');
  });

  it('should return database.status as disconnected with error when prisma query fails', async () => {
    mockPrisma.user.count.mockRejectedValue(new Error('Connection refused'));
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(health.database.status).toBe('disconnected');
    expect(health.database.error).toBe('Connection refused');
  });

  it('should return storage.status as connected when testStorageConnection succeeds', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(health.storage.status).toBe('connected');
  });

  it('should return storage.status as disconnected when testStorageConnection fails', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({
      success: false,
      message: 'Bucket not found',
    });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(health.storage.status).toBe('disconnected');
    expect(health.storage.error).toBe('Bucket not found');
  });

  it('should return storage.status as disconnected when testStorageConnection throws', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockRejectedValue(new Error('Network error'));
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(health.storage.status).toBe('disconnected');
    expect(health.storage.error).toBe('Network error');
  });

  it('should return server.uptime as a positive number', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(typeof health.server.uptime).toBe('number');
    expect(health.server.uptime).toBeGreaterThan(0);
  });

  it('should return server.nodeVersion matching process.version', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(health.server.nodeVersion).toBe(process.version);
  });

  it('should return server.memory with rss, heapTotal, and heapUsed as numbers', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({});

    const health = await getSystemHealth();

    expect(typeof health.server.memory.rss).toBe('number');
    expect(typeof health.server.memory.heapTotal).toBe('number');
    expect(typeof health.server.memory.heapUsed).toBe('number');
  });

  it('should return collaboration.status as connected when Hocuspocus server is available', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockReturnValue({ someServer: true });

    const health = await getSystemHealth();

    expect(health.collaboration.status).toBe('connected');
  });

  it('should return collaboration.status as disconnected when Hocuspocus server throws', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockFilesService.testStorageConnection.mockResolvedValue({ success: true, message: 'OK' });
    mockHocuspocus.getHocuspocusServer.mockImplementation(() => {
      throw new Error('Not initialised');
    });

    const health = await getSystemHealth();

    expect(health.collaboration.status).toBe('disconnected');
  });
});
