/**
 * Files Store — E2EE integration tests
 *
 * Verifies that file content is transparently encrypted before upload
 * and decrypted after download when the workspace is encrypted.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFilesStore } from '../files';
import { useAuthStore } from '../auth';
import { filesService } from '@/services/files.service';

// Mock the files service
vi.mock('@/services/files.service', () => ({
  filesService: {
    uploadFile: vi.fn(),
    getFile: vi.fn(),
    listFiles: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
    getStorageInfo: vi.fn(),
    testStorageConnection: vi.fn(),
  },
}));

// Mock useEncryption composable
const mockEncryption = vi.hoisted(() => ({
  isUnlocked: { value: false },
  isSetUp: { value: false },
  masterKey: { value: null },
  privateKey: { value: null },
  checkStatus: vi.fn(),
  setupEncryption: vi.fn(),
  unlock: vi.fn(),
  lock: vi.fn(),
  encryptContent: vi.fn(),
  decryptContent: vi.fn(),
  encryptBinary: vi.fn(),
  decryptBinary: vi.fn(),
  getWorkspaceKey: vi.fn(),
  recoverWithRecoveryKey: vi.fn(),
}));

vi.mock('@/composables/useEncryption', () => ({
  useEncryption: () => mockEncryption,
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Files Store — E2EE integration', () => {
  const mockWorkspaceKey = new Uint8Array(32).fill(42);

  function createMockFileInfo(id = 'file-1', name = 'document.pdf') {
    return {
      id,
      organizationId: 'org-1',
      pageId: null,
      name,
      originalName: name,
      mimeType: 'application/pdf',
      size: 1024,
      storageType: 'LOCAL' as const,
      storagePath: `org-1/${id}.pdf`,
      url: `/uploads/org-1/${id}.pdf`,
      uploadedById: 'user-1',
      createdAt: new Date().toISOString(),
    };
  }

  function setupAuthStore(isEncrypted = false) {
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      emailVerified: true,
      isSuperAdmin: false,
      locale: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl: null,
      onboardingCompletedAt: null,
    });
    authStore.setOrganizations(
      [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          logoUrl: null,
          accentColor: null,
          allowedDomains: [],
          aiEnabled: false,
          isEncrypted,
          encryptionDisabledAt: null,
        },
      ],
      [{ organizationId: 'org-1', role: 'OWNER' }]
    );
    return authStore;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');

    // Reset encryption mock state
    mockEncryption.isUnlocked.value = false;
    mockEncryption.isSetUp.value = false;
    mockEncryption.getWorkspaceKey.mockResolvedValue(null);
    mockEncryption.encryptBinary.mockResolvedValue(new Uint8Array([99, 99, 99]));
    mockEncryption.decryptBinary.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // =============================================
  // uploadFile — encryption before upload
  // =============================================

  describe('uploadFile — encryption', () => {
    it('should encrypt file content before uploading when org is encrypted', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);

      const encryptedBytes = new Uint8Array([10, 20, 30]);
      mockEncryption.encryptBinary.mockResolvedValue(encryptedBytes);

      const mockFileInfo = createMockFileInfo();
      vi.mocked(filesService.uploadFile).mockResolvedValue({ file: mockFileInfo });

      const store = useFilesStore();
      const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
      await store.uploadFile(file);

      // encryptBinary should have been called with file bytes and workspace key
      expect(mockEncryption.encryptBinary).toHaveBeenCalledTimes(1);
      expect(mockEncryption.encryptBinary).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        mockWorkspaceKey
      );

      // The service should receive an encrypted File (not the original)
      const uploadCall = vi.mocked(filesService.uploadFile).mock.calls[0]!;
      const uploadedFile = uploadCall[1] as File;
      expect(uploadedFile.name).toBe('test.txt');
      expect(uploadedFile.type).toBe('text/plain');
      // Size should differ from original (encrypted bytes)
      expect(uploadedFile.size).toBe(encryptedBytes.length);
    });

    it('should NOT encrypt when org is not encrypted', async () => {
      setupAuthStore(false);

      const mockFileInfo = createMockFileInfo();
      vi.mocked(filesService.uploadFile).mockResolvedValue({ file: mockFileInfo });

      const store = useFilesStore();
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      await store.uploadFile(file);

      expect(mockEncryption.encryptBinary).not.toHaveBeenCalled();
    });

    it('should NOT encrypt when encryption is not unlocked', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = false;

      const mockFileInfo = createMockFileInfo();
      vi.mocked(filesService.uploadFile).mockResolvedValue({ file: mockFileInfo });

      const store = useFilesStore();
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      await store.uploadFile(file);

      expect(mockEncryption.encryptBinary).not.toHaveBeenCalled();
    });

    it('should NOT encrypt when workspace key is unavailable', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(null);

      const mockFileInfo = createMockFileInfo();
      vi.mocked(filesService.uploadFile).mockResolvedValue({ file: mockFileInfo });

      const store = useFilesStore();
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      await store.uploadFile(file);

      expect(mockEncryption.encryptBinary).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // downloadFile — decryption after download
  // =============================================

  describe('downloadFile — decryption', () => {
    it('should decrypt file content after downloading when org is encrypted', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);

      const decryptedBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      mockEncryption.decryptBinary.mockResolvedValue(decryptedBytes);

      const encryptedBlob = new Blob([new Uint8Array([99, 99, 99])], {
        type: 'application/pdf',
      });
      vi.mocked(filesService.downloadFile).mockResolvedValue(encryptedBlob);

      const store = useFilesStore();
      const result = await store.downloadFile('file-1');

      expect(mockEncryption.decryptBinary).toHaveBeenCalledTimes(1);
      expect(mockEncryption.decryptBinary).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        mockWorkspaceKey
      );

      // Should return a Blob with decrypted content
      expect(result).toBeInstanceOf(Blob);
      const resultBytes = new Uint8Array(await result.arrayBuffer());
      expect(resultBytes).toEqual(decryptedBytes);
    });

    it('should NOT decrypt when org is not encrypted', async () => {
      setupAuthStore(false);

      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' });
      vi.mocked(filesService.downloadFile).mockResolvedValue(blob);

      const store = useFilesStore();
      await store.downloadFile('file-1');

      expect(mockEncryption.decryptBinary).not.toHaveBeenCalled();
    });

    it('should NOT decrypt when encryption is not unlocked', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = false;

      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' });
      vi.mocked(filesService.downloadFile).mockResolvedValue(blob);

      const store = useFilesStore();
      await store.downloadFile('file-1');

      expect(mockEncryption.decryptBinary).not.toHaveBeenCalled();
    });
  });
});
