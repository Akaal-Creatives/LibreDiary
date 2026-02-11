import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth, getClientIp } from '../auth/auth.middleware.js';
import { getAuthUser } from '../../utils/errors.js';
import { logAudit } from '../audit/audit.service.js';
import {
  requestDataExport,
  listDataExports,
  getDataExport,
  getExportArchive,
} from './data-export.service.js';
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
} from './account-deletion.service.js';

const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export async function gdprRoutes(fastify: FastifyInstance): Promise<void> {
  // =============================================
  // DATA EXPORT
  // =============================================

  /**
   * POST /gdpr/export — Request a new data export
   */
  fastify.post(
    '/export',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getAuthUser(request);

      try {
        const dataExport = await requestDataExport(user.id);

        logAudit({
          action: 'GDPR_DATA_EXPORT_REQUESTED',
          userId: user.id,
          resourceType: 'data_export',
          resourceId: dataExport.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
        });

        return {
          success: true,
          data: { export: dataExport },
        };
      } catch (error) {
        if ((error as Error).message === 'EXPORT_LIMIT_REACHED') {
          return reply.status(429).send({
            success: false,
            error: {
              code: 'EXPORT_LIMIT_REACHED',
              message: 'Too many pending exports. Please wait for current exports to complete.',
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /gdpr/exports — List all data exports for the authenticated user
   */
  fastify.get('/exports', { preHandler: [requireAuth] }, async (request: FastifyRequest) => {
    const user = getAuthUser(request);
    const exports = await listDataExports(user.id);

    return {
      success: true,
      data: { exports },
    };
  });

  /**
   * GET /gdpr/exports/:id — Get a single data export
   */
  fastify.get(
    '/exports/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getAuthUser(request);
      const dataExport = await getDataExport(request.params.id, user.id);

      if (!dataExport) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Export not found' },
        });
      }

      return {
        success: true,
        data: { export: dataExport },
      };
    }
  );

  /**
   * GET /gdpr/exports/:id/download — Download a completed data export
   */
  fastify.get(
    '/exports/:id/download',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getAuthUser(request);
      const result = await getExportArchive(request.params.id, user.id);

      if (!result) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Export not found, expired, or not yet ready',
          },
        });
      }

      logAudit({
        action: 'GDPR_DATA_EXPORT_DOWNLOADED',
        userId: user.id,
        resourceType: 'data_export',
        resourceId: request.params.id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', `attachment; filename="${result.fileName}"`)
        .header('Content-Length', result.buffer.length)
        .send(result.buffer);
    }
  );

  // =============================================
  // ACCOUNT DELETION
  // =============================================

  /**
   * GET /gdpr/deletion-status — Check account deletion status
   */
  fastify.get(
    '/deletion-status',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getAuthUser(request);
      const status = await getDeletionStatus(user.id);

      if (!status) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      return {
        success: true,
        data: status,
      };
    }
  );

  /**
   * POST /gdpr/delete-account — Request account deletion (30-day grace period)
   */
  fastify.post(
    '/delete-account',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getAuthUser(request);

      const body = deleteAccountSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'You must type "DELETE MY ACCOUNT" to confirm',
          },
        });
      }

      try {
        const { deletionDate } = await requestAccountDeletion(user.id);

        logAudit({
          action: 'GDPR_ACCOUNT_DELETION_REQUESTED',
          userId: user.id,
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
          metadata: { scheduledDeletionDate: deletionDate.toISOString() },
        });

        return {
          success: true,
          data: {
            message:
              'Account deletion requested. Your account will be permanently deleted in 30 days.',
            scheduledDeletionDate: deletionDate,
          },
        };
      } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'ACCOUNT_ALREADY_DELETED') {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'ACCOUNT_ALREADY_DELETED',
              message: 'Account deletion is already in progress',
            },
          });
        }
        if (msg.startsWith('SOLE_OWNER:')) {
          const orgNames = msg.replace('SOLE_OWNER:', '');
          return reply.status(409).send({
            success: false,
            error: {
              code: 'SOLE_OWNER',
              message: `You are the sole owner of: ${orgNames}. Transfer ownership before deleting your account.`,
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /gdpr/cancel-deletion — Cancel a pending account deletion
   */
  fastify.post(
    '/cancel-deletion',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getAuthUser(request);

      try {
        await cancelAccountDeletion(user.id);

        logAudit({
          action: 'GDPR_ACCOUNT_DELETION_CANCELLED',
          userId: user.id,
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
        });

        return {
          success: true,
          data: { message: 'Account deletion has been cancelled' },
        };
      } catch (error) {
        if ((error as Error).message === 'NO_PENDING_DELETION') {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'NO_PENDING_DELETION',
              message: 'No pending account deletion to cancel',
            },
          });
        }
        throw error;
      }
    }
  );
}
