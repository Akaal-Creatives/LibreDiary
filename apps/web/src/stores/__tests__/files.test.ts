import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFilesStore } from '../files';
import { filesService } from '@/services/files.service';

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

// Mock auth store
vi.mock('../auth', () => ({
  useAuthStore: () => ({
    currentOrganizationId: 'org-1',
  }),
}));

const mockedService = vi.mocked(filesService);

describe('useFilesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ===========================================
  // UPLOAD FILE
  // ===========================================

  describe('uploadFile', () => {
    it('should upload file and add to list', async () => {
      const mockFile: ReturnType<typeof createMockFileInfo> = createMockFileInfo();
      mockedService.uploadFile.mockResolvedValue({ file: mockFile });

      const store = useFilesStore();
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await store.uploadFile(file);

      expect(result.id).toBe('file-1');
      expect(store.files).toContainEqual(mockFile);
      expect(mockedService.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should track uploading state', async () => {
      mockedService.uploadFile.mockResolvedValue({ file: createMockFileInfo() });

      const store = useFilesStore();
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const promise = store.uploadFile(file);

      expect(store.uploading).toBe(true);
      await promise;
      expect(store.uploading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockedService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      const store = useFilesStore();
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(store.uploadFile(file)).rejects.toThrow('Upload failed');
      expect(store.error).toBe('Upload failed');
      expect(store.uploading).toBe(false);
    });
  });

  // ===========================================
  // FETCH FILES
  // ===========================================

  describe('fetchFiles', () => {
    it('should populate files list', async () => {
      const mockFiles = [createMockFileInfo(), createMockFileInfo('file-2', 'report.pdf')];
      mockedService.listFiles.mockResolvedValue({ files: mockFiles });

      const store = useFilesStore();
      await store.fetchFiles();

      expect(store.files).toHaveLength(2);
    });

    it('should set loading state', async () => {
      mockedService.listFiles.mockResolvedValue({ files: [] });

      const store = useFilesStore();
      const promise = store.fetchFiles();

      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });

    it('should pass pageId filter', async () => {
      mockedService.listFiles.mockResolvedValue({ files: [] });

      const store = useFilesStore();
      await store.fetchFiles({ pageId: 'page-1' });

      expect(mockedService.listFiles).toHaveBeenCalledWith('org-1', { pageId: 'page-1' });
    });
  });

  // ===========================================
  // DELETE FILE
  // ===========================================

  describe('deleteFile', () => {
    it('should remove file from list', async () => {
      const mockFile = createMockFileInfo();
      mockedService.listFiles.mockResolvedValue({ files: [mockFile] });
      mockedService.deleteFile.mockResolvedValue({ message: 'deleted' });

      const store = useFilesStore();
      await store.fetchFiles();
      expect(store.files).toHaveLength(1);

      await store.deleteFile('file-1');
      expect(store.files).toHaveLength(0);
    });
  });

  // ===========================================
  // STORAGE INFO
  // ===========================================

  describe('fetchStorageInfo', () => {
    it('should populate storage info', async () => {
      mockedService.getStorageInfo.mockResolvedValue({
        storage: { type: 'LOCAL', totalFiles: 5, totalSize: 10240 },
      });

      const store = useFilesStore();
      await store.fetchStorageInfo();

      expect(store.storageInfo).toEqual({
        type: 'LOCAL',
        totalFiles: 5,
        totalSize: 10240,
      });
    });
  });

  // ===========================================
  // TEST CONNECTION
  // ===========================================

  describe('testConnection', () => {
    it('should return connection result', async () => {
      mockedService.testStorageConnection.mockResolvedValue({
        result: { success: true, message: 'Connected' },
      });

      const store = useFilesStore();
      const result = await store.testConnection();

      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // RESET
  // ===========================================

  describe('reset', () => {
    it('should clear all state', async () => {
      mockedService.listFiles.mockResolvedValue({
        files: [createMockFileInfo()],
      });

      const store = useFilesStore();
      await store.fetchFiles();
      expect(store.files).toHaveLength(1);

      store.reset();

      expect(store.files).toHaveLength(0);
      expect(store.uploading).toBe(false);
      expect(store.uploadProgress).toBe(0);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.storageInfo).toBeNull();
    });
  });
});

// ===========================================
// HELPER
// ===========================================

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
