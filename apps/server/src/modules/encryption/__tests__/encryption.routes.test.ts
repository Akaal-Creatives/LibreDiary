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
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock('../encryption.service.js', () => mockEncryptionService);
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: mockRequireAuth,
}));

// Import routes after mocking
import { encryptionRoutes } from '../encryption.routes.js';

describe('Encryption Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock auth middleware to set request.user
    mockRequireAuth.mockImplementation(async (request: { user: { id: string } }) => {
      request.user = { id: 'user-123' } as { id: string };
    });

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
});
