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
import { generateOtp, hashToken, expiresIn, EXPIRATION } from '../../utils/tokens.js';
import { sendEncryptionChangeOtpEmail } from '../../services/email.service.js';

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

const requestChangeSchema = z.object({
  workspaceName: z.string().min(1),
});

const verifyCodeSchema = z.object({
  code: z.string().length(6),
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

const changeRequestErrorMap: ErrorMap = {
  'No pending verification request found': {
    status: 400,
    code: 'NO_PENDING_REQUEST',
    message: 'No pending verification request found',
  },
  'Verification code has expired': {
    status: 400,
    code: 'CODE_EXPIRED',
    message: 'Verification code has expired',
  },
  'Invalid verification code': {
    status: 400,
    code: 'INVALID_CODE',
    message: 'Invalid verification code',
  },
  'Workspace is not encrypted': {
    status: 400,
    code: 'NOT_ENCRYPTED',
    message: 'Workspace is not encrypted',
  },
  'Only owners and admins can disable encryption': {
    status: 403,
    code: 'FORBIDDEN',
    message: 'Only owners and admins can disable encryption',
  },
  'Verified disable request required': {
    status: 400,
    code: 'VERIFICATION_REQUIRED',
    message: 'A verified disable request is required',
  },
  'Organisation not found': {
    status: 404,
    code: 'ORG_NOT_FOUND',
    message: 'Organisation not found',
  },
  'Only owners and admins can manage encryption': {
    status: 403,
    code: 'FORBIDDEN',
    message: 'Only owners and admins can manage encryption',
  },
  'Workspace is not in encryption grace period': {
    status: 400,
    code: 'NOT_IN_GRACE_PERIOD',
    message: 'Workspace is not in encryption grace period',
  },
};

// Stricter rate limit for OTP verification endpoints to prevent brute-force
const otpVerifyRateLimit = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '5 minutes',
    },
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

  // =============================================
  // Encryption Change Request Routes
  // =============================================

  // POST /encryption/workspace/:organizationId/request-enable
  app.post(
    '/workspace/:organizationId/request-enable',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = requestChangeSchema.safeParse(request.body);
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

      const user = getAuthUser(request);
      const hasData = await encryptionService.hasWorkspaceData(request.params.organizationId);

      if (!hasData) {
        return reply.send({ success: true, data: { requiresVerification: false } });
      }

      const otp = generateOtp();
      await encryptionService.createEncryptionChangeRequest({
        organizationId: request.params.organizationId,
        requestedById: user.id,
        type: 'ENABLE',
        verificationCodeHash: otp.hash,
        verificationExpiresAt: expiresIn(EXPIRATION.OTP),
      });

      await sendEncryptionChangeOtpEmail({
        to: user.email,
        recipientName: user.name ?? '',
        workspaceName: parsed.data.workspaceName,
        action: 'enable',
        code: otp.code,
      });

      return reply.send({ success: true, data: { requiresVerification: true } });
    }
  );

  // POST /encryption/workspace/:organizationId/verify-enable
  app.post(
    '/workspace/:organizationId/verify-enable',
    otpVerifyRateLimit,
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = verifyCodeSchema.safeParse(request.body);
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
        await encryptionService.verifyEncryptionChangeRequest({
          organizationId: request.params.organizationId,
          type: 'ENABLE',
          codeHash: hashToken(parsed.data.code),
        });
        return reply.send({ success: true });
      } catch (error) {
        return mapServiceError(error, reply, changeRequestErrorMap);
      }
    }
  );

  // POST /encryption/workspace/:organizationId/request-disable
  app.post(
    '/workspace/:organizationId/request-disable',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = requestChangeSchema.safeParse(request.body);
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

      const user = getAuthUser(request);
      const otp = generateOtp();

      await encryptionService.createEncryptionChangeRequest({
        organizationId: request.params.organizationId,
        requestedById: user.id,
        type: 'DISABLE',
        verificationCodeHash: otp.hash,
        verificationExpiresAt: expiresIn(EXPIRATION.OTP),
      });

      await sendEncryptionChangeOtpEmail({
        to: user.email,
        recipientName: user.name ?? '',
        workspaceName: parsed.data.workspaceName,
        action: 'disable',
        code: otp.code,
      });

      return reply.send({ success: true, data: { requiresVerification: true } });
    }
  );

  // POST /encryption/workspace/:organizationId/verify-disable
  app.post(
    '/workspace/:organizationId/verify-disable',
    otpVerifyRateLimit,
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = verifyCodeSchema.safeParse(request.body);
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
        await encryptionService.verifyEncryptionChangeRequest({
          organizationId: request.params.organizationId,
          type: 'DISABLE',
          codeHash: hashToken(parsed.data.code),
        });
        return reply.send({ success: true });
      } catch (error) {
        return mapServiceError(error, reply, changeRequestErrorMap);
      }
    }
  );

  // POST /encryption/workspace/:organizationId/disable
  app.post(
    '/workspace/:organizationId/disable',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const user = getAuthUser(request);
        const result = await encryptionService.disableWorkspaceEncryption({
          organizationId: request.params.organizationId,
          userId: user.id,
        });
        return reply.send({ success: true, data: result });
      } catch (error) {
        return mapServiceError(error, reply, changeRequestErrorMap);
      }
    }
  );

  // POST /encryption/workspace/:organizationId/cancel-disable
  app.post(
    '/workspace/:organizationId/cancel-disable',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const user = getAuthUser(request);
        const result = await encryptionService.cancelDisableEncryption({
          organizationId: request.params.organizationId,
          userId: user.id,
        });
        return reply.send({ success: true, data: result });
      } catch (error) {
        return mapServiceError(error, reply, changeRequestErrorMap);
      }
    }
  );

  // GET /encryption/workspace/:organizationId/pending-members
  app.get(
    '/workspace/:organizationId/pending-members',
    async (
      request: FastifyRequest<{ Params: { organizationId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const result = await encryptionService.getMembersWithoutKeyShare(
          request.params.organizationId
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        return mapServiceError(error, reply, {
          'Organisation is not encrypted': {
            status: 400,
            code: 'NOT_ENCRYPTED',
            message: 'Organisation is not encrypted',
          },
        });
      }
    }
  );
}
