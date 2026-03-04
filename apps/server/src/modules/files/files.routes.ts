import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as filesService from './files.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgParams {
  orgId: string;
}

interface FileParams extends OrgParams {
  fileId: string;
}

interface ListQuery {
  pageId?: string;
}

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  FILE_NOT_FOUND: {
    status: 404,
    code: 'FILE_NOT_FOUND',
    message: 'File not found',
  },
  FILE_TOO_LARGE: {
    status: 413,
    code: 'FILE_TOO_LARGE',
    message: 'File exceeds maximum size limit',
  },
  FILE_TYPE_NOT_ALLOWED: {
    status: 415,
    code: 'FILE_TYPE_NOT_ALLOWED',
    message: 'This file type is not allowed for security reasons',
  },
};

// ===========================================
// FILE ROUTES
// ===========================================

export async function filesRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  // --- Upload file (multipart) ---

  fastify.post<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'NO_FILE',
              message: 'No file provided',
            },
          });
        }

        const buffer = await data.toBuffer();
        const pageId = data.fields.pageId
          ? String(
              (data.fields.pageId as { value?: string }).value ??
                (data.fields.pageId as unknown as string)
            )
          : undefined;

        const file = await filesService.uploadFile(
          request.params.orgId,
          getAuthUser(request).id,
          {
            buffer,
            originalName: data.filename,
            mimeType: data.mimetype,
            size: buffer.length,
          },
          pageId ? { pageId } : undefined
        );

        return reply.status(201).send({
          success: true,
          data: { file },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- List files ---

  fastify.get<{ Params: OrgParams; Querystring: ListQuery }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams; Querystring: ListQuery }>) => {
      const { pageId } = request.query;
      const files = await filesService.listFiles(
        request.params.orgId,
        pageId ? { pageId } : undefined
      );

      return {
        success: true,
        data: { files },
      };
    }
  );

  // --- Get file metadata ---

  fastify.get<{ Params: FileParams }>(
    '/:fileId',
    async (request: FastifyRequest<{ Params: FileParams }>, reply: FastifyReply) => {
      try {
        const file = await filesService.getFile(request.params.orgId, request.params.fileId);

        return {
          success: true,
          data: { file },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Download file ---

  fastify.get<{ Params: FileParams }>(
    '/:fileId/download',
    async (request: FastifyRequest<{ Params: FileParams }>, reply: FastifyReply) => {
      try {
        const result = await filesService.downloadFile(request.params.orgId, request.params.fileId);

        return reply
          .header('content-type', result.mimeType)
          .header('x-content-type-options', 'nosniff')
          .header(
            'content-disposition',
            `attachment; filename="${encodeURIComponent(result.filename)}"`
          )
          .send(result.buffer);
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Delete file ---

  fastify.delete<{ Params: FileParams }>(
    '/:fileId',
    async (request: FastifyRequest<{ Params: FileParams }>, reply: FastifyReply) => {
      try {
        await filesService.deleteFile(request.params.orgId, request.params.fileId);

        return {
          success: true,
          data: { message: 'File deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );
}
