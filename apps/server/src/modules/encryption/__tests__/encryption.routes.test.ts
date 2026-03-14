import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// Mock setup using vi.hoisted for proper hoisting
const mockEncryptionService = vi.hoisted(() => ({
  setupEncryption: vi.fn(),
  getEncryptionStatus: vi.fn(),
  getEncryptionData: vi.fn(),
  updateRecoveryKey: vi.fn(),
  enableWorkspaceEncryption: vi.fn(),
  shareWorkspaceKey: vi.fn(),
  getWorkspaceKeyShare: vi.fn(),
  listWorkspaceKeyShares: vi.fn(),
  hasWorkspaceData: vi.fn(),
  createEncryptionChangeRequest: vi.fn(),
  verifyEncryptionChangeRequest: vi.fn(),
  disableWorkspaceEncryption: vi.fn(),
  cancelDisableEncryption: vi.fn(),
  purgeEncryptedData: vi.fn(),
  getMembersWithoutKeyShare: vi.fn(),
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());

const mockEmailService = vi.hoisted(() => ({
  sendEncryptionChangeOtpEmail: vi.fn(),
}));

const mockLogAudit = vi.hoisted(() => vi.fn());

vi.mock('../encryption.service.js', () => mockEncryptionService);
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: mockRequireAuth,
}));
vi.mock('../../../services/email.service.js', () => mockEmailService);
vi.mock('../../audit/audit.service.js', () => ({ logAudit: mockLogAudit }));

// Import routes after mocking
import { encryptionRoutes } from '../encryption.routes.js';

