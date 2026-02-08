import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireSuperAdmin } from '../admin/admin.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { env } from '../../config/index.js';
import * as backupService from './backup.service.js';
import * as systemBackupService from './system-backup.service.js';
import { createOrgBackupSchema, createSystemBackupSchema } from '@librediary/shared';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgParams {
  orgId: string;
}

interface BackupParams {
  backupId: string;
}

interface OrgBackupParams extends OrgParams {
  backupId: string;
}

// ===========================================
// ERROR RESPONSE HELPER
// ===========================================

function mapServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const errorMap: Record<string, { status: number; code: string; message: string }> = {
    BACKUP_NOT_FOUND: {
      status: 404,
      code: 'BACKUP_NOT_FOUND',
      message: 'Backup not found',
    },
    BACKUP_NOT_AVAILABLE: {
      status: 400,
      code: 'BACKUP_NOT_AVAILABLE',
      message: 'Backup is not available for download',
    },
  };

  const errorInfo = errorMap[message] || {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  return reply.status(errorInfo.status).send({
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
    },
  });
}

// ===========================================
// ADMIN BACKUP ROUTES (Super Admin only)
// ===========================================

export async function adminBackupRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSuperAdmin);

  // --- Get backup settings ---
  app.get('/settings', async (_request, reply) => {
    const pgDumpAvailable = await systemBackupService.checkPgDumpAvailable();

    return reply.send({
      success: true,
      data: {
        settings: {
          enabled: env.BACKUP_ENABLED,
          storageType: env.BACKUP_STORAGE_TYPE,
          schedule: env.BACKUP_SCHEDULE,
          retentionDays: env.BACKUP_RETENTION_DAYS,
          maxSizeMb: env.BACKUP_MAX_SIZE_MB,
          pgDumpAvailable,
        },
      },
    });
  });

  // --- Check pg_dump availability ---
  app.get('/pg-dump-check', async (_request, reply) => {
    const available = await systemBackupService.checkPgDumpAvailable();

    return reply.send({
      success: true,
      data: { available },
    });
  });

  // --- List all backups (admin view) ---
  app.get('/', async (_request, reply) => {
    const { prisma } = await import('../../lib/prisma.js');
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { name: true, slug: true } },
        triggeredBy: { select: { name: true, email: true } },
      },
    });

    return reply.send({
      success: true,
      data: { backups },
    });
  });

  // --- Create system backup ---
  app.post('/system', async (request, reply) => {
    const body = createSystemBackupSchema.parse(request.body);

    const backup = await systemBackupService.createSystemBackup(request.user!.id, {
      encrypt: body.encrypt,
      password: body.password,
    });

    return reply.status(201).send({
      success: true,
      data: { backup },
    });
  });

  // --- Get system backup ---
  app.get<{ Params: BackupParams }>(
    '/system/:backupId',
    async (request: FastifyRequest<{ Params: BackupParams }>, reply) => {
      try {
        const backup = await backupService.getBackup(request.params.backupId);
        return reply.send({
          success: true,
          data: { backup },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // --- Download system backup ---
  app.get<{ Params: BackupParams }>(
    '/system/:backupId/download',
    async (request: FastifyRequest<{ Params: BackupParams }>, reply) => {
      try {
        const result = await backupService.downloadBackup(request.params.backupId);

        return reply
          .header('content-type', 'application/octet-stream')
          .header(
            'content-disposition',
            `attachment; filename="${encodeURIComponent(result.fileName)}"`
          )
          .send(result.buffer);
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // --- Delete system backup ---
  app.delete<{ Params: BackupParams }>(
    '/system/:backupId',
    async (request: FastifyRequest<{ Params: BackupParams }>, reply) => {
      try {
        await backupService.deleteBackup(request.params.backupId);

        return reply.send({
          success: true,
          data: { message: 'Backup deleted' },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}

// ===========================================
// ORG BACKUP ROUTES (Org members)
// ===========================================

export async function orgBackupRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireOrgAccess);

  // --- List org backups ---
  app.get<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply) => {
      const backups = await backupService.listOrgBackups(request.params.orgId);

      return reply.send({
        success: true,
        data: { backups },
      });
    }
  );

  // --- Create org backup ---
  app.post<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply) => {
      const body = createOrgBackupSchema.parse(request.body);

      const backup = await backupService.createOrgBackup(request.params.orgId, request.user!.id, {
        encrypt: body.encrypt,
        password: body.password,
      });

      return reply.status(201).send({
        success: true,
        data: { backup },
      });
    }
  );

  // --- Get org backup ---
  app.get<{ Params: OrgBackupParams }>(
    '/:backupId',
    async (request: FastifyRequest<{ Params: OrgBackupParams }>, reply) => {
      try {
        const backup = await backupService.getBackup(request.params.backupId, request.params.orgId);

        return reply.send({
          success: true,
          data: { backup },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // --- Download org backup ---
  app.get<{ Params: OrgBackupParams }>(
    '/:backupId/download',
    async (request: FastifyRequest<{ Params: OrgBackupParams }>, reply) => {
      try {
        const result = await backupService.downloadBackup(
          request.params.backupId,
          request.params.orgId
        );

        return reply
          .header('content-type', 'application/octet-stream')
          .header(
            'content-disposition',
            `attachment; filename="${encodeURIComponent(result.fileName)}"`
          )
          .send(result.buffer);
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // --- Delete org backup ---
  app.delete<{ Params: OrgBackupParams }>(
    '/:backupId',
    async (request: FastifyRequest<{ Params: OrgBackupParams }>, reply) => {
      try {
        await backupService.deleteBackup(request.params.backupId, request.params.orgId);

        return reply.send({
          success: true,
          data: { message: 'Backup deleted' },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}

// Combined export for the module barrel
export async function backupRoutes(_app: FastifyInstance): Promise<void> {
  // Routes are registered separately in app.ts
}
