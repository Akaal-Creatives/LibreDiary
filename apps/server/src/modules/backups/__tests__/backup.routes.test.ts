import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ===========================================
// MOCKS
// ===========================================

vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-1', email: 'admin@example.com', name: 'Admin' };
  }),
}));

vi.mock('../../admin/admin.middleware.js', () => ({
  requireSuperAdmin: vi.fn(async () => {
    // no-op, allow through
  }),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(async (request: { organizationId: string }) => {
    request.organizationId = 'org-1';
  }),
}));

const { mockBackupService, mockSystemBackupService, mockPrisma, mockEnvRef, resetMocks } =
  vi.hoisted(() => {
    const mockBackupService = {
      listOrgBackups: vi.fn(),
      createOrgBackup: vi.fn(),
      getBackup: vi.fn(),
      downloadBackup: vi.fn(),
      deleteBackup: vi.fn(),
    };

    const mockSystemBackupService = {
      checkPgDumpAvailable: vi.fn(),
      createSystemBackup: vi.fn(),
      listSystemBackups: vi.fn(),
    };

    const mockPrismaBackup = {
      findMany: vi.fn(),
    };

    const mockPrisma = {
      backup: mockPrismaBackup,
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    const mockEnvRef = {
      value: {
        BACKUP_ENABLED: true,
        BACKUP_STORAGE_TYPE: 'LOCAL',
        BACKUP_SCHEDULE: '0 2 * * *',
        BACKUP_RETENTION_DAYS: 30,
        BACKUP_MAX_SIZE_MB: 500,
      },
    };

    function resetMocks() {
      Object.values(mockBackupService).forEach((m) => m.mockReset());
      Object.values(mockSystemBackupService).forEach((m) => m.mockReset());
      Object.values(mockPrismaBackup).forEach((m) => m.mockReset());
    }

    return { mockBackupService, mockSystemBackupService, mockPrisma, mockEnvRef, resetMocks };
  });

vi.mock('../backup.service.js', () => mockBackupService);
vi.mock('../system-backup.service.js', () => mockSystemBackupService);
vi.mock('../../../lib/prisma.js', () => ({ prisma: mockPrisma }));
vi.mock('../../../config/index.js', () => ({
  get env() {
    return mockEnvRef.value;
  },
}));

vi.mock('@librediary/shared', () => ({
  createOrgBackupSchema: {
    parse: vi.fn((body: unknown) => body),
  },
  createSystemBackupSchema: {
    parse: vi.fn((body: unknown) => body),
  },
}));

import Fastify from 'fastify';
import { adminBackupRoutes, orgBackupRoutes } from '../backup.routes.js';

// ===========================================
// ADMIN BACKUP ROUTES
// ===========================================

describe('Admin Backup Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    await app.register(adminBackupRoutes, { prefix: '/admin/backups' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // --- GET /admin/backups/settings ---
  describe('GET /admin/backups/settings', () => {
    it('should return backup settings', async () => {
      mockSystemBackupService.checkPgDumpAvailable.mockResolvedValue(true);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/backups/settings',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.settings.enabled).toBe(true);
      expect(body.data.settings.storageType).toBe('LOCAL');
      expect(body.data.settings.schedule).toBe('0 2 * * *');
      expect(body.data.settings.retentionDays).toBe(30);
      expect(body.data.settings.maxSizeMb).toBe(500);
      expect(body.data.settings.pgDumpAvailable).toBe(true);
    });
  });

  // --- GET /admin/backups/pg-dump-check ---
  describe('GET /admin/backups/pg-dump-check', () => {
    it('should return pg_dump availability', async () => {
      mockSystemBackupService.checkPgDumpAvailable.mockResolvedValue(false);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/backups/pg-dump-check',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.available).toBe(false);
    });
  });

  // --- GET /admin/backups ---
  describe('GET /admin/backups', () => {
    it('should return all backups', async () => {
      const mockBackups = [
        { id: 'backup-1', type: 'SYSTEM', status: 'COMPLETED' },
        { id: 'backup-2', type: 'ORGANISATION', status: 'PENDING' },
      ];
      mockPrisma.backup.findMany.mockResolvedValue(mockBackups);

      const response = await app.inject({
        method: 'GET',
        url: '/admin/backups',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.backups).toHaveLength(2);
    });
  });

  // --- POST /admin/backups/system ---
  describe('POST /admin/backups/system', () => {
    it('should create a system backup', async () => {
      const mockBackup = { id: 'sys-1', type: 'SYSTEM', status: 'PENDING' };
      mockSystemBackupService.createSystemBackup.mockResolvedValue(mockBackup);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/backups/system',
        payload: { encrypt: false },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.backup.type).toBe('SYSTEM');
      expect(mockSystemBackupService.createSystemBackup).toHaveBeenCalledWith('user-1', {
        encrypt: false,
        password: undefined,
      });
    });

    it('should pass encryption options', async () => {
      mockSystemBackupService.createSystemBackup.mockResolvedValue({
        id: 'sys-1',
        isEncrypted: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/admin/backups/system',
        payload: { encrypt: true, password: 'securepass' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockSystemBackupService.createSystemBackup).toHaveBeenCalledWith('user-1', {
        encrypt: true,
        password: 'securepass',
      });
    });
  });

  // --- GET /admin/backups/system/:backupId ---
  describe('GET /admin/backups/system/:backupId', () => {
    it('should return a system backup', async () => {
      mockBackupService.getBackup.mockResolvedValue({ id: 'sys-1', type: 'SYSTEM' });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/backups/system/sys-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.backup.id).toBe('sys-1');
    });

    it('should return 404 when not found', async () => {
      mockBackupService.getBackup.mockRejectedValue(new Error('BACKUP_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/admin/backups/system/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BACKUP_NOT_FOUND');
    });
  });

  // --- GET /admin/backups/system/:backupId/download ---
  describe('GET /admin/backups/system/:backupId/download', () => {
    it('should return file binary', async () => {
      const content = Buffer.from('backup-data');
      mockBackupService.downloadBackup.mockResolvedValue({
        buffer: content,
        fileName: 'system-backup.tar.gz',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/admin/backups/system/sys-1/download',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('system-backup.tar.gz');
    });

    it('should return 400 when backup not available', async () => {
      mockBackupService.downloadBackup.mockRejectedValue(new Error('BACKUP_NOT_AVAILABLE'));

      const response = await app.inject({
        method: 'GET',
        url: '/admin/backups/system/sys-1/download',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BACKUP_NOT_AVAILABLE');
    });
  });

  // --- DELETE /admin/backups/system/:backupId ---
  describe('DELETE /admin/backups/system/:backupId', () => {
    it('should delete a system backup', async () => {
      mockBackupService.deleteBackup.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/backups/system/sys-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(mockBackupService.deleteBackup).toHaveBeenCalledWith('sys-1');
    });

    it('should return 404 when backup not found', async () => {
      mockBackupService.deleteBackup.mockRejectedValue(new Error('BACKUP_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/admin/backups/system/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

// ===========================================
// ORG BACKUP ROUTES
// ===========================================

describe('Org Backup Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(orgBackupRoutes, { prefix: '/organizations/:orgId/backups' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // --- GET /organizations/:orgId/backups ---
  describe('GET /organizations/:orgId/backups', () => {
    it('should return org backups', async () => {
      const mockBackups = [{ id: 'backup-1', type: 'ORGANISATION', status: 'COMPLETED' }];
      mockBackupService.listOrgBackups.mockResolvedValue(mockBackups);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-1/backups',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.backups).toHaveLength(1);
      expect(mockBackupService.listOrgBackups).toHaveBeenCalledWith('org-1');
    });
  });

  // --- POST /organizations/:orgId/backups ---
  describe('POST /organizations/:orgId/backups', () => {
    it('should create an org backup', async () => {
      const mockBackup = { id: 'backup-1', type: 'ORGANISATION', status: 'PENDING' };
      mockBackupService.createOrgBackup.mockResolvedValue(mockBackup);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-1/backups',
        payload: { encrypt: false },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.backup.type).toBe('ORGANISATION');
      expect(mockBackupService.createOrgBackup).toHaveBeenCalledWith('org-1', 'user-1', {
        encrypt: false,
        password: undefined,
      });
    });

    it('should pass encryption options', async () => {
      mockBackupService.createOrgBackup.mockResolvedValue({
        id: 'backup-1',
        isEncrypted: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-1/backups',
        payload: { encrypt: true, password: 'securepass' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockBackupService.createOrgBackup).toHaveBeenCalledWith('org-1', 'user-1', {
        encrypt: true,
        password: 'securepass',
      });
    });
  });

  // --- GET /organizations/:orgId/backups/:backupId ---
  describe('GET /organizations/:orgId/backups/:backupId', () => {
    it('should return a backup scoped to org', async () => {
      mockBackupService.getBackup.mockResolvedValue({
        id: 'backup-1',
        organizationId: 'org-1',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-1/backups/backup-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.backup.id).toBe('backup-1');
      expect(mockBackupService.getBackup).toHaveBeenCalledWith('backup-1', 'org-1');
    });

    it('should return 404 when not found', async () => {
      mockBackupService.getBackup.mockRejectedValue(new Error('BACKUP_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-1/backups/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BACKUP_NOT_FOUND');
    });
  });

  // --- GET /organizations/:orgId/backups/:backupId/download ---
  describe('GET /organizations/:orgId/backups/:backupId/download', () => {
    it('should return file binary', async () => {
      const content = Buffer.from('org-backup-data');
      mockBackupService.downloadBackup.mockResolvedValue({
        buffer: content,
        fileName: 'org-backup.tar.gz',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-1/backups/backup-1/download',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('org-backup.tar.gz');
      expect(mockBackupService.downloadBackup).toHaveBeenCalledWith('backup-1', 'org-1');
    });

    it('should return 400 when backup not available', async () => {
      mockBackupService.downloadBackup.mockRejectedValue(new Error('BACKUP_NOT_AVAILABLE'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-1/backups/backup-1/download',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // --- DELETE /organizations/:orgId/backups/:backupId ---
  describe('DELETE /organizations/:orgId/backups/:backupId', () => {
    it('should delete an org backup', async () => {
      mockBackupService.deleteBackup.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-1/backups/backup-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(mockBackupService.deleteBackup).toHaveBeenCalledWith('backup-1', 'org-1');
    });

    it('should return 404 when backup not found', async () => {
      mockBackupService.deleteBackup.mockRejectedValue(new Error('BACKUP_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-1/backups/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
