import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibreDiaryClient, LibreDiaryApiError } from '../../client/api-client.js';
import type { McpConfig } from '../../config.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('LibreDiaryClient', () => {
  const config: McpConfig = {
    apiUrl: 'http://localhost:3000/api',
    apiToken: 'ld_test_token_123',
    orgId: 'org_test_id',
  };

  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LibreDiaryClient(config);
  });

  function mockSuccessResponse<T>(data: T) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data }),
    });
  }

  function mockErrorResponse(status: number, code: string, message: string) {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({
        success: false,
        error: { code, message },
      }),
    });
  }

  // ===========================================
  // URL CONSTRUCTION
  // ===========================================

  describe('URL construction', () => {
    it('should build org-scoped URLs correctly', async () => {
      mockSuccessResponse({ pages: [] });

      await client.orgGet('/pages');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/organizations/org_test_id/pages',
        expect.any(Object)
      );
    });

    it('should build org-scoped URLs with nested paths', async () => {
      mockSuccessResponse({ page: {} });

      await client.orgGet('/pages/page123/ancestors');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/organizations/org_test_id/pages/page123/ancestors',
        expect.any(Object)
      );
    });

    it('should build non-org URLs correctly', async () => {
      mockSuccessResponse({ user: {} });

      await client.get('/auth/me');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/me',
        expect.any(Object)
      );
    });

    it('should handle empty org path', async () => {
      mockSuccessResponse({ organization: {} });

      await client.orgGet('');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/organizations/org_test_id',
        expect.any(Object)
      );
    });
  });

  // ===========================================
  // HEADERS
  // ===========================================

  describe('headers', () => {
    it('should include Bearer auth token', async () => {
      mockSuccessResponse({});

      await client.orgGet('/pages');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer ld_test_token_123');
    });

    it('should include Content-Type application/json', async () => {
      mockSuccessResponse({});

      await client.orgGet('/pages');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include Accept application/json', async () => {
      mockSuccessResponse({});

      await client.orgGet('/pages');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers['Accept']).toBe('application/json');
    });
  });

  // ===========================================
  // HTTP METHODS
  // ===========================================

  describe('HTTP methods', () => {
    it('orgGet should use GET method', async () => {
      mockSuccessResponse({});

      await client.orgGet('/pages');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].method).toBe('GET');
    });

    it('orgPost should use POST method', async () => {
      mockSuccessResponse({});

      await client.orgPost('/pages', { title: 'Test' });

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].method).toBe('POST');
    });

    it('orgPatch should use PATCH method', async () => {
      mockSuccessResponse({});

      await client.orgPatch('/pages/123', { title: 'Updated' });

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].method).toBe('PATCH');
    });

    it('orgDelete should use DELETE method', async () => {
      mockSuccessResponse({});

      await client.orgDelete('/pages/123');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].method).toBe('DELETE');
    });

    it('get should use GET method', async () => {
      mockSuccessResponse({});

      await client.get('/auth/me');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].method).toBe('GET');
    });

    it('post should use POST method', async () => {
      mockSuccessResponse({});

      await client.post('/auth/login', { email: 'test@test.com' });

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].method).toBe('POST');
    });
  });

  // ===========================================
  // REQUEST BODY
  // ===========================================

  describe('request body', () => {
    it('should serialise body as JSON for POST', async () => {
      mockSuccessResponse({});

      const body = { title: 'Test Page', parentId: null };
      await client.orgPost('/pages', body);

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it('should serialise body as JSON for PATCH', async () => {
      mockSuccessResponse({});

      const body = { title: 'Updated' };
      await client.orgPatch('/pages/123', body);

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it('should not include body for GET requests', async () => {
      mockSuccessResponse({});

      await client.orgGet('/pages');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].body).toBeUndefined();
    });

    it('should not include body for DELETE requests', async () => {
      mockSuccessResponse({});

      await client.orgDelete('/pages/123');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].body).toBeUndefined();
    });

    it('should handle POST without body', async () => {
      mockSuccessResponse({});

      await client.orgPost('/pages/123/restore');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].body).toBeUndefined();
    });
  });

  // ===========================================
  // RESPONSE HANDLING
  // ===========================================

  describe('success responses', () => {
    it('should return data from successful response', async () => {
      const pages = [{ id: '1', title: 'Page 1' }];
      mockSuccessResponse({ pages });

      const result = await client.orgGet<{ pages: typeof pages }>('/pages');

      expect(result).toEqual({ pages });
    });

    it('should handle empty data', async () => {
      mockSuccessResponse(null);

      const result = await client.orgGet('/pages');

      expect(result).toBeNull();
    });
  });

  // ===========================================
  // ERROR HANDLING
  // ===========================================

  describe('error handling', () => {
    it('should throw LibreDiaryApiError on 404', async () => {
      mockErrorResponse(404, 'PAGE_NOT_FOUND', 'Page not found');

      await expect(client.orgGet('/pages/nonexistent')).rejects.toThrow(LibreDiaryApiError);
    });

    it('should include status code in error', async () => {
      mockErrorResponse(404, 'PAGE_NOT_FOUND', 'Page not found');

      try {
        await client.orgGet('/pages/nonexistent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LibreDiaryApiError);
        expect((error as LibreDiaryApiError).status).toBe(404);
      }
    });

    it('should include error code', async () => {
      mockErrorResponse(404, 'PAGE_NOT_FOUND', 'Page not found');

      try {
        await client.orgGet('/pages/nonexistent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as LibreDiaryApiError).code).toBe('PAGE_NOT_FOUND');
      }
    });

    it('should include error message', async () => {
      mockErrorResponse(404, 'PAGE_NOT_FOUND', 'Page not found');

      try {
        await client.orgGet('/pages/nonexistent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as LibreDiaryApiError).message).toBe('Page not found');
      }
    });

    it('should handle 400 validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: { title: ['Required'] },
          },
        }),
      });

      try {
        await client.orgPost('/pages', {});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LibreDiaryApiError);
        expect((error as LibreDiaryApiError).status).toBe(400);
        expect((error as LibreDiaryApiError).details).toEqual({ title: ['Required'] });
      }
    });

    it('should handle 401 unauthorised errors', async () => {
      mockErrorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token');

      await expect(client.orgGet('/pages')).rejects.toThrow('Invalid or expired token');
    });

    it('should handle 500 server errors', async () => {
      mockErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error');

      await expect(client.orgGet('/pages')).rejects.toThrow('Internal server error');
    });

    it('should use fallback code for responses without error code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ success: false }),
      });

      try {
        await client.orgGet('/pages');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as LibreDiaryApiError).code).toBe('UNKNOWN_ERROR');
      }
    });

    it('should use fallback message for responses without error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ success: false }),
      });

      try {
        await client.orgGet('/pages');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as LibreDiaryApiError).message).toContain('502');
      }
    });

    it('should throw on success:false even if HTTP status is 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: { code: 'LOGIC_ERROR', message: 'Something went wrong' },
        }),
      });

      await expect(client.orgGet('/pages')).rejects.toThrow('Something went wrong');
    });
  });
});

describe('LibreDiaryApiError', () => {
  it('should have correct name', () => {
    const error = new LibreDiaryApiError(404, 'NOT_FOUND', 'Not found');
    expect(error.name).toBe('LibreDiaryApiError');
  });

  it('should be instanceof Error', () => {
    const error = new LibreDiaryApiError(404, 'NOT_FOUND', 'Not found');
    expect(error).toBeInstanceOf(Error);
  });

  it('should store details', () => {
    const details = { field: 'title', reason: 'required' };
    const error = new LibreDiaryApiError(400, 'VALIDATION', 'Bad', details);
    expect(error.details).toEqual(details);
  });

  it('should have undefined details when not provided', () => {
    const error = new LibreDiaryApiError(404, 'NOT_FOUND', 'Not found');
    expect(error.details).toBeUndefined();
  });
});
