/**
 * Encryption Routes — E2EE key material storage endpoints
 *
 * These routes store and retrieve encrypted key material.
 * The server NEVER has access to plaintext keys.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as encryptionService from './encryption.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const setupEncryptionSchema = z.object({
  publicKey: z.string().min(1),
  encryptedPrivateKey: z.string().min(1),
  keySalt: z.string().min(1),
  keyParams: z.object({
    memoryLimit: z.number(),
    opsLimit: z.number(),
  }),
  recoveryEncryptedMasterKey: z.any().optional(),
  recoverySalt: z.string().optional(),
  recoveryKeyHash: z.string().optional(),
});

const updateRecoverySchema = z.object({
  recoveryEncryptedMasterKey: z.any(),
  recoverySalt: z.string().min(1),
  recoveryKeyHash: z.string().min(1),
});

const enableWorkspaceSchema = z.object({
  encryptedKey: z.string().min(1),
  nonce: z.string().min(1),
  sharedByPublicKey: z.string().min(1),
});

const shareKeySchema = z.object({
  targetUserId: z.string().min(1),
  encryptedKey: z.string().min(1),
  nonce: z.string().min(1),
  sharedByPublicKey: z.string().min(1),
});

// ===========================================
// ERROR MAPS
// ===========================================

const setupErrorMap: ErrorMap = {
  'Encryption is already set up for this user': {
    status: 400,
    code: 'ENCRYPTION_ALREADY_SET_UP',
    message: 'Encryption is already set up for this user',
  },
};

const recoveryErrorMap: ErrorMap = {
  'Encryption is not set up for this user': {
    status: 400,
    code: 'ENCRYPTION_NOT_SET_UP',
    message: 'Encryption is not set up for this user',
  },
};

const workspaceErrorMap: ErrorMap = {
  'Organisation not found': {
    status: 404,
    code: 'ORG_NOT_FOUND',
    message: 'Organisation not found',
  },
  'Only owners and admins can enable encryption': {
    status: 403,
    code: 'FORBIDDEN',
    message: 'Only owners and admins can enable encryption',
  },
  'Workspace is already encrypted': {
    status: 400,
    code: 'ALREADY_ENCRYPTED',
    message: 'Workspace is already encrypted',
  },
  'Workspace is not encrypted': {
    status: 400,
    code: 'NOT_ENCRYPTED',
    message: 'Workspace is not encrypted',
  },
  'Target user is not a member of this organisation': {
    status: 400,
    code: 'NOT_A_MEMBER',
    message: 'Target user is not a member of this organisation',
  },
};

// ===========================================
// ROUTES
// ===========================================

export async function encryptionRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('onRequest', requireAuth);

  // POST /encryption/setup
  app.post('/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = setupEncryptionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      });
    }

    try {
      const user = getAuthUser(request);
      const result = await encryptionService.setupEncryption({
        userId: user.id,
        ...parsed.data,
      });
      return reply.status(201).send({ success: true, data: result });
    } catch (error) {
      return mapServiceError(error, reply, setupErrorMap);
    }
  });

  // GET /encryption/status
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getAuthUser(request);
    const result = await encryptionService.getEncryptionStatus(user.id);
    return reply.send({ success: true, data: result });
  });

  // GET /encryption/data
  app.get('/data', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getAuthUser(request);
    const result = await encryptionService.getEncryptionData(user.id);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ENCRYPTION_NOT_SET_UP',
          message: 'Encryption is not set up for this user',
        },
      });
    }

    return reply.send({ success: true, data: result });
  });

  // POST /encryption/recovery
  app.post('/recovery', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = updateRecoverySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      });
    }

    try {
      const user = getAuthUser(request);
      await encryptionService.updateRecoveryKey(user.id, parsed.data);
      return reply.send({ success: true });
    } catch (error) {
      return mapServiceError(error, reply, recoveryErrorMap);
    }
  });

  // POST /encryption/workspace/:organizationId/enable
  app.post(
    '/workspace/:organizationId/enable',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = enableWorkspaceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
          },
        });
      }

      try {
        const user = getAuthUser(request);
        const result = await encryptionService.enableWorkspaceEncryption({
          organizationId: request.params.organizationId,
          userId: user.id,
          ...parsed.data,
        });
        return reply.send({ success: true, data: result });
      } catch (error) {
        return mapServiceError(error, reply, workspaceErrorMap);
      }
    }
  );

  // GET /encryption/workspace/:organizationId/key-share
  app.get(
    '/workspace/:organizationId/key-share',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const user = getAuthUser(request);
      const result = await encryptionService.getWorkspaceKeyShare(
        request.params.organizationId,
        user.id
      );

      if (!result) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'KEY_SHARE_NOT_FOUND',
            message: 'No key share found for this workspace',
          },
        });
      }

      return reply.send({ success: true, data: result });
    }
  );

  // POST /encryption/workspace/:organizationId/key-shares
  app.post(
    '/workspace/:organizationId/key-shares',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = shareKeySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
          },
        });
      }

      try {
        const result = await encryptionService.shareWorkspaceKey({
          organizationId: request.params.organizationId,
          ...parsed.data,
        });
        return reply.status(201).send({ success: true, data: result });
      } catch (error) {
        return mapServiceError(error, reply, workspaceErrorMap);
      }
    }
  );

  // GET /encryption/workspace/:organizationId/key-shares
  app.get(
    '/workspace/:organizationId/key-shares',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const result = await encryptionService.listWorkspaceKeyShares(request.params.organizationId);
      return reply.send({ success: true, data: result });
    }
  );
}
