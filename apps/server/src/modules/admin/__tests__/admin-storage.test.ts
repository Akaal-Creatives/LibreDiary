import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth + admin middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; isSuperAdmin: boolean } }) => {
    request.user = { id: 'admin-1', isSuperAdmin: true };
  }),
}));

vi.mock('../admin.middleware.js', () => ({
  requireSuperAdmin: vi.fn(async () => {}),
}));

// Mock files service
const { mockFilesService, mockMigrationService, resetMocks } = vi.hoisted(() => {
  const mockFilesService = {
    getStorageInfo: vi.fn(),
    testStorageConnection: vi.fn(),
  };

  const mockMigrationService = {
    migrateStorage: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockFilesService).forEach((mock) => mock.mockReset());
    Object.values(mockMigrationService).forEach((mock) => mock.mockReset());
  }

  return { mockFilesService, mockMigrationService, resetMocks };
});

vi.mock('../../files/files.service.js', () => mockFilesService);
vi.mock('../../files/storage-migration.service.js', () => mockMigrationService);

// Need to also mock the prisma imports that admin.service and audit.service use
vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    user: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    organization: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import Fastify from 'fastify';
import { adminRoutes } from '../admin.routes.js';

describe('Admin Storage Endpoints', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // GET /admin/storage/info
  // ===========================================

  describe('GET /admin/storage/info', () => {
    it('should return storage type and usage stats with 200', async () => {
      mockFilesService.getStorageInfo.mockResolvedValue({
        type: 'LOCAL',
        totalFiles: 42,
        totalSize: 1048576,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/storage/info',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.storage.type).toBe('LOCAL');
      expect(body.data.storage.totalFiles).toBe(42);
      expect(body.data.storage.totalSize).toBe(1048576);
    });
  });

  // ===========================================
  // POST /admin/storage/test
  // ===========================================

  describe('POST /admin/storage/test', () => {
    it('should test storage connection and return result with 200', async () => {
      mockFilesService.testStorageConnection.mockResolvedValue({
        success: true,
        message: 'Local storage is accessible and writable',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/storage/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.result.success).toBe(true);
      expect(body.data.result.message).toContain('accessible');
    });
  });

  // ===========================================
  // POST /admin/storage/migrate
  // ===========================================

  describe('POST /admin/storage/migrate', () => {
    it('should trigger migration and return result with 200', async () => {
      mockMigrationService.migrateStorage.mockResolvedValue({
        total: 5,
        migrated: 5,
        failed: 0,
        errors: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/storage/migrate',
        headers: { 'content-type': 'application/json' },
        payload: { targetType: 'S3' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.result.total).toBe(5);
      expect(body.data.result.migrated).toBe(5);
      expect(body.data.result.failed).toBe(0);
    });

    it('should pass targetType to migration service', async () => {
      mockMigrationService.migrateStorage.mockResolvedValue({
        total: 0,
        migrated: 0,
        failed: 0,
        errors: [],
      });

      await app.inject({
        method: 'POST',
        url: '/admin/storage/migrate',
        payload: { targetType: 'MINIO' },
      });

      expect(mockMigrationService.migrateStorage).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'MINIO' })
      );
    });

    it('should support dry-run mode', async () => {
      mockMigrationService.migrateStorage.mockResolvedValue({
        total: 10,
        migrated: 0,
        failed: 0,
        errors: [],
        dryRun: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/storage/migrate',
        payload: { targetType: 'S3', dryRun: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.result.dryRun).toBe(true);
      expect(mockMigrationService.migrateStorage).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'S3', dryRun: true })
      );
    });

    it('should return 400 for missing targetType', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/storage/migrate',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid targetType', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/storage/migrate',
        payload: { targetType: 'INVALID' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return migration errors in response', async () => {
      mockMigrationService.migrateStorage.mockResolvedValue({
        total: 3,
        migrated: 2,
        failed: 1,
        errors: [{ fileId: 'file-3', fileName: 'broken.pdf', error: 'File not found on disk' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/storage/migrate',
        payload: { targetType: 'S3' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.result.failed).toBe(1);
      expect(body.data.result.errors).toHaveLength(1);
      expect(body.data.result.errors[0].fileId).toBe('file-3');
    });

    it('should return 500 when migration throws', async () => {
      mockMigrationService.migrateStorage.mockRejectedValue(
        new Error('Target storage connection failed: Invalid credentials')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/admin/storage/migrate',
        payload: { targetType: 'S3' },
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
