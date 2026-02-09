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
const { mockFilesService, resetMocks } = vi.hoisted(() => {
  const mockFilesService = {
    getStorageInfo: vi.fn(),
    testStorageConnection: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockFilesService).forEach((mock) => mock.mockReset());
  }

  return { mockFilesService, resetMocks };
});

vi.mock('../../files/files.service.js', () => mockFilesService);

// Need to also mock the prisma imports that admin.service uses
vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    user: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    organization: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
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
});