describe('Encryption Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock auth middleware to set request.user
    mockRequireAuth.mockImplementation(
      async (request: { user: { id: string; email: string; name: string | null } }) => {
        request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' } as {
          id: string;
          email: string;
          name: string | null;
        };
      }
    );

    app = Fastify();
    await app.register(encryptionRoutes, { prefix: '/encryption' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // =============================================
  // POST /encryption/setup
  // =============================================
  describe('POST /encryption/setup', () => {
    const validBody = {
      publicKey: 'base64-public-key',
      encryptedPrivateKey: 'base64-encrypted-private-key',
      keySalt: 'base64-salt',
      keyParams: { memoryLimit: 65536, opsLimit: 3 },
      recoveryEncryptedMasterKey: { version: 1, iv: 'abc', ciphertext: 'def' },
      recoverySalt: 'base64-recovery-salt',
      recoveryKeyHash: 'base64-hash',
    };

    it('should set up encryption successfully', async () => {
      mockEncryptionService.setupEncryption.mockResolvedValue({
        id: 'enc-123',
        userId: 'user-123',
        publicKey: validBody.publicKey,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/setup',
        payload: validBody,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(mockEncryptionService.setupEncryption).toHaveBeenCalledWith({
        userId: 'user-123',
        ...validBody,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/encryption/setup',
        payload: {
          publicKey: 'key',
          // Missing encryptedPrivateKey, keySalt
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });

    it('should return 400 when encryption already set up', async () => {
      mockEncryptionService.setupEncryption.mockRejectedValue(
        new Error('Encryption is already set up for this user')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/setup',
        payload: validBody,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.message).toBe('Encryption is already set up for this user');
    });
  });

  // =============================================
  // GET /encryption/status
  // =============================================
  describe('GET /encryption/status', () => {
    it('should return encryption status', async () => {
      mockEncryptionService.getEncryptionStatus.mockResolvedValue({
        isSetUp: true,
        publicKey: 'base64-pk',
        keySalt: 'base64-salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        hasRecoveryKey: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/status',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.isSetUp).toBe(true);
      expect(body.data.publicKey).toBe('base64-pk');
    });

    it('should return not set up when no encryption exists', async () => {
      mockEncryptionService.getEncryptionStatus.mockResolvedValue({
        isSetUp: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/status',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.isSetUp).toBe(false);
    });
  });

  // =============================================
  // GET /encryption/data
  // =============================================
  describe('GET /encryption/data', () => {
    it('should return full encryption data', async () => {
      mockEncryptionService.getEncryptionData.mockResolvedValue({
        id: 'enc-123',
        publicKey: 'pk',
        encryptedPrivateKey: 'epk',
        keySalt: 'salt',
        keyParams: { memoryLimit: 65536, opsLimit: 3 },
        recoveryEncryptedMasterKey: { version: 1 },
        recoverySalt: 'rsalt',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/data',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.encryptedPrivateKey).toBe('epk');
    });

    it('should return 404 when no encryption set up', async () => {
      mockEncryptionService.getEncryptionData.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/data',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // =============================================
  // POST /encryption/recovery
  // =============================================
  describe('POST /encryption/recovery', () => {
    it('should update recovery key data', async () => {
      mockEncryptionService.updateRecoveryKey.mockResolvedValue({
        id: 'enc-123',
        recoveryKeyHash: 'new-hash',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/recovery',
        payload: {
          recoveryEncryptedMasterKey: { version: 1, iv: 'iv', ciphertext: 'ct' },
          recoverySalt: 'salt',
          recoveryKeyHash: 'hash',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should return 400 for missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/encryption/recovery',
        payload: {
          recoverySalt: 'salt',
          // Missing recoveryEncryptedMasterKey and recoveryKeyHash
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/enable
  // =============================================
  describe('POST /encryption/workspace/:organizationId/enable', () => {
    it('should enable workspace encryption', async () => {
      mockEncryptionService.enableWorkspaceEncryption.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/enable',
        payload: {
          encryptedKey: 'base64-key',
          nonce: 'base64-nonce',
          sharedByPublicKey: 'base64-pk',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.isEncrypted).toBe(true);
    });

    it('should return 400 for missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/enable',
        payload: {
          encryptedKey: 'key',
          // Missing nonce, sharedByPublicKey
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =============================================
  // GET /encryption/workspace/:organizationId/key-share
  // =============================================
  describe('GET /encryption/workspace/:organizationId/key-share', () => {
    it('should return key share for the user', async () => {
      mockEncryptionService.getWorkspaceKeyShare.mockResolvedValue({
        id: 'share-123',
        encryptedKey: 'base64-key',
        nonce: 'base64-nonce',
        sharedByPublicKey: 'base64-pk',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/workspace/org-123/key-share',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.encryptedKey).toBe('base64-key');
    });

    it('should return 404 when no key share exists', async () => {
      mockEncryptionService.getWorkspaceKeyShare.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/workspace/org-123/key-share',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/key-shares
  // =============================================
  describe('POST /encryption/workspace/:organizationId/key-shares', () => {
    it('should share workspace key with a collaborator', async () => {
      mockEncryptionService.shareWorkspaceKey.mockResolvedValue({
        id: 'share-456',
        organizationId: 'org-123',
        userId: 'collab-456',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/key-shares',
        payload: {
          targetUserId: 'collab-456',
          encryptedKey: 'base64-key',
          nonce: 'base64-nonce',
          sharedByPublicKey: 'base64-pk',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().success).toBe(true);
    });

    it('should return 400 for missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/key-shares',
        payload: {
          targetUserId: 'collab-456',
          // Missing encryptedKey, nonce, sharedByPublicKey
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =============================================
  // GET /encryption/workspace/:organizationId/key-shares
  // =============================================
  describe('GET /encryption/workspace/:organizationId/key-shares', () => {
    it('should list all key shares for a workspace', async () => {
      mockEncryptionService.listWorkspaceKeyShares.mockResolvedValue([
        { id: 'share-1', userId: 'user-1' },
        { id: 'share-2', userId: 'user-2' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/workspace/org-123/key-shares',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toHaveLength(2);
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/request-enable
  // =============================================
  describe('POST /encryption/workspace/:organizationId/request-enable', () => {
    it('should return requiresVerification: false when workspace has no data', async () => {
      mockEncryptionService.hasWorkspaceData.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/request-enable',
        payload: { workspaceName: 'My Workspace' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.requiresVerification).toBe(false);
    });

    it('should send OTP and return requiresVerification: true when workspace has data', async () => {
      mockEncryptionService.hasWorkspaceData.mockResolvedValue(true);
      mockEncryptionService.createEncryptionChangeRequest.mockResolvedValue({
        id: 'req-123',
        status: 'PENDING_VERIFICATION',
      });
      mockEmailService.sendEncryptionChangeOtpEmail.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/request-enable',
        payload: { workspaceName: 'My Workspace' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.requiresVerification).toBe(true);
      expect(mockEmailService.sendEncryptionChangeOtpEmail).toHaveBeenCalled();
    });
  });

  // =============================================
  // Rate limiting on OTP verification endpoints
  // =============================================
  describe('rate limiting on verification endpoints', () => {
    it('should have rate limit config on verify-enable and verify-disable routes', async () => {
      // Register the rate-limit plugin so Fastify processes the route config
      const rateLimitedApp = Fastify();
      const rateLimit = await import('@fastify/rate-limit');
      await rateLimitedApp.register(rateLimit.default, { max: 100, timeWindow: '1 minute' });
      await rateLimitedApp.register(encryptionRoutes, { prefix: '/encryption' });
      await rateLimitedApp.ready();

      mockEncryptionService.verifyEncryptionChangeRequest.mockResolvedValue({
        id: 'req-1',
        status: 'VERIFIED',
      });

      // Send 6 requests to verify-enable — the 6th should be rate-limited
      for (let i = 0; i < 5; i++) {
        await rateLimitedApp.inject({
          method: 'POST',
          url: '/encryption/workspace/org-123/verify-enable',
          payload: { code: '123456' },
        });
      }

      const rateLimited = await rateLimitedApp.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/verify-enable',
        payload: { code: '123456' },
      });

      expect(rateLimited.statusCode).toBe(429);
      await rateLimitedApp.close();
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/verify-enable
  // =============================================
  describe('POST /encryption/workspace/:organizationId/verify-enable', () => {
    it('should verify enable request with valid code', async () => {
      mockEncryptionService.verifyEncryptionChangeRequest.mockResolvedValue({
        id: 'req-123',
        status: 'VERIFIED',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/verify-enable',
        payload: { code: '123456' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should return 400 for missing code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/verify-enable',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/request-disable
  // =============================================
  describe('POST /encryption/workspace/:organizationId/request-disable', () => {
    it('should send OTP for disable request', async () => {
      mockEncryptionService.createEncryptionChangeRequest.mockResolvedValue({
        id: 'req-456',
        status: 'PENDING_VERIFICATION',
      });
      mockEmailService.sendEncryptionChangeOtpEmail.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/request-disable',
        payload: { workspaceName: 'My Workspace' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.requiresVerification).toBe(true);
      expect(mockEmailService.sendEncryptionChangeOtpEmail).toHaveBeenCalled();
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/verify-disable
  // =============================================
  describe('POST /encryption/workspace/:organizationId/verify-disable', () => {
    it('should verify disable request with valid code', async () => {
      mockEncryptionService.verifyEncryptionChangeRequest.mockResolvedValue({
        id: 'req-456',
        status: 'VERIFIED',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/verify-disable',
        payload: { code: '654321' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/disable
  // =============================================
  describe('POST /encryption/workspace/:organizationId/disable', () => {
    it('should disable workspace encryption', async () => {
      mockEncryptionService.disableWorkspaceEncryption.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
        encryptionDisabledAt: new Date().toISOString(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/disable',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.isEncrypted).toBe(false);
    });

    it('should return error when service throws', async () => {
      mockEncryptionService.disableWorkspaceEncryption.mockRejectedValue(
        new Error('Workspace is not encrypted')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/disable',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =============================================
  // POST /encryption/workspace/:organizationId/cancel-disable
  // =============================================
  describe('POST /encryption/workspace/:organizationId/cancel-disable', () => {
    it('should cancel disable and re-enable encryption', async () => {
      mockEncryptionService.cancelDisableEncryption.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
        encryptionDisabledAt: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/cancel-disable',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.isEncrypted).toBe(true);
    });

    it('should return error when not in grace period', async () => {
      mockEncryptionService.cancelDisableEncryption.mockRejectedValue(
        new Error('Workspace is not in encryption grace period')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/cancel-disable',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =============================================
  // GET /encryption/workspace/:orgId/pending-members
  // =============================================
  describe('GET /encryption/workspace/:orgId/pending-members', () => {
    it('should return members without key shares', async () => {
      const pendingMembers = [
        {
          userId: 'user-2',
          email: 'bob@test.com',
          name: 'Bob',
          publicKey: 'pk-2',
          hasEncryptionSetup: true,
        },
        {
          userId: 'user-3',
          email: 'charlie@test.com',
          name: 'Charlie',
          publicKey: null,
          hasEncryptionSetup: false,
        },
      ];
      mockEncryptionService.getMembersWithoutKeyShare.mockResolvedValue(pendingMembers);

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/workspace/org-123/pending-members',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].userId).toBe('user-2');
    });

    it('should return 400 if workspace is not encrypted', async () => {
      mockEncryptionService.getMembersWithoutKeyShare.mockRejectedValue(
        new Error('Organisation is not encrypted')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/encryption/workspace/org-456/pending-members',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // =============================================
  // E2EE AUDIT LOGGING
  // =============================================
  describe('E2EE audit logging', () => {
    it('should log E2EE_SETUP_COMPLETED on successful setup', async () => {
      mockEncryptionService.setupEncryption.mockResolvedValue({ id: 'enc-123' });

      await app.inject({
        method: 'POST',
        url: '/encryption/setup',
        payload: {
          publicKey: 'pk',
          encryptedPrivateKey: 'epk',
          keySalt: 'salt',
          keyParams: { memoryLimit: 65536, opsLimit: 3 },
        },
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'E2EE_SETUP_COMPLETED',
          userId: 'user-123',
        })
      );
    });

    it('should log E2EE_RECOVERY_KEY_GENERATED on recovery key update', async () => {
      mockEncryptionService.updateRecoveryKey.mockResolvedValue({ id: 'enc-123' });

      await app.inject({
        method: 'POST',
        url: '/encryption/recovery',
        payload: {
          recoveryEncryptedMasterKey: { version: 1, iv: 'iv', ciphertext: 'ct' },
          recoverySalt: 'salt',
          recoveryKeyHash: 'hash',
        },
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'E2EE_RECOVERY_KEY_GENERATED',
          userId: 'user-123',
        })
      );
    });

    it('should log E2EE_WORKSPACE_ENCRYPTED on workspace enable', async () => {
      mockEncryptionService.enableWorkspaceEncryption.mockResolvedValue({
        id: 'org-123',
        isEncrypted: true,
      });

      await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/enable',
        payload: {
          encryptedKey: 'key',
          nonce: 'nonce',
          sharedByPublicKey: 'pk',
        },
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'E2EE_WORKSPACE_ENCRYPTED',
          userId: 'user-123',
          organizationId: 'org-123',
        })
      );
    });

    it('should log E2EE_KEY_SHARED on workspace key share', async () => {
      mockEncryptionService.shareWorkspaceKey.mockResolvedValue({ id: 'share-1' });

      await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/key-shares',
        payload: {
          targetUserId: 'collab-456',
          encryptedKey: 'key',
          nonce: 'nonce',
          sharedByPublicKey: 'pk',
        },
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'E2EE_KEY_SHARED',
          organizationId: 'org-123',
          metadata: expect.objectContaining({ targetUserId: 'collab-456' }),
        })
      );
    });

    it('should log E2EE_WORKSPACE_DECRYPTED on workspace disable', async () => {
      mockEncryptionService.disableWorkspaceEncryption.mockResolvedValue({
        id: 'org-123',
        isEncrypted: false,
      });

      await app.inject({
        method: 'POST',
        url: '/encryption/workspace/org-123/disable',
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'E2EE_WORKSPACE_DECRYPTED',
          userId: 'user-123',
          organizationId: 'org-123',
        })
      );
    });
  });
});
