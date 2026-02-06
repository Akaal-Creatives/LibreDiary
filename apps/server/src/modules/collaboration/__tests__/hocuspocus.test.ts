import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted
const { mockCollaborationService, mockSessionService } = vi.hoisted(() => {
  return {
    mockCollaborationService: {
      loadDocument: vi.fn(),
      storeDocument: vi.fn(),
      validatePageAccess: vi.fn(),
      getPageInfo: vi.fn(),
    },
    mockSessionService: {
      getSessionByToken: vi.fn(),
    },
  };
});

// Mock modules before imports
vi.mock('../collaboration.service.js', () => mockCollaborationService);
vi.mock('../../../services/session.service.js', () => mockSessionService);

// Import after mocking
import { createHocuspocusServer, parseDocumentName } from '../hocuspocus.js';

function resetMocks() {
  Object.values(mockCollaborationService).forEach((mock) => mock.mockReset());
  Object.values(mockSessionService).forEach((mock) => mock.mockReset());
}

describe('Hocuspocus Server', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    deletedAt: null,
  };

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    token: 'valid-token',
    expiresAt: futureDate,
    user: mockUser,
  };

  // ===========================================
  // PARSE DOCUMENT NAME
  // ===========================================

  describe('parseDocumentName', () => {
    it('should parse org and page from document name', () => {
      const result = parseDocumentName('org-123/page-456');

      expect(result).toEqual({
        organizationId: 'org-123',
        pageId: 'page-456',
      });
    });

    it('should return null for invalid document name', () => {
      expect(parseDocumentName('invalid')).toBeNull();
      expect(parseDocumentName('')).toBeNull();
      expect(parseDocumentName('org-123')).toBeNull();
    });

    it('should handle document names with special characters', () => {
      const result = parseDocumentName('clm123abc/clp456def');

      expect(result).toEqual({
        organizationId: 'clm123abc',
        pageId: 'clp456def',
      });
    });
  });

  // ===========================================
  // CREATE SERVER
  // ===========================================

  describe('createHocuspocusServer', () => {
    it('should create a Hocuspocus server instance', () => {
      const server = createHocuspocusServer();

      expect(server).toBeDefined();
      // Server instance has internal methods, just check it's an object
      expect(typeof server).toBe('object');
    });

    it('should create server with proper configuration', () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      expect(config).toBeDefined();
      expect(config.name).toBe('librediary-collab');
    });
  });

  // ===========================================
  // AUTHENTICATION HOOK TESTS
  // ===========================================

  describe('onAuthenticate hook', () => {
    it('should have onAuthenticate configured', () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      expect(typeof config.onAuthenticate).toBe('function');
    });

    it('should authenticate valid session token', async () => {
      mockSessionService.getSessionByToken.mockResolvedValue(mockSession);
      mockCollaborationService.validatePageAccess.mockResolvedValue({
        hasAccess: true,
        organizationId: 'org-123',
        pageId: 'page-456',
      });

      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      const data = {
        documentName: 'org-123/page-456',
        token: 'valid-token',
      };

      const result = await config.onAuthenticate(data);

      expect(result).toEqual({
        userId: 'user-123',
        organizationId: 'org-123',
        userName: 'Test User',
      });
    });

    it('should reject missing token', async () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      const data = {
        documentName: 'org-123/page-456',
        token: '',
      };

      await expect(config.onAuthenticate(data)).rejects.toThrow('Authentication required');
    });

    it('should reject invalid document name', async () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      const data = {
        documentName: 'invalid',
        token: 'valid-token',
      };

      await expect(config.onAuthenticate(data)).rejects.toThrow('Invalid document name format');
    });

    it('should reject invalid session', async () => {
      mockSessionService.getSessionByToken.mockResolvedValue(null);

      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      const data = {
        documentName: 'org-123/page-456',
        token: 'invalid-token',
      };

      // Now tries WS token, cookie, and session token before failing with "Authentication required"
      await expect(config.onAuthenticate(data)).rejects.toThrow('Authentication required');
    });

    it('should reject if user has no page access', async () => {
      mockSessionService.getSessionByToken.mockResolvedValue(mockSession);
      mockCollaborationService.validatePageAccess.mockResolvedValue({
        hasAccess: false,
        organizationId: 'org-123',
        pageId: 'page-456',
      });

      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      const data = {
        documentName: 'org-123/page-456',
        token: 'valid-token',
      };

      await expect(config.onAuthenticate(data)).rejects.toThrow('Access denied to this document');
    });

    it('should use email as userName fallback', async () => {
      const sessionWithNoName = {
        ...mockSession,
        user: { ...mockUser, name: null },
      };
      mockSessionService.getSessionByToken.mockResolvedValue(sessionWithNoName);
      mockCollaborationService.validatePageAccess.mockResolvedValue({
        hasAccess: true,
        organizationId: 'org-123',
        pageId: 'page-456',
      });

      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      const data = {
        documentName: 'org-123/page-456',
        token: 'valid-token',
      };

      const result = await config.onAuthenticate(data);

      expect(result.userName).toBe('test@example.com');
    });
  });

  // ===========================================
  // DOCUMENT HOOKS EXISTENCE TESTS
  // ===========================================

  describe('document hooks', () => {
    it('should have onLoadDocument configured', () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      expect(typeof config.onLoadDocument).toBe('function');
    });

    it('should have onStoreDocument configured', () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      expect(typeof config.onStoreDocument).toBe('function');
    });

    it('should have onConnect configured', () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      expect(typeof config.onConnect).toBe('function');
    });

    it('should have onDisconnect configured', () => {
      const server = createHocuspocusServer();
      const config = (server as any).configuration;

      expect(typeof config.onDisconnect).toBe('function');
    });
  });
});
