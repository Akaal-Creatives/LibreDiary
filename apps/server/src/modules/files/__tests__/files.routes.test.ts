import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(async (request: { organizationId: string }) => {
    request.organizationId = 'org-123';
  }),
}));

// Mock service
const { mockService, resetMocks } = vi.hoisted(() => {
  const mockService = {
    uploadFile: vi.fn(),
    getFile: vi.fn(),
    downloadFile: vi.fn(),
    listFiles: vi.fn(),
    deleteFile: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockService).forEach((mock) => mock.mockReset());
  }

  return { mockService, resetMocks };
});

vi.mock('../files.service.js', () => mockService);

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { filesRoutes } from '../files.routes.js';

describe('Files Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(multipart, { limits: { fileSize: 10485760 } });
    await app.register(filesRoutes, { prefix: '/organizations/:orgId/files' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // POST / — Upload file
  // ===========================================

  describe('POST /organizations/:orgId/files', () => {
    it('should upload a file via multipart and return 201', async () => {
      const mockFile = {
        id: 'file-1',
        organizationId: 'org-123',
        pageId: null,
        name: 'abc123.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageType: 'LOCAL',
        storagePath: 'org-123/abc123.pdf',
        url: '/uploads/org-123/abc123.pdf',
        uploadedById: 'user-123',
        createdAt: new Date().toISOString(),
      };
      mockService.uploadFile.mockResolvedValue(mockFile);

      const form = buildMultipartBody('document.pdf', 'application/pdf', 'pdf-content');

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/files',
        headers: form.headers,
        payload: form.body,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.file.originalName).toBe('document.pdf');
    });
  });

  // ===========================================
  // GET / — List files
  // ===========================================

  describe('GET /organizations/:orgId/files', () => {
    it('should return files list with 200', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          organizationId: 'org-123',
          name: 'abc.pdf',
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          createdAt: new Date().toISOString(),
        },
      ];
      mockService.listFiles.mockResolvedValue(mockFiles);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/files',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.files).toHaveLength(1);
    });

    it('should pass pageId filter when provided', async () => {
      mockService.listFiles.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/organizations/org-123/files?pageId=page-1',
      });

      expect(mockService.listFiles).toHaveBeenCalledWith('org-123', { pageId: 'page-1' });
    });
  });

  // ===========================================
  // GET /:fileId — Get file metadata
  // ===========================================

  describe('GET /organizations/:orgId/files/:fileId', () => {
    it('should return file metadata with 200', async () => {
      const mockFile = {
        id: 'file-1',
        organizationId: 'org-123',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      };
      mockService.getFile.mockResolvedValue(mockFile);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/files/file-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.file.id).toBe('file-1');
    });

    it('should return 404 for non-existent file', async () => {
      mockService.getFile.mockRejectedValue(new Error('FILE_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/files/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // GET /:fileId/download — Download file
  // ===========================================

  describe('GET /organizations/:orgId/files/:fileId/download', () => {
    it('should return file binary with 200', async () => {
      const content = Buffer.from('file content');
      mockService.downloadFile.mockResolvedValue({
        buffer: content,
        mimeType: 'application/pdf',
        filename: 'document.pdf',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/files/file-1/download',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('document.pdf');
    });
  });

  // ===========================================
  // DELETE /:fileId — Delete file
  // ===========================================

  describe('DELETE /organizations/:orgId/files/:fileId', () => {
    it('should delete file and return 200', async () => {
      mockService.deleteFile.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/files/file-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(mockService.deleteFile).toHaveBeenCalledWith('org-123', 'file-1');
    });
  });
});

// ===========================================
// HELPER: Build multipart body
// ===========================================

function buildMultipartBody(
  filename: string,
  contentType: string,
  content: string
): { headers: Record<string, string>; body: string } {
  const boundary = '---boundary123';
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  };
}
