import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { filesService } from '../files.service';

describe('Files Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should call upload with correct endpoint and FormData', async () => {
      mockApi.upload.mockResolvedValue({ file: { id: 'file-1' } });
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await filesService.uploadFile('org-1', file);

      expect(mockApi.upload).toHaveBeenCalledTimes(1);
      const [endpoint, formData] = mockApi.upload.mock.calls[0];
      expect(endpoint).toBe('/organizations/org-1/files');
      expect(formData).toBeInstanceOf(FormData);
    });

    it('should include pageId in FormData when provided', async () => {
      mockApi.upload.mockResolvedValue({ file: { id: 'file-1' } });
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await filesService.uploadFile('org-1', file, { pageId: 'page-1' });

      const formData = mockApi.upload.mock.calls[0][1] as FormData;
      expect(formData.get('pageId')).toBe('page-1');
    });

    it('should pass onProgress callback', async () => {
      mockApi.upload.mockResolvedValue({ file: { id: 'file-1' } });
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const onProgress = vi.fn();

      await filesService.uploadFile('org-1', file, undefined, onProgress);

      expect(mockApi.upload.mock.calls[0][2]).toBe(onProgress);
    });
  });

  describe('getFile', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ file: { id: 'file-1' } });

      await filesService.getFile('org-1', 'file-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/files/file-1');
    });
  });

  describe('listFiles', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ files: [] });

      await filesService.listFiles('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/files');
    });

    it('should pass pageId query param', async () => {
      mockApi.get.mockResolvedValue({ files: [] });

      await filesService.listFiles('org-1', { pageId: 'page-1' });

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/files?pageId=page-1');
    });
  });

  describe('deleteFile', () => {
    it('should DELETE from correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await filesService.deleteFile('org-1', 'file-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/files/file-1');
    });
  });

  describe('getStorageInfo', () => {
    it('should GET from admin endpoint', async () => {
      mockApi.get.mockResolvedValue({ storage: { type: 'LOCAL', totalFiles: 0, totalSize: 0 } });

      await filesService.getStorageInfo();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/storage/info');
    });
  });

  describe('testStorageConnection', () => {
    it('should POST to admin endpoint', async () => {
      mockApi.post.mockResolvedValue({ result: { success: true, message: 'ok' } });

      await filesService.testStorageConnection();

      expect(mockApi.post).toHaveBeenCalledWith('/admin/storage/test');
    });
  });
});
